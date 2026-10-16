import uuid
from datetime import datetime

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


class TransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, tx_id: uuid.UUID) -> Transaction | None:
        return self.db.get(Transaction, tx_id)

    def get_for_user(
        self, tx_id: uuid.UUID, wallet_id: uuid.UUID
    ) -> Transaction | None:
        """IDOR-safe : retourne la transaction seulement si wallet_id est
        expéditeur ou destinataire. Retourne None sinon (→ 404)."""
        stmt = select(Transaction).where(
            Transaction.id == tx_id,
            or_(
                Transaction.sender_wallet_id == wallet_id,
                Transaction.receiver_wallet_id == wallet_id,
            ),
        )
        return self.db.scalar(stmt)

    def get_by_reference(self, reference: str) -> Transaction | None:
        stmt = select(Transaction).where(
            Transaction.reference == reference
        )
        return self.db.scalar(stmt)

    def get_by_idempotency_key(self, key: str) -> Transaction | None:
        stmt = select(Transaction).where(
            Transaction.idempotency_key == key
        )
        return self.db.scalar(stmt)

    def list_by_wallet(
        self,
        wallet_id: uuid.UUID,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Transaction]:
        stmt = (
            select(Transaction)
            .where(
                or_(
                    Transaction.sender_wallet_id == wallet_id,
                    Transaction.receiver_wallet_id == wallet_id,
                )
            )
            .order_by(Transaction.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def list_for_user(
        self,
        wallet_id: uuid.UUID,
        *,
        statut: str | None = None,
        devise: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        reference: str | None = None,
        sort_col=Transaction.created_at,
        sort_dir: str = "desc",
        offset: int = 0,
        limit: int = 20,
    ) -> list[Transaction]:
        stmt = select(Transaction).where(
            or_(
                Transaction.sender_wallet_id == wallet_id,
                Transaction.receiver_wallet_id == wallet_id,
            )
        )
        if statut:
            stmt = stmt.where(Transaction.statut == statut)
        if devise:
            stmt = stmt.where(Transaction.devise == devise)
        if date_from:
            stmt = stmt.where(Transaction.created_at >= date_from)
        if date_to:
            stmt = stmt.where(Transaction.created_at <= date_to)
        if reference:
            stmt = stmt.where(Transaction.reference == reference)
        order = (
            sort_col.asc() if sort_dir == "asc" else sort_col.desc()
        )
        return list(
            self.db.scalars(stmt.order_by(order).offset(offset).limit(limit))
        )

    def count_for_user(
        self,
        wallet_id: uuid.UUID,
        *,
        statut: str | None = None,
        devise: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        reference: str | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Transaction)
            .where(
                or_(
                    Transaction.sender_wallet_id == wallet_id,
                    Transaction.receiver_wallet_id == wallet_id,
                )
            )
        )
        if statut:
            stmt = stmt.where(Transaction.statut == statut)
        if devise:
            stmt = stmt.where(Transaction.devise == devise)
        if date_from:
            stmt = stmt.where(Transaction.created_at >= date_from)
        if date_to:
            stmt = stmt.where(Transaction.created_at <= date_to)
        if reference:
            stmt = stmt.where(Transaction.reference == reference)
        return self.db.scalar(stmt) or 0

    def count(self) -> int:
        return (
            self.db.scalar(select(func.count()).select_from(Transaction))
            or 0
        )

    def create(self, transaction: Transaction) -> Transaction:
        self.db.add(transaction)
        self.db.flush()
        return transaction
