"""
TransactionService — moteur de transaction financière sécurisé.

Frais :
    - Même devise   : 0,5 % du montant (min. 500 GNF équivalent)
    - Cross-devise  : 1,5 % du montant (min. 500 GNF équivalent)

Conversion :
    taux stocké dans MNBCReserve.taux = "1 unité = X GNF"
    montant_converti = montant * taux_sender / taux_receiver

Verrouillage anti-deadlock :
    Les deux wallets sont verrouillés dans l'ordre croissant de leur UUID.
"""
import uuid
import secrets
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.ledger import LedgerEntry
from app.models.mnbc import MNBCReserve
from app.models.transaction import Transaction
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.wallet_repository import WalletRepository

DEVISES_VALIDES = {"GNF", "EUR", "USD", "GBP", "XOF"}

_TAUX_FRAIS_MEME = Decimal("0.005")   # 0,5 % même devise
_TAUX_FRAIS_CROSS = Decimal("0.015")  # 1,5 % cross-devise
_MIN_FRAIS_GNF = Decimal("500")       # plancher tarifaire en GNF


def _generate_reference() -> str:
    return "TXN-" + secrets.token_hex(8).upper()


def _q(value: Decimal, places: str = "0.0001") -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


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


class ExchangeRateError(Exception):
    """Taux de change indisponible pour cette devise."""
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

    # ─── Helpers taux / frais ─────────────────────────────────────

    def _get_taux(self, devise: str) -> Decimal:
        """1 unité de `devise` = retourne X GNF. GNF → toujours 1."""
        if devise == "GNF":
            return Decimal("1")
        reserve = self.db.scalar(
            select(MNBCReserve).where(
                MNBCReserve.devise == devise,
                MNBCReserve.statut == "ACTIVE",
            )
        )
        if reserve is None:
            raise ExchangeRateError(
                f"Taux de change indisponible pour {devise}."
            )
        return reserve.taux

    def _compute_frais(
        self,
        montant: Decimal,
        sender_devise: str,
        receiver_devise: str,
        taux_sender: Decimal,
    ) -> Decimal:
        """Frais en sender_devise avec plancher 500 GNF équivalent."""
        is_cross = sender_devise != receiver_devise
        pct = _TAUX_FRAIS_CROSS if is_cross else _TAUX_FRAIS_MEME
        frais_raw = _q(montant * pct)
        min_frais = _q(_MIN_FRAIS_GNF / taux_sender)
        return max(frais_raw, min_frais)

    def _convert(
        self,
        montant: Decimal,
        taux_from: Decimal,
        taux_to: Decimal,
    ) -> Decimal:
        """Convertit montant via GNF : montant * taux_from / taux_to."""
        return _q(montant * taux_from / taux_to)

    # ─── Transfert financier ─────────────────────────────────────

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
        Transfert atomique multi-devises.

        1. Idempotence : clé déjà vue → retourne la tx existante.
        2. SELECT FOR UPDATE dans l'ordre UUID (anti-deadlock).
        3. Validation : ownership, statut, devise sender, solde.
        4. Conversion cross-devise via MNBCReserve.taux.
        5. Écriture atomique : Transaction + 2 LedgerEntry + soldes.
        """

        # ── 1. Idempotence ───────────────────────────────────────
        existing = self.tx_repo.get_by_idempotency_key(idempotency_key)
        if existing is not None:
            if (
                existing.receiver_wallet_id != receiver_wallet_id
                or existing.montant != montant
                or existing.devise != devise
            ):
                raise IdempotencyConflictError(
                    "Idempotency key already used with different parameters."
                )
            return existing

        # ── 2. Résolution du wallet expéditeur ───────────────────
        sender_wallet = self.wallet_repo.get_by_user_id(sender_user_id)
        if sender_wallet is None:
            raise WalletNotFoundError("Wallet expéditeur introuvable.")

        # ── 3. Validations pre-lock ───────────────────────────────
        if sender_wallet.id == receiver_wallet_id:
            raise SelfTransferError(
                "L'expéditeur et le destinataire ne peuvent pas être identiques."
            )
        if devise not in DEVISES_VALIDES:
            raise ValueError(f"Devise invalide : {devise}")
        if montant <= Decimal("0"):
            raise ValueError("Le montant doit être strictement positif.")

        # ── 4. SELECT FOR UPDATE ordre déterministe ───────────────
        ids_sorted = sorted([sender_wallet.id, receiver_wallet_id])
        first = self.wallet_repo.get_for_update(ids_sorted[0])
        second = self.wallet_repo.get_for_update(ids_sorted[1])

        if first is None or second is None:
            raise WalletNotFoundError("Un des wallets est introuvable.")

        if sender_wallet.id == ids_sorted[0]:
            sender_locked, receiver_locked = first, second
        else:
            sender_locked, receiver_locked = second, first

        # ── 5. Validations post-lock ──────────────────────────────
        if sender_locked.statut != "ACTIVE":
            raise WalletInactiveError(f"Wallet expéditeur {sender_locked.statut}.")
        if receiver_locked.statut != "ACTIVE":
            raise WalletInactiveError(f"Wallet destinataire {receiver_locked.statut}.")
        if sender_locked.devise != devise:
            raise CurrencyMismatchError(
                f"Votre wallet est en {sender_locked.devise}, "
                f"mais la devise demandée est {devise}."
            )

        sender_devise = sender_locked.devise
        receiver_devise = receiver_locked.devise

        # ── 6. Taux de change et frais ────────────────────────────
        taux_sender = self._get_taux(sender_devise)
        taux_receiver = self._get_taux(receiver_devise)

        frais = self._compute_frais(montant, sender_devise, receiver_devise, taux_sender)
        montant_total = _q(montant + frais)

        if sender_locked.solde < montant_total:
            raise InsufficientFundsError(
                f"Solde insuffisant : disponible {sender_locked.solde} "
                f"{sender_devise}, requis {montant_total} {sender_devise}."
            )

        montant_converti = self._convert(montant, taux_sender, taux_receiver)

        # ── 7. Écriture atomique ──────────────────────────────────
        try:
            tx = Transaction(
                reference=_generate_reference(),
                sender_wallet_id=sender_locked.id,
                receiver_wallet_id=receiver_locked.id,
                montant=montant,
                devise=sender_devise,
                frais=frais,
                montant_total=montant_total,
                receiver_devise=receiver_devise,
                montant_converti=montant_converti,
                taux_applique=taux_sender,
                statut="COMPLETED",
                motif=motif,
                idempotency_key=idempotency_key,
                confirmed_at=datetime.now(timezone.utc),
            )
            self.tx_repo.create(tx)

            debit = LedgerEntry(
                transaction_id=tx.id,
                wallet_id=sender_locked.id,
                type_mouvement="DEBIT",
                montant=montant_total,
                devise=sender_devise,
            )
            credit = LedgerEntry(
                transaction_id=tx.id,
                wallet_id=receiver_locked.id,
                type_mouvement="CREDIT",
                montant=montant_converti,
                devise=receiver_devise,
            )
            self.ledger_repo.create_pair(debit, credit)

            self.wallet_repo.update_solde(
                sender_locked, sender_locked.solde - montant_total
            )
            self.wallet_repo.update_solde(
                receiver_locked, receiver_locked.solde + montant_converti
            )

            return tx

        except IntegrityError:
            self.db.rollback()
            existing = self.tx_repo.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing
            raise
