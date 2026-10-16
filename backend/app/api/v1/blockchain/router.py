from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.blockchain_service import BlockchainService

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


@router.get("/status", summary="Blockchain module status")
def blockchain_status(db: Session = Depends(get_db)):
    svc = BlockchainService(db)
    last = svc.get_last_block()
    return {
        "module": "blockchain",
        "status": "ready",
        "total_blocks": svc.count(),
        "last_block_index": last.index if last else None,
        "last_block_hash": last.hash[:16] + "…" if last else None,
    }
