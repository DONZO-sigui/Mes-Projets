import uuid
from decimal import Decimal

from app.models.wallet import Wallet
from app.models.transaction import Transaction


def _make_wallet(db, nif: str) -> Wallet:
    w = Wallet(nif=nif, nom="Test", prenom="User", devise="GNF")
    db.add(w)
    db.flush()
    return w


def test_transaction_creation(db):
    sender = _make_wallet(db, "SNIF001TX")
    receiver = _make_wallet(db, "RNIF001TX")

    tx = Transaction(
        reference="REF-TEST-001",
        sender_wallet_id=sender.id,
        receiver_wallet_id=receiver.id,
        montant=Decimal("50000.0000"),
        devise="GNF",
        frais=Decimal("0.0000"),
        montant_total=Decimal("50000.0000"),
        statut="PENDING",
        motif="Test transfert",
        idempotency_key="idem-key-test-001",
    )
    db.add(tx)
    db.flush()

    assert tx.id is not None
    assert isinstance(tx.id, uuid.UUID)
    assert tx.statut == "PENDING"
    assert tx.montant == Decimal("50000.0000")


def test_transaction_reference_unique(db):
    from sqlalchemy.exc import IntegrityError

    sender = _make_wallet(db, "SNIF002TX")
    receiver = _make_wallet(db, "RNIF002TX")

    db.add(Transaction(
        reference="REF-DUP-001",
        sender_wallet_id=sender.id,
        receiver_wallet_id=receiver.id,
        montant=Decimal("1000.0000"),
        devise="GNF",
        frais=Decimal("0.0000"),
        montant_total=Decimal("1000.0000"),
        idempotency_key="idem-dup-a",
    ))
    db.flush()

    import pytest
    with pytest.raises(IntegrityError):
        db.add(Transaction(
            reference="REF-DUP-001",
            sender_wallet_id=sender.id,
            receiver_wallet_id=receiver.id,
            montant=Decimal("2000.0000"),
            devise="GNF",
            frais=Decimal("0.0000"),
            montant_total=Decimal("2000.0000"),
            idempotency_key="idem-dup-b",
        ))
        db.flush()


def test_idempotency_key_unique(db):
    from sqlalchemy.exc import IntegrityError

    sender = _make_wallet(db, "SNIF003TX")
    receiver = _make_wallet(db, "RNIF003TX")

    db.add(Transaction(
        reference="REF-IDEM-A",
        sender_wallet_id=sender.id,
        receiver_wallet_id=receiver.id,
        montant=Decimal("1000.0000"),
        devise="GNF",
        frais=Decimal("0.0000"),
        montant_total=Decimal("1000.0000"),
        idempotency_key="SAME-IDEM-KEY",
    ))
    db.flush()

    import pytest
    with pytest.raises(IntegrityError):
        db.add(Transaction(
            reference="REF-IDEM-B",
            sender_wallet_id=sender.id,
            receiver_wallet_id=receiver.id,
            montant=Decimal("2000.0000"),
            devise="GNF",
            frais=Decimal("0.0000"),
            montant_total=Decimal("2000.0000"),
            idempotency_key="SAME-IDEM-KEY",
        ))
        db.flush()


def test_transaction_motif_is_plain_text(db):
    """motif ne doit jamais être rendu comme HTML — vérification du typage."""
    sender = _make_wallet(db, "SNIF004TX")
    receiver = _make_wallet(db, "RNIF004TX")

    xss_attempt = "<script>alert('xss')</script>"
    tx = Transaction(
        reference="REF-XSS-001",
        sender_wallet_id=sender.id,
        receiver_wallet_id=receiver.id,
        montant=Decimal("100.0000"),
        devise="GNF",
        frais=Decimal("0.0000"),
        montant_total=Decimal("100.0000"),
        motif=xss_attempt,
        idempotency_key="idem-xss-001",
    )
    db.add(tx)
    db.flush()
    # Stocké en tant que texte brut — l'échappement est la responsabilité du frontend
    assert tx.motif == xss_attempt
