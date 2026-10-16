"""
MNBCReserve — Réserve de Monnaie Numérique de Banque Centrale.
Remplace les variables globales Python de l'ancien projet Flask.
Source de vérité : PostgreSQL. Jamais en mémoire Python globale.
"""
import uuid
from decimal import Decimal
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Uuid

from app.db.base import Base


class MNBCReserve(Base):
    __tablename__ = "mnbc_reserves"
    __table_args__ = (
        CheckConstraint(
            "devise IN ('GNF','EUR','USD')",
            name="ck_mnbc_reserves_devise",
        ),
        CheckConstraint(
            "statut IN ('ACTIVE','SUSPENDED')",
            name="ck_mnbc_reserves_statut",
        ),
        CheckConstraint(
            "reserve >= 0",
            name="ck_mnbc_reserves_reserve_positive",
        ),
        CheckConstraint(
            "taux > 0",
            name="ck_mnbc_reserves_taux_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    devise: Mapped[str] = mapped_column(
        String(3), unique=True, nullable=False, index=True
    )
    reserve: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0.0000")
    )
    # Taux de change : 1 MNBC = taux GNF (ou devise de référence)
    taux: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("1.000000")
    )
    statut: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ACTIVE"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<MNBCReserve devise={self.devise} reserve={self.reserve} taux={self.taux}>"
