"""
Tests GET /api/v1/transactions/me — historique paginé + filtres + tri

Couvre :
  - Authentification obligatoire
  - Liste vide pour un nouvel utilisateur
  - Transactions envoyées et reçues visibles
  - Champs requis dans la réponse
  - IDOR : chaque utilisateur ne voit que ses propres transactions
  - Pagination (page, limit, bords)
  - Filtres (statut, devise, reference)
  - Tri (sort_by, sort_dir) — whitelist uniquement
  - Paramètres invalides → 422
"""
import uuid
from decimal import Decimal

import pytest

ME = "/api/v1/transactions/me"
TXN = "/api/v1/transactions"


# ─── Helpers ──────────────────────────────────────────────────

def _key():
    return "HIST-" + uuid.uuid4().hex[:16].upper()


def _send(client, headers, receiver_wallet_id, montant="10000.0000"):
    return client.post(
        TXN,
        json={
            "receiver_wallet_id": str(receiver_wallet_id),
            "montant": montant,
            "devise": "GNF",
        },
        headers={**headers, "Idempotency-Key": _key()},
    )


# ─── Fixtures ─────────────────────────────────────────────────

@pytest.fixture()
def alice(db_for_api):
    """Expéditeur avec 500 000 GNF."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="alice.hist@example.com",
        password_hash=hash_password("AlicePass1!"),
        first_name="Alice",
        last_name="Hist",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()
    wallet = Wallet(
        user_id=user.id,
        nif="ALI" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
        solde=Decimal("500000.0000"),
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


@pytest.fixture()
def bob(db_for_api):
    """Destinataire avec 0 GNF."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="bob.hist@example.com",
        password_hash=hash_password("BobPass1!"),
        first_name="Bob",
        last_name="Hist",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()
    wallet = Wallet(
        user_id=user.id,
        nif="BOB" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


@pytest.fixture()
def carol(db_for_api):
    """Tiers sans aucune transaction."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="carol.hist@example.com",
        password_hash=hash_password("CarolPass1!"),
        first_name="Carol",
        last_name="Hist",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()
    wallet = Wallet(
        user_id=user.id,
        nif="CAR" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


def _login(client, email, password):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def alice_h(client, alice):
    return _login(client, "alice.hist@example.com", "AlicePass1!")


@pytest.fixture()
def bob_h(client, bob):
    return _login(client, "bob.hist@example.com", "BobPass1!")


@pytest.fixture()
def carol_h(client, carol):
    return _login(client, "carol.hist@example.com", "CarolPass1!")


@pytest.fixture()
def bob_wallet(db_for_api, bob):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db_for_api).get_by_user_id(bob.id)


# ─── Authentification ─────────────────────────────────────────

def test_history_requires_auth(client):
    resp = client.get(ME)
    assert resp.status_code == 401


# ─── Liste basique ────────────────────────────────────────────

def test_history_empty_for_new_user(client, alice_h, alice):
    resp = client.get(ME, headers=alice_h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["limit"] == 20


def test_history_shows_sent_transactions(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)
    _send(client, alice_h, bob_wallet.id)

    resp = client.get(ME, headers=alice_h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_history_shows_received_transactions(
    client, alice_h, alice, bob, bob_wallet, bob_h
):
    _send(client, alice_h, bob_wallet.id)

    resp = client.get(ME, headers=bob_h)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_history_response_fields(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)

    resp = client.get(ME, headers=alice_h)
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    required = {
        "id", "reference", "montant", "frais", "montant_total",
        "devise", "statut", "created_at",
    }
    assert required.issubset(item.keys())
    assert "password" not in item
    assert "password_hash" not in item


# ─── IDOR — isolation stricte ─────────────────────────────────

def test_history_idor_carol_sees_zero_transactions(
    client, alice_h, alice, bob, bob_wallet, carol_h, carol
):
    """Carol n'est pas impliquée → son historique est vide."""
    _send(client, alice_h, bob_wallet.id)

    carol_resp = client.get(ME, headers=carol_h)
    assert carol_resp.json()["total"] == 0


def test_history_idor_alice_and_bob_see_same_tx(
    client, alice_h, alice, bob, bob_wallet, bob_h
):
    """Alice (sender) et Bob (receiver) voient tous les deux la transaction."""
    r = _send(client, alice_h, bob_wallet.id)
    tx_id = r.json()["id"]

    alice_ids = [x["id"] for x in client.get(ME, headers=alice_h).json()["items"]]
    bob_ids = [x["id"] for x in client.get(ME, headers=bob_h).json()["items"]]

    assert tx_id in alice_ids
    assert tx_id in bob_ids


# ─── Pagination ───────────────────────────────────────────────

def test_history_pagination_basic(
    client, alice_h, alice, bob, bob_wallet
):
    for _ in range(5):
        _send(client, alice_h, bob_wallet.id)

    r1 = client.get(
        ME, params={"page": 1, "limit": 2}, headers=alice_h
    )
    assert r1.status_code == 200
    assert len(r1.json()["items"]) == 2
    assert r1.json()["total"] == 5
    assert r1.json()["page"] == 1
    assert r1.json()["limit"] == 2

    r2 = client.get(
        ME, params={"page": 2, "limit": 2}, headers=alice_h
    )
    assert len(r2.json()["items"]) == 2

    r3 = client.get(
        ME, params={"page": 3, "limit": 2}, headers=alice_h
    )
    assert len(r3.json()["items"]) == 1


def test_history_page_beyond_total_is_empty(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)
    resp = client.get(
        ME, params={"page": 999, "limit": 20}, headers=alice_h
    )
    assert resp.status_code == 200
    assert resp.json()["items"] == []


def test_history_limit_above_100_rejected(client, alice_h, alice):
    resp = client.get(ME, params={"limit": 101}, headers=alice_h)
    assert resp.status_code == 422


def test_history_limit_zero_rejected(client, alice_h, alice):
    resp = client.get(ME, params={"limit": 0}, headers=alice_h)
    assert resp.status_code == 422


def test_history_page_zero_rejected(client, alice_h, alice):
    resp = client.get(ME, params={"page": 0}, headers=alice_h)
    assert resp.status_code == 422


# ─── Filtres ──────────────────────────────────────────────────

def test_history_filter_statut_completed(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)

    resp = client.get(
        ME, params={"statut": "COMPLETED"}, headers=alice_h
    )
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
    for item in resp.json()["items"]:
        assert item["statut"] == "COMPLETED"


def test_history_filter_invalid_statut_rejected(client, alice_h, alice):
    resp = client.get(
        ME, params={"statut": "NOPE"}, headers=alice_h
    )
    assert resp.status_code == 422


def test_history_filter_devise_gnf(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)

    resp = client.get(
        ME, params={"devise": "GNF"}, headers=alice_h
    )
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
    for item in resp.json()["items"]:
        assert item["devise"] == "GNF"


def test_history_filter_invalid_devise_rejected(client, alice_h, alice):
    resp = client.get(
        ME, params={"devise": "XYZ"}, headers=alice_h
    )
    assert resp.status_code == 422


def test_history_filter_by_reference(
    client, alice_h, alice, bob, bob_wallet
):
    r1 = _send(client, alice_h, bob_wallet.id)
    ref = r1.json()["reference"]
    _send(client, alice_h, bob_wallet.id)  # deuxième tx

    resp = client.get(ME, params={"reference": ref}, headers=alice_h)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["reference"] == ref


def test_history_filter_unknown_reference_empty(
    client, alice_h, alice
):
    resp = client.get(
        ME, params={"reference": "TXN-UNKNOWN000000"}, headers=alice_h
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


# ─── Tri contrôlé ─────────────────────────────────────────────

def test_history_sort_by_montant_asc(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id, montant="50000.0000")
    _send(client, alice_h, bob_wallet.id, montant="1000.0000")

    resp = client.get(
        ME,
        params={"sort_by": "montant", "sort_dir": "asc"},
        headers=alice_h,
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert Decimal(str(items[0]["montant"])) <= Decimal(
        str(items[1]["montant"])
    )


def test_history_sort_by_montant_desc(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id, montant="1000.0000")
    _send(client, alice_h, bob_wallet.id, montant="50000.0000")

    resp = client.get(
        ME,
        params={"sort_by": "montant", "sort_dir": "desc"},
        headers=alice_h,
    )
    items = resp.json()["items"]
    assert Decimal(str(items[0]["montant"])) >= Decimal(
        str(items[1]["montant"])
    )


def test_history_sort_invalid_field_rejected(client, alice_h, alice):
    resp = client.get(
        ME, params={"sort_by": "password"}, headers=alice_h
    )
    assert resp.status_code == 422


def test_history_sort_invalid_dir_rejected(client, alice_h, alice):
    resp = client.get(
        ME, params={"sort_dir": "random"}, headers=alice_h
    )
    assert resp.status_code == 422


def test_history_sort_by_statut(
    client, alice_h, alice, bob, bob_wallet
):
    _send(client, alice_h, bob_wallet.id)
    resp = client.get(
        ME,
        params={"sort_by": "statut", "sort_dir": "asc"},
        headers=alice_h,
    )
    assert resp.status_code == 200
