"""
ÉTAPE 10 — Tests de sécurité supplémentaires

Couvre (compléments aux tests existants) :
  A. Security headers — X-Content-Type-Options, X-Frame-Options,
                        Referrer-Policy, Content-Security-Policy
  B. Password policy (ÉTAPE 10) — majuscule + chiffre obligatoires
  C. JWT iat — token à iat futur rejeté
  D. IDOR transactions — /transactions/me isolé par current_user
  E. Données sensibles absentes des réponses d'erreur
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.core.security import (
    create_access_token,
    decode_token,
    validate_password_policy,
)
from jose import JWTError
from jose import jwt as jose_jwt

from app.core.config import settings


# ─── A. Security headers ──────────────────────────────────────

def test_security_header_x_content_type_options(client):
    resp = client.get("/")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"


def test_security_header_x_frame_options(client):
    resp = client.get("/")
    assert resp.headers.get("X-Frame-Options") == "DENY"


def test_security_header_referrer_policy(client):
    resp = client.get("/")
    assert resp.headers.get("Referrer-Policy") == (
        "strict-origin-when-cross-origin"
    )


def test_security_header_csp(client):
    resp = client.get("/")
    csp = resp.headers.get("Content-Security-Policy", "")
    assert "frame-ancestors" in csp


def test_security_headers_on_api_routes(client, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"


def test_security_headers_on_error_responses(client):
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer bad-token"},
    )
    assert resp.status_code == 401
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"


# ─── B. Password policy (ÉTAPE 10) ───────────────────────────

def test_password_policy_rejects_no_uppercase():
    with pytest.raises(ValueError, match="majuscule"):
        validate_password_policy("nouppercase1")


def test_password_policy_rejects_no_digit():
    with pytest.raises(ValueError, match="chiffre"):
        validate_password_policy("NoDigitAtAll!")


def test_password_policy_accepts_with_uppercase_and_digit():
    validate_password_policy("ValidPass1")  # aucune exception attendue


def test_password_policy_minimum_valid():
    validate_password_policy("Aa345678")  # exactement 8 chars, règles OK


def test_register_password_without_uppercase_rejected(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "noup@example.com",
        "password": "nocapital1!",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code in (422, 400)


def test_register_password_without_digit_rejected(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "nodig@example.com",
        "password": "NoDigitHere!",
        "first_name": "A",
        "last_name": "B",
    })
    assert resp.status_code in (422, 400)


# ─── C. JWT iat — token futur rejeté ─────────────────────────

def test_decode_token_rejects_future_iat():
    """Un JWT signé avec un iat dans le futur est rejeté."""
    future_iat = datetime.now(tz=timezone.utc) + timedelta(hours=1)
    future_exp = future_iat + timedelta(minutes=15)
    payload = {
        "sub": str(uuid.uuid4()),
        "type": "access",
        "role": "USER",
        "jti": str(uuid.uuid4()),
        "iat": int(future_iat.timestamp()),
        "exp": int(future_exp.timestamp()),
    }
    token = jose_jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(JWTError):
        decode_token(token)


def test_decode_token_accepts_current_iat():
    """Un JWT avec un iat actuel est accepté normalement."""
    uid = uuid.uuid4()
    token = create_access_token(uid, "USER")
    decoded = decode_token(token)
    assert decoded["sub"] == str(uid)


# ─── D. IDOR — /transactions/me isolé par current_user ───────

@pytest.fixture()
def user_a_with_transactions(client, db_for_api):
    """Utilisateur A avec wallet crédité et une transaction sortante."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    # sender A
    a = User(
        email="idor.a@example.com",
        password_hash=hash_password("IgorA1Pass!"),
        first_name="Igor",
        last_name="A",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(a)
    db_for_api.flush()
    wa = Wallet(
        user_id=a.id,
        nif="IDORA" + a.id.hex[:10].upper(),
        nom="A",
        prenom="Igor",
        devise="GNF",
        solde=Decimal("500000.0000"),
    )
    db_for_api.add(wa)

    # receiver C (distinct de B)
    c = User(
        email="idor.c@example.com",
        password_hash=hash_password("IgorC1Pass!"),
        first_name="Igor",
        last_name="C",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(c)
    db_for_api.flush()
    wc = Wallet(
        user_id=c.id,
        nif="IDORC" + c.id.hex[:10].upper(),
        nom="C",
        prenom="Igor",
        devise="GNF",
    )
    db_for_api.add(wc)
    db_for_api.flush()

    # login A + effectuer un transfert vers C
    login = client.post("/api/v1/auth/login", json={
        "email": "idor.a@example.com",
        "password": "IgorA1Pass!",
    })
    assert login.status_code == 200
    headers_a = {"Authorization": f"Bearer {login.json()['access_token']}"}

    key = "IDOR-" + uuid.uuid4().hex[:14].upper()
    tx = client.post(
        "/api/v1/transactions",
        json={
            "receiver_wallet_id": str(wc.id),
            "montant": "10000.0000",
            "devise": "GNF",
        },
        headers={**headers_a, "Idempotency-Key": key},
    )
    assert tx.status_code == 201

    return {"user_a": a, "user_c": c}


@pytest.fixture()
def user_b_headers(client, db_for_api):
    """Utilisateur B sans aucune transaction — token de connexion."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    b = User(
        email="idor.b@example.com",
        password_hash=hash_password("IgorB1Pass!"),
        first_name="Igor",
        last_name="B",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(b)
    db_for_api.flush()
    wb = Wallet(
        user_id=b.id,
        nif="IDORB" + b.id.hex[:10].upper(),
        nom="B",
        prenom="Igor",
        devise="GNF",
    )
    db_for_api.add(wb)
    db_for_api.flush()

    login = client.post("/api/v1/auth/login", json={
        "email": "idor.b@example.com",
        "password": "IgorB1Pass!",
    })
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_idor_user_b_cannot_see_user_a_transactions(
    client, user_a_with_transactions, user_b_headers
):
    """
    User A a des transactions. User B appelle /transactions/me.
    User B ne doit voir QUE ses propres transactions (liste vide ici).
    Preuve que /me isole par current_user, non par paramètre exposé.
    """
    resp = client.get(
        "/api/v1/transactions/me",
        headers=user_b_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_idor_transactions_me_returns_only_own(
    client, user_a_with_transactions, user_b_headers
):
    """
    User A a 1 transaction. /transactions/me avec son token retourne 1.
    User B a 0 transaction. /transactions/me avec son token retourne 0.
    Les deux comptages sont distincts.
    """
    user_a = user_a_with_transactions["user_a"]
    at_a = create_access_token(user_a.id, user_a.role)
    headers_a = {"Authorization": f"Bearer {at_a}"}

    resp_a = client.get("/api/v1/transactions/me", headers=headers_a)
    assert resp_a.status_code == 200
    assert resp_a.json()["total"] >= 1

    resp_b = client.get(
        "/api/v1/transactions/me", headers=user_b_headers
    )
    assert resp_b.status_code == 200
    assert resp_b.json()["total"] == 0


# ─── E. Réponses d'erreur sans données internes ───────────────

def test_error_response_no_traceback(client):
    """Les réponses 4xx n'exposent pas de traceback Python."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "WrongPass1!",
    })
    assert resp.status_code == 401
    body = resp.text
    assert "Traceback" not in body
    assert "File " not in body
    assert "line " not in body.lower().replace("outline", "")


def test_error_response_envelope(client):
    """Les erreurs suivent l'enveloppe {"error": {code, message, details}}."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "WrongPass1!",
    })
    assert resp.status_code == 401
    data = resp.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


def test_404_no_internal_path(client, auth_headers):
    """Un 404 ne révèle pas de chemin interne."""
    resp = client.get(
        "/api/v1/nonexistent-route", headers=auth_headers
    )
    assert resp.status_code == 404
    body = resp.text
    assert "/app/" not in body
    assert "site-packages" not in body
