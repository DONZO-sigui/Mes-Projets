from pydantic import BaseModel
from typing import Any, Optional


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "OK"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[Any] = None


class PaginatedResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[Any]
