import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class BeneficiaryCreate(BaseModel):
    wallet_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=100)
    nickname: str | None = Field(None, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide.")
        return v

    @field_validator("nickname")
    @classmethod
    def strip_nickname(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped if stripped else None


class BeneficiaryUpdate(BaseModel):
    """
    Seuls name et nickname sont modifiables.
    wallet_id et user_id sont immuables après création.
    """
    name: str | None = Field(None, min_length=1, max_length=100)
    nickname: str | None = Field(None, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            raise ValueError("Le nom ne peut pas être vide.")
        return stripped

    @field_validator("nickname")
    @classmethod
    def strip_nickname(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped if stripped else None


class BeneficiaryResponse(BaseModel):
    """
    Données exposées au frontend.
    N'inclut pas : solde, transactions, propriétaire du wallet,
    informations financières privées.
    """
    model_config = {"from_attributes": True}

    id: uuid.UUID
    wallet_id: uuid.UUID
    name: str
    nickname: str | None
    created_at: datetime
    updated_at: datetime


class BeneficiaryListResponse(BaseModel):
    total: int
    items: list[BeneficiaryResponse]
