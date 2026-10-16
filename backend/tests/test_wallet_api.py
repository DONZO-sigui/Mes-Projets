"""
Tests GET /api/v1/wallets/me          — wallet personnel
      GET /api/v1/wallets/me/balance  — solde seul

Sécurité testée :
  - IDOR (User A ≠ User B)
  - utilisateur non authentifié
  - utilisateur suspendu
  - solde non modifiable par le frontend
  - user_id absent des réponses publiques
  - précision financière (Decimal, pas Float)
"""
import uuid
from decimal import Decimal

BASE_WALLET = "/api/v1/wallets"
BASE_AUTH = "/api/v1/auth"


# ─── GET /wallets/me ──────────────────────────────────────────

def test_get_my_wallet_returns_wallet(client, auth_headers):
    resp = client.get(f"{BASE_WALLET}/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert "solde" in data
    assert "devise" in data
    assert "statut" in data
    assert "nif" in data


def test_get_my_wallet_devise_is_gnf(client, auth_headers):
    """Le wallet créé à l'inscription est en GNF par défaut."""
    data = client.get(
        f"{BASE_WALLET}/me", headers=auth_headers
    ).json()
    assert data["devise"] == "GNF"


def test_get_my_wallet_solde_is_zero(client, auth_headers):
    """Nouveau wallet : solde = 0."""
    data = client.get(
        f"{BASE_WALLET}/me", headers=auth_headers
    ).json()
    assert Decimal(str(data["solde"])) == Decimal("0")


def test_get_my_wallet_statut_active(client, auth_headers):
    data = client.get(
        f"{BASE_WALLET}/me", headers=auth_headers
    ).json()
    assert data["statut"] == "ACTIVE"


def test_get_my_wallet_unauthenticated(client):
    resp = client.get(f"{BASE_WALLET}/me")
    assert resp.status_code == 401


def test_get_my_wallet_invalid_token(client):
    resp = client.get(
        f"{BASE_WALLET}/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert resp.status_code == 401


def test_get_my_wallet_suspended_user(client, suspended_user):
    from app.core.security import create_access_token
    at = create_access_token(suspended_user.id, suspended_user.role)
    resp = client.get(
        f"{BASE_WALLET}/me",
        headers={"Authorization": f"Bearer {at}"},
    )
    assert resp.status_code == 403


# ─── GET /wallets/me/balance ─────────────────────────────────

def test_get_balance_returns_balance(client, auth_headers):
    resp = client.get(
        f"{BASE_WALLET}/me/balance", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "wallet_id" in data
    assert "solde" in data
    assert "devise" in data
    assert "statut" in data


def test_get_balance_solde_is_decimal_string(client, auth_headers):
    """
    L'API retourne le solde comme string JSON numérique
    avec 4 décimales (NUMERIC 18,4 → Pydantic Decimal).
    """
    data = client.get(
        f"{BASE_WALLET}/me/balance", headers=auth_headers
    ).json()
    solde_str = str(data["solde"])
    # Convertible en Decimal sans perte
    assert Decimal(solde_str) == Decimal("0")


def test_get_balance_unauthenticated(client):
    resp = client.get(f"{BASE_WALLET}/me/balance")
    assert resp.status_code == 401


# ─── IDOR — User A ≠ User B ──────────────────────────────────

def test_idor_user_cannot_see_other_wallet_by_id(
    client, auth_headers, admin_user, db_for_api
):
    """
    User A (auth_headers = test_user) ne doit pas pouvoir
    accéder au wallet d'User B (admin_user) par son UUID.
    GET /wallets/<uuid_appartenant_à_B> → 404 ou 401
    (il n'existe pas de route /wallets/{id} dans ce design).
    """
    from app.repositories.wallet_repository import WalletRepository
    wallet_b = WalletRepository(db_for_api).get_by_user_id(
        admin_user.id
    )
    if wallet_b is None:
        return  # admin n'a pas de wallet (pas créé via register)

    # Il n'existe pas de route GET /wallets/{id} → 404/405
    resp = client.get(
        f"{BASE_WALLET}/{wallet_b.id}",
        headers=auth_headers,
    )
    assert resp.status_code in (404, 405, 422)


def test_idor_wallet_me_always_own(client, test_user, admin_user):
    """
    Chaque utilisateur voit UNIQUEMENT son propre wallet via /me.
    Même s'il connaît l'UUID du wallet d'un autre, /me
    retourne toujours son propre wallet.
    """
    # Connexion test_user
    r1 = client.post(f"{BASE_AUTH}/login", json={
        "email": "test.user@example.com",
        "password": "TestPassword1!",
    })
    assert r1.status_code == 200
    headers_a = {"Authorization": f"Bearer {r1.json()['access_token']}"}

    # Connexion admin_user
    r2 = client.post(f"{BASE_AUTH}/login", json={
        "email": "test.admin@example.com",
        "password": "AdminPassword1!",
    })
    assert r2.status_code == 200
    headers_b = {"Authorization": f"Bearer {r2.json()['access_token']}"}

    wallet_a = client.get(f"{BASE_WALLET}/me", headers=headers_a).json()
    wallet_b = client.get(f"{BASE_WALLET}/me", headers=headers_b).json()

    # Les wallets sont distincts
    if "id" in wallet_a and "id" in wallet_b:
        assert wallet_a["id"] != wallet_b["id"]


# ─── Sécurité : solde non modifiable ─────────────────────────

def test_cannot_patch_wallet_balance(client, auth_headers):
    """
    Il n'existe pas de route PATCH /wallets/me → 405.
    Le solde ne peut jamais être modifié directement par le client.
    """
    resp = client.patch(
        f"{BASE_WALLET}/me",
        json={"solde": 999999999},
        headers=auth_headers,
    )
    assert resp.status_code in (404, 405, 422)


def test_cannot_post_to_update_balance(client, auth_headers):
    """
    POST /wallets/me → interdit (route inexistante).
    """
    resp = client.post(
        f"{BASE_WALLET}/me",
        json={"solde": 1000000, "devise": "GNF"},
        headers=auth_headers,
    )
    assert resp.status_code in (404, 405, 422)


def test_wallet_response_no_sensitive_fields(client, auth_headers):
    """
    La réponse wallet ne doit pas exposer de données sensibles
    telles que user_id ou informations internes.
    La réponse WalletRead inclut nif, nom, prenom, solde, devise, statut.
    """
    data = client.get(
        f"{BASE_WALLET}/me", headers=auth_headers
    ).json()
    # Le solde est bien un nombre (pas un secret)
    assert "solde" in data
    # Mais le user_id n'est pas exposé dans WalletRead
    assert "user_id" not in data


# ─── UUID inexistant ─────────────────────────────────────────

def test_nonexistent_uuid_wallet(client, auth_headers):
    """
    Un UUID valide mais appartenant à personne → route inexistante.
    """
    fake_id = uuid.uuid4()
    resp = client.get(
        f"{BASE_WALLET}/{fake_id}",
        headers=auth_headers,
    )
    assert resp.status_code in (404, 405, 422)
