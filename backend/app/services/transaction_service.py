"""
TransactionService — moteur de transaction financière sécurisé.

Convention frais (ÉTAPE 6) :
    frais = 0  (moteur de frais non encore défini)
    montant_total = montant + frais  (débité du sender)
    montant crédité au receiver = montant

Convention verrouillage (anti-deadlock) :
    Les deux wallets sont verrouillés dans l'ordre croissant de leur UUID
    afin que deux transferts simultanés A→B et B→A acquièrent les verrous
    dans le même ordre.

Transitions autorisées :
    PENDING → COMPLETED  (succès)
    PENDING → FAILED     (erreur métier ou technique)
    COMPLETED → REVERSED (remboursement — étape future)
"""
import uuid
import secrets
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.ledger import LedgerEntry
from app.models.transaction import Transaction
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.wallet_repository import WalletRepository

DEVISES_VALIDES = {"GNF", "EUR", "USD"}


def _generate_reference() -> str:
    """Référence métier unique : TXN-{16 hex chars}."""
    return "TXN-" + secrets.token_hex(8).upper()


class InsufficientFundsError(Exception):
    pass


class WalletNotFoundError(Exception):
    pass


class WalletInactiveError(Exception):
    pass


class SelfTransferError(Exception):
    pass


class CurrencyMismatchError(Exception):
    pass


class IdempotencyConflictError(Exception):
    """Même clé, payload différent."""
    pass


class TransactionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.tx_repo = TransactionRepository(db)
        self.wallet_repo = WalletRepository(db)
        self.ledger_repo = LedgerRepository(db)

    # ─── Lecture ─────────────────────────────────────────────────

    def get_by_reference(self, reference: str) -> Transaction | None:
        return self.tx_repo.get_by_reference(reference)

    def get_by_idempotency_key(self, key: str) -> Transaction | None:
        return self.tx_repo.get_by_idempotency_key(key)

    def count(self) -> int:
        return self.tx_repo.count()

    # ─── Transfert financier ────────────────────────────────────

    def transfer(
        self,
        sender_user_id: uuid.UUID,
        receiver_wallet_id: uuid.UUID,
        montant: Decimal,
        devise: str,
        idempotency_key: str,
        motif: str | None = None,
    ) -> Transaction:
        """
        Transfert atomique sécurisé entre deux wallets.

        1. Idempotence : si la clé existe déjà → retourne la transaction existante
           (ou lève IdempotencyConflictError si le payload diffère).
        2. SELECT FOR UPDATE dans l'ordre déterministe des UUID (anti-deadlock).
        3. Validation : ownership, statut, devise, solde, sender ≠ receiver.
        4. Écriture atomique : Transaction + 2 LedgerEntry + update soldes.
        5. db.flush() — le commit est délégué au router.
        """

        # ── 1. Idempotence ──────────────────────────────────────
        existing = self.tx_repo.get_by_idempotency_key(idempotency_key)
        if existing is not None:
            # Vérifie que le payload est cohérent avec la transaction existante
            if (
                existing.receiver_wallet_id != receiver_wallet_id
                or existing.montant != montant
                or existing.devise != devise
            ):
                raise IdempotencyConflictError(
                    "Idempotency key already used with different parameters."
                )
            return existing

        # ── 2. Résolution du wallet expéditeur (ownership) ──────
        sender_wallet = self.wallet_repo.get_by_user_id(sender_user_id)
        if sender_wallet is None:
            raise WalletNotFoundError("Wallet expéditeur introuvable.")

        # ── 3. Validation pre-lock ───────────────────────────────
        if sender_wallet.id == receiver_wallet_id:
            raise SelfTransferError(
                "L'expéditeur et le destinataire ne peuvent pas être identiques."
            )
        if devise not in DEVISES_VALIDES:
            raise ValueError(f"Devise invalide : {devise}")
        if montant <= Decimal("0"):
            raise ValueError("Le montant doit être strictement positif.")

        # ── 4. SELECT FOR UPDATE dans l'ordre déterministe ──────
        ids_sorted = sorted([sender_wallet.id, receiver_wallet_id])
        first = self.wallet_repo.get_for_update(ids_sorted[0])
        second = self.wallet_repo.get_for_update(ids_sorted[1])

        if first is None or second is None:
            raise WalletNotFoundError("Un des wallets est introuvable.")

        # Réassignation sémantique après lock
        if sender_wallet.id == ids_sorted[0]:
            sender_locked, receiver_locked = first, second
        else:
            sender_locked, receiver_locked = second, first

        # ── 5. Validations post-lock ─────────────────────────────
        if sender_locked.statut != "ACTIVE":
            raise WalletInactiveError(
                f"Wallet expéditeur {sender_locked.statut}."
            )
        if receiver_locked.statut != "ACTIVE":
            raise WalletInactiveError(
                f"Wallet destinataire {receiver_locked.statut}."
            )
        if sender_locked.devise != devise:
            raise CurrencyMismatchError(
                f"Devise du wallet expéditeur ({sender_locked.devise}) "
                f"incompatible avec la devise de la transaction ({devise})."
            )
        if receiver_locked.devise != devise:
            raise CurrencyMismatchError(
                f"Devise du wallet destinataire ({receiver_locked.devise}) "
                f"incompatible avec la devise de la transaction ({devise})."
            )

        frais = Decimal("0.0000")
        montant_total = montant + frais  # total débité du sender

        if sender_locked.solde < montant_total:
            raise InsufficientFundsError(
                f"Solde insuffisant : disponible {sender_locked.solde} "
                f"{devise}, requis {montant_total} {devise}."
            )

        # ── 6–8. Écriture atomique : Transaction + Ledger + Soldes ──
        #
        # En cas de race condition (deux requêtes avec la même
        # idempotency_key passent le contrôle pré-lock simultanément),
        # PostgreSQL lève une IntegrityError sur la contrainte UNIQUE.
        # On rollback, on re-lit la transaction existante et on la retourne
        # sans avoir effectué de deuxième débit.
        try:
            tx = Transaction(
                reference=_generate_reference(),
                sender_wallet_id=sender_locked.id,
                receiver_wallet_id=receiver_locked.id,
                montant=montant,
                devise=devise,
                frais=frais,
                montant_total=montant_total,
                statut="COMPLETED",
                motif=motif,
                idempotency_key=idempotency_key,
                confirmed_at=datetime.now(timezone.utc),
            )
            self.tx_repo.create(tx)  # flush — peut lever IntegrityError

            debit = LedgerEntry(
                transaction_id=tx.id,
                wallet_id=sender_locked.id,
                type_mouvement="DEBIT",
                montant=montant_total,
                devise=devise,
            )
            credit = LedgerEntry(
                transaction_id=tx.id,
                wallet_id=receiver_locked.id,
                type_mouvement="CREDIT",
                montant=montant,
                devise=devise,
            )
            self.ledger_repo.create_pair(debit, credit)

            self.wallet_repo.update_solde(
                sender_locked, sender_locked.solde - montant_total
            )
            self.wallet_repo.update_solde(
                receiver_locked, receiver_locked.solde + montant
            )

            return tx

        except IntegrityError:
            # Race condition sur idempotency_key :
            # un concurrent a committé en premier.
            # Rollback du SAVEPOINT courant, puis lecture de la tx existante.
            self.db.rollback()
            existing = self.tx_repo.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing
            raise  # IntegrityError non liée à l'idempotency_key
