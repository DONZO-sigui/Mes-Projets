import uuid
from decimal import Decimal
from datetime import datetime

from sqlalchemy import (
    String, Numeric, DateTime, CheckConstraint, func, ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (
        CheckConstraint(
            "devise IN ('GNF','EUR','USD')",
            name="ck_wallets_devise",
        ),
        CheckConstraint(
            "statut IN ('ACTIVE','SUSPENDED','CLOSED')",
            name="ck_wallets_statut",
        ),
        CheckConstraint(
            "solde >= 0",
            name="ck_wallets_solde_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nif: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    ville: Mapped[str | None] = mapped_column(String(100), nullable=True)
    devise: Mapped[str] = mapped_column(
        String(3), nullable=False, default="GNF"
    )
    solde: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0.0000")
    )
    statut: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ACTIVE"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        back_populates="wallets",
        lazy="select",
    )
    transactions_sent: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        foreign_keys="Transaction.sender_wallet_id",
        back_populates="sender_wallet",
        lazy="select",
    )
    transactions_received: Mapped[  # noqa: F821
        list["Transaction"]
    ] = relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_wallet_id",
        back_populates="receiver_wallet",
        lazy="select",
    )
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship(  # noqa: F821
        "LedgerEntry",
        back_populates="wallet",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<Wallet nif={self.nif} solde={self.solde} {self.devise}>"
        )
