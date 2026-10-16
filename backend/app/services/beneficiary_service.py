"""
Service Bénéficiaires — ÉTAPE 11

Règles métier :
  - Le wallet référencé doit exister en DB
  - Le wallet doit être ACTIVE
  - L'utilisateur ne peut pas s'enregistrer lui-même comme bénéficiaire
    (wallet dont user_id == current_user.id)
  - Un utilisateur ne peut pas enregistrer deux fois le même wallet
  - wallet_id immuable après création
  - Seul le propriétaire peut modifier ou supprimer un bénéficiaire
    (garanti par BeneficiaryRepository.get_by_id_for_user)
"""
import uuid

from sqlalchemy.orm import Session

from app.models.beneficiary import Beneficiary
from app.repositories.beneficiary_repository import BeneficiaryRepository
from app.repositories.wallet_repository import WalletRepository
from app.schemas.beneficiary import (
    BeneficiaryCreate,
    BeneficiaryListResponse,
    BeneficiaryResponse,
    BeneficiaryUpdate,
)


# ─── Exceptions métier ────────────────────────────────────────

class BeneficiaryNotFoundError(Exception):
    pass


class BeneficiaryWalletNotFoundError(Exception):
    pass


class BeneficiaryWalletInactiveError(Exception):
    pass


class BeneficiarySelfWalletError(Exception):
    pass


class BeneficiaryDuplicateError(Exception):
    pass


# ─── Service ─────────────────────────────────────────────────

class BeneficiaryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = BeneficiaryRepository(db)
        self.wallet_repo = WalletRepository(db)

    def create(
        self,
        current_user_id: uuid.UUID,
        data: BeneficiaryCreate,
    ) -> BeneficiaryResponse:
        # Wallet existe ?
        wallet = self.wallet_repo.get_by_id(data.wallet_id)
        if wallet is None:
            raise BeneficiaryWalletNotFoundError(
                "Le wallet destinataire est introuvable."
            )

        # Wallet actif ?
        if wallet.statut != "ACTIVE":
            raise BeneficiaryWalletInactiveError(
                "Ce wallet n'est pas actif."
            )

        # Auto-bénéficiaire interdit
        if wallet.user_id == current_user_id:
            raise BeneficiarySelfWalletError(
                "Vous ne pouvez pas vous enregistrer"
                " vous-même comme bénéficiaire."
            )

        # Doublon
        if self.repo.exists_for_user_wallet(current_user_id, data.wallet_id):
            raise BeneficiaryDuplicateError(
                "Ce wallet est déjà enregistré comme bénéficiaire."
            )

        benef = Beneficiary(
            user_id=current_user_id,
            wallet_id=data.wallet_id,
            name=data.name,
            nickname=data.nickname,
        )
        self.repo.create(benef)
        return BeneficiaryResponse.model_validate(benef)

    def list(
        self,
        current_user_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
    ) -> BeneficiaryListResponse:
        offset = (page - 1) * limit
        items = self.repo.list_for_user(current_user_id, offset, limit)
        total = self.repo.count_for_user(current_user_id)
        return BeneficiaryListResponse(
            total=total,
            items=[BeneficiaryResponse.model_validate(b) for b in items],
        )

    def get(
        self,
        current_user_id: uuid.UUID,
        beneficiary_id: uuid.UUID,
    ) -> BeneficiaryResponse:
        benef = self.repo.get_by_id_for_user(beneficiary_id, current_user_id)
        if benef is None:
            raise BeneficiaryNotFoundError(
                "Bénéficiaire introuvable."
            )
        return BeneficiaryResponse.model_validate(benef)

    def update(
        self,
        current_user_id: uuid.UUID,
        beneficiary_id: uuid.UUID,
        data: BeneficiaryUpdate,
    ) -> BeneficiaryResponse:
        benef = self.repo.get_by_id_for_user(beneficiary_id, current_user_id)
        if benef is None:
            raise BeneficiaryNotFoundError(
                "Bénéficiaire introuvable."
            )

        # nickname peut être mis à None explicitement (si fourni comme "")
        # Le schéma strip → None si chaîne vide
        clear_nickname = (
            "nickname" in data.model_fields_set and data.nickname is None
        )

        self.repo.update(
            benef,
            name=data.name,
            nickname=data.nickname,
            clear_nickname=clear_nickname,
        )
        return BeneficiaryResponse.model_validate(benef)

    def delete(
        self,
        current_user_id: uuid.UUID,
        beneficiary_id: uuid.UUID,
    ) -> None:
        benef = self.repo.get_by_id_for_user(beneficiary_id, current_user_id)
        if benef is None:
            raise BeneficiaryNotFoundError(
                "Bénéficiaire introuvable."
            )
        self.repo.delete(benef)
