"""
NotificationService — ÉTAPE 13

Gestion des notifications utilisateur.

Principes :
  - Types contrôlés par NOTIFICATION_TYPES (liste blanche côté backend)
  - IDOR : toutes les opérations scopées par user_id
  - Aucune donnée sensible (token, MDP, hash) dans les notifications
  - Les erreurs de notification ne bloquent jamais une transaction financière
"""
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.notification import NOTIFICATION_TYPES
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)


class NotificationNotFoundError(Exception):
    pass


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = NotificationRepository(db)

    def create_notification(
        self,
        user_id: uuid.UUID,
        type_: str,
        title: str,
        message: str,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Crée une notification après validation du type.
        Seuls les types de NOTIFICATION_TYPES sont autorisés.
        """
        if type_ not in NOTIFICATION_TYPES:
            raise ValueError(f"Type de notification non autorisé : {type_}")
        return self.repo.create(
            user_id=user_id,
            type_=type_,
            title=title,
            message=message,
            metadata_json=metadata,
        )

    def get_user_notifications(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        items = self.repo.list_for_user(user_id, page, limit, unread_only)
        total = self.repo.count_for_user(user_id, unread_only)
        unread_count = self.repo.count_for_user(user_id, unread_only=True)
        return NotificationListResponse(
            total=total,
            unread_count=unread_count,
            items=[NotificationResponse.model_validate(n) for n in items],
        )

    def count_unread(self, user_id: uuid.UUID) -> UnreadCountResponse:
        count = self.repo.count_for_user(user_id, unread_only=True)
        return UnreadCountResponse(count=count)

    def mark_as_read(
        self, user_id: uuid.UUID, notification_id: uuid.UUID
    ) -> NotificationResponse:
        notif = self.repo.get_by_id_for_user(notification_id, user_id)
        if notif is None:
            raise NotificationNotFoundError(
                "Notification introuvable."
            )
        self.repo.mark_as_read(notif)
        return NotificationResponse.model_validate(notif)

    def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        return self.repo.mark_all_as_read(user_id)
