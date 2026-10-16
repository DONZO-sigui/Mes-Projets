import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import Query


class WalletPartyInfo(BaseModel):
    """Informations publiques d'une partie de la transaction (pas de NIF, pas de solde)."""
    nom: str
    prenom: str


class TransferRequest(BaseModel):
    """
    Body de POST /transactions — le backend détermine sender_wallet
    depuis current_user.id. Le client ne fournit jamais sender_wallet_id.
    """
    receiver_wallet_id: uuid.UUID
    montant: Decimal = Field(..., gt=0, decimal_places=4)
    devise: str = Field("GNF", pattern="^(GNF|EUR|USD)$")
    motif: str | None = Field(None, max_length=250)


class TransactionCreate(BaseModel):
    """Usage interne uniquement (tests modèles, seeds)."""
    sender_wallet_id: uuid.UUID
    receiver_wallet_id: uuid.UUID
    montant: Decimal = Field(..., gt=0, decimal_places=4)
    devise: str = Field("GNF", pattern="^(GNF|EUR|USD)$")
    motif: str | None = Field(None, max_length=250)
    idempotency_key: str = Field(..., min_length=8, max_length=100)


class TransactionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    reference: str
    sender_wallet_id: uuid.UUID
    receiver_wallet_id: uuid.UUID
    montant: Decimal
    devise: str
    frais: Decimal
    montant_total: Decimal
    statut: str
    motif: str | None
    idempotency_key: str
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TransactionDetailResponse(BaseModel):
    """
    Détail complet d'une transaction — IDOR contrôlé côté backend.
    N'expose pas : NIF, email, solde, tokens, hash, données internes.
    """
    id: uuid.UUID
    reference: str
    montant: Decimal
    frais: Decimal
    montant_total: Decimal
    devise: str
    statut: str
    motif: str | None
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    sender: WalletPartyInfo
    receiver: WalletPartyInfo


class TransactionSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    reference: str
    montant: Decimal
    devise: str
    statut: str
    created_at: datetime


_STATUTS = (
    "PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED|REVERSED"
)


class TransactionListParams:
    """Dependency class for GET /transactions/me query parameters."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Numéro de page"),
        limit: int = Query(
            20, ge=1, le=100, description="Éléments par page"
        ),
        statut: str | None = Query(
            None,
            pattern=f"^({_STATUTS})$",
            description="Filtrer par statut",
        ),
        devise: str | None = Query(
            None,
            pattern="^(GNF|EUR|USD)$",
            description="Filtrer par devise",
        ),
        date_from: datetime | None = Query(
            None, description="Date de début (ISO 8601)"
        ),
        date_to: datetime | None = Query(
            None, description="Date de fin (ISO 8601)"
        ),
        reference: str | None = Query(
            None, description="Filtrer par référence exacte"
        ),
        sort_by: str = Query(
            "created_at",
            pattern="^(created_at|montant|statut)$",
            description="Champ de tri",
        ),
        sort_dir: str = Query(
            "desc",
            pattern="^(asc|desc)$",
            description="Sens du tri",
        ),
    ) -> None:
        self.page = page
        self.limit = limit
        self.statut = statut
        self.devise = devise
        self.date_from = date_from
        self.date_to = date_to
        self.reference = reference
        self.sort_by = sort_by
        self.sort_dir = sort_dir


class TransactionListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[TransactionRead]
