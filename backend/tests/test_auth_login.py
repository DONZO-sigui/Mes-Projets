"""
Tests POST /api/v1/auth/login — Connexion
"""

BASE = "/api/v1/auth"


# ─── Cas nominaux ─────────────────────────────────────────────

def test_login_success(client, test_user):
    resp = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "TestPassword1!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["email"] == "test.user@example.com"
    assert "password_hash" not in data["user"]


def test_login_email_case_insensitive(client, test_user):
    resp = client.post(f"{BASE}/login", json={
        "email": "Test.User@example.com",
        "password": "TestPassword1!",
    })
    assert resp.status_code == 200


def test_login_updates_access_token_on_second_login(client, test_user):
    r1 = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "TestPassword1!",
    })
    r2 = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "TestPassword1!",
    })
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Chaque login génère un nouveau access_token distinct
    assert r1.json()["access_token"] != r2.json()["access_token"]


# ─── Identifiants invalides ───────────────────────────────────

def test_login_wrong_password(client, test_user):
    resp = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "WrongPassword!",
    })
    assert resp.status_code == 401
    assert "WWW-Authenticate" in resp.headers


def test_login_unknown_email(client):
    resp = client.post(f"{BASE}/login", json={
        "email": "ghost@example.com",
        "password": "SomePassword1!",
    })
    assert resp.status_code == 401


def test_login_generic_error_message(client, test_user):
    """Le message d'erreur ne doit pas distinguer email inconnu vs mauvais MDP."""
    r_bad_email = client.post(f"{BASE}/login", json={
        "email": "nobody@example.com",
        "password": "TestPassword1!",
    })
    r_bad_pass = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
        "password": "WrongPass!",
    })
    # Même code HTTP
    assert r_bad_email.status_code == r_bad_pass.status_code == 401
    # Même message d'erreur
    err1 = r_bad_email.json()["error"]["message"]
    err2 = r_bad_pass.json()["error"]["message"]
    assert err1 == err2


# ─── Compte suspendu ─────────────────────────────────────────

def test_login_suspended_account(client, suspended_user):
    resp = client.post(f"{BASE}/login", json={
        "email": "suspended.user@example.com",
        "password": "TestPassword1!",
    })
    assert resp.status_code == 403


# ─── Validation entrée ───────────────────────────────────────

def test_login_invalid_email_format(client):
    resp = client.post(f"{BASE}/login", json={
        "email": "not-email",
        "password": "TestPassword1!",
    })
    assert resp.status_code == 422


def test_login_missing_password(client):
    resp = client.post(f"{BASE}/login", json={
        "email": "test.user@example.com",
    })
    assert resp.status_code == 422
