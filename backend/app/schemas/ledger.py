import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class LedgerEntryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    transaction_id: uuid.UUID
    wallet_id: uuid.UUID
    type_mouvement: str
    montant: Decimal
    devise: str
    created_at: datetime
