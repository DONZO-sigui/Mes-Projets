import uuid

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.beneficiary import Beneficiary


class BeneficiaryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, beneficiary: Beneficiary) -> Beneficiary:
        self.db.add(beneficiary)
        self.db.flush()
        return beneficiary

    def get_by_id_for_user(
        self,
        beneficiary_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Beneficiary | None:
        """
        Récupère un bénéficiaire uniquement si il appartient à user_id.
        Protection IDOR : impossible de lire le bénéficiaire d'un autre user.
        """
        stmt = select(Beneficiary).where(
            Beneficiary.id == beneficiary_id,
            Beneficiary.user_id == user_id,
        )
        return self.db.scalar(stmt)

    def list_for_user(
        self,
        user_id: uuid.UUID,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Beneficiary]:
        stmt = (
            select(Beneficiary)
            .where(Beneficiary.user_id == user_id)
            .order_by(Beneficiary.name.asc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count_for_user(self, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Beneficiary)
            .where(Beneficiary.user_id == user_id)
        )
        return self.db.scalar(stmt) or 0

    def exists_for_user_wallet(
        self,
        user_id: uuid.UUID,
        wallet_id: uuid.UUID,
    ) -> bool:
        stmt = select(Beneficiary).where(
            Beneficiary.user_id == user_id,
            Beneficiary.wallet_id == wallet_id,
        )
        return self.db.scalar(stmt) is not None

    def update(
        self,
        beneficiary: Beneficiary,
        name: str | None,
        nickname: str | None,
        clear_nickname: bool = False,
    ) -> Beneficiary:
        if name is not None:
            beneficiary.name = name
        if clear_nickname:
            beneficiary.nickname = None
        elif nickname is not None:
            beneficiary.nickname = nickname
        self.db.flush()
        return beneficiary

    def delete(self, beneficiary: Beneficiary) -> None:
        self.db.delete(beneficiary)
        self.db.flush()
