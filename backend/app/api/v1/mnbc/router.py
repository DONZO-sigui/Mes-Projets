from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.mnbc_service import MNBCService
from app.schemas.mnbc import MNBCReserveRead

router = APIRouter(prefix="/mnbc", tags=["MNBC"])


@router.get("/status", summary="MNBC module status")
def mnbc_status(db: Session = Depends(get_db)):
    svc = MNBCService(db)
    reserves = svc.get_reserves()
    return {
        "module": "mnbc",
        "status": "ready",
        "reserves_actives": len(reserves),
    }


@router.get("/reserves", response_model=list[MNBCReserveRead], summary="Réserves MNBC actives")
def list_reserves(db: Session = Depends(get_db)):
    svc = MNBCService(db)
    return svc.get_reserves()
