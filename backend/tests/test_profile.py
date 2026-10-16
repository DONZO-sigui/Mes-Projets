"""
Tests profil utilisateur, changement de mot de passe et sessions — ÉTAPE 12

Couvre :
  - GET /users/me (profil, données, champs sensibles absents)
  - PATCH /users/me (mise à jour, body vide, mass-assignment)
  - POST /users/me/password (succès, mauvais MDP, politique, révocation sessions)
  - GET /users/me/sessions (liste, schéma, isolation IDOR)
  - DELETE /users/me/sessions (révocation globale, effet sur refresh token)
"""
import pytest
from decimal import Decimal

BASE = "/api/v1/users"
AUTH = "/api/v1/auth"

PASSWORD = "ProfileTest1!"
NEW_PASSWORD = "NewProfile2@"


# ─── Fixtures ─────────────────────────────────────────────────

@pytest.fixture()
def user(db_for_api):
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    u = User(
        email="profile@example.com",
        password_hash=hash_password(PASSWORD),
        first_name="Jean",
        last_name="Dupont",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(u)
    db_for_api.flush()

    w = Wallet(
        user_id=u.id,
        nif="PROF" + u.id.hex[:12].upper(),
        nom="Dupont",
        prenom="Jean",
        devise="GNF",
        solde=Decimal("50000"),
    )
    db_for_api.add(w)
    db_for_api.flush()
    return u


@pytest.fixture()
def user_b(db_for_api):
    from app.models.user import User
    from app.core.security import hash_password

    u = User(
        email="profile.b@example.com",
        password_hash=hash_password("BProfile1!"),
        first_name="Marie",
        last_name="Martin",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(u)
    db_for_api.flush()
    return u


@pytest.fixture()
def login_data(client, user):
    """Retourne le corps complet du login (access_token + refresh_token)."""
    resp = client.post(f"{AUTH}/login", json={
        "email": "profile@example.com",
        "password": PASSWORD,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture()
def headers(login_data):
    return {"Authorization": f"Bearer {login_data['access_token']}"}


@pytest.fixture()
def headers_b(client, user_b):
    resp = client.post(f"{AUTH}/login", json={
        "email": "profile.b@example.com",
        "password": "BProfile1!",
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ─── GET /users/me ────────────────────────────────────────────

def test_get_me_unauthenticated(client):
    assert client.get(f"{BASE}/me").status_code == 401


def test_get_me_returns_profile(client, headers, user):
    resp = client.get(f"{BASE}/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "profile@example.com"
    assert data["first_name"] == "Jean"
    assert data["last_name"] == "Dupont"
    assert data["role"] == "USER"
    assert data["status"] == "ACTIVE"
    assert "id" in data
    assert "created_at" in data


def test_get_me_no_sensitive_data(client, headers):
    data = client.get(f"{BASE}/me", headers=headers).json()
    assert "password_hash" not in data
    assert "password" not in data


# ─── PATCH /users/me ─────────────────────────────────────────

def test_patch_me_unauthenticated(client):
    assert client.patch(f"{BASE}/me", json={"first_name": "X"}).status_code == 401


def test_patch_me_update_first_name(client, headers):
    resp = client.patch(f"{BASE}/me", json={"first_name": "Mamadou"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Mamadou"
    assert resp.json()["last_name"] == "Dupont"  # inchangé


def test_patch_me_update_last_name(client, headers):
    resp = client.patch(f"{BASE}/me", json={"last_name": "Diallo"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["last_name"] == "Diallo"
    assert resp.json()["first_name"] == "Jean"  # inchangé


def test_patch_me_update_both(client, headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Alpha", "last_name": "Beta"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Alpha"
    assert resp.json()["last_name"] == "Beta"


def test_patch_me_empty_body(client, headers):
    resp = client.patch(f"{BASE}/me", json={}, headers=headers)
    assert resp.status_code == 422


def test_patch_me_role_not_changeable(client, headers):
    """role dans le body est ignoré — mass-assignment protection."""
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "X", "role": "ADMIN"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "USER"


def test_patch_me_response_no_sensitive_data(client, headers):
    resp = client.patch(f"{BASE}/me", json={"first_name": "X"}, headers=headers)
    assert "password_hash" not in resp.json()
    assert "password" not in resp.json()


# ─── POST /users/me/password ─────────────────────────────────

def test_change_password_unauthenticated(client):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": "x", "new_password": "NewPass1!"},
    )
    assert resp.status_code == 401


def test_change_password_success(client, headers):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 204


def test_change_password_wrong_current(client, headers):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": "WrongPass1!", "new_password": NEW_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 401
    assert "error" in resp.json()


def test_change_password_policy_too_short(client, headers):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": "Ab1"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_change_password_policy_no_uppercase(client, headers):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": "nouppercase123"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_change_password_policy_no_digit(client, headers):
    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": "NoDigitPassed"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_change_password_revokes_sessions(client, login_data):
    """Après changement de MDP, les anciens refresh tokens sont révoqués."""
    old_refresh = login_data["refresh_token"]
    old_access = login_data["access_token"]

    resp = client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {old_access}"},
    )
    assert resp.status_code == 204

    refresh_resp = client.post(
        f"{AUTH}/refresh",
        json={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 401


def test_change_password_can_login_with_new(client, login_data):
    """Après changement, la connexion avec le nouveau MDP fonctionne."""
    client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )
    resp = client.post(f"{AUTH}/login", json={
        "email": "profile@example.com",
        "password": NEW_PASSWORD,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_change_password_old_password_rejected_after_change(client, login_data):
    """Après changement, l'ancien MDP est rejeté à la connexion."""
    client.post(
        f"{BASE}/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )
    resp = client.post(f"{AUTH}/login", json={
        "email": "profile@example.com",
        "password": PASSWORD,
    })
    assert resp.status_code == 401


# ─── GET /users/me/sessions ──────────────────────────────────

def test_sessions_unauthenticated(client):
    assert client.get(f"{BASE}/me/sessions").status_code == 401


def test_sessions_after_login(client, headers, user):
    """Le login crée un refresh token — la liste doit avoir au moins 1 entrée."""
    resp = client.get(f"{BASE}/me/sessions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


def test_sessions_schema(client, headers, user):
    data = client.get(f"{BASE}/me/sessions", headers=headers).json()
    item = data["items"][0]
    assert "id" in item
    assert "created_at" in item
    assert "expires_at" in item
    assert "token_hash" not in item
    assert "jti" not in item
    assert "user_id" not in item


def test_sessions_isolation(client, headers, headers_b, user, user_b):
    """User A ne voit pas les sessions de user B."""
    ids_a = {i["id"] for i in client.get(f"{BASE}/me/sessions", headers=headers).json()["items"]}
    ids_b = {i["id"] for i in client.get(f"{BASE}/me/sessions", headers=headers_b).json()["items"]}
    assert ids_a.isdisjoint(ids_b)


# ─── DELETE /users/me/sessions ───────────────────────────────

def test_revoke_all_sessions_unauthenticated(client):
    assert client.delete(f"{BASE}/me/sessions").status_code == 401


def test_revoke_all_sessions(client, login_data):
    """Après révocation globale, le refresh token est invalide."""
    refresh_token = login_data["refresh_token"]
    access_token = login_data["access_token"]

    resp = client.delete(
        f"{BASE}/me/sessions",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 204

    refresh_resp = client.post(
        f"{AUTH}/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401


def test_revoke_all_sessions_clears_list(client, login_data):
    """Après révocation, la liste de sessions est vide."""
    access_token = login_data["access_token"]

    client.delete(
        f"{BASE}/me/sessions",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp = client.get(
        f"{BASE}/me/sessions",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_revoke_only_own_sessions(client, login_data, headers_b, user_b):
    """La révocation de A n'affecte pas les sessions de B."""
    access_token = login_data["access_token"]

    client.delete(
        f"{BASE}/me/sessions",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp_b = client.get(f"{BASE}/me/sessions", headers=headers_b)
    assert resp_b.json()["total"] >= 1
