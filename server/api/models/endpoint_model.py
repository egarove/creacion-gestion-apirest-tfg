from typing import Literal
from pydantic import BaseModel

# GET→select, POST→insert, PUT→update, DELETE→update|delete
STRICT_MATRIX: dict[str, list[str]] = {
    "get":    ["select"],
    "post":   ["insert"],
    "put":    ["update"],
    "delete": ["update", "delete"],
}

class Endpoint(BaseModel):
    """Modelo de datos para la creación de un endpoint."""
    method: Literal["get", "post", "put", "delete"]
    path: str
    function_name: str
    logic: Literal["select", "insert", "update", "delete"]
    table: str | None = None
    is_public: bool = False