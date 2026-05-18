import re
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from models.endpoint_model import Endpoint

_API_NAME_RE = re.compile(r'^[a-z][a-z0-9_]{1,49}$')


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

    @field_validator('api_name')
    @classmethod
    def validate_api_name(cls, v: str) -> str:
        if not _API_NAME_RE.match(v):
            raise ValueError(
                "api_name debe empezar por letra minúscula, contener solo "
                "minúsculas, dígitos y guiones bajos, y tener entre 2 y 50 caracteres."
            )
        return v