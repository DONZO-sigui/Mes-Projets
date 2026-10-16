"""
Tests notifications — ÉTAPE 13

Couvre :
  - Auth (401 sur tous les endpoints)
  - CRUD : GET /notifications, GET /notifications/unread-count,
           PATCH /notifications/{id}/read, POST /notifications/read-all
  - Pagination et filtre ?unread=true
  - IDOR : un utilisateur ne peut pas lire les notifications d'un autre
  - Événements sécurité : PASSWORD_CHANGED (POST /users/me/password),
                          SESSION_REVOKED (DELETE /users/me/sessions)
  - Événements transfert : TRANSFER_COMPLETED + TRANSFER_RECEIVED
  - Événements bénéficiaires : BENEFICIARY_CREATED, BENEFICIARY_DELETED
"""
import uuid
from decimal import Decimal

import pytest

BASE = "/api/v1/notifications"
USERS = "/api/v1/users"
AUTH = "/api/v1/auth"
TX = "/api/v1/transactions"
BENEF = "/api/v1/beneficiaries"


# ─── Fixtures ─────────────────────────────────────────────────

def _make_user(db, email, password="Notif1Pass!", role="USER", balance="50000"):
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    u = User(
        email=email,
        password_hash=hash_password(password),
        first_name="Notif",
        last_name="Test",
        role=role,
        status="ACTIVE",
        is_email_verified=True,
    )
    db.add(u)
    db.flush()

    w = Wallet(
        user_id=u.id,
        nif="NTF" + u.id.hex[:12].upper(),
        nom="Test",
        prenom="Notif",
        devise="GNF",
        solde=Decimal(balance),
    )
    db.add(w)
    db.flush()
    return u


def _login(client, email, password="Notif1Pass!"):
    resp = client.post(AUTH + "/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _seed_notif(db, user_id, type_="SECURITY_ALERT", is_read=False):
    """Insère directement une notification en base (sans passer par l'API)."""
    from app.services.notification_service import NotificationService
    svc = NotificationService(db)
    n = svc.create_notification(
        user_id=user_id,
        type_=type_,
        title="Test",
        message="Message de test",
    )
    if is_read:
        n.is_read = True
    db.flush()
    return n


@pytest.fixture()
def user_a(db_for_api):
    return _make_user(db_for_api, "notif.a@example.com")


@pytest.fixture()
def user_b(db_for_api):
    return _make_user(db_for_api, "notif.b@example.com")


@pytest.fixture()
def headers_a(client, user_a):
    return _login(client, "notif.a@example.com")


@pytest.fixture()
def headers_b(client, user_b):
    return _login(client, "notif.b@example.com")


# ─── Auth ─────────────────────────────────────────────────────

class TestAuth:
    def test_list_requires_auth(self, client):
        assert client.get(BASE).status_code == 401

    def test_unread_count_requires_auth(self, client):
        assert client.get(BASE + "/unread-count").status_code == 401

    def test_mark_read_requires_auth(self, client):
        assert client.patch(f"{BASE}/{uuid.uuid4()}/read").status_code == 401

    def test_read_all_requires_auth(self, client):
        assert client.post(BASE + "/read-all").status_code == 401


# ─── Schéma et liste ──────────────────────────────────────────

class TestList:
    def test_empty_list(self, client, headers_a):
        resp = client.get(BASE, headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["unread_count"] == 0
        assert data["items"] == []

    def test_list_returns_user_notifications(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id)
        _seed_notif(db_for_api, user_a.id)
        resp = client.get(BASE, headers=headers_a)
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    def test_list_schema(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id)
        item = client.get(BASE, headers=headers_a).json()["items"][0]
        assert "id" in item
        assert "type" in item
        assert "title" in item
        assert "message" in item
        assert "is_read" in item
        assert "created_at" in item
        assert "read_at" in item

    def test_unread_filter(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id, is_read=False)
        _seed_notif(db_for_api, user_a.id, is_read=True)
        resp = client.get(BASE + "?unread=true", headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert all(not i["is_read"] for i in data["items"])

    def test_pagination(self, client, db_for_api, user_a, headers_a):
        for _ in range(5):
            _seed_notif(db_for_api, user_a.id)
        resp = client.get(BASE + "?page=1&limit=3", headers=headers_a)
        assert resp.json()["total"] == 5
        assert len(resp.json()["items"]) == 3

    def test_list_ordered_newest_first(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id)
        _seed_notif(db_for_api, user_a.id)
        items = client.get(BASE, headers=headers_a).json()["items"]
        dates = [i["created_at"] for i in items]
        assert dates == sorted(dates, reverse=True)


# ─── Unread count ─────────────────────────────────────────────

class TestUnreadCount:
    def test_zero_when_no_notifs(self, client, headers_a):
        resp = client.get(BASE + "/unread-count", headers=headers_a)
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_counts_only_unread(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id, is_read=False)
        _seed_notif(db_for_api, user_a.id, is_read=False)
        _seed_notif(db_for_api, user_a.id, is_read=True)
        resp = client.get(BASE + "/unread-count", headers=headers_a)
        assert resp.json()["count"] == 2


# ─── Mark as read ─────────────────────────────────────────────

class TestMarkRead:
    def test_mark_as_read(self, client, db_for_api, user_a, headers_a):
        n = _seed_notif(db_for_api, user_a.id)
        resp = client.patch(f"{BASE}/{n.id}/read", headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_read"] is True
        assert data["read_at"] is not None

    def test_mark_already_read_is_idempotent(self, client, db_for_api, user_a, headers_a):
        n = _seed_notif(db_for_api, user_a.id, is_read=True)
        resp = client.patch(f"{BASE}/{n.id}/read", headers=headers_a)
        assert resp.status_code == 200

    def test_mark_read_unknown_id_404(self, client, headers_a):
        resp = client.patch(f"{BASE}/{uuid.uuid4()}/read", headers=headers_a)
        assert resp.status_code == 404

    def test_mark_read_decrements_unread_count(self, client, db_for_api, user_a, headers_a):
        n = _seed_notif(db_for_api, user_a.id)
        assert client.get(BASE + "/unread-count", headers=headers_a).json()["count"] == 1
        client.patch(f"{BASE}/{n.id}/read", headers=headers_a)
        assert client.get(BASE + "/unread-count", headers=headers_a).json()["count"] == 0


# ─── Mark all read ────────────────────────────────────────────

class TestMarkAllRead:
    def test_mark_all_read(self, client, db_for_api, user_a, headers_a):
        for _ in range(3):
            _seed_notif(db_for_api, user_a.id)
        resp = client.post(BASE + "/read-all", headers=headers_a)
        assert resp.status_code == 200
        assert resp.json()["updated"] == 3
        assert client.get(BASE + "/unread-count", headers=headers_a).json()["count"] == 0

    def test_mark_all_read_when_none(self, client, headers_a):
        resp = client.post(BASE + "/read-all", headers=headers_a)
        assert resp.status_code == 200
        assert resp.json()["updated"] == 0

    def test_mark_all_read_skips_already_read(self, client, db_for_api, user_a, headers_a):
        _seed_notif(db_for_api, user_a.id, is_read=True)
        _seed_notif(db_for_api, user_a.id, is_read=False)
        resp = client.post(BASE + "/read-all", headers=headers_a)
        assert resp.json()["updated"] == 1


# ─── IDOR ─────────────────────────────────────────────────────

class TestIDOR:
    def test_list_only_own_notifications(self, client, db_for_api, user_a, user_b, headers_a, headers_b):
        _seed_notif(db_for_api, user_a.id)
        _seed_notif(db_for_api, user_b.id)
        assert client.get(BASE, headers=headers_a).json()["total"] == 1
        assert client.get(BASE, headers=headers_b).json()["total"] == 1

    def test_cannot_mark_other_user_notification_as_read(self, client, db_for_api, user_b, headers_a):
        n = _seed_notif(db_for_api, user_b.id)
        resp = client.patch(f"{BASE}/{n.id}/read", headers=headers_a)
        assert resp.status_code == 404

    def test_mark_all_read_only_affects_own(self, client, db_for_api, user_a, user_b, headers_a, headers_b):
        _seed_notif(db_for_api, user_a.id)
        _seed_notif(db_for_api, user_b.id)
        resp = client.post(BASE + "/read-all", headers=headers_a)
        assert resp.json()["updated"] == 1
        assert client.get(BASE + "/unread-count", headers=headers_b).json()["count"] == 1

    def test_unread_count_scoped_to_user(self, client, db_for_api, user_a, user_b, headers_a, headers_b):
        for _ in range(3):
            _seed_notif(db_for_api, user_a.id)
        assert client.get(BASE + "/unread-count", headers=headers_a).json()["count"] == 3
        assert client.get(BASE + "/unread-count", headers=headers_b).json()["count"] == 0


# ─── Événements sécurité ──────────────────────────────────────

class TestSecurityEvents:
    def test_password_changed_creates_notification(self, client, db_for_api, user_a, headers_a):
        client.post(
            USERS + "/me/password",
            json={"current_password": "Notif1Pass!", "new_password": "NewNotif2@"},
            headers=headers_a,
        )
        # Reconnexion avec nouveau mot de passe
        new_headers = _login(client, "notif.a@example.com", "NewNotif2@")
        resp = client.get(BASE, headers=new_headers)
        types = [i["type"] for i in resp.json()["items"]]
        assert "PASSWORD_CHANGED" in types

    def test_session_revoked_creates_notification(self, client, db_for_api, user_a, headers_a):
        # Se connecter depuis un autre "device" pour avoir deux sessions
        _login(client, "notif.a@example.com")
        client.delete(USERS + "/me/sessions", headers=headers_a)
        # Reconnexion
        new_headers = _login(client, "notif.a@example.com")
        types = [i["type"] for i in client.get(BASE, headers=new_headers).json()["items"]]
        assert "SESSION_REVOKED" in types


# ─── Événements transfert ─────────────────────────────────────

class TestTransferEvents:
    @pytest.fixture()
    def sender(self, db_for_api):
        return _make_user(db_for_api, "sender.notif@example.com", balance="100000")

    @pytest.fixture()
    def receiver(self, db_for_api):
        return _make_user(db_for_api, "receiver.notif@example.com")

    @pytest.fixture()
    def sender_headers(self, client, sender):
        return _login(client, "sender.notif@example.com")

    @pytest.fixture()
    def receiver_headers(self, client, receiver):
        return _login(client, "receiver.notif@example.com")

    def _get_wallet_id(self, db, user_id):
        from app.repositories.wallet_repository import WalletRepository
        w = WalletRepository(db).get_by_user_id(user_id)
        return str(w.id)

    def test_transfer_creates_completed_notification(self, client, db_for_api, sender, receiver, sender_headers, receiver_headers):
        receiver_wallet_id = self._get_wallet_id(db_for_api, receiver.id)
        resp = client.post(
            TX,
            json={"receiver_wallet_id": receiver_wallet_id, "montant": "5000", "devise": "GNF"},
            headers={**sender_headers, "Idempotency-Key": str(uuid.uuid4())},
        )
        assert resp.status_code == 201
        types = [i["type"] for i in client.get(BASE, headers=sender_headers).json()["items"]]
        assert "TRANSFER_COMPLETED" in types

    def test_transfer_creates_received_notification(self, client, db_for_api, sender, receiver, sender_headers, receiver_headers):
        receiver_wallet_id = self._get_wallet_id(db_for_api, receiver.id)
        client.post(
            TX,
            json={"receiver_wallet_id": receiver_wallet_id, "montant": "5000", "devise": "GNF"},
            headers={**sender_headers, "Idempotency-Key": str(uuid.uuid4())},
        )
        types = [i["type"] for i in client.get(BASE, headers=receiver_headers).json()["items"]]
        assert "TRANSFER_RECEIVED" in types

    def test_idempotent_transfer_no_duplicate_notification(self, client, db_for_api, sender, receiver, sender_headers):
        receiver_wallet_id = self._get_wallet_id(db_for_api, receiver.id)
        key = str(uuid.uuid4())
        for _ in range(2):
            client.post(
                TX,
                json={"receiver_wallet_id": receiver_wallet_id, "montant": "1000", "devise": "GNF"},
                headers={**sender_headers, "Idempotency-Key": key},
            )
        types = [i["type"] for i in client.get(BASE, headers=sender_headers).json()["items"]]
        assert types.count("TRANSFER_COMPLETED") == 1


# ─── Événements bénéficiaires ─────────────────────────────────

class TestBeneficiaryEvents:
    @pytest.fixture()
    def owner(self, db_for_api):
        return _make_user(db_for_api, "owner.notif@example.com")

    @pytest.fixture()
    def target(self, db_for_api):
        return _make_user(db_for_api, "target.notif@example.com")

    @pytest.fixture()
    def owner_headers(self, client, owner):
        return _login(client, "owner.notif@example.com")

    def _get_wallet_id(self, db, user_id):
        from app.repositories.wallet_repository import WalletRepository
        return str(WalletRepository(db).get_by_user_id(user_id).id)

    def test_beneficiary_created_notification(self, client, db_for_api, owner, target, owner_headers):
        wallet_id = self._get_wallet_id(db_for_api, target.id)
        resp = client.post(BENEF, json={"wallet_id": wallet_id, "name": "Ami Test"}, headers=owner_headers)
        assert resp.status_code == 201
        types = [i["type"] for i in client.get(BASE, headers=owner_headers).json()["items"]]
        assert "BENEFICIARY_CREATED" in types

    def test_beneficiary_deleted_notification(self, client, db_for_api, owner, target, owner_headers):
        wallet_id = self._get_wallet_id(db_for_api, target.id)
        benef = client.post(BENEF, json={"wallet_id": wallet_id, "name": "Ami Del"}, headers=owner_headers).json()
        client.delete(f"{BENEF}/{benef['id']}", headers=owner_headers)
        types = [i["type"] for i in client.get(BASE, headers=owner_headers).json()["items"]]
        assert "BENEFICIARY_DELETED" in types
