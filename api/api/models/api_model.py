from pydantic import BaseModel

from models.endpoint_model import Endpoint

class ApiModel(BaseModel):
    """Modelo de datos para la creación de una nueva API."""
    api_name: str
    port: int
    db: str
    columns: list[str] = []
    endpoints: list[Endpoint] = []
    usr: str
    paswd: str