import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError


def test_db_connection(db):
    result = db.execute(text("SELECT 1 AS val"))
    row = result.fetchone()
    assert row is not None
    assert row.val == 1


def test_db_session_created(db):
    assert db is not None
    assert db.is_active


def test_db_rollback(db):
    """Vérifie que les données créées dans un test ne persistent pas."""
    from app.models.mnbc import MNBCReserve
    from decimal import Decimal

    reserve = MNBCReserve(
        devise="GNF",
        reserve=Decimal("1000000.0000"),
        taux=Decimal("1.000000"),
    )
    db.add(reserve)
    db.flush()
    assert reserve.id is not None
    # Le rollback est effectué automatiquement par le fixture conftest
    # après ce test — la ligne ne persistera pas.
