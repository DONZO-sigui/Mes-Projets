"""
Routes Bénéficiaires — ÉTAPE 11 + ÉTAPE 13

GET    /beneficiaries            → liste paginée du current_user
POST   /beneficiaries            → créer un bénéficiaire
GET    /beneficiaries/{id}       → détail (IDOR-safe)
PATCH  /beneficiaries/{id}       → modifier name / nickname uniquement
DELETE /beneficiaries/{id}       → supprimer (IDOR-safe)

Protection IDOR :
  Toutes les opérations sur un bénéficiaire sont scopées par current_user.id.
  Un utilisateur ne peut jamais accéder au bénéficiaire d'un autre.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.beneficiary import (
    BeneficiaryCreate,
    BeneficiaryListResponse,
    BeneficiaryResponse,
    BeneficiaryUpdate,
)
from app.services.beneficiary_service import (
    BeneficiaryDuplicateError,
    BeneficiaryNotFoundError,
    BeneficiaryService,
    BeneficiarySelfWalletError,
    BeneficiaryWalletInactiveError,
    BeneficiaryWalletNotFoundError,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiaries"])


# ─── GET /beneficiaries ───────────────────────────────────────

@router.get(
    "",
    response_model=BeneficiaryListResponse,
    summary="Liste des bénéficiaires de l'utilisateur connecté",
)
def list_beneficiaries(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BeneficiaryListResponse:
    svc = BeneficiaryService(db)
    return svc.list(current_user.id, page=page, limit=limit)


# ─── POST /beneficiaries ──────────────────────────────────────

@router.post(
    "",
    response_model=BeneficiaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enregistrer un nouveau bénéficiaire",
    responses={
        201: {"description": "Bénéficiaire créé"},
        401: {"description": "Non authentifié"},
        404: {"description": "Wallet introuvable"},
        409: {"description": "Doublon ou auto-bénéficiaire ou wallet inactif"},
        422: {"description": "Données invalides"},
    },
)
def create_beneficiary(
    data: BeneficiaryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BeneficiaryResponse:
    svc = BeneficiaryService(db)
    try:
        result = svc.create(current_user.id, data)
        db.commit()
    except BeneficiaryWalletNotFoundError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    except BeneficiaryWalletInactiveError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except BeneficiarySelfWalletError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except BeneficiaryDuplicateError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except Exception:
        db.rollback()
        raise

    # Best-effort notification
    try:
        NotificationService(db).create_notification(
            user_id=current_user.id,
            type_="BENEFICIARY_CREATED",
            title="Bénéficiaire ajouté",
            message=f"Le bénéficiaire « {result.name} » a été ajouté à votre liste.",
            metadata={"beneficiary_id": str(result.id)},
        )
        db.commit()
    except Exception:
        logger.exception("Notification BENEFICIARY_CREATED failed — non-blocking")
        db.rollback()

    return result


# ─── GET /beneficiaries/{id} ──────────────────────────────────

@router.get(
    "/{beneficiary_id}",
    response_model=BeneficiaryResponse,
    summary="Détail d'un bénéficiaire (IDOR-safe)",
)
def get_beneficiary(
    beneficiary_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BeneficiaryResponse:
    svc = BeneficiaryService(db)
    try:
        return svc.get(current_user.id, beneficiary_id)
    except BeneficiaryNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


# ─── PATCH /beneficiaries/{id} ───────────────────────────────

@router.patch(
    "/{beneficiary_id}",
    response_model=BeneficiaryResponse,
    summary="Modifier nom / surnom d'un bénéficiaire",
    responses={
        200: {"description": "Bénéficiaire mis à jour"},
        404: {"description": "Bénéficiaire introuvable"},
        422: {"description": "Données invalides"},
    },
)
def update_beneficiary(
    beneficiary_id: uuid.UUID,
    data: BeneficiaryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BeneficiaryResponse:
    if data.name is None and data.nickname is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Au moins un champ (name ou nickname) doit être fourni.",
        )
    svc = BeneficiaryService(db)
    try:
        result = svc.update(current_user.id, beneficiary_id, data)
        db.commit()
        return result
    except BeneficiaryNotFoundError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    except Exception:
        db.rollback()
        raise


# ─── DELETE /beneficiaries/{id} ──────────────────────────────

@router.delete(
    "/{beneficiary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer un bénéficiaire (lien uniquement)",
    responses={
        204: {"description": "Bénéficiaire supprimé"},
        404: {"description": "Bénéficiaire introuvable"},
    },
)
def delete_beneficiary(
    beneficiary_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    svc = BeneficiaryService(db)
    try:
        deleted = svc.get(current_user.id, beneficiary_id)
        svc.delete(current_user.id, beneficiary_id)
        db.commit()
    except BeneficiaryNotFoundError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    except Exception:
        db.rollback()
        raise

    # Best-effort notification
    try:
        NotificationService(db).create_notification(
            user_id=current_user.id,
            type_="BENEFICIARY_DELETED",
            title="Bénéficiaire supprimé",
            message=f"Le bénéficiaire « {deleted.name} » a été retiré de votre liste.",
            metadata={"beneficiary_id": str(beneficiary_id)},
        )
        db.commit()
    except Exception:
        logger.exception("Notification BENEFICIARY_DELETED failed — non-blocking")
        db.rollback()
