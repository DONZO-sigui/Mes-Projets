from sqlalchemy.orm import Session

from app.models.wallet import Wallet
from app.repositories.wallet_repository import WalletRepository
from app.schemas.wallet import WalletCreate


class WalletService:
    def __init__(self, db: Session) -> None:
        self.repo = WalletRepository(db)

    def create_wallet(self, data: WalletCreate) -> Wallet:
        existing = self.repo.get_by_nif(data.nif)
        if existing:
            raise ValueError(f"Un wallet avec le NIF '{data.nif}' existe déjà.")
        wallet = Wallet(
            nif=data.nif.upper(),
            nom=data.nom,
            prenom=data.prenom,
            ville=data.ville,
            devise=data.devise,
        )
        return self.repo.create(wallet)

    def get_wallet(self, nif: str) -> Wallet | None:
        return self.repo.get_by_nif(nif)

    def list_wallets(self, offset: int = 0, limit: int = 50) -> list[Wallet]:
        return self.repo.list_all(offset=offset, limit=limit)

    def count(self) -> int:
        return self.repo.count()
