import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.db.base import Base


class Beneficiary(Base):
    """
    Bénéficiaire enregistré par un utilisateur.

    Un bénéficiaire représente un wallet de destination que l'utilisateur
    souhaite mémoriser pour accélérer ses futurs transferts.

    Contrainte métier :
      - Un utilisateur ne peut pas enregistrer deux fois le même wallet.
      - UNIQUE(user_id, wallet_id)
    """
    __tablename__ = "beneficiaries"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "wallet_id",
            name="uq_beneficiaries_user_wallet",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    nickname: Mapped[str | None] = mapped_column(
        String(50), nullable=True
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

    owner: Mapped["User"] = relationship(  # noqa: F821
        "User",
        lazy="select",
    )
    wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<Beneficiary name={self.name!r}"
            f" user_id={self.user_id}"
            f" wallet_id={self.wallet_id}>"
        )
