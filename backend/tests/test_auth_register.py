"""
Tests POST /api/v1/auth/register — Inscription utilisateur
"""
import pytest


BASE = "/api/v1/auth"


# ─── Cas nominaux ─────────────────────────────────────────────

def test_register_success(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "alice@example.com",
        "password": "SecurePass1!",
        "first_name": "Alice",
        "last_name": "Diallo",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["role"] == "USER"
    assert data["user"]["status"] == "ACTIVE"
    assert "password_hash" not in data["user"]
    assert "password" not in data["user"]


def test_register_email_normalized_to_lowercase(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "Bob@example.com",
        "password": "SecurePass1!",
        "first_name": "Bob",
        "last_name": "Bah",
    })
    assert resp.status_code == 201
    assert resp.json()["user"]["email"] == "bob@example.com"


def test_register_creates_wallet(client, db_for_api):
    resp = client.post(f"{BASE}/register", json={
        "email": "carol@example.com",
        "password": "SecurePass1!",
        "first_name": "Carol",
        "last_name": "Camara",
    })
    assert resp.status_code == 201
    user_id = resp.json()["user"]["id"]

    from app.models.wallet import Wallet
    from sqlalchemy import select
    import uuid

    wallets = db_for_api.scalars(
        select(Wallet).where(Wallet.user_id == uuid.UUID(user_id))
    ).all()
    assert len(wallets) == 1
    assert wallets[0].devise == "GNF"


# ─── Unicité email ────────────────────────────────────────────

def test_register_duplicate_email_returns_409(client):
    payload = {
        "email": "dup@example.com",
        "password": "SecurePass1!",
        "first_name": "A",
        "last_name": "B",
    }
    r1 = client.post(f"{BASE}/register", json=payload)
    assert r1.status_code == 201

    r2 = client.post(f"{BASE}/register", json=payload)
    assert r2.status_code == 409
    assert r2.status_code == 409


def test_register_duplicate_email_case_insensitive(client):
    client.post(f"{BASE}/register", json={
        "email": "unique@example.com",
        "password": "SecurePass1!",
        "first_name": "A",
        "last_name": "B",
    })
    resp = client.post(f"{BASE}/register", json={
        "email": "Unique@example.com",
        "password": "SecurePass1!",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code == 409


# ─── Validation mot de passe ─────────────────────────────────

def test_register_password_too_short(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "short@example.com",
        "password": "abc",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code in (422, 400)


def test_register_password_too_long(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "long@example.com",
        "password": "x" * 129,
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code in (422, 400)


# ─── Validation Pydantic ─────────────────────────────────────

def test_register_invalid_email_format(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "not-an-email",
        "password": "SecurePass1!",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code == 422


def test_register_missing_required_fields(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "nopass@example.com",
    })
    assert resp.status_code == 422


def test_register_password_not_in_response(client):
    resp = client.post(f"{BASE}/register", json={
        "email": "secure@example.com",
        "password": "SecurePass1!",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code == 201
    body = str(resp.json())
    assert "SecurePass1!" not in body
    assert "password_hash" not in body
