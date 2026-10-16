import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class WalletCreate(BaseModel):
    nif: str = Field(..., min_length=5, max_length=20, examples=["NIF123456"])
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    ville: str | None = Field(None, max_length=100)
    devise: str = Field("GNF", pattern="^(GNF|EUR|USD)$")

    @field_validator("nif")
    @classmethod
    def nif_uppercase(cls, v: str) -> str:
        return v.strip().upper()


class WalletRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    nif: str
    nom: str
    prenom: str
    ville: str | None
    devise: str
    solde: Decimal
    statut: str
    created_at: datetime
    updated_at: datetime


class WalletSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    nif: str
    nom: str
    prenom: str
    devise: str
    solde: Decimal
    statut: str


class WalletBalance(BaseModel):
    """Solde courant d'un wallet — lecture seule, calculé par PostgreSQL."""
    model_config = {"from_attributes": True}

    wallet_id: uuid.UUID
    solde: Decimal
    devise: str
    statut: str


class WalletUpdateStatut(BaseModel):
    statut: str = Field(..., pattern="^(ACTIVE|SUSPENDED|CLOSED)$")


class WalletDepositRequest(BaseModel):
    montant: Decimal = Field(..., gt=0, le=50_000_000, description="Montant à créditer en GNF")
