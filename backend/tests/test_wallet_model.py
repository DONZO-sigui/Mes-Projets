import uuid
from decimal import Decimal
import pytest

from app.models.wallet import Wallet


def test_wallet_creation(db):
    wallet = Wallet(
        nif="NIF001TEST",
        nom="Diallo",
        prenom="Mamadou",
        ville="Conakry",
        devise="GNF",
    )
    db.add(wallet)
    db.flush()

    assert wallet.id is not None
    assert isinstance(wallet.id, uuid.UUID)
    assert wallet.nif == "NIF001TEST"
    assert wallet.devise == "GNF"
    assert wallet.statut == "ACTIVE"


def test_wallet_solde_default(db):
    wallet = Wallet(nif="NIF002TEST", nom="Bah", prenom="Fatoumata", devise="GNF")
    db.add(wallet)
    db.flush()

    assert wallet.solde == Decimal("0.0000")


def test_wallet_solde_is_decimal(db):
    wallet = Wallet(nif="NIF003TEST", nom="Camara", prenom="Ibrahima", devise="GNF")
    db.add(wallet)
    db.flush()

    assert isinstance(wallet.solde, Decimal)


def test_wallet_uuid_uniqueness(db):
    w1 = Wallet(nif="NIF004A", nom="A", prenom="A", devise="GNF")
    w2 = Wallet(nif="NIF004B", nom="B", prenom="B", devise="GNF")
    db.add_all([w1, w2])
    db.flush()

    assert w1.id != w2.id


def test_wallet_nif_unique_constraint(db):
    from sqlalchemy.exc import IntegrityError

    db.add(Wallet(nif="NIFDUP01", nom="X", prenom="X", devise="GNF"))
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(Wallet(nif="NIFDUP01", nom="Y", prenom="Y", devise="GNF"))
        db.flush()


def test_wallet_timestamps_set(db):
    wallet = Wallet(nif="NIF005TS", nom="Kouyaté", prenom="Sékou", devise="GNF")
    db.add(wallet)
    db.flush()
    db.refresh(wallet)

    assert wallet.created_at is not None
    assert wallet.updated_at is not None
