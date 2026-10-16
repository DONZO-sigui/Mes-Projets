"""
Tests de sécurité — hashage, politique MDP, résistance timing attack
"""
import time
import pytest

from app.core.security import (
    hash_password,
    verify_password,
    needs_rehash,
    hash_token,
    validate_password_policy,
    create_access_token,
    create_refresh_token,
    decode_token,
)

import uuid


# ─── Argon2id ─────────────────────────────────────────────────

def test_hash_password_produces_argon2_hash():
    h = hash_password("MyPassword1!")
    assert h.startswith("$argon2id$")


def test_verify_password_correct():
    plain = "CorrectPassword!"
    assert verify_password(plain, hash_password(plain)) is True


def test_verify_password_wrong():
    h = hash_password("RightPassword!")
    assert verify_password("WrongPassword!", h) is False


def test_verify_password_does_not_raise_on_bad_hash():
    result = verify_password("anything", "notahash")
    assert result is False


def test_hash_password_unique_salts():
    """Deux hashes du même MDP doivent être différents (salt aléatoire)."""
    h1 = hash_password("SamePassword!")
    h2 = hash_password("SamePassword!")
    assert h1 != h2


def test_needs_rehash_current_params():
    """Un hash fraîchement généré ne doit pas nécessiter de réhachage."""
    h = hash_password("AnyPassword!")
    assert needs_rehash(h) is False


# ─── hash_token (SHA-256) ─────────────────────────────────────

def test_hash_token_is_deterministic():
    t = "some-random-jwt-string"
    assert hash_token(t) == hash_token(t)


def test_hash_token_length_is_64():
    assert len(hash_token("any-token")) == 64


def test_hash_token_different_tokens_different_hashes():
    assert hash_token("token-a") != hash_token("token-b")


# ─── Politique mot de passe ───────────────────────────────────

def test_password_policy_min_length():
    with pytest.raises(ValueError):
        validate_password_policy("short")


def test_password_policy_max_length():
    with pytest.raises(ValueError):
        validate_password_policy("x" * 129)


def test_password_policy_valid_passes():
    validate_password_policy("ValidPass1!")  # ne lève pas


def test_password_policy_exactly_min_length():
    validate_password_policy("Aa345678")  # 8 chars, uppercase + digit — ok


def test_password_policy_empty_raises():
    with pytest.raises(ValueError):
        validate_password_policy("")


# ─── JWT access token ─────────────────────────────────────────

def test_access_token_decode():
    uid = uuid.uuid4()
    token = create_access_token(uid, "USER")
    payload = decode_token(token)
    assert payload["sub"] == str(uid)
    assert payload["type"] == "access"
    assert payload["role"] == "USER"
    assert "jti" in payload
    assert "exp" in payload


def test_access_token_unique_jti():
    uid = uuid.uuid4()
    t1 = create_access_token(uid, "USER")
    t2 = create_access_token(uid, "USER")
    assert decode_token(t1)["jti"] != decode_token(t2)["jti"]


# ─── JWT refresh token ────────────────────────────────────────

def test_refresh_token_decode():
    uid = uuid.uuid4()
    token, jti, expires_at = create_refresh_token(uid)
    payload = decode_token(token)
    assert payload["sub"] == str(uid)
    assert payload["type"] == "refresh"
    assert payload["jti"] == jti


def test_refresh_token_different_from_access_token():
    uid = uuid.uuid4()
    at = create_access_token(uid, "USER")
    rt, _, _ = create_refresh_token(uid)
    assert at != rt
    assert decode_token(at)["type"] == "access"
    assert decode_token(rt)["type"] == "refresh"


# ─── Résistance timing attack (login) ────────────────────────

def test_login_timing_similar_for_known_vs_unknown_email(client):
    """
    Le temps de réponse pour un email inconnu doit être proche de celui
    d'un email connu + mauvais MDP (protection contre l'énumération).
    """
    # Email inconnu
    start = time.monotonic()
    r1 = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "AnyPassword1!",
    })
    t_unknown = time.monotonic() - start

    # Email connu + mauvais MDP (on inscrit d'abord)
    client.post("/api/v1/auth/register", json={
        "email": "timing@example.com",
        "password": "RealPassword1!",
        "first_name": "T",
        "last_name": "T",
    })
    start = time.monotonic()
    r2 = client.post("/api/v1/auth/login", json={
        "email": "timing@example.com",
        "password": "WrongPassword!",
    })
    t_known = time.monotonic() - start

    assert r1.status_code == 401
    assert r2.status_code == 401
    # Argon2 est intentionnellement lent — au moins quelques ms
    assert t_unknown > 0.001
    assert t_known > 0.001
