"""
Tests RBAC et autorisation — get_current_user / require_role
"""

BASE = "/api/v1/auth"


# ─── get_current_user ─────────────────────────────────────────

def test_protected_route_without_token(client):
    resp = client.get(f"{BASE}/me")
    assert resp.status_code == 401
    assert "WWW-Authenticate" in resp.headers


def test_protected_route_with_valid_token(client, auth_headers):
    resp = client.get(f"{BASE}/me", headers=auth_headers)
    assert resp.status_code == 200


def test_protected_route_with_expired_token(client, test_user):
    """Simule un token expiré avec une clé invalide."""
    resp = client.get(
        f"{BASE}/me",
        headers={
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.e30.invalid"
        },
    )
    assert resp.status_code == 401


def test_protected_route_with_refresh_token_rejected(client, test_user):
    """Le refresh token ne doit pas donner accès aux routes protégées."""
    login_resp = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "TestPassword1!",
    })
    rt = login_resp.json()["refresh_token"]

    resp = client.get(
        f"{BASE}/me", headers={"Authorization": f"Bearer {rt}"}
    )
    assert resp.status_code == 401


def test_suspended_user_cannot_access_protected_route(
    client, suspended_user
):
    """Utilisateur suspendu — token valide mais accès refusé (403)."""
    from app.core.security import create_access_token
    at = create_access_token(suspended_user.id, suspended_user.role)

    resp = client.get(
        f"{BASE}/me", headers={"Authorization": f"Bearer {at}"}
    )
    assert resp.status_code == 403


# ─── Rôle USER ───────────────────────────────────────────────

def test_user_role_confirmed_in_me(client, auth_headers):
    resp = client.get(f"{BASE}/me", headers=auth_headers)
    assert resp.json()["role"] == "USER"


# ─── Rôle ADMIN ──────────────────────────────────────────────

def test_admin_role_confirmed_in_me(client, admin_headers):
    resp = client.get(f"{BASE}/me", headers=admin_headers)
    assert resp.json()["role"] == "ADMIN"


# ─── Schéma UserResponse ─────────────────────────────────────

def test_me_response_schema(client, auth_headers):
    """Vérifie que tous les champs obligatoires sont présents."""
    data = client.get(f"{BASE}/me", headers=auth_headers).json()
    required_fields = {
        "id", "email", "first_name", "last_name",
        "role", "status", "is_email_verified", "created_at",
    }
    assert required_fields.issubset(data.keys())
    assert "password_hash" not in data
    assert "password" not in data
