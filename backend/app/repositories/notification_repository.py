import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        user_id: uuid.UUID,
        type_: str,
        title: str,
        message: str,
        metadata_json: dict[str, Any] | None = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            metadata_json=metadata_json,
        )
        self.db.add(notif)
        self.db.flush()
        return notif

    def get_by_id_for_user(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> Notification | None:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        return self.db.scalar(stmt)

    def list_for_user(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
        unread_only: bool = False,
    ) -> list[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        stmt = (
            stmt.order_by(Notification.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count_for_user(
        self, user_id: uuid.UUID, unread_only: bool = False
    ) -> int:
        stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id
        )
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        return self.db.scalar(stmt) or 0

    def mark_as_read(self, notif: Notification) -> Notification:
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = datetime.now(tz=timezone.utc)
            self.db.flush()
        return notif

    def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        now = datetime.now(tz=timezone.utc)
        stmt = (
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        unread = list(self.db.scalars(stmt))
        for n in unread:
            n.is_read = True
            n.read_at = now
        self.db.flush()
        return len(unread)
