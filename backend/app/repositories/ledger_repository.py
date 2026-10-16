import uuid

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.ledger import LedgerEntry


class LedgerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_transaction(self, tx_id: uuid.UUID) -> list[LedgerEntry]:
        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.transaction_id == tx_id)
            .order_by(LedgerEntry.created_at)
        )
        return list(self.db.scalars(stmt))

    def list_by_wallet(
        self, wallet_id: uuid.UUID, offset: int = 0, limit: int = 100
    ) -> list[LedgerEntry]:
        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.wallet_id == wallet_id)
            .order_by(LedgerEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count_by_wallet(self, wallet_id: uuid.UUID) -> int:
        stmt = select(func.count()).select_from(LedgerEntry).where(
            LedgerEntry.wallet_id == wallet_id
        )
        return self.db.scalar(stmt) or 0

    def create(self, entry: LedgerEntry) -> LedgerEntry:
        self.db.add(entry)
        self.db.flush()
        return entry

    def create_pair(
        self, debit: LedgerEntry, credit: LedgerEntry
    ) -> tuple[LedgerEntry, LedgerEntry]:
        """Crée les deux écritures du double-entry ledger en une seule flush."""
        self.db.add(debit)
        self.db.add(credit)
        self.db.flush()
        return debit, credit
