"""
Dépendances FastAPI réutilisables — authentification et RBAC.

Principe d'autorisation (à appliquer dans toutes les routes futures) :
    current_user.id == resource.owner_id
    → jamais faire confiance à un user_id fourni par le frontend
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)


def _get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'accès manquant.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_current_user(
    token: str = Depends(_get_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Dépendance principale d'authentification.
    1. Vérifie la signature JWT
    2. Vérifie exp
    3. Vérifie type == "access"
    4. Charge l'utilisateur depuis la DB
    5. Vérifie le statut du compte
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except JWTError:
        raise credentials_error

    if payload.get("type") != "access":
        raise credentials_error

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_error

    import uuid as _uuid
    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise credentials_error

    user: User | None = db.get(User, uid)
    if user is None:
        raise credentials_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte suspendu ou désactivé.",
        )
    return user


def get_session_jti(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str | None:
    """Extrait session_jti du payload de l'access token (pour is_current)."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(credentials.credentials)
        return payload.get("session_jti")
    except JWTError:
        return None


def require_role(*roles: str):
    """
    Fabrique de dépendance RBAC.

    Usage :
        @router.get("/admin", dependencies=[Depends(require_role("ADMIN"))])
        async def admin_only(): ...
    """
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Droits insuffisants.",
            )
        return user
    return _check
