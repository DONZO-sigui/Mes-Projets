"""
Tests GET/POST/PATCH/DELETE /api/v1/beneficiaries — ÉTAPE 11

Couvre :
  - Création (OK, wallet inexistant, inactif, self-wallet, doublon)
  - Liste (uniquement du current_user)
  - Détail (IDOR-safe)
  - Modification (name, nickname, champs immuables)
  - Suppression (IDOR-safe, ne supprime pas wallet/transactions)
  - Authentification sur tous les endpoints
"""
import uuid
from decimal import Decimal

import pytest

BASE = "/api/v1/beneficiaries"


# ─── Fixtures ─────────────────────────────────────────────────

@pytest.fixture()
def user_a(db_for_api):
    """Utilisateur A avec wallet GNF crédité."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    u = User(
        email="benef.a@example.com",
        password_hash=hash_password("BenefA1Pass!"),
        first_name="Alpha",
        last_name="A",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(u)
    db_for_api.flush()

    w = Wallet(
        user_id=u.id,
        nif="BENEFA" + u.id.hex[:9].upper(),
        nom="A",
        prenom="Alpha",
        devise="GNF",
        solde=Decimal("100000.0000"),
    )
    db_for_api.add(w)
    db_for_api.flush()
    return u


@pytest.fixture()
def user_b(db_for_api):
    """Utilisateur B avec wallet GNF."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    u = User(
        email="benef.b@example.com",
        password_hash=hash_password("BenefB1Pass!"),
        first_name="Beta",
        last_name="B",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(u)
    db_for_api.flush()

    w = Wallet(
        user_id=u.id,
        nif="BENEFB" + u.id.hex[:9].upper(),
        nom="B",
        prenom="Beta",
        devise="GNF",
    )
    db_for_api.add(w)
    db_for_api.flush()
    return u


@pytest.fixture()
def wallet_b(db_for_api, user_b):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db_for_api).get_by_user_id(user_b.id)


@pytest.fixture()
def wallet_a(db_for_api, user_a):
    from app.repositories.wallet_repository import WalletRepository
    return WalletRepository(db_for_api).get_by_user_id(user_a.id)


@pytest.fixture()
def headers_a(client, user_a):
    resp = client.post("/api/v1/auth/login", json={
        "email": "benef.a@example.com",
        "password": "BenefA1Pass!",
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def headers_b(client, user_b):
    resp = client.post("/api/v1/auth/login", json={
        "email": "benef.b@example.com",
        "password": "BenefB1Pass!",
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _body(wallet_id, name="Mamadou", nickname=None):
    d = {"wallet_id": str(wallet_id), "name": name}
    if nickname is not None:
        d["nickname"] = nickname
    return d


# ─── Authentification ─────────────────────────────────────────

def test_list_unauthenticated(client):
    assert client.get(BASE).status_code == 401


def test_create_unauthenticated(client, wallet_b):
    resp = client.post(BASE, json=_body(wallet_b.id))
    assert resp.status_code == 401


def test_get_unauthenticated(client):
    resp = client.get(f"{BASE}/{uuid.uuid4()}")
    assert resp.status_code == 401


def test_patch_unauthenticated(client):
    resp = client.patch(f"{BASE}/{uuid.uuid4()}", json={"name": "X"})
    assert resp.status_code == 401


def test_delete_unauthenticated(client):
    resp = client.delete(f"{BASE}/{uuid.uuid4()}")
    assert resp.status_code == 401


# ─── Création — cas nominaux ──────────────────────────────────

def test_create_success(client, headers_a, wallet_b):
    resp = client.post(
        BASE, json=_body(wallet_b.id, name="Mamadou", nickname="Frère"),
        headers=headers_a,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Mamadou"
    assert data["nickname"] == "Frère"
    assert data["wallet_id"] == str(wallet_b.id)
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_without_nickname(client, headers_a, wallet_b):
    resp = client.post(BASE, json=_body(wallet_b.id), headers=headers_a)
    assert resp.status_code == 201
    assert resp.json()["nickname"] is None


def test_create_response_no_sensitive_fields(client, headers_a, wallet_b):
    """La réponse n'expose pas de données sensibles du wallet."""
    data = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    assert "solde" not in data
    assert "password" not in data
    assert "password_hash" not in data
    assert "user_id" not in data


def test_create_name_trimmed(client, headers_a, wallet_b):
    resp = client.post(
        BASE,
        json=_body(wallet_b.id, name="  Aissatou  "),
        headers=headers_a,
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Aissatou"


# ─── Création — erreurs métier ────────────────────────────────

def test_create_wallet_not_found(client, headers_a):
    resp = client.post(
        BASE,
        json=_body(uuid.uuid4(), name="Inconnu"),
        headers=headers_a,
    )
    assert resp.status_code == 404


def test_create_self_wallet(client, headers_a, wallet_a):
    """Un utilisateur ne peut pas s'enregistrer lui-même."""
    resp = client.post(
        BASE, json=_body(wallet_a.id), headers=headers_a
    )
    assert resp.status_code == 409
    assert "vous-même" in resp.json()["error"]["message"].lower() \
        or "bénéficiaire" in resp.json()["error"]["message"].lower()


def test_create_duplicate(client, headers_a, wallet_b):
    """Même wallet enregistré deux fois → 409."""
    client.post(BASE, json=_body(wallet_b.id), headers=headers_a)
    resp = client.post(BASE, json=_body(wallet_b.id), headers=headers_a)
    assert resp.status_code == 409


def test_create_wallet_inactive(client, headers_a, wallet_b, db_for_api):
    """Wallet suspendu → 409."""
    wallet_b.statut = "SUSPENDED"
    db_for_api.flush()
    db_for_api.commit()

    resp = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    )
    assert resp.status_code == 409


def test_create_invalid_wallet_uuid(client, headers_a):
    resp = client.post(
        BASE,
        json={"wallet_id": "not-a-uuid", "name": "X"},
        headers=headers_a,
    )
    assert resp.status_code == 422


def test_create_name_required(client, headers_a, wallet_b):
    resp = client.post(
        BASE,
        json={"wallet_id": str(wallet_b.id)},
        headers=headers_a,
    )
    assert resp.status_code == 422


def test_create_name_too_long(client, headers_a, wallet_b):
    resp = client.post(
        BASE,
        json=_body(wallet_b.id, name="X" * 101),
        headers=headers_a,
    )
    assert resp.status_code == 422


# ─── Liste ────────────────────────────────────────────────────

def test_list_empty(client, headers_a):
    resp = client.get(BASE, headers=headers_a)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_list_returns_own_only(client, headers_a, headers_b, wallet_b, wallet_a):
    """User A voit ses bénéficiaires, pas ceux de user B."""
    # A enregistre B
    client.post(BASE, json=_body(wallet_b.id), headers=headers_a)
    # B enregistre A
    client.post(BASE, json=_body(wallet_a.id), headers=headers_b)

    resp_a = client.get(BASE, headers=headers_a)
    assert resp_a.json()["total"] == 1
    assert resp_a.json()["items"][0]["wallet_id"] == str(wallet_b.id)

    resp_b = client.get(BASE, headers=headers_b)
    assert resp_b.json()["total"] == 1
    assert resp_b.json()["items"][0]["wallet_id"] == str(wallet_a.id)


def test_list_schema(client, headers_a, wallet_b):
    client.post(BASE, json=_body(wallet_b.id, name="Awa"), headers=headers_a)
    data = client.get(BASE, headers=headers_a).json()
    item = data["items"][0]
    assert "id" in item
    assert "wallet_id" in item
    assert "name" in item
    assert "nickname" in item
    assert "created_at" in item


# ─── Détail ───────────────────────────────────────────────────

def test_get_own_beneficiary(client, headers_a, wallet_b):
    created = client.post(
        BASE, json=_body(wallet_b.id, name="Kadiatou"), headers=headers_a
    ).json()
    resp = client.get(f"{BASE}/{created['id']}", headers=headers_a)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Kadiatou"


def test_get_other_user_beneficiary_returns_404(
    client, headers_a, headers_b, wallet_b, wallet_a
):
    """User B ne peut pas lire le bénéficiaire de user A (IDOR)."""
    created = client.post(
        BASE, json=_body(wallet_b.id, name="IDOR test"), headers=headers_a
    ).json()
    # User B tente d'accéder
    resp = client.get(f"{BASE}/{created['id']}", headers=headers_b)
    assert resp.status_code == 404


def test_get_nonexistent_returns_404(client, headers_a):
    resp = client.get(f"{BASE}/{uuid.uuid4()}", headers=headers_a)
    assert resp.status_code == 404


# ─── Modification ─────────────────────────────────────────────

def test_patch_name(client, headers_a, wallet_b):
    created = client.post(
        BASE, json=_body(wallet_b.id, name="Ancien"), headers=headers_a
    ).json()
    resp = client.patch(
        f"{BASE}/{created['id']}",
        json={"name": "Nouveau"},
        headers=headers_a,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Nouveau"
    assert resp.json()["wallet_id"] == str(wallet_b.id)  # immuable


def test_patch_nickname(client, headers_a, wallet_b):
    created = client.post(
        BASE, json=_body(wallet_b.id, nickname="Vieux"), headers=headers_a
    ).json()
    resp = client.patch(
        f"{BASE}/{created['id']}",
        json={"name": "X", "nickname": "Nouveau surnom"},
        headers=headers_a,
    )
    assert resp.status_code == 200
    assert resp.json()["nickname"] == "Nouveau surnom"


def test_patch_empty_body_rejected(client, headers_a, wallet_b):
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    resp = client.patch(
        f"{BASE}/{created['id']}", json={}, headers=headers_a
    )
    assert resp.status_code == 422


def test_patch_wallet_id_ignored(client, headers_a, wallet_b):
    """wallet_id dans le body PATCH est ignoré (masse-assignment protection)."""
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    fake_wallet = str(uuid.uuid4())
    resp = client.patch(
        f"{BASE}/{created['id']}",
        json={"name": "X", "wallet_id": fake_wallet},
        headers=headers_a,
    )
    assert resp.status_code == 200
    # wallet_id n'a pas changé
    assert resp.json()["wallet_id"] == str(wallet_b.id)


def test_patch_other_user_beneficiary_404(
    client, headers_a, headers_b, wallet_b
):
    """User B ne peut pas modifier le bénéficiaire de user A (IDOR)."""
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    resp = client.patch(
        f"{BASE}/{created['id']}",
        json={"name": "Hacked"},
        headers=headers_b,
    )
    assert resp.status_code == 404


# ─── Suppression ─────────────────────────────────────────────

def test_delete_own_beneficiary(client, headers_a, wallet_b):
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    resp = client.delete(f"{BASE}/{created['id']}", headers=headers_a)
    assert resp.status_code == 204

    # Plus disponible
    assert client.get(
        f"{BASE}/{created['id']}", headers=headers_a
    ).status_code == 404


def test_delete_does_not_remove_wallet(
    client, headers_a, wallet_b, db_for_api
):
    """Supprimer un bénéficiaire ne supprime pas le wallet."""
    from app.models.wallet import Wallet
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    client.delete(f"{BASE}/{created['id']}", headers=headers_a)

    db_for_api.expire_all()
    wallet_still_exists = db_for_api.get(Wallet, wallet_b.id)
    assert wallet_still_exists is not None


def test_delete_other_user_beneficiary_404(
    client, headers_a, headers_b, wallet_b
):
    """User B ne peut pas supprimer le bénéficiaire de user A (IDOR)."""
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    resp = client.delete(f"{BASE}/{created['id']}", headers=headers_b)
    assert resp.status_code == 404


def test_delete_nonexistent_404(client, headers_a):
    resp = client.delete(f"{BASE}/{uuid.uuid4()}", headers=headers_a)
    assert resp.status_code == 404


def test_delete_idempotent_second_call_404(client, headers_a, wallet_b):
    """Double suppression → 404 au second appel (pas d'erreur interne)."""
    created = client.post(
        BASE, json=_body(wallet_b.id), headers=headers_a
    ).json()
    client.delete(f"{BASE}/{created['id']}", headers=headers_a)
    resp = client.delete(f"{BASE}/{created['id']}", headers=headers_a)
    assert resp.status_code == 404


# ─── Intégration avec le transfert ───────────────────────────

def test_beneficiary_wallet_id_usable_in_transfer(
    client, headers_a, wallet_b
):
    """
    Le wallet_id d'un bénéficiaire peut être utilisé directement
    dans POST /transactions comme receiver_wallet_id.
    """
    benef = client.post(
        BASE, json=_body(wallet_b.id, name="Reciever"), headers=headers_a
    ).json()

    key = "BENEF-" + uuid.uuid4().hex[:13].upper()
    tx = client.post(
        "/api/v1/transactions",
        json={
            "receiver_wallet_id": benef["wallet_id"],
            "montant": "10000.0000",
            "devise": "GNF",
        },
        headers={**headers_a, "Idempotency-Key": key},
    )
    assert tx.status_code == 201
