from sqlalchemy import ARRAY, Column, Integer, JSON, String
from events.db import Base

class DBModel(Base):
    """Modelo de base de datos para almacenar información de las APIs creadas."""
    __tablename__ = "api_data"

    id = Column(Integer, primary_key=True, index=True)
    api_name = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    backup_port = Column(Integer)
    language = Column(String, default="python")
    db = Column(String)
    columns = Column(ARRAY(String))
    endpoints = Column(JSON, default=list)
    tables = Column(JSON, default=list)
    usr = Column(String)
    paswd = Column(String)
    generar_ui = Column(Integer, default=0)