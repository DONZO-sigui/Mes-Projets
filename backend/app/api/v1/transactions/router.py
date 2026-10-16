"""
Routes Transactions — ÉTAPE 6 + ÉTAPE 7 + ÉTAPE 13 + ÉTAPE 14

POST /transactions
    Body  : TransferRequest (receiver_wallet_id, montant, devise, motif)
    Header: Idempotency-Key (obligatoire, 8-100 chars)
    Auth  : Bearer token obligatoire
    → 201 TransactionRead   (nouvelle transaction)
    → 200 TransactionRead   (même Idempotency-Key → idempotent)
    → 400 Bad Request       (clé idempotence réutilisée, payload différent)
    → 401 Unauthorized      (token absent/invalide)
    → 403 Forbidden         (utilisateur suspendu)
    → 404 Not Found         (wallet destinataire inconnu)
    → 409 Conflict          (solde insuffisant, wallet inactif, sender=rcv)
    → 422 Unprocessable     (validation Pydantic)

GET /transactions/me
    Auth  : Bearer token obligatoire
    Query : page, limit, statut, devise, date_from, date_to,
            reference, sort_by, sort_dir
    → 200 TransactionListResponse

GET /transactions/{transaction_id}
    Auth  : Bearer token obligatoire
    IDOR  : sender ou receiver seulement
    → 200 TransactionDetailResponse
    → 401 Non authentifié
    → 404 Introuvable ou accès refusé

GET /transactions/status — diagnostic (non authentifié)
"""
import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.wallet_repository import WalletRepository
from app.repositories.user_repository import UserRepository
from app.schemas.transaction import (
    TransactionDetailResponse,
    TransactionListParams,
    TransactionListResponse,
    TransactionRead,
    TransferRequest,
    WalletPartyInfo,
)
from app.services.notification_service import NotificationService
from app.services.transaction_service import (
    CurrencyMismatchError,
    IdempotencyConflictError,
    InsufficientFundsError,
    SelfTransferError,
    TransactionService,
    WalletInactiveError,
    WalletNotFoundError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Whitelist de tri — jamais passer du texte utilisateur brut à ORDER BY
_SORT_FIELDS: dict = {
    "created_at": Transaction.created_at,
    "montant": Transaction.montant,
    "statut": Transaction.statut,
}


# ─── POST /transactions ───────────────────────────────────────

@router.post(
    "",
    response_model=TransactionRead,
    summary="Initier un transfert financier",
    responses={
        200: {"description": "Transaction idempotente (déjà existante)"},
        201: {"description": "Nouvelle transaction créée"},
        400: {"description": "Clé d'idempotence réutilisée, payload différent"},
        401: {"description": "Token absent ou invalide"},
        403: {"description": "Compte suspendu"},
        404: {"description": "Wallet destinataire introuvable"},
        409: {"description": "Solde insuffisant, wallet inactif, auto-transfert"},
        422: {"description": "Données invalides"},
    },
)
def create_transfer(
    body: TransferRequest,
    response: Response,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=8,
        max_length=100,
        description="Clé unique cliente pour éviter les doubles transferts.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionRead:
    svc = TransactionService(db)
    pre_existing = TransactionRepository(db).get_by_idempotency_key(
        idempotency_key
    )

    try:
        tx = svc.transfer(
            sender_user_id=current_user.id,
            receiver_wallet_id=body.receiver_wallet_id,
            montant=body.montant,
            devise=body.devise,
            idempotency_key=idempotency_key,
            motif=body.motif,
        )
    except IdempotencyConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except SelfTransferError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except WalletNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except WalletInactiveError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except CurrencyMismatchError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except InsufficientFundsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    db.commit()

    # Best-effort notifications — never block a committed transaction
    if pre_existing is None:
        try:
            notif_svc = NotificationService(db)
            montant_str = f"{tx.montant:,.0f} {tx.devise}"

            # Notification expéditeur
            notif_svc.create_notification(
                user_id=current_user.id,
                type_="TRANSFER_COMPLETED",
                title="Transfert effectué",
                message=f"Votre transfert de {montant_str} a été effectué.",
                metadata={"transaction_id": str(tx.id), "montant": str(tx.montant), "devise": tx.devise},
            )

            # Notification destinataire
            wallet_repo = WalletRepository(db)
            user_repo = UserRepository(db)
            receiver_wallet = wallet_repo.get_by_id(tx.receiver_wallet_id)
            if receiver_wallet:
                receiver = user_repo.get_by_id(receiver_wallet.user_id)
                if receiver:
                    notif_svc.create_notification(
                        user_id=receiver.id,
                        type_="TRANSFER_RECEIVED",
                        title="Transfert reçu",
                        message=f"Vous avez reçu {montant_str}.",
                        metadata={"transaction_id": str(tx.id), "montant": str(tx.montant), "devise": tx.devise},
                    )

            db.commit()
        except Exception:
            logger.exception("Notification transfer failed — non-blocking")
            db.rollback()

    if pre_existing is None:
        response.status_code = status.HTTP_201_CREATED

    return TransactionRead.model_validate(tx)


# ─── GET /transactions/me ─────────────────────────────────────

@router.get(
    "/me",
    response_model=TransactionListResponse,
    summary="Historique paginé des transactions de l'utilisateur",
    responses={
        200: {"description": "Liste paginée des transactions"},
        401: {"description": "Token absent ou invalide"},
        404: {"description": "Wallet introuvable"},
    },
)
def list_my_transactions(
    params: TransactionListParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    wallet_repo = WalletRepository(db)
    tx_repo = TransactionRepository(db)

    wallet = wallet_repo.get_by_user_id(current_user.id)
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet introuvable.",
        )

    sort_col = _SORT_FIELDS[params.sort_by]
    offset = (params.page - 1) * params.limit

    transactions = tx_repo.list_for_user(
        wallet.id,
        statut=params.statut,
        devise=params.devise,
        date_from=params.date_from,
        date_to=params.date_to,
        reference=params.reference,
        sort_col=sort_col,
        sort_dir=params.sort_dir,
        offset=offset,
        limit=params.limit,
    )
    total = tx_repo.count_for_user(
        wallet.id,
        statut=params.statut,
        devise=params.devise,
        date_from=params.date_from,
        date_to=params.date_to,
        reference=params.reference,
    )

    return TransactionListResponse(
        total=total,
        page=params.page,
        limit=params.limit,
        items=[TransactionRead.model_validate(tx) for tx in transactions],
    )


# ─── GET /transactions/{transaction_id} ──────────────────────

@router.get(
    "/{transaction_id}",
    response_model=TransactionDetailResponse,
    summary="Détail d'une transaction (IDOR-safe)",
    responses={
        200: {"description": "Détail de la transaction"},
        401: {"description": "Non authentifié"},
        404: {"description": "Transaction introuvable ou accès refusé"},
    },
)
def get_transaction_detail(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionDetailResponse:
    wallet_repo = WalletRepository(db)
    tx_repo = TransactionRepository(db)

    wallet = wallet_repo.get_by_user_id(current_user.id)
    if wallet is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction introuvable.")

    tx = tx_repo.get_for_user(transaction_id, wallet.id)
    if tx is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction introuvable.")

    return TransactionDetailResponse(
        id=tx.id,
        reference=tx.reference,
        montant=tx.montant,
        frais=tx.frais,
        montant_total=tx.montant_total,
        devise=tx.devise,
        statut=tx.statut,
        motif=tx.motif,
        confirmed_at=tx.confirmed_at,
        created_at=tx.created_at,
        updated_at=tx.updated_at,
        sender=WalletPartyInfo(
            nom=tx.sender_wallet.nom,
            prenom=tx.sender_wallet.prenom,
        ),
        receiver=WalletPartyInfo(
            nom=tx.receiver_wallet.nom,
            prenom=tx.receiver_wallet.prenom,
        ),
    )


# ─── GET /transactions/status ─────────────────────────────────

@router.get(
    "/status",
    summary="Transactions module status",
    include_in_schema=False,
)
def transactions_status(db: Session = Depends(get_db)):
    svc = TransactionService(db)
    return {
        "module": "transactions",
        "status": "ready",
        "total_transactions": svc.count(),
    }
