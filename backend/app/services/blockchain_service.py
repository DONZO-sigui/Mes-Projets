"""
BlockchainService — lecture uniquement à cette étape.

IMPORTANT : le mining réel (PoW SHA-256 synchrone) n'est PAS implémenté ici.
Le mining synchrone bloquerait le serveur ASGI et doit être traité
de façon asynchrone (file de tâches) lorsque Redis/Celery sera disponible.

Architecture prévue pour le mining :
    POST /blockchain/mine
        → file de tâches (Celery)
        → worker effectue PoW hors du thread FastAPI
        → résultat stocké en DB
        → client poll GET /blockchain/mine/{task_id}
"""
from sqlalchemy.orm import Session

from app.models.blockchain import Block
from app.repositories.blockchain_repository import BlockchainRepository


class BlockchainService:
    def __init__(self, db: Session) -> None:
        self.repo = BlockchainRepository(db)

    def get_chain(self, offset: int = 0, limit: int = 50) -> list[Block]:
        return self.repo.list_all(offset=offset, limit=limit)

    def get_last_block(self) -> Block | None:
        return self.repo.get_last_block()

    def count(self) -> int:
        return self.repo.count()
