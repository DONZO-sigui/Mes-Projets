"""
Tests format d'erreur uniforme — ÉTAPE 7

Chaque réponse d'erreur doit respecter l'enveloppe :
    {"error": {"code": "...", "message": "...", "details": null|list}}

Couvre :
  - 401 Unauthorized (token absent)
  - 403 Forbidden (compte suspendu)
  - 404 Not Found (wallet/ressource inconnu)
  - 409 Conflict (solde insuffisant)
  - 422 Validation Error (payload invalide)
  - Absence du champ 'detail' legacy de FastAPI
"""
import uuid

import pytest

AUTH = "/api/v1/auth"
TXN = "/api/v1/transactions"
WALLETS = "/api/v1/wallets"


# ─── Helper ───────────────────────────────────────────────────

def _has_error_envelope(data: dict) -> bool:
    return (
        isinstance(data.get("error"), dict)
        and "code" in data["error"]
        and "message" in data["error"]
    )


def _key():
    return "ERR-" + uuid.uuid4().hex[:16].upper()


# ─── 401 Unauthorized ─────────────────────────────────────────

def test_401_wallet_me_no_token(client):
    resp = client.get(f"{WALLETS}/me")
    assert resp.status_code == 401
    assert _has_error_envelope(resp.json())
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"
    assert "detail" not in resp.json()


def test_401_transactions_me_no_token(client):
    resp = client.get(f"{TXN}/me")
    assert resp.status_code == 401
    assert _has_error_envelope(resp.json())
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_401_post_transaction_no_token(client):
    key = _key()
    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(uuid.uuid4()),
            "montant": "1000.0000",
            "devise": "GNF",
        },
        headers={"Idempotency-Key": key},
    )
    assert resp.status_code == 401
    assert _has_error_envelope(resp.json())


# ─── 422 Validation Error ─────────────────────────────────────

def test_422_login_missing_password(client):
    resp = client.post(
        f"{AUTH}/login",
        json={"email": "user@example.com"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(body["error"]["details"], list)
    assert len(body["error"]["details"]) > 0


def test_422_transfer_missing_receiver(client, test_user, auth_headers):
    resp = client.post(
        TXN,
        json={"montant": "1000.0000", "devise": "GNF"},
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_422_transfer_invalid_devise(client, test_user, auth_headers):
    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(uuid.uuid4()),
            "montant": "1000.0000",
            "devise": "XYZ",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422
    assert _has_error_envelope(resp.json())


def test_422_transfer_negative_amount(client, test_user, auth_headers):
    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(uuid.uuid4()),
            "montant": "-100.0000",
            "devise": "GNF",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 422
    assert _has_error_envelope(resp.json())


def test_422_transaction_history_invalid_sort(
    client, test_user, auth_headers
):
    resp = client.get(
        f"{TXN}/me",
        params={"sort_by": "password_hash"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert _has_error_envelope(resp.json())


# ─── 404 Not Found ────────────────────────────────────────────

def test_404_transfer_unknown_receiver_wallet(
    client, test_user, auth_headers
):
    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(uuid.uuid4()),
            "montant": "1000.0000",
            "devise": "GNF",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 404
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "NOT_FOUND"
    assert "detail" not in body


# ─── 409 Conflict ─────────────────────────────────────────────

def test_409_insufficient_funds_error_envelope(
    client, test_user, auth_headers, db_for_api
):
    """test_user a solde=0 — le transfert génère un 409 CONFLICT."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    recv = User(
        email="recv.err@example.com",
        password_hash=hash_password("RecvPass1!"),
        first_name="Recv",
        last_name="Err",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(recv)
    db_for_api.flush()
    recv_w = Wallet(
        user_id=recv.id,
        nif="ERR" + recv.id.hex[:12].upper(),
        nom="Err",
        prenom="Recv",
        devise="GNF",
    )
    db_for_api.add(recv_w)
    db_for_api.flush()

    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(recv_w.id),
            "montant": "999999999.0000",
            "devise": "GNF",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "CONFLICT"
    assert "detail" not in body


def test_409_self_transfer_error_envelope(
    client, test_user, auth_headers, db_for_api
):
    """Auto-transfert → 409 avec enveloppe d'erreur."""
    from app.repositories.wallet_repository import WalletRepository
    wallet = WalletRepository(db_for_api).get_by_user_id(test_user.id)

    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(wallet.id),
            "montant": "1000.0000",
            "devise": "GNF",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "CONFLICT"


# ─── 403 Forbidden ────────────────────────────────────────────

def test_403_suspended_account_error_envelope(
    client, suspended_user
):
    """Après login, un compte suspendu reçoit 403 sur les routes protégées."""
    login = client.post(
        f"{AUTH}/login",
        json={
            "email": "suspended.user@example.com",
            "password": "TestPassword1!",
        },
    )
    if login.status_code != 200:
        pytest.skip("login refusé pour utilisateur suspendu")

    headers = {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }
    resp = client.get(f"{WALLETS}/me", headers=headers)
    assert resp.status_code == 403
    body = resp.json()
    assert _has_error_envelope(body)
    assert body["error"]["code"] == "FORBIDDEN"
    assert "detail" not in body


# ─── Champ 'detail' absent ────────────────────────────────────

def test_no_legacy_detail_field_on_401(client):
    resp = client.get(f"{WALLETS}/me")
    assert resp.status_code == 401
    assert "detail" not in resp.json()


def test_no_legacy_detail_field_on_404(
    client, test_user, auth_headers
):
    resp = client.post(
        TXN,
        json={
            "receiver_wallet_id": str(uuid.uuid4()),
            "montant": "1000.0000",
            "devise": "GNF",
        },
        headers={**auth_headers, "Idempotency-Key": _key()},
    )
    assert resp.status_code == 404
    assert "detail" not in resp.json()


def test_no_legacy_detail_field_on_422(client):
    resp = client.post(
        f"{AUTH}/login",
        json={"email": "user@example.com"},
    )
    assert resp.status_code == 422
    assert "detail" not in resp.json()
