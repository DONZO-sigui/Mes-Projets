import uuid

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.blockchain import Block


class BlockchainRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, block_id: uuid.UUID) -> Block | None:
        return self.db.get(Block, block_id)

    def get_by_hash(self, hash_value: str) -> Block | None:
        stmt = select(Block).where(Block.hash == hash_value)
        return self.db.scalar(stmt)

    def get_last_block(self) -> Block | None:
        stmt = select(Block).order_by(Block.index.desc()).limit(1)
        return self.db.scalar(stmt)

    def get_by_index(self, index: int) -> Block | None:
        stmt = select(Block).where(Block.index == index)
        return self.db.scalar(stmt)

    def list_all(self, offset: int = 0, limit: int = 50) -> list[Block]:
        stmt = (
            select(Block)
            .order_by(Block.index.asc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Block)) or 0

    def create(self, block: Block) -> Block:
        self.db.add(block)
        self.db.flush()
        return block
