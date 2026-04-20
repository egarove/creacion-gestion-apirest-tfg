from typing import Literal

from pydantic import BaseModel

from models.endpoint_model import Endpoint

class ApiModel(BaseModel):
    """Modelo de datos para la creación de una nueva API."""
    api_name: str
    port: int
    db: Literal["mysql", "postgresql", "sqlite", "mariadb"] # Se añaderán si se quieren ampliar la cantidad de bases de datos.
    columns: list[str] = []
    endpoints: list[Endpoint] = []
    usr: str
    paswd: str