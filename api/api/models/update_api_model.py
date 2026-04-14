from pydantic import BaseModel


class UpdateApiModel (BaseModel):
    id: int
    name: str = None
    description: str = None