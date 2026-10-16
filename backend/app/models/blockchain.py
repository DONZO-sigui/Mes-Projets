"""
Blockchain de traçabilité — PAS la source de vérité financière.
La source de vérité financière est : PostgreSQL + ledger_entries.
La blockchain sert à la traçabilité et à la démonstration du mécanisme PoW.

Vérification future :
    hash       = SHA-256(SHA-256(index + previous_hash + timestamp + nonce + data))
    difficulty = nombre de zéros en tête du hash
    PoW        = hash[:difficulty] == "0" * difficulty
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    String, Integer, Boolean, DateTime, JSON,
    CheckConstraint, func, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (
        CheckConstraint("difficulty >= 0", name="ck_blocks_difficulty_positive"),
        CheckConstraint("nonce >= 0", name="ck_blocks_nonce_positive"),
        CheckConstraint(
            "statut IN ('VALID','INVALID','PENDING')",
            name="ck_blocks_statut",
        ),
        UniqueConstraint("hash", name="uq_blocks_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    previous_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    nonce: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    statut: Mapped[str] = mapped_column(
        String(10), nullable=False, default="PENDING"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transaction: Mapped["Transaction | None"] = relationship(  # noqa: F821
        "Transaction",
        foreign_keys=[transaction_id],
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Block index={self.index} hash={self.hash[:12]}… statut={self.statut}>"
