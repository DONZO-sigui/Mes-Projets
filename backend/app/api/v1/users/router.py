"""
Routes Utilisateurs — ÉTAPE 5 + ÉTAPE 12 + ÉTAPE 13 + ÉTAPE 15

GET    /users/me                      → profil de l'utilisateur connecté
PATCH  /users/me                      → mise à jour partielle du profil
POST   /users/me/password             → changement de mot de passe
GET    /users/me/sessions             → liste des sessions actives
DELETE /users/me/sessions             → révocation de toutes les sessions
DELETE /users/me/sessions/{id}        → révocation d'une session individuelle

Champs modifiables via PATCH : first_name, last_name uniquement.
Champs JAMAIS modifiables via cette route :
  role, status, password_hash, is_email_verified, balance, user_id
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_session_jti
from app.core.security import (
    hash_password,
    validate_password_policy,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    PasswordChangeRequest,
    SessionListResponse,
    SessionResponse,
    UserResponse,
    UserUpdate,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


# ─── GET /users/me ────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Profil de l'utilisateur connecté",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


# ─── PATCH /users/me ─────────────────────────────────────────

@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Mise à jour partielle du profil",
)
def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    if data.first_name is None and data.last_name is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Au moins un champ doit être fourni.",
        )

    repo = UserRepository(db)
    user = repo.update_profile(
        current_user,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    db.commit()
    return UserResponse.model_validate(user)


# ─── POST /users/me/password ─────────────────────────────────

@router.post(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Changer le mot de passe",
    responses={
        204: {"description": "Mot de passe modifié, sessions révoquées"},
        401: {"description": "Mot de passe actuel incorrect"},
        422: {"description": "Politique de mot de passe non respectée"},
    },
)
def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect.",
        )
    try:
        validate_password_policy(data.new_password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    current_user.password_hash = hash_password(data.new_password)
    db.flush()

    rt_repo = RefreshTokenRepository(db)
    rt_repo.revoke_all_for_user(current_user.id)
    db.commit()

    # Best-effort notification
    try:
        NotificationService(db).create_notification(
            user_id=current_user.id,
            type_="PASSWORD_CHANGED",
            title="Mot de passe modifié",
            message=(
                "Votre mot de passe a été modifié. "
                "Toutes vos sessions ont été révoquées."
            ),
        )
        db.commit()
    except Exception:
        logger.exception("Notification PASSWORD_CHANGED failed — non-blocking")
        db.rollback()


# ─── GET /users/me/sessions ──────────────────────────────────

@router.get(
    "/me/sessions",
    response_model=SessionListResponse,
    summary="Sessions actives (refresh tokens non révoqués)",
)
def list_sessions(
    current_user: User = Depends(get_current_user),
    session_jti: str | None = Depends(get_session_jti),
    db: Session = Depends(get_db),
) -> SessionListResponse:
    rt_repo = RefreshTokenRepository(db)
    tokens = rt_repo.list_active_for_user(current_user.id)
    items = []
    for t in tokens:
        resp = SessionResponse.model_validate(t)
        resp.is_current = (
            session_jti is not None and t.jti == session_jti
        )
        items.append(resp)
    return SessionListResponse(total=len(items), items=items)


# ─── DELETE /users/me/sessions/{session_id} ──────────────────

@router.delete(
    "/me/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Révoquer une session individuelle (IDOR-safe)",
    responses={
        204: {"description": "Session révoquée"},
        404: {"description": "Session introuvable"},
    },
)
def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    rt_repo = RefreshTokenRepository(db)
    rt = rt_repo.get_by_id_for_user(session_id, current_user.id)
    if rt is None or rt.is_revoked or rt.is_expired:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable.",
        )
    rt_repo.revoke(rt)
    db.commit()


# ─── DELETE /users/me/sessions ───────────────────────────────

@router.delete(
    "/me/sessions",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Révoquer toutes les sessions actives",
    responses={
        204: {"description": "Toutes les sessions révoquées"},
    },
)
def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    rt_repo = RefreshTokenRepository(db)
    rt_repo.revoke_all_for_user(current_user.id)
    db.commit()

    # Best-effort notification
    try:
        NotificationService(db).create_notification(
            user_id=current_user.id,
            type_="SESSION_REVOKED",
            title="Sessions révoquées",
            message="Toutes vos sessions actives ont été déconnectées.",
        )
        db.commit()
    except Exception:
        logger.exception("Notification SESSION_REVOKED failed — non-blocking")
        db.rollback()
