"""
Routes Notifications — ÉTAPE 13

GET    /notifications                → liste paginée (optionnel ?unread=true)
GET    /notifications/unread-count   → {"count": N}
PATCH  /notifications/{id}/read      → marquer comme lue (IDOR-safe)
POST   /notifications/read-all       → marquer toutes comme lues

IDOR : toutes les opérations scopées par current_user.id.
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import (
    NotificationNotFoundError,
    NotificationService,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ─── GET /notifications ───────────────────────────────────────

@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Liste paginée des notifications de l'utilisateur",
    responses={
        200: {"description": "Liste paginée"},
        401: {"description": "Non authentifié"},
    },
)
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    unread: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    svc = NotificationService(db)
    return svc.get_user_notifications(
        current_user.id, page=page, limit=limit, unread_only=unread
    )


# ─── GET /notifications/unread-count ─────────────────────────

@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Nombre de notifications non lues",
    responses={
        200: {"description": "Compteur"},
        401: {"description": "Non authentifié"},
    },
)
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadCountResponse:
    svc = NotificationService(db)
    return svc.count_unread(current_user.id)


# ─── PATCH /notifications/{id}/read ─────────────────────────

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Marquer une notification comme lue (IDOR-safe)",
    responses={
        200: {"description": "Notification marquée comme lue"},
        401: {"description": "Non authentifié"},
        404: {"description": "Notification introuvable"},
    },
)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    svc = NotificationService(db)
    try:
        result = svc.mark_as_read(current_user.id, notification_id)
        db.commit()
        return result
    except NotificationNotFoundError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    except Exception:
        db.rollback()
        raise


# ─── POST /notifications/read-all ────────────────────────────

@router.post(
    "/read-all",
    summary="Marquer toutes les notifications comme lues",
    responses={
        200: {"description": "Nombre de notifications mises à jour"},
        401: {"description": "Non authentifié"},
    },
)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    svc = NotificationService(db)
    count = svc.mark_all_as_read(current_user.id)
    db.commit()
    return {"updated": count}
