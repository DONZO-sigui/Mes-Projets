import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.core.security import hash_token


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_jti(self, jti: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.jti == jti)
        return self.db.scalar(stmt)

    def create(
        self,
        user_id: uuid.UUID,
        token_raw: str,
        jti: str,
        expires_at: datetime,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> RefreshToken:
        rt = RefreshToken(
            user_id=user_id,
            jti=jti,
            token_hash=hash_token(token_raw),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(rt)
        self.db.flush()
        return rt

    def update_last_used(self, rt: RefreshToken) -> RefreshToken:
        """Met à jour last_used_at au moment de la rotation."""
        rt.last_used_at = datetime.now(tz=timezone.utc)
        self.db.flush()
        return rt

    def get_by_id_for_user(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> RefreshToken | None:
        """Charge une session par ID, scopé à l'utilisateur (IDOR-safe)."""
        stmt = select(RefreshToken).where(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user_id,
        )
        return self.db.scalar(stmt)


    def revoke(self, rt: RefreshToken) -> RefreshToken:
        rt.revoked_at = datetime.now(tz=timezone.utc)
        self.db.flush()
        return rt

    def revoke_all_for_user(self, user_id: uuid.UUID) -> int:
        now = datetime.now(tz=timezone.utc)
        stmt = (
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        )
        tokens = list(self.db.scalars(stmt))
        for t in tokens:
            t.revoked_at = now
        self.db.flush()
        return len(tokens)

    def verify_token_hash(self, rt: RefreshToken, token_raw: str) -> bool:
        """Vérifie que le token brut correspond au hash stocké."""
        return rt.token_hash == hash_token(token_raw)

    def list_active_for_user(self, user_id: uuid.UUID) -> list[RefreshToken]:
        """Tokens non révoqués, non expirés — du plus récent au plus ancien."""
        now = datetime.now(tz=timezone.utc)
        stmt = (
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        )
        return list(self.db.scalars(stmt))
