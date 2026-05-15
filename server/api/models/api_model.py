from typing import Literal, Optional

from pydantic import BaseModel

from models.endpoint_model import Endpoint


class TableDefinition(BaseModel):
    """Definición de una tabla adicional en la API."""
    name: str
    columns: list[str]


class ApiModel(BaseModel):
    """Modelo de datos para la creación de una nueva API."""
    api_name: str
    port: Optional[int] = None
    language: Literal["python", "typescript", "go", "rust", "java", "c", "cpp"] = "python"
    db: Literal["mysql", "postgresql", "sqlite", "mariadb"]
    columns: list[str] = []
    tables: list[TableDefinition] = []
    endpoints: list[Endpoint] = []
    usr: str
    paswd: str
    generar_ui: bool = False