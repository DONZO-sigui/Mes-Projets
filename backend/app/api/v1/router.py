from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth.router import router as auth_router
from app.api.v1.users.router import router as users_router
from app.api.v1.wallets.router import router as wallets_router
from app.api.v1.transactions.router import router as transactions_router
from app.api.v1.blockchain.router import router as blockchain_router
from app.api.v1.mnbc.router import router as mnbc_router
from app.api.v1.beneficiaries.router import router as beneficiaries_router
from app.api.v1.notifications.router import router as notifications_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(wallets_router)
api_router.include_router(transactions_router)
api_router.include_router(blockchain_router)
api_router.include_router(mnbc_router)
api_router.include_router(beneficiaries_router)
api_router.include_router(notifications_router)
