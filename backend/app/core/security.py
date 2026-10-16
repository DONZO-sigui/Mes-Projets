"""
Sécurité GNF-Token — ÉTAPE 4 + ÉTAPE 10

Hashage : Argon2id (argon2-cffi 23.1.0)
    - Algorithme gagnant du Password Hashing Competition (PHC)
    - Résistant aux attaques GPU/ASIC
    - time_cost=3, memory_cost=65536 KB, parallelism=4 (défauts)
    - Remplace passlib[bcrypt] qui utilisait bcrypt (moins résistant aux GPU)

JWT : python-jose + HS256
    - Access token : 15 min (configurable)
    - Refresh token : 7 jours (configurable, révocable en DB)
    - Claims : sub, type, jti, iat, exp, (role pour access)
    - iat vérifié : token à iat futur rejeté (tolérance 5 s horloge)

Transport des tokens côté client :
    - Bearer token dans Authorization header
    - Access token : mémoire React (AuthContext) — jamais persisté
    - Refresh token : localStorage — risque XSS documenté
    - En production : migrer vers httpOnly cookie + SameSite=Strict + HTTPS

Rate limiting :
    - Non implémenté (Redis absent)
    - À ajouter avec slowapi + Redis en production multi-worker

CSRF :
    - Non applicable avec Authorization header (pas de cookies)
    - Si migration vers cookies : ajouter X-CSRF-Token + SameSite

Politique mot de passe (ÉTAPE 10) :
    - Minimum 8 caractères
    - Au moins 1 majuscule
    - Au moins 1 chiffre
    - Maximum 128 caractères
"""
import hashlib
import re
import uuid
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import (
    InvalidHashError,
    VerificationError,
    VerifyMismatchError,
)
from jose import JWTError, jwt  # noqa: F401 — JWTError re-exported for callers

from app.core.config import settings

_ph = PasswordHasher()


# ─── Hashage Argon2id ─────────────────────────────────────────

def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """Détecte si le hash doit être recalculé (paramètres obsolètes)."""
    return _ph.check_needs_rehash(hashed)


# ─── Hash SHA-256 pour refresh token stocké en DB ─────────────

def hash_token(token: str) -> str:
    """SHA-256 du token brut — seule valeur stockée en DB."""
    return hashlib.sha256(token.encode()).hexdigest()


# ─── JWT ──────────────────────────────────────────────────────

def create_access_token(
    user_id: uuid.UUID,
    role: str,
    expires_delta: timedelta | None = None,
    session_jti: str | None = None,
) -> str:
    jti = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)
    expire = now + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict = {
        "sub": str(user_id),
        "type": "access",
        "role": role,
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    if session_jti is not None:
        payload["session_jti"] = session_jti
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    user_id: uuid.UUID,
    expires_delta: timedelta | None = None,
) -> tuple[str, str, datetime]:
    """
    Retourne (token_brut, jti, expires_at).
    Seul token_brut est renvoyé au client.
    jti et hash(token_brut) sont stockés en DB.
    """
    jti = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)
    expire = now + (
        expires_delta
        or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token, jti, expire


_IAT_CLOCK_SKEW_SECONDS = 5


def decode_token(token: str) -> dict:
    """
    Décode et valide un JWT.
    Lève JWTError si invalide, expiré, mal signé,
    ou si iat est dans le futur (± tolérance horloge).
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    iat = payload.get("iat")
    if iat is not None:
        now_ts = datetime.now(tz=timezone.utc).timestamp()
        if float(iat) > now_ts + _IAT_CLOCK_SKEW_SECONDS:
            raise JWTError("Token issued in future (iat claim invalid)")
    return payload


# ─── Politique de mot de passe ────────────────────────────────

MIN_PASSWORD_LEN = 8
MAX_PASSWORD_LEN = 128


def validate_password_policy(password: str) -> None:
    """
    Politique de complexité — ne jamais logger le mot de passe.
    Lève ValueError si la politique n'est pas respectée.
    """
    if not password or len(password) < MIN_PASSWORD_LEN:
        raise ValueError(
            f"Le mot de passe doit contenir au moins "
            f"{MIN_PASSWORD_LEN} caractères."
        )
    if len(password) > MAX_PASSWORD_LEN:
        raise ValueError(
            f"Le mot de passe ne doit pas dépasser "
            f"{MAX_PASSWORD_LEN} caractères."
        )
    if not re.search(r"[A-Z]", password):
        raise ValueError(
            "Le mot de passe doit contenir au moins une lettre majuscule."
        )
    if not re.search(r"[0-9]", password):
        raise ValueError(
            "Le mot de passe doit contenir au moins un chiffre."
        )
