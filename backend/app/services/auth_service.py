"""
Service d'authentification GNF-Token — ÉTAPE 4

Responsabilités :
  register  — inscription + création wallet atomique
  login     — vérification identifiants + émission tokens
  refresh   — rotation du refresh token
  logout    — révocation du refresh token

Toutes les opérations DB passent par les repositories.
Les erreurs métier remontent comme exceptions Python ;
le router les traduit en codes HTTP.
"""
import uuid

from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    needs_rehash,
    validate_password_policy,
    verify_password,
)
from app.models.user import User
from app.models.wallet import Wallet
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, UserResponse


# Hash Argon2id pré-calculé — utilisé pour la protection timing attack
# (vérification à coût constant même si l'email est inconnu)
_DUMMY_HASH: str = hash_password("__gnf_timing_protection_dummy__")


# ─── Exceptions métier ────────────────────────────────────────

class DuplicateEmailError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountInactiveError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


# ─── Helpers ─────────────────────────────────────────────────

def _generate_nif(user_id: uuid.UUID) -> str:
    """Génère un NIF unique basé sur l'UUID utilisateur (max 20 chars)."""
    return "GNF" + user_id.hex[:12].upper()


def _build_token_response(
    user: User,
    db: Session,
    rt_repo: RefreshTokenRepository,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> TokenResponse:
    """Crée access + refresh token et persiste le refresh en DB."""
    token_raw, jti, expires_at = create_refresh_token(user.id)

    rt_repo.create(
        user_id=user.id,
        token_raw=token_raw,
        jti=jti,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    # session_jti lie l'access token à la session refresh (pour is_current)
    access_token = create_access_token(
        user.id, user.role, session_jti=jti
    )

    from app.core.config import settings
    return TokenResponse(
        access_token=access_token,
        refresh_token=token_raw,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# ─── Service ─────────────────────────────────────────────────

class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.rt_repo = RefreshTokenRepository(db)

    # ── Inscription ───────────────────────────────────────────

    def register(
        self,
        data: UserCreate,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        """
        Inscription atomique :
          1. Unicité email
          2. Politique mot de passe
          3. Création User
          4. Création Wallet GNF lié
          5. Émission tokens
        """
        if self.user_repo.email_exists(data.email):
            raise DuplicateEmailError(
                f"L'adresse e-mail '{data.email}' est déjà utilisée."
            )

        validate_password_policy(data.password)

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            role="USER",
            status="ACTIVE",
            is_email_verified=False,
        )
        self.user_repo.create(user)

        # Wallet GNF créé automatiquement à l'inscription
        wallet = Wallet(
            user_id=user.id,
            nif=_generate_nif(user.id),
            nom=data.last_name,
            prenom=data.first_name,
            devise="GNF",
        )
        self.db.add(wallet)
        self.db.flush()

        return _build_token_response(
            user, self.db, self.rt_repo, user_agent, ip_address
        )

    # ── Connexion ─────────────────────────────────────────────

    def login(
        self,
        email: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        """
        Connexion :
          1. Recherche user par email (timing constant : toujours vérifier)
          2. Vérification hash Argon2id
          3. Vérification statut
          4. Mise à jour last_login_at
          5. Réhachage si paramètres obsolètes
          6. Émission tokens
        """
        user = self.user_repo.get_by_email(email)

        # Vérification constante même si l'utilisateur n'existe pas
        # pour résister à l'énumération d'emails (timing attack).
        # _DUMMY_HASH est un vrai hash Argon2id précalculé au démarrage.
        if user is None:
            verify_password(password, _DUMMY_HASH)
            raise InvalidCredentialsError("Identifiants invalides.")

        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("Identifiants invalides.")

        if not user.is_active:
            raise AccountInactiveError(
                "Compte suspendu ou désactivé. Contactez le support."
            )

        # Rehash si les paramètres Argon2 ont changé
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
            self.db.flush()

        self.user_repo.update_last_login(user)

        return _build_token_response(
            user, self.db, self.rt_repo, user_agent, ip_address
        )

    # ── Renouvellement ────────────────────────────────────────

    def refresh(
        self,
        token_raw: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        """
        Rotation du refresh token :
          1. Décode JWT (vérifie signature + exp)
          2. Vérifie type == "refresh"
          3. Charge depuis DB par JTI
          4. Détection réutilisation (révoque TOUT si token déjà révoqué)
          5. Vérifie non-expiré
          6. Vérifie hash du token brut
          7. Vérifie statut user
          8. Met à jour last_used_at
          9. Révoque l'ancien token
         10. Émet de nouveaux tokens
        """
        try:
            payload = self._decode_refresh_jwt(token_raw)
        except (JWTError, ValueError):
            raise InvalidRefreshTokenError("Refresh token invalide ou expiré.")

        jti = payload.get("jti")
        if not jti:
            raise InvalidRefreshTokenError("Refresh token invalide.")

        rt = self.rt_repo.get_by_jti(jti)
        if rt is None:
            raise InvalidRefreshTokenError("Refresh token invalide.")

        # Détection de réutilisation : token déjà révoqué → vol probable.
        # On commit immédiatement les révocations AVANT de lever l'exception
        # pour ne pas les perdre si le router fait un rollback sur l'erreur.
        if rt.is_revoked:
            self.rt_repo.revoke_all_for_user(rt.user_id)
            self.db.commit()
            raise InvalidRefreshTokenError(
                "Token déjà utilisé — toutes les sessions ont été révoquées."
            )

        if rt.is_expired:
            raise InvalidRefreshTokenError("Refresh token expiré.")

        if not self.rt_repo.verify_token_hash(rt, token_raw):
            raise InvalidRefreshTokenError("Refresh token invalide.")

        user = self.user_repo.get_by_id(rt.user_id)
        if user is None or not user.is_active:
            raise InvalidRefreshTokenError(
                "Utilisateur introuvable ou inactif."
            )

        # Enregistre la date d'utilisation avant rotation
        self.rt_repo.update_last_used(rt)

        # Rotation : révoquer l'ancien avant d'émettre le nouveau
        self.rt_repo.revoke(rt)

        return _build_token_response(
            user, self.db, self.rt_repo, user_agent, ip_address
        )

    # ── Déconnexion ───────────────────────────────────────────

    def logout(self, token_raw: str) -> None:
        """
        Révoque le refresh token fourni.
        Silencieux si le token est déjà révoqué ou inconnu
        (idempotent — évite les erreurs côté client).
        """
        try:
            payload = self._decode_refresh_jwt(token_raw)
            jti = payload.get("jti")
            if jti:
                rt = self.rt_repo.get_by_jti(jti)
                if rt and not rt.is_revoked:
                    self.rt_repo.revoke(rt)
        except (JWTError, Exception):
            # Toujours 200 — ne pas révéler l'état du token au client
            pass

    # ── Helpers privés ────────────────────────────────────────

    def _decode_refresh_jwt(self, token_raw: str) -> dict:
        """Décode et valide le JWT refresh (type + exp)."""
        from app.core.security import decode_token
        payload = decode_token(token_raw)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        return payload
