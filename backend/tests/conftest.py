"""
Configuration pytest GNF-Token — ÉTAPE 4

Fixtures disponibles :
  engine       — moteur SQLAlchemy (session-scoped)
  db           — session isolée par rollback (pour tests modèles)
  db_for_api   — session isolée par SAVEPOINT (supporte db.commit())
  client       — TestClient FastAPI avec override get_db
  test_user    — utilisateur USER pré-créé
  admin_user   — utilisateur ADMIN pré-créé
  auth_headers — Bearer token pour test_user
  admin_headers— Bearer token pour admin_user
"""
import os
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session as SASession

from app.core.config import settings
from app.db.base import Base

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", settings.DATABASE_URL)


# ─── Moteur ──────────────────────────────────────────────────

@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


# ─── Session pour tests modèles (rollback, sans commit) ──────

@pytest.fixture(scope="function")
def db(engine) -> SASession:
    """Session isolée par rollback — sans commit()."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(
        bind=connection, autocommit=False, autoflush=False
    )()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


# ─── Session pour tests API (SAVEPOINT — supporte commit()) ──

@pytest.fixture(scope="function")
def db_for_api(engine) -> SASession:
    """
    Session isolée par SAVEPOINT.
    Chaque db.commit() du router libère le SAVEPOINT courant et en ouvre un
    nouveau — la transaction extérieure est annulée au teardown du test.
    """
    connection = engine.connect()
    trans = connection.begin()
    session = SASession(bind=connection, autoflush=False, autocommit=False)
    session.begin_nested()  # premier SAVEPOINT

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    yield session

    session.close()
    trans.rollback()
    connection.close()


# ─── Client FastAPI avec dépendance DB overridée ─────────────

@pytest.fixture(scope="function")
def client(db_for_api):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db

    def _override_get_db():
        yield db_for_api

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=True) as tc:
        yield tc
    app.dependency_overrides.clear()


# ─── Utilisateurs de test ─────────────────────────────────────

@pytest.fixture(scope="function")
def test_user(db_for_api):
    """Utilisateur USER actif + wallet GNF (miroir de /register)."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="test.user@example.com",
        password_hash=hash_password("TestPassword1!"),
        first_name="Test",
        last_name="User",
        role="USER",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()

    wallet = Wallet(
        user_id=user.id,
        nif="GNF" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


@pytest.fixture(scope="function")
def suspended_user(db_for_api):
    """Utilisateur USER suspendu."""
    from app.models.user import User
    from app.core.security import hash_password

    user = User(
        email="suspended.user@example.com",
        password_hash=hash_password("TestPassword1!"),
        first_name="Suspended",
        last_name="User",
        role="USER",
        status="SUSPENDED",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()
    return user


@pytest.fixture(scope="function")
def admin_user(db_for_api):
    """Utilisateur ADMIN actif + wallet GNF pré-créé."""
    from app.models.user import User
    from app.models.wallet import Wallet
    from app.core.security import hash_password

    user = User(
        email="test.admin@example.com",
        password_hash=hash_password("AdminPassword1!"),
        first_name="Admin",
        last_name="GNF",
        role="ADMIN",
        status="ACTIVE",
        is_email_verified=True,
    )
    db_for_api.add(user)
    db_for_api.flush()

    wallet = Wallet(
        user_id=user.id,
        nif="GNF" + user.id.hex[:12].upper(),
        nom=user.last_name,
        prenom=user.first_name,
        devise="GNF",
    )
    db_for_api.add(wallet)
    db_for_api.flush()
    return user


# ─── Headers d'authentification ──────────────────────────────

@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    """Bearer token valide pour test_user (USER)."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "test.user@example.com", "password": "TestPassword1!"},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture(scope="function")
def admin_headers(client, admin_user):
    """Bearer token valide pour admin_user (ADMIN)."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "test.admin@example.com", "password": "AdminPassword1!"},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
