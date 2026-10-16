"""
Routes d'authentification — ÉTAPE 4

POST /auth/register  → Inscription
POST /auth/login     → Connexion
POST /auth/refresh   → Rotation du refresh token
POST /auth/logout    → Révocation du refresh token
GET  /auth/me        → Profil utilisateur connecté
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import (
    AccountInactiveError,
    AuthService,
    DuplicateEmailError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── POST /auth/register ─────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inscription d'un nouvel utilisateur",
)
def register(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    service = AuthService(db)
    try:
        result = service.register(data, user_agent=ua, ip_address=ip)
        db.commit()
        return result
    except DuplicateEmailError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception:
        db.rollback()
        raise


# ─── POST /auth/login ────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Connexion — retourne access + refresh token",
)
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    service = AuthService(db)
    try:
        result = service.login(
            data.email, data.password, user_agent=ua, ip_address=ip
        )
        db.commit()
        return result
    except InvalidCredentialsError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except AccountInactiveError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except Exception:
        db.rollback()
        raise


# ─── POST /auth/refresh ──────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renouvellement — rotation du refresh token",
)
def refresh(
    data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    service = AuthService(db)
    try:
        result = service.refresh(
            data.refresh_token, user_agent=ua, ip_address=ip
        )
        db.commit()
        return result
    except InvalidRefreshTokenError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        db.rollback()
        raise


# ─── POST /auth/logout ───────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Déconnexion — révocation du refresh token",
)
def logout(
    data: LogoutRequest,
    db: Session = Depends(get_db),
) -> None:
    service = AuthService(db)
    service.logout(data.refresh_token)
    db.commit()


# ─── GET /auth/me ────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Profil de l'utilisateur authentifié",
)
def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
