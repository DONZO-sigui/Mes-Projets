import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None
    metadata: dict[str, Any] | None = Field(None, validation_alias="metadata_json")


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: list[NotificationResponse]


class UnreadCountResponse(BaseModel):
    count: int
