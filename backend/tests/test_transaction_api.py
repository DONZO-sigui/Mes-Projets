"""
Tests POST /api/v1/transactions — moteur de transfert financier

Couvre :
  - Validation montant / devise / idempotency-key
  - Authentification et autorisation
  - Wallet expéditeur / destinataire
  - Solde insuffisant / exact / négatif impossible
  - Double-entry ledger (DEBIT + CREDIT)
  - Conservation de la masse monétaire
  - Idempotence (replay → 200, conflit payload → 400)
  - Atomicité / rollback sur erreur
  - Concurrence séquentielle (double-spend)
  - Sécurité (IDOR, mass assignment, sender_wallet_id ignoré)
"""
import uuid
from decimal import Decimal

import pytest

BASE = "/api/v1/transactions"


# ─── Helpers ──────────────────────────────────────────────────

def _key() -> str:
    """Génère une Idempotency-Key unique."""
    return "TEST-" + uuid.uuid4().hex[:16].upper()


def _body(receiver_wallet_id, montant="100000.0000", devise="GNF", motif=None):
    d = {
        "receiver_wallet_id": str(receiver_wallet_id),
        "montant": montant,
        "devise": devise,
    }
    if motif:
        d["motif"] = motif
    return d


# ─── Fixtures locales ─────────────────────────────────────────

@pytest.fixture()
def sender(db_for_api):
    """Utilisateur USER actif — wallet GNF crédité 500 000 GNF."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="sender@example.com",
        password_hash=hash_password("SenderPass1!"),
        first_name="Sender",
        last_name="GNF",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()

    wallet = Wallet(
        user_id=user.id,
        nif="GNF" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
        solde=Decimal("500000.0000"),
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


@pytest.fixture()
def receiver(db_for_api):
    """Utilisateur USER actif — wallet GNF vide."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="receiver@example.com",
        password_hash=hash_password("ReceiverPass1!"),
        first_name="Receiver",
        last_name="GNF",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()

    wallet = Wallet(
        user_id=user.id,
        nif="REC" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


@pytest.fixture()
def sender_headers(client, sender):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "sender@example.com", "password": "SenderPass1!"},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def sender_wallet(db_for_api, sender):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db_for_api).get_by_user_id(sender.id)


@pytest.fixture()
def receiver_wallet(db_for_api, receiver):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db_for_api).get_by_user_id(receiver.id)


@pytest.fixture()
def receiver_wallet_id(receiver_wallet):
    return receiver_wallet.id


# ─── Validation montant / devise / idempotency-key ────────────

def test_transfer_zero_amount(client, sender_headers, receiver_wallet_id):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="0"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422


def test_transfer_negative_amount(client, sender_headers, receiver_wallet_id):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="-1000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422


def test_transfer_invalid_currency(client, sender_headers, receiver_wallet_id):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, devise="XAF"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422


def test_transfer_missing_idempotency_key(
    client, sender_headers, receiver_wallet_id
):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers=sender_headers,
    )
    assert resp.status_code == 422


def test_transfer_too_short_idempotency_key(
    client, sender_headers, receiver_wallet_id
):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={**sender_headers, "Idempotency-Key": "short"},
    )
    assert resp.status_code == 422


# ─── Authentification ─────────────────────────────────────────

def test_transfer_unauthenticated(client, receiver_wallet_id):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={"Idempotency-Key": _key()},
    )
    assert resp.status_code == 401


def test_transfer_suspended_user(client, suspended_user, receiver_wallet_id):
    from app.core.security import create_access_token
    token = create_access_token(suspended_user.id, suspended_user.role)
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": _key(),
        },
    )
    assert resp.status_code == 403


# ─── Validation wallets ───────────────────────────────────────

def test_transfer_receiver_not_found(client, sender_headers):
    resp = client.post(
        BASE,
        json=_body(uuid.uuid4()),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 404


def test_transfer_self_transfer(client, sender_headers, sender_wallet):
    """L'utilisateur ne peut pas s'envoyer de l'argent à lui-même."""
    resp = client.post(
        BASE,
        json=_body(sender_wallet.id),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 409


# ─── Solde ────────────────────────────────────────────────────

def test_transfer_insufficient_funds(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    sender_wallet.solde = Decimal("50000.0000")
    db_for_api.flush()
    db_for_api.commit()

    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="100000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 409
    assert "insuffisant" in resp.json()["error"]["message"].lower()


def test_transfer_exact_balance_succeeds(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    """Solde exactement égal au montant → succès (pas de refus)."""
    sender_wallet.solde = Decimal("100000.0000")
    db_for_api.flush()
    db_for_api.commit()

    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="100000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201

    db_for_api.refresh(sender_wallet)
    assert sender_wallet.solde == Decimal("0.0000")


def test_transfer_no_negative_balance(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    """Le solde ne peut jamais devenir négatif."""
    sender_wallet.solde = Decimal("10.0000")
    db_for_api.flush()
    db_for_api.commit()

    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="10000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 409

    db_for_api.refresh(sender_wallet)
    assert sender_wallet.solde >= Decimal("0.0000")


# ─── Transfert valide — réponse et état ───────────────────────

def test_transfer_valid_returns_201(
    client, sender_headers, receiver_wallet_id
):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, motif="Test de paiement"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["statut"] == "COMPLETED"
    assert data["devise"] == "GNF"
    assert Decimal(str(data["montant"])) == Decimal("100000.0000")


def test_transfer_response_fields(
    client, sender_headers, receiver_wallet_id
):
    """La réponse expose les champs attendus sans données sensibles."""
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    data = resp.json()
    required = {
        "id", "reference", "montant", "frais", "montant_total",
        "devise", "statut", "idempotency_key", "created_at",
    }
    assert required.issubset(data.keys())
    assert "password" not in data
    assert "password_hash" not in data


def test_transfer_reference_starts_with_txn(
    client, sender_headers, receiver_wallet_id
):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    assert resp.json()["reference"].startswith("TXN-")


def test_transfer_balances_updated(
    client, sender_headers, sender_wallet, receiver_wallet,
    receiver_wallet_id, db_for_api,
):
    """Après transfert : sender perd montant, receiver gagne montant."""
    initial_sender = sender_wallet.solde
    amount = Decimal("100000.0000")

    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant=str(amount)),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201

    db_for_api.refresh(sender_wallet)
    db_for_api.refresh(receiver_wallet)
    assert sender_wallet.solde == initial_sender - amount
    assert receiver_wallet.solde == amount


def test_money_conservation(
    client, sender_headers, sender_wallet, receiver_wallet,
    receiver_wallet_id, db_for_api,
):
    """La somme des soldes est conservée : aucune création ni destruction."""
    total_before = sender_wallet.solde + receiver_wallet.solde
    amount = Decimal("100000.0000")

    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant=str(amount)),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201

    db_for_api.refresh(sender_wallet)
    db_for_api.refresh(receiver_wallet)
    total_after = sender_wallet.solde + receiver_wallet.solde
    assert total_after == total_before


# ─── Double-entry ledger ───────────────────────────────────────

def test_transfer_creates_debit_and_credit(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    tx_id = uuid.UUID(resp.json()["id"])

    from app.repositories.ledger_repository import LedgerRepository
    entries = LedgerRepository(db_for_api).list_by_transaction(tx_id)
    assert len(entries) == 2

    types = {e.type_mouvement for e in entries}
    assert types == {"DEBIT", "CREDIT"}


def test_transfer_ledger_balanced(
    client, sender_headers, receiver_wallet_id, db_for_api
):
    """Total DEBIT == Total CREDIT (avec frais=0)."""
    amount = Decimal("100000.0000")
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant=str(amount)),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    tx_id = uuid.UUID(resp.json()["id"])

    from app.repositories.ledger_repository import LedgerRepository
    entries = LedgerRepository(db_for_api).list_by_transaction(tx_id)

    total_debit = sum(
        e.montant for e in entries if e.type_mouvement == "DEBIT"
    )
    total_credit = sum(
        e.montant for e in entries if e.type_mouvement == "CREDIT"
    )
    assert total_debit == total_credit


def test_transfer_ledger_amounts_correct(
    client, sender_headers, receiver_wallet_id, sender_wallet,
    receiver_wallet, db_for_api,
):
    """DEBIT = montant total débité ; CREDIT = montant crédité."""
    amount = Decimal("100000.0000")
    resp = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant=str(amount)),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    tx_id = uuid.UUID(resp.json()["id"])

    from app.repositories.ledger_repository import LedgerRepository
    entries = LedgerRepository(db_for_api).list_by_transaction(tx_id)

    debit = next(e for e in entries if e.type_mouvement == "DEBIT")
    credit = next(e for e in entries if e.type_mouvement == "CREDIT")

    assert debit.wallet_id == sender_wallet.id
    assert credit.wallet_id == receiver_wallet.id
    assert debit.montant == amount
    assert credit.montant == amount


# ─── Idempotence ──────────────────────────────────────────────

def test_idempotency_replay_returns_200(
    client, sender_headers, receiver_wallet_id
):
    """Le même Idempotency-Key retourne la même transaction → 200."""
    key = _key()
    body = _body(receiver_wallet_id)

    r1 = client.post(
        BASE, json=body,
        headers={**sender_headers, "Idempotency-Key": key},
    )
    assert r1.status_code == 201

    r2 = client.post(
        BASE, json=body,
        headers={**sender_headers, "Idempotency-Key": key},
    )
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]


def test_idempotency_no_double_debit(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    """Un replay idempotent ne débite pas deux fois."""
    key = _key()
    body = _body(receiver_wallet_id, montant="100000.0000")

    h = {**sender_headers, "Idempotency-Key": key}
    client.post(BASE, json=body, headers=h)
    client.post(BASE, json=body, headers=h)

    db_for_api.refresh(sender_wallet)
    # Le montant initial est 500 000 ; un seul débit de 100 000
    assert sender_wallet.solde == Decimal("400000.0000")


def test_idempotency_conflict_different_montant(
    client, sender_headers, receiver_wallet_id
):
    """Même clé + montant différent → 400 (conflit d'idempotence)."""
    key = _key()
    r1 = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="100000.0000"),
        headers={**sender_headers, "Idempotency-Key": key},
    )
    assert r1.status_code == 201

    r2 = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="200000.0000"),
        headers={**sender_headers, "Idempotency-Key": key},
    )
    assert r2.status_code == 400


def test_idempotency_different_keys_different_transactions(
    client, sender_headers, receiver_wallet_id
):
    """Deux clés différentes → deux transactions distinctes."""
    r1 = client.post(
        BASE, json=_body(receiver_wallet_id, montant="50000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    r2 = client.post(
        BASE, json=_body(receiver_wallet_id, montant="50000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]


# ─── Atomicité / Rollback ─────────────────────────────────────

def test_atomicity_rollback_on_ledger_error(engine, monkeypatch):
    """
    Force une erreur après le flush de la Transaction (avant la création du
    ledger) via un SAVEPOINT explicite sur une session propre.

    Vérifie :
      - La Transaction est absente après rollback du SAVEPOINT.
      - Le solde du sender est inchangé.

    Note : on utilise engine (session-scoped) au lieu de db_for_api pour éviter
    que session.rollback() ne remonte au niveau de la connexion externe.
    Les données ne sont jamais committées : la session sort sans commit.
    """
    from decimal import Decimal
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from app.core.security import hash_password
    from app.models.transaction import Transaction
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.repositories.ledger_repository import LedgerRepository
    from app.repositories.wallet_repository import WalletRepository
    from app.services.transaction_service import TransactionService

    idem_key = "ATOMICITY-" + uuid.uuid4().hex[:12].upper()

    def _fail(self, debit, credit):
        raise RuntimeError("Erreur forcée — test d'atomicité")

    monkeypatch.setattr(LedgerRepository, "create_pair", _fail)

    with Session(engine) as sess:
        # ── Setup (dans la transaction externe, jamais committée) ──
        sender_u = User(
            email="atm.sender." + uuid.uuid4().hex[:6] + "@example.com",
            password_hash=hash_password("AtmPass1!"),
            first_name="Atm",
            last_name="Sender",
            role="USER",
            status="ACTIVE",
            is_email_verified=True,
        )
        sess.add(sender_u)
        sess.flush()

        sender_w = Wallet(
            user_id=sender_u.id,
            nif="ATMS" + sender_u.id.hex[:10].upper(),
            nom="Sender",
            prenom="Atm",
            devise="GNF",
            solde=Decimal("500000.0000"),
        )
        sess.add(sender_w)

        receiver_u = User(
            email="atm.recv." + uuid.uuid4().hex[:6] + "@example.com",
            password_hash=hash_password("AtmPass1!"),
            first_name="Atm",
            last_name="Receiver",
            role="USER",
            status="ACTIVE",
            is_email_verified=True,
        )
        sess.add(receiver_u)
        sess.flush()

        receiver_w = Wallet(
            user_id=receiver_u.id,
            nif="ATMR" + receiver_u.id.hex[:10].upper(),
            nom="Receiver",
            prenom="Atm",
            devise="GNF",
        )
        sess.add(receiver_w)
        sess.flush()

        sender_u_id = sender_u.id
        sender_w_id = sender_w.id
        receiver_w_id = receiver_w.id
        initial_solde = Decimal("500000.0000")

        # ── Transfert dans un SAVEPOINT explicite ──────────────────
        sp = sess.begin_nested()
        svc = TransactionService(sess)
        with pytest.raises(RuntimeError):
            svc.transfer(
                sender_user_id=sender_u_id,
                receiver_wallet_id=receiver_w_id,
                montant=Decimal("100000.0000"),
                devise="GNF",
                idempotency_key=idem_key,
            )
        # Rollback uniquement du SAVEPOINT
        sp.rollback()

        # ── Vérifications post-rollback du SAVEPOINT ───────────────
        sess.expire_all()

        # Wallet sender toujours là avec solde intact
        w_after = WalletRepository(sess).get_by_id(sender_w_id)
        assert w_after is not None, "wallet sender disparu — rollback trop large"
        assert w_after.solde == initial_solde, (
            f"Solde altéré : {w_after.solde} != {initial_solde}"
        )

        # Aucune Transaction persistée
        tx_check = sess.scalar(
            select(Transaction).where(
                Transaction.idempotency_key == idem_key
            )
        )
        assert tx_check is None, "Transaction persistée malgré le rollback"
        # (exit du with Session sans commit → rollback automatique)


# ─── Concurrence séquentielle (double-spend) ──────────────────

def test_sequential_double_spend(
    client, sender_headers, receiver_wallet_id, sender_wallet, db_for_api
):
    """
    Simule un double-spend séquentiel :
    Deux transferts qui épuiseraient le solde.
    Seul le premier doit réussir.
    """
    sender_wallet.solde = Decimal("100000.0000")
    db_for_api.flush()
    db_for_api.commit()

    r1 = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="100000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    r2 = client.post(
        BASE,
        json=_body(receiver_wallet_id, montant="100000.0000"),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )

    statuses = {r1.status_code, r2.status_code}
    assert 201 in statuses
    assert 409 in statuses

    db_for_api.refresh(sender_wallet)
    assert sender_wallet.solde >= Decimal("0.0000")


def test_no_money_created_after_multiple_transfers(
    client, sender_headers, sender_wallet, receiver_wallet,
    receiver_wallet_id, db_for_api,
):
    """Plusieurs transferts ne créent pas de monnaie."""
    total_before = sender_wallet.solde + receiver_wallet.solde

    for _ in range(3):
        client.post(
            BASE,
            json=_body(receiver_wallet_id, montant="10000.0000"),
            headers={**sender_headers, "Idempotency-Key": _key()},
        )

    db_for_api.refresh(sender_wallet)
    db_for_api.refresh(receiver_wallet)
    total_after = sender_wallet.solde + receiver_wallet.solde
    assert total_after == total_before


# ─── Sécurité ─────────────────────────────────────────────────

def test_security_extra_sender_wallet_ignored(
    client, sender_headers, sender_wallet, receiver_wallet_id
):
    """
    Un sender_wallet_id fourni dans le body est ignoré.
    Le backend détermine toujours l'expéditeur depuis current_user.
    """
    fake_wallet_id = uuid.uuid4()
    body = _body(receiver_wallet_id)
    body["sender_wallet_id"] = str(fake_wallet_id)

    resp = client.post(
        BASE, json=body,
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    # Pydantic ignore les champs extra → la requête aboutit normalement
    assert resp.status_code == 201
    # Le sender_wallet_id dans la réponse est celui du vrai sender
    data = resp.json()
    assert data["sender_wallet_id"] == str(sender_wallet.id)


def test_security_cannot_force_status(
    client, sender_headers, receiver_wallet_id
):
    """Le client ne peut pas imposer un statut."""
    body = _body(receiver_wallet_id)
    body["statut"] = "PENDING"

    resp = client.post(
        BASE, json=body,
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    assert resp.json()["statut"] == "COMPLETED"


def test_security_cannot_force_frais(
    client, sender_headers, receiver_wallet_id
):
    """Le client ne peut pas imposer les frais."""
    body = _body(receiver_wallet_id)
    body["frais"] = "999999"

    resp = client.post(
        BASE, json=body,
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    assert Decimal(str(resp.json()["frais"])) == Decimal("0.0000")


def test_security_response_has_no_sensitive_data(
    client, sender_headers, receiver_wallet_id
):
    """La réponse n'expose jamais de données sensibles."""
    resp = client.post(
        BASE, json=_body(receiver_wallet_id),
        headers={**sender_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 201
    data = resp.json()
    forbidden = {"password", "password_hash", "secret", "token", "jwt"}
    assert not forbidden.intersection(data.keys())


# ─── Concurrence réelle (threads + sessions séparées) ─────────
#
# Ces tests utilisent engine (session-scoped) avec des sessions
# PostgreSQL distinctes par thread, et committent réellement des
# données. Un fixture dédié assure le nettoyage en teardown.

@pytest.fixture()
def concurrent_wallets(engine):
    """
    Crée deux utilisateurs (sender 100 000 GNF + receiver 0 GNF)
    committés dans la DB pour être visibles depuis plusieurs threads.
    Nettoyage complet en teardown (ledger → transaction → wallet → user).
    """
    from decimal import Decimal
    from sqlalchemy import delete
    from sqlalchemy.orm import Session

    from app.core.security import hash_password
    from app.models.ledger import LedgerEntry
    from app.models.transaction import Transaction
    from app.models.user import User
    from app.models.wallet import Wallet

    suffix = uuid.uuid4().hex[:10]

    with Session(engine) as setup:
        with setup.begin():
            sender_u = User(
                email=f"ct.sender.{suffix}@example.com",
                password_hash=hash_password("TestPass1!"),
                first_name="CT",
                last_name="Sender",
                role="USER",
                status="ACTIVE",
                is_email_verified=True,
            )
            setup.add(sender_u)
            setup.flush()

            sender_w = Wallet(
                user_id=sender_u.id,
                nif="CTS" + sender_u.id.hex[:11].upper(),
                nom="Sender",
                prenom="CT",
                devise="GNF",
                solde=Decimal("100000.0000"),
            )
            setup.add(sender_w)

            receiver_u = User(
                email=f"ct.recv.{suffix}@example.com",
                password_hash=hash_password("TestPass1!"),
                first_name="CT",
                last_name="Receiver",
                role="USER",
                status="ACTIVE",
                is_email_verified=True,
            )
            setup.add(receiver_u)
            setup.flush()

            receiver_w = Wallet(
                user_id=receiver_u.id,
                nif="CTR" + receiver_u.id.hex[:11].upper(),
                nom="Receiver",
                prenom="CT",
                devise="GNF",
            )
            setup.add(receiver_w)
            setup.flush()

            sender_u_id = sender_u.id
            sender_w_id = sender_w.id
            receiver_u_id = receiver_u.id
            receiver_w_id = receiver_w.id

    ids = {
        "sender_user_id": sender_u_id,
        "sender_wallet_id": sender_w_id,
        "receiver_user_id": receiver_u_id,
        "receiver_wallet_id": receiver_w_id,
    }

    yield ids

    # ── Teardown (ordre FK : ledger → transaction → wallet → user) ──
    w_ids = [ids["sender_wallet_id"], ids["receiver_wallet_id"]]
    u_ids = [ids["sender_user_id"], ids["receiver_user_id"]]

    with Session(engine) as cleanup:
        with cleanup.begin():
            cleanup.execute(
                delete(LedgerEntry).where(
                    LedgerEntry.wallet_id.in_(w_ids)
                )
            )
            cleanup.execute(
                delete(Transaction).where(
                    (Transaction.sender_wallet_id.in_(w_ids))
                    | (Transaction.receiver_wallet_id.in_(w_ids))
                )
            )
            cleanup.execute(
                delete(Wallet).where(Wallet.id.in_(w_ids))
            )
            cleanup.execute(
                delete(User).where(User.id.in_(u_ids))
            )


def test_concurrent_same_idempotency_key(engine, concurrent_wallets):
    """
    Deux threads lancent simultanément le même transfert avec la même
    Idempotency-Key. Une seule transaction doit être créée.

    Scénario de race condition :
      Thread A ─ get_by_idempotency_key → None
      Thread B ─ get_by_idempotency_key → None   (avant commit de A)
      Thread A ─ SELECT FOR UPDATE → acquiert les locks
      Thread B ─ SELECT FOR UPDATE → bloque (attend A)
      Thread A ─ INSERT transaction + flush + commit
      Thread B ─ débloqué, tente INSERT → IntegrityError UNIQUE
      Thread B ─ catch IntegrityError → rollback → re-lit tx de A → la retourne

    Résultat : 1 seule transaction, 1 seul DEBIT.
    """
    import threading
    from sqlalchemy import func, select
    from sqlalchemy.orm import Session

    from app.models.ledger import LedgerEntry
    from app.services.transaction_service import TransactionService

    key = "CI-" + uuid.uuid4().hex[:16].upper()
    results: list[uuid.UUID] = []
    errors: list[Exception] = []
    barrier = threading.Barrier(2)

    def do_transfer():
        with Session(engine) as sess:
            barrier.wait()  # démarre les deux threads simultanément
            try:
                svc = TransactionService(sess)
                tx = svc.transfer(
                    sender_user_id=concurrent_wallets["sender_user_id"],
                    receiver_wallet_id=concurrent_wallets["receiver_wallet_id"],
                    montant=Decimal("10000.0000"),
                    devise="GNF",
                    idempotency_key=key,
                )
                sess.commit()
                results.append(tx.id)
            except Exception as exc:
                errors.append(exc)

    t1 = threading.Thread(target=do_transfer)
    t2 = threading.Thread(target=do_transfer)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert errors == [], f"Erreurs inattendues : {errors}"
    assert len(results) == 2, f"Attendu 2 résultats, obtenu {len(results)}"
    assert results[0] == results[1], (
        f"Deux transactions distinctes créées : {results[0]} vs {results[1]} "
        "— violation d'idempotence !"
    )

    # Un seul DEBIT sur le wallet expéditeur
    with Session(engine) as check:
        debit_count = check.scalar(
            select(func.count()).select_from(LedgerEntry).where(
                LedgerEntry.wallet_id == concurrent_wallets["sender_wallet_id"],
                LedgerEntry.type_mouvement == "DEBIT",
            )
        )
    assert debit_count == 1, (
        f"Attendu 1 DEBIT, trouvé {debit_count} — double débit détecté !"
    )


def test_concurrent_double_spend(engine, concurrent_wallets):
    """
    Deux threads tentent simultanément de dépenser le même wallet :
      A → B : 80 000 GNF  (clé 1)
      A → B : 80 000 GNF  (clé 2, transfert différent)

    Le wallet A = 100 000 GNF → une seule opération peut réussir.

    SELECT FOR UPDATE garantit l'isolation :
      Thread gagnant : balance check passe (100 000 >= 80 000) → commit
      Thread perdant : balance check échoue (20 000 < 80 000) → Insuffisant

    Résultat : solde sender >= 0, aucune création monétaire.
    """
    import threading
    from sqlalchemy.orm import Session

    from app.models.wallet import Wallet
    from app.services.transaction_service import (
        InsufficientFundsError,
        TransactionService,
    )

    success_count = 0
    failure_count = 0
    errors: list[Exception] = []
    lock = threading.Lock()
    barrier = threading.Barrier(2)

    def do_transfer(idem_key):
        nonlocal success_count, failure_count
        with Session(engine) as sess:
            barrier.wait()
            try:
                svc = TransactionService(sess)
                svc.transfer(
                    sender_user_id=concurrent_wallets["sender_user_id"],
                    receiver_wallet_id=concurrent_wallets["receiver_wallet_id"],
                    montant=Decimal("80000.0000"),
                    devise="GNF",
                    idempotency_key=idem_key,
                )
                sess.commit()
                with lock:
                    success_count += 1
            except InsufficientFundsError:
                with lock:
                    failure_count += 1
            except Exception as exc:
                with lock:
                    errors.append(exc)

    t1 = threading.Thread(target=do_transfer, args=(_key(),))
    t2 = threading.Thread(target=do_transfer, args=(_key(),))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert errors == [], f"Erreurs inattendues : {errors}"
    assert success_count == 1, (
        f"Attendu 1 succès, obtenu {success_count}"
    )
    assert failure_count == 1, (
        f"Attendu 1 échec InsufficientFunds, obtenu {failure_count}"
    )

    # Solde sender jamais négatif
    with Session(engine) as check:
        w = check.get(Wallet, concurrent_wallets["sender_wallet_id"])
    assert w.solde >= Decimal("0.0000"), (
        f"Solde négatif détecté : {w.solde}"
    )
