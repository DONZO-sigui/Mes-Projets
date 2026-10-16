from decimal import Decimal

from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.ledger import LedgerEntry


def _make_pair(db):
    sender = Wallet(nif="SLD001", nom="A", prenom="A", devise="GNF",
                    solde=Decimal("100000.0000"))
    receiver = Wallet(nif="RLD001", nom="B", prenom="B", devise="GNF")
    db.add_all([sender, receiver])
    db.flush()

    tx = Transaction(
        reference="REF-LED-001",
        sender_wallet_id=sender.id,
        receiver_wallet_id=receiver.id,
        montant=Decimal("10000.0000"),
        devise="GNF",
        frais=Decimal("0.0000"),
        montant_total=Decimal("10000.0000"),
        idempotency_key="idem-led-001",
    )
    db.add(tx)
    db.flush()
    return sender, receiver, tx


def test_ledger_double_entry(db):
    sender, receiver, tx = _make_pair(db)

    debit = LedgerEntry(
        transaction_id=tx.id,
        wallet_id=sender.id,
        type_mouvement="DEBIT",
        montant=Decimal("10000.0000"),
        devise="GNF",
    )
    credit = LedgerEntry(
        transaction_id=tx.id,
        wallet_id=receiver.id,
        type_mouvement="CREDIT",
        montant=Decimal("10000.0000"),
        devise="GNF",
    )
    db.add_all([debit, credit])
    db.flush()

    assert debit.type_mouvement == "DEBIT"
    assert credit.type_mouvement == "CREDIT"
    assert debit.montant == credit.montant


def test_ledger_relation_to_wallet(db):
    sender, receiver, tx = _make_pair(db)

    entry = LedgerEntry(
        transaction_id=tx.id,
        wallet_id=sender.id,
        type_mouvement="DEBIT",
        montant=Decimal("5000.0000"),
        devise="GNF",
    )
    db.add(entry)
    db.flush()
    db.refresh(entry)

    assert entry.wallet_id == sender.id


def test_ledger_relation_to_transaction(db):
    sender, receiver, tx = _make_pair(db)

    entry = LedgerEntry(
        transaction_id=tx.id,
        wallet_id=receiver.id,
        type_mouvement="CREDIT",
        montant=Decimal("5000.0000"),
        devise="GNF",
    )
    db.add(entry)
    db.flush()

    assert entry.transaction_id == tx.id
