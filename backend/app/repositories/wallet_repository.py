import uuid
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.wallet import Wallet


class WalletRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, wallet_id: uuid.UUID) -> Wallet | None:
        return self.db.get(Wallet, wallet_id)

    def get_by_user_id(self, user_id: uuid.UUID) -> Wallet | None:
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        return self.db.scalar(stmt)

    def get_by_nif(self, nif: str) -> Wallet | None:
        stmt = select(Wallet).where(Wallet.nif == nif.upper())
        return self.db.scalar(stmt)

    def list_all(self, offset: int = 0, limit: int = 50) -> list[Wallet]:
        stmt = select(Wallet).offset(offset).limit(limit).order_by(Wallet.created_at.desc())
        return list(self.db.scalars(stmt))

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Wallet)) or 0

    def create(self, wallet: Wallet) -> Wallet:
        self.db.add(wallet)
        self.db.flush()
        return wallet

    def get_for_update(self, wallet_id: uuid.UUID) -> Wallet | None:
        """
        Verrouillage pessimiste pour les opérations financières.

        populate_existing=True est indispensable : sans ce flag, SQLAlchemy
        retourne l'objet de son identity map (valeur périmée) si le wallet
        était déjà chargé dans la session. Avec le flag, les attributs sont
        TOUJOURS mis à jour depuis le résultat de la DB après déverrouillage,
        garantissant que `wallet.solde` reflète l'état committé par tout
        concurrent ayant relâché le verrou.
        """
        stmt = (
            select(Wallet)
            .where(Wallet.id == wallet_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return self.db.scalar(stmt)

    def update_solde(self, wallet: Wallet, nouveau_solde: Decimal) -> Wallet:
        wallet.solde = nouveau_solde
        self.db.flush()
        return wallet
