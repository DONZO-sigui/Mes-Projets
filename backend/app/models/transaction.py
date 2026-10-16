import uuid
from decimal import Decimal
from datetime import datetime
from typing import Any

from sqlalchemy import String, Numeric, DateTime, CheckConstraint, JSON, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base


STATUTS_VALIDES = (
    "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REVERSED"
)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "statut IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','REVERSED')",
            name="ck_transactions_statut",
        ),
        CheckConstraint(
            "devise IN ('GNF','EUR','USD')",
            name="ck_transactions_devise",
        ),
        CheckConstraint(
            "montant > 0",
            name="ck_transactions_montant_positive",
        ),
        CheckConstraint(
            "frais >= 0",
            name="ck_transactions_frais_positive",
        ),
        CheckConstraint(
            "sender_wallet_id != receiver_wallet_id",
            name="ck_transactions_no_self_transfer",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reference: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True
    )
    sender_wallet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    receiver_wallet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    montant: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False
    )
    devise: Mapped[str] = mapped_column(String(3), nullable=False, default="GNF")
    frais: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0.0000")
    )
    montant_total: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False
    )
    statut: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING", index=True
    )
    # Texte libre — jamais rendu comme HTML côté client
    motif: Mapped[str | None] = mapped_column(String(250), nullable=True)
    # Clé d'idempotence pour éviter les doubles transferts
    idempotency_key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON, nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sender_wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[sender_wallet_id],
        back_populates="transactions_sent",
    )
    receiver_wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[receiver_wallet_id],
        back_populates="transactions_received",
    )
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship(  # noqa: F821
        "LedgerEntry",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Transaction ref={self.reference} montant={self.montant} statut={self.statut}>"
