"""
Tests GET /api/v1/transactions/{transaction_id} — ÉTAPE 14

Couvre :
  - Auth (401)
  - IDOR : sender peut consulter, receiver peut consulter, tiers → 404
  - Schéma complet : reference, montant, frais, total, devise, statut, dates
  - Champs sender/receiver (nom, prenom) présents
  - Absence de données sensibles (password_hash, tokens, solde, NIF)
  - UUID inconnu → 404
  - Non-régression des autres endpoints
"""
import uuid
from decimal import Decimal

import pytest

BASE = "/api/v1/transactions"


# ─── Fixtures ─────────────────────────────────────────────────

def _make_user(db, email, balance="100000"):
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    u = User(
        email=email,
        password_hash=hash_password("Detail1Pass!"),
        first_name="Détail",
        last_name="Test",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db.add(u)
    db.flush()

    w = Wallet(
        user_id=u.id,
        nif="DTL" + u.id.hex[:12].upper(),
        nom="Test",
        prenom="Détail",
        devise="GNF",
        solde=Decimal(balance),
    )
    db.add(w)
    db.flush()
    return u


def _login(client, email):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Detail1Pass!"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _do_transfer(client, sender_headers, receiver_wallet_id, montant="5000"):
    r = client.post(
        BASE,
        json={
            "receiver_wallet_id": str(receiver_wallet_id),
            "montant": montant,
            "devise": "GNF",
            "motif": "Test détail",
        },
        headers={**sender_headers, "Idempotency-Key": str(uuid.uuid4())},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _get_wallet_id(db, user_id):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db).get_by_user_id(user_id).id


@pytest.fixture()
def sender(db_for_api):
    return _make_user(db_for_api, "sender.detail@example.com", balance="50000")


@pytest.fixture()
def receiver(db_for_api):
    return _make_user(db_for_api, "receiver.detail@example.com")


@pytest.fixture()
def third_party(db_for_api):
    return _make_user(db_for_api, "third.detail@example.com")


@pytest.fixture()
def sender_headers(client, sender):
    return _login(client, "sender.detail@example.com")


@pytest.fixture()
def receiver_headers(client, receiver):
    return _login(client, "receiver.detail@example.com")


@pytest.fixture()
def third_headers(client, third_party):
    return _login(client, "third.detail@example.com")


@pytest.fixture()
def tx_id(client, db_for_api, sender, receiver, sender_headers):
    receiver_wallet_id = _get_wallet_id(db_for_api, receiver.id)
    data = _do_transfer(client, sender_headers, receiver_wallet_id)
    return data["id"]


# ─── Auth ─────────────────────────────────────────────────────

class TestAuth:
    def test_no_token_returns_401(self, client, tx_id):
        assert client.get(f"{BASE}/{tx_id}").status_code == 401

    def test_unknown_id_no_token_returns_401(self, client):
        assert client.get(f"{BASE}/{uuid.uuid4()}").status_code == 401


# ─── IDOR ─────────────────────────────────────────────────────

class TestIDOR:
    def test_sender_can_access_own_transaction(
        self, client, tx_id, sender_headers
    ):
        r = client.get(f"{BASE}/{tx_id}", headers=sender_headers)
        assert r.status_code == 200

    def test_receiver_can_access_transaction(
        self, client, tx_id, receiver_headers
    ):
        r = client.get(f"{BASE}/{tx_id}", headers=receiver_headers)
        assert r.status_code == 200

    def test_third_party_gets_404(
        self, client, tx_id, third_headers
    ):
        r = client.get(f"{BASE}/{tx_id}", headers=third_headers)
        assert r.status_code == 404

    def test_unknown_transaction_id_returns_404(
        self, client, sender_headers
    ):
        r = client.get(f"{BASE}/{uuid.uuid4()}", headers=sender_headers)
        assert r.status_code == 404

    def test_404_does_not_leak_transaction_info(
        self, client, tx_id, third_headers
    ):
        r = client.get(f"{BASE}/{tx_id}", headers=third_headers)
        body = r.text.lower()
        assert "montant" not in body
        assert "reference" not in body


# ─── Schéma ───────────────────────────────────────────────────

class TestSchema:
    def test_response_has_required_fields(
        self, client, tx_id, sender_headers
    ):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        for field in (
            "id", "reference", "montant", "frais", "montant_total",
            "devise", "statut", "motif", "created_at", "confirmed_at",
            "updated_at", "sender", "receiver",
        ):
            assert field in data, f"Champ manquant : {field}"

    def test_sender_receiver_have_nom_prenom(
        self, client, tx_id, sender_headers
    ):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert "nom" in data["sender"]
        assert "prenom" in data["sender"]
        assert "nom" in data["receiver"]
        assert "prenom" in data["receiver"]

    def test_montant_correct(
        self, client, db_for_api, sender, receiver, sender_headers
    ):
        receiver_wallet_id = _get_wallet_id(db_for_api, receiver.id)
        data = _do_transfer(client, sender_headers, receiver_wallet_id, "12345")
        detail = client.get(f"{BASE}/{data['id']}", headers=sender_headers).json()
        assert Decimal(detail["montant"]) == Decimal("12345")

    def test_frais_is_zero(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert Decimal(data["frais"]) == Decimal("0")

    def test_montant_total_equals_montant_plus_frais(
        self, client, tx_id, sender_headers
    ):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert Decimal(data["montant_total"]) == (
            Decimal(data["montant"]) + Decimal(data["frais"])
        )

    def test_devise_is_gnf(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert data["devise"] == "GNF"

    def test_statut_is_completed(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert data["statut"] == "COMPLETED"

    def test_motif_is_present(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert data["motif"] == "Test détail"

    def test_reference_format(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert data["reference"].startswith("TXN-")

    def test_id_matches_requested(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert data["id"] == tx_id


# ─── Sécurité — aucune donnée sensible ───────────────────────

class TestNoSensitiveData:
    def test_no_password_hash(self, client, tx_id, sender_headers):
        r = client.get(f"{BASE}/{tx_id}", headers=sender_headers)
        assert "password_hash" not in r.text
        assert "password" not in r.text

    def test_no_solde(self, client, tx_id, sender_headers):
        r = client.get(f"{BASE}/{tx_id}", headers=sender_headers)
        data = r.json()
        assert "solde" not in data
        assert "solde" not in str(data.get("sender", {}))
        assert "solde" not in str(data.get("receiver", {}))

    def test_no_nif(self, client, tx_id, sender_headers):
        r = client.get(f"{BASE}/{tx_id}", headers=sender_headers)
        data = r.json()
        assert "nif" not in data.get("sender", {})
        assert "nif" not in data.get("receiver", {})

    def test_no_idempotency_key_exposed(self, client, tx_id, sender_headers):
        data = client.get(f"{BASE}/{tx_id}", headers=sender_headers).json()
        assert "idempotency_key" not in data

    def test_no_tokens(self, client, tx_id, sender_headers):
        r = client.get(f"{BASE}/{tx_id}", headers=sender_headers)
        assert "access_token" not in r.text
        assert "refresh_token" not in r.text
