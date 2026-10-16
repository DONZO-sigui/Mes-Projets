"""
Notification — ÉTAPE 13

Stocke les notifications utilisateur générées par les événements métier
(transferts, sécurité, bénéficiaires, compte).

Types contrôlés côté backend uniquement.
Aucune donnée sensible (mot de passe, token, hash) n'est jamais stockée ici.
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base

# Types de notification autorisés — liste contrôlée côté backend uniquement
NOTIFICATION_TYPES = frozenset({
    "TRANSFER_COMPLETED",
    "TRANSFER_FAILED",
    "TRANSFER_RECEIVED",
    "PASSWORD_CHANGED",
    "SESSION_REVOKED",
    "SECURITY_ALERT",
    "BENEFICIARY_CREATED",
    "BENEFICIARY_DELETED",
    "ACCOUNT_UPDATED",
})


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id", "user_id"),
        Index("ix_notifications_user_is_read", "user_id", "is_read"),
        Index("ix_notifications_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Métadonnées facultatives — jamais de token/mot de passe/hash
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="notifications",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<Notification type={self.type} user={self.user_id} "
            f"read={self.is_read}>"
        )
