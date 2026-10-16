import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class BlockRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    index: int
    hash: str
    previous_hash: str
    timestamp: datetime
    nonce: int
    difficulty: int
    data: dict[str, Any] | None
    transaction_id: uuid.UUID | None
    statut: str
    created_at: datetime
