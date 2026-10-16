"""
RefreshToken — persistance des refresh tokens en PostgreSQL.

Architecture de sécurité :
    - Seul le hash SHA-256 du token est stocké (jamais le token brut)
    - jti (JWT ID) permet la révocation individuelle
    - La rotation révoque l'ancien token à chaque utilisation
    - Un refresh token réutilisé après révocation déclenche une alerte

Transport côté client :
    - Le token brut est retourné UNE SEULE FOIS dans la réponse login/refresh
    - Le client le stocke en localStorage (risque XSS documenté)
    - En production, préférer httpOnly cookie + SameSite=Strict + HTTPS

Rate limiting sur /login, /register, /refresh :
    - Non implémenté ici (Redis absent)
    - À ajouter avec slowapi ou un middleware Redis en production
"""
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid


from app.db.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # JWT ID du refresh token — permet la révocation par jti
    jti: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True
    )
    # SHA-256 du token brut — jamais le token lui-même
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="refresh_tokens",
    )

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    @property
    def is_expired(self) -> bool:
        from datetime import timezone
        return datetime.now(tz=timezone.utc) >= self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.is_revoked and not self.is_expired

    def __repr__(self) -> str:
        return f"<RefreshToken jti={self.jti[:8]}… user={self.user_id} revoked={self.is_revoked}>"
