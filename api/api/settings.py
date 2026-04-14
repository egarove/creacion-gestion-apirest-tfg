"""Settings."""
from starlette.config import Config

config = Config(".env")

API_IP = config("API_IP", default="127.0.0.1")
DATABASE_URL = config("DATABASE_URL", default="postgresql://postgres:password@localhost:5432/mi_base_de_datos")