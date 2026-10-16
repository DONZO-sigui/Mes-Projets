"""
Tests POST /api/v1/auth/logout — Révocation du refresh token
GET  /api/v1/auth/me — Profil utilisateur connecté
"""

BASE = "/api/v1/auth"
_EMAIL = "test.user@example.com"
_PASS = "TestPassword1!"


def _login(client, email=_EMAIL, password=_PASS):
    resp = client.post(
        f"{BASE}/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200
    return resp.json()


# ─── Logout ───────────────────────────────────────────────────

def test_logout_returns_204(client, test_user):
    tokens = _login(client)
    resp = client.post(
        f"{BASE}/logout", json={"refresh_token": tokens["refresh_token"]}
    )
    assert resp.status_code == 204


def test_logout_revokes_refresh_token(client, test_user):
    tokens = _login(client)
    rt = tokens["refresh_token"]

    client.post(f"{BASE}/logout", json={"refresh_token": rt})

    resp = client.post(f"{BASE}/refresh", json={"refresh_token": rt})
    assert resp.status_code == 401


def test_logout_idempotent_with_already_revoked_token(client, test_user):
    """Logout avec un token déjà révoqué → 204 (pas d'erreur)."""
    tokens = _login(client)
    rt = tokens["refresh_token"]

    r1 = client.post(f"{BASE}/logout", json={"refresh_token": rt})
    r2 = client.post(f"{BASE}/logout", json={"refresh_token": rt})
    assert r1.status_code == 204
    assert r2.status_code == 204


def test_logout_with_garbage_token_is_silent(client):
    """Un token invalide au logout ne génère pas d'erreur (204)."""
    resp = client.post(
        f"{BASE}/logout", json={"refresh_token": "bad.token.here"}
    )
    assert resp.status_code == 204


def test_logout_does_not_invalidate_access_token(client, test_user):
    """
    Après logout, le access_token reste valide jusqu'à son expiration.
    (Pas de blacklist — comportement documenté.)
    """
    tokens = _login(client)
    at = tokens["access_token"]
    rt = tokens["refresh_token"]

    client.post(f"{BASE}/logout", json={"refresh_token": rt})

    resp = client.get(
        f"{BASE}/me", headers={"Authorization": f"Bearer {at}"}
    )
    assert resp.status_code == 200


# ─── GET /auth/me ─────────────────────────────────────────────

def test_me_returns_current_user(client, auth_headers):
    resp = client.get(f"{BASE}/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == _EMAIL
    assert data["role"] == "USER"
    assert "password_hash" not in data


def test_me_without_token_returns_401(client):
    resp = client.get(f"{BASE}/me")
    assert resp.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    resp = client.get(
        f"{BASE}/me",
        headers={"Authorization": "Bearer bad.token.value"},
    )
    assert resp.status_code == 401
