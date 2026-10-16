"""
Routes Wallets — ÉTAPE 5

GET /wallets/me          → wallet de l'utilisateur connecté
GET /wallets/me/balance  → solde seul (lecture rapide)
GET /wallets/status      → diagnostic module (non authentifié)

Règle d'ownership :
  Le backend résout toujours user → wallet via current_user.id.
  Le frontend ne fournit jamais de wallet_id pour accéder à ses données.
  Ceci empêche l'IDOR (Insecure Direct Object Reference).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.wallet_repository import WalletRepository
from app.schemas.wallet import WalletBalance, WalletDepositRequest, WalletRead
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/wallets", tags=["Wallets"])


# ─── Endpoints authentifiés ───────────────────────────────────

@router.get(
    "/me",
    response_model=WalletRead,
    summary="Wallet de l'utilisateur connecté",
)
def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletRead:
    repo = WalletRepository(db)
    wallet = repo.get_by_user_id(current_user.id)
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun wallet associé à ce compte.",
        )
    return WalletRead.model_validate(wallet)


@router.get(
    "/me/balance",
    response_model=WalletBalance,
    summary="Solde du wallet de l'utilisateur connecté",
)
def get_my_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletBalance:
    repo = WalletRepository(db)
    wallet = repo.get_by_user_id(current_user.id)
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun wallet associé à ce compte.",
        )
    return WalletBalance(
        wallet_id=wallet.id,
        solde=wallet.solde,
        devise=wallet.devise,
        statut=wallet.statut,
    )


@router.post(
    "/me/deposit",
    response_model=WalletRead,
    summary="Recharger/créditer le wallet de l'utilisateur connecté",
)
def deposit_to_my_wallet(
    body: WalletDepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletRead:
    repo = WalletRepository(db)
    wallet = repo.get_by_user_id(current_user.id)
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun wallet associé à ce compte.",
        )
    if wallet.statut != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Wallet {wallet.statut}.",
        )
    locked_wallet = repo.get_for_update(wallet.id)
    repo.update_solde(locked_wallet, locked_wallet.solde + body.montant)
    db.commit()
    db.refresh(locked_wallet)
    return WalletRead.model_validate(locked_wallet)


# ─── Endpoint de diagnostic (non authentifié) ─────────────────

@router.get("/status", summary="Wallets module status")
def wallets_status(db: Session = Depends(get_db)):
    svc = WalletService(db)
    return {
        "module": "wallets",
        "status": "ready",
        "total_wallets": svc.count(),
    }
