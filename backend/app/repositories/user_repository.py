import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        return self.db.scalar(stmt)

    def email_exists(self, email: str) -> bool:
        return self.get_by_email(email) is not None

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user

    def update_last_login(self, user: User) -> User:
        user.last_login_at = datetime.now(tz=timezone.utc)
        self.db.flush()
        return user

    def update_status(self, user: User, status: str) -> User:
        user.status = status
        self.db.flush()
        return user

    def update_profile(
        self,
        user: User,
        first_name: str | None,
        last_name: str | None,
    ) -> User:
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        self.db.flush()
        return user
