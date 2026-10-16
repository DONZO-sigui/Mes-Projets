from datetime import datetime, timezone

from app.models.blockchain import Block


GENESIS_HASH = "000" + "a" * 61
GENESIS_PREV = "0" * 64


def test_block_creation(db):
    block = Block(
        index=0,
        hash=GENESIS_HASH,
        previous_hash=GENESIS_PREV,
        timestamp=datetime.now(tz=timezone.utc),
        nonce=42,
        difficulty=3,
        data={"type": "genesis"},
        statut="VALID",
    )
    db.add(block)
    db.flush()

    assert block.id is not None
    assert block.index == 0
    assert block.hash == GENESIS_HASH
    assert block.nonce == 42
    assert block.difficulty == 3


def test_block_hash_unique(db):
    from sqlalchemy.exc import IntegrityError
    import pytest

    h = "000" + "b" * 61
    db.add(Block(
        index=1, hash=h, previous_hash=GENESIS_HASH,
        timestamp=datetime.now(tz=timezone.utc),
        nonce=1, difficulty=3, statut="VALID",
    ))
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(Block(
            index=2, hash=h, previous_hash=GENESIS_HASH,
            timestamp=datetime.now(tz=timezone.utc),
            nonce=2, difficulty=3, statut="VALID",
        ))
        db.flush()


def test_block_previous_hash_chain(db):
    h0 = "000" + "c" * 61
    h1 = "000" + "d" * 61

    b0 = Block(
        index=0, hash=h0, previous_hash=GENESIS_PREV,
        timestamp=datetime.now(tz=timezone.utc),
        nonce=0, difficulty=3, statut="VALID",
    )
    b1 = Block(
        index=1, hash=h1, previous_hash=h0,
        timestamp=datetime.now(tz=timezone.utc),
        nonce=5, difficulty=3, statut="VALID",
    )
    db.add_all([b0, b1])
    db.flush()

    assert b1.previous_hash == b0.hash


def test_block_pow_prefix(db):
    """Le hash d'un bloc VALID doit commencer par difficulty zéros."""
    difficulty = 3
    nonce = 0
    hash_value = "000abc" + "x" * 58

    block = Block(
        index=10, hash=hash_value, previous_hash=GENESIS_PREV,
        timestamp=datetime.now(tz=timezone.utc),
        nonce=nonce, difficulty=difficulty, statut="VALID",
    )
    db.add(block)
    db.flush()

    assert block.hash.startswith("0" * block.difficulty)
