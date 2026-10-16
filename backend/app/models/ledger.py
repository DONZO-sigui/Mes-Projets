"""
Double-entry ledger : chaque Transaction génère exactement deux LedgerEntry.
    DEBIT  → wallet source      (solde diminue)
    CREDIT → wallet destination (solde augmente)

Les écritures sont atomiques dans la même transaction PostgreSQL.
"""
import uuid
from decimal import Decimal
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, CheckConstraint, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint(
            "type_mouvement IN ('DEBIT','CREDIT')",
            name="ck_ledger_entries_type_mouvement",
        ),
        CheckConstraint(
            "devise IN ('GNF','EUR','USD')",
            name="ck_ledger_entries_devise",
        ),
        CheckConstraint(
            "montant > 0",
            name="ck_ledger_entries_montant_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    type_mouvement: Mapped[str] = mapped_column(
        String(10), nullable=False
    )
    montant: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False
    )
    devise: Mapped[str] = mapped_column(String(3), nullable=False, default="GNF")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    transaction: Mapped["Transaction"] = relationship(  # noqa: F821
        "Transaction",
        back_populates="ledger_entries",
    )
    wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        back_populates="ledger_entries",
    )

    def __repr__(self) -> str:
        return (
            f"<LedgerEntry {self.type_mouvement} {self.montant} {self.devise}"
            f" wallet={self.wallet_id}>"
        )
