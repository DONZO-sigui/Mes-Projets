"""
Tests GET /api/v1/users/me    — consultation profil
      PATCH /api/v1/users/me  — mise à jour partielle profil

Sécurité testée :
  - mass assignment (role, status, is_email_verified bloqués)
  - token absent / invalide → 401
  - utilisateur suspendu → 403
  - password_hash jamais dans la réponse
"""

BASE = "/api/v1/users"


# ─── GET /users/me ────────────────────────────────────────────

def test_get_profile_returns_user(client, auth_headers):
    resp = client.get(f"{BASE}/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test.user@example.com"
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert data["role"] == "USER"
    assert data["status"] == "ACTIVE"


def test_get_profile_excludes_password(client, auth_headers):
    data = client.get(f"{BASE}/me", headers=auth_headers).json()
    assert "password" not in data
    assert "password_hash" not in data


def test_get_profile_schema(client, auth_headers):
    """Vérifie les champs obligatoires du schéma UserResponse."""
    data = client.get(f"{BASE}/me", headers=auth_headers).json()
    required = {
        "id", "email", "first_name", "last_name",
        "role", "status", "is_email_verified", "created_at",
    }
    assert required.issubset(data.keys())


def test_get_profile_unauthenticated(client):
    resp = client.get(f"{BASE}/me")
    assert resp.status_code == 401


def test_get_profile_invalid_token(client):
    resp = client.get(
        f"{BASE}/me",
        headers={"Authorization": "Bearer bad.token"},
    )
    assert resp.status_code == 401


def test_get_profile_suspended_user(client, suspended_user):
    from app.core.security import create_access_token
    at = create_access_token(suspended_user.id, suspended_user.role)
    resp = client.get(
        f"{BASE}/me",
        headers={"Authorization": f"Bearer {at}"},
    )
    assert resp.status_code == 403


# ─── PATCH /users/me ─────────────────────────────────────────

def test_patch_profile_first_name(client, auth_headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Moussa"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Moussa"
    assert resp.json()["last_name"] == "User"  # inchangé


def test_patch_profile_last_name(client, auth_headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"last_name": "Diallo"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["last_name"] == "Diallo"


def test_patch_profile_both_fields(client, auth_headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Mamadou", "last_name": "Bah"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Mamadou"
    assert resp.json()["last_name"] == "Bah"


def test_patch_profile_empty_body_rejected(client, auth_headers):
    """Corps vide (aucun champ) → 422."""
    resp = client.patch(
        f"{BASE}/me", json={}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_patch_profile_unauthenticated(client):
    resp = client.patch(f"{BASE}/me", json={"first_name": "X"})
    assert resp.status_code == 401


# ─── Sécurité : mass-assignment bloqué ───────────────────────

def test_patch_profile_role_ignored(client, auth_headers):
    """Le champ 'role' n'est PAS dans UserUpdate → Pydantic l'ignore."""
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Test", "role": "ADMIN"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "USER"  # inchangé


def test_patch_profile_status_ignored(client, auth_headers):
    """Le champ 'status' n'est PAS dans UserUpdate → ignoré."""
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Test", "status": "DISABLED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACTIVE"  # inchangé


def test_patch_profile_password_hash_not_in_response(
    client, auth_headers
):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "Safe"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "password_hash" not in resp.json()
    assert "password" not in resp.json()


def test_patch_profile_first_name_too_short(client, auth_headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_patch_profile_first_name_too_long(client, auth_headers):
    resp = client.patch(
        f"{BASE}/me",
        json={"first_name": "X" * 101},
        headers=auth_headers,
    )
    assert resp.status_code == 422
