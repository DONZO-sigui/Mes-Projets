import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.mnbc import MNBCReserve


class MNBCRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, reserve_id: uuid.UUID) -> MNBCReserve | None:
        return self.db.get(MNBCReserve, reserve_id)

    def get_by_devise(self, devise: str) -> MNBCReserve | None:
        stmt = select(MNBCReserve).where(MNBCReserve.devise == devise.upper())
        return self.db.scalar(stmt)

    def list_active(self) -> list[MNBCReserve]:
        stmt = (
            select(MNBCReserve)
            .where(MNBCReserve.statut == "ACTIVE")
            .order_by(MNBCReserve.devise)
        )
        return list(self.db.scalars(stmt))

    def create(self, reserve: MNBCReserve) -> MNBCReserve:
        self.db.add(reserve)
        self.db.flush()
        return reserve
