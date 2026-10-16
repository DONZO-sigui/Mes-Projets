"""
Tests POST /api/v1/auth/refresh — Rotation du refresh token
"""

BASE = "/api/v1/auth"

_EMAIL = "test.user@example.com"
_PASS = "TestPassword1!"


def _get_tokens(client, email=_EMAIL, password=_PASS):
    resp = client.post(
        f"{BASE}/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200
    return resp.json()


# ─── Cas nominaux ─────────────────────────────────────────────

def test_refresh_returns_new_tokens(client, test_user):
    tokens = _get_tokens(client)
    resp = client.post(f"{BASE}/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    new_data = resp.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["access_token"] != tokens["access_token"]
    assert new_data["refresh_token"] != tokens["refresh_token"]


def test_refresh_returns_user_info(client, test_user):
    tokens = _get_tokens(client)
    resp = client.post(f"{BASE}/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == _EMAIL
    assert "password_hash" not in resp.json()["user"]


# ─── Rotation (ancien token révoqué) ─────────────────────────

def test_refresh_old_token_rejected_after_rotation(client, test_user):
    tokens = _get_tokens(client)
    old_rt = tokens["refresh_token"]

    r1 = client.post(f"{BASE}/refresh", json={"refresh_token": old_rt})
    assert r1.status_code == 200

    # Réutilisation de l'ancien refresh token → 401
    r2 = client.post(f"{BASE}/refresh", json={"refresh_token": old_rt})
    assert r2.status_code == 401


def test_refresh_chain_two_rotations(client, test_user):
    t1 = _get_tokens(client)
    r2 = client.post(
        f"{BASE}/refresh",
        json={"refresh_token": t1["refresh_token"]},
    )
    assert r2.status_code == 200
    r3 = client.post(
        f"{BASE}/refresh",
        json={"refresh_token": r2.json()["refresh_token"]},
    )
    assert r3.status_code == 200


# ─── Tokens invalides ─────────────────────────────────────────

def test_refresh_with_garbage_token(client):
    resp = client.post(
        f"{BASE}/refresh", json={"refresh_token": "garbage.token.value"}
    )
    assert resp.status_code == 401


def test_refresh_with_access_token_rejected(client, test_user):
    """Le access token ne doit pas être accepté comme refresh token."""
    tokens = _get_tokens(client)
    resp = client.post(f"{BASE}/refresh", json={
        "refresh_token": tokens["access_token"],
    })
    assert resp.status_code == 401


def test_refresh_missing_body(client):
    resp = client.post(f"{BASE}/refresh", json={})
    assert resp.status_code == 422
