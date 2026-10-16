import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_not_logged(cls, v: str) -> str:
        # Validation uniquement — le mot de passe n'est jamais loggé
        return v


class UserResponse(BaseModel):
    """password_hash JAMAIS inclus dans ce schéma."""
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    is_email_verified: bool
    last_login_at: datetime | None
    created_at: datetime


class UserUpdate(BaseModel):
    """
    Champs modifiables par l'utilisateur via PATCH /users/me.

    Exclusions intentionnelles (mass-assignment protection) :
      role, status, password_hash, is_email_verified, user_id, balance
    """
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)


class UserSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    status: str


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class SessionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    last_used_at: datetime | None = None
    user_agent: str | None = None
    is_current: bool = False


class SessionListResponse(BaseModel):
    total: int
    items: list[SessionResponse]
