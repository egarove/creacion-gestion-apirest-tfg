from typing import Literal
from pydantic import BaseModel

class Endpoint(BaseModel):
    """Modelo de datos para la creación de un endpoint."""
    method: Literal["get", "post", "put", "delete"]
    path: str
    function_name: str
    logic: Literal["select", "insert", "update", "delete"]