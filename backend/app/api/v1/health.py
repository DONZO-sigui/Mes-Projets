from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
def health_check():
    return {"status": "ok", "service": "GNF-Token API"}


@router.get("/health/db", summary="Database connectivity check")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except OperationalError:
        return {"status": "error", "database": "unreachable"}
    except Exception:
        return {"status": "error", "database": "error"}
