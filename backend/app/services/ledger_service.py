import uuid

from sqlalchemy.orm import Session

from app.models.ledger import LedgerEntry
from app.repositories.ledger_repository import LedgerRepository


class LedgerService:
    def __init__(self, db: Session) -> None:
        self.repo = LedgerRepository(db)

    def get_wallet_history(
        self, wallet_id: uuid.UUID, offset: int = 0, limit: int = 100
    ) -> list[LedgerEntry]:
        return self.repo.list_by_wallet(wallet_id, offset=offset, limit=limit)

    def get_transaction_entries(self, tx_id: uuid.UUID) -> list[LedgerEntry]:
        return self.repo.list_by_transaction(tx_id)
