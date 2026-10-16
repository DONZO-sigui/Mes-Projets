from sqlalchemy.orm import Session

from app.models.mnbc import MNBCReserve
from app.repositories.mnbc_repository import MNBCRepository


class MNBCService:
    def __init__(self, db: Session) -> None:
        self.repo = MNBCRepository(db)

    def get_reserves(self) -> list[MNBCReserve]:
        return self.repo.list_active()

    def get_by_devise(self, devise: str) -> MNBCReserve | None:
        return self.repo.get_by_devise(devise)
