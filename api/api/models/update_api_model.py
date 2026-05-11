from typing import Optional
from pydantic import BaseModel


class UpdateApiModel(BaseModel):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
