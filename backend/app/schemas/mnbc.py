import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class MNBCReserveRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    devise: str
    reserve: Decimal
    taux: Decimal
    statut: str
    created_at: datetime
    updated_at: datetime


class MNBCReserveCreate(BaseModel):
    devise: str = Field(..., pattern="^(GNF|EUR|USD)$")
    reserve: Decimal = Field(..., ge=0, decimal_places=4)
    taux: Decimal = Field(..., gt=0, decimal_places=6)
