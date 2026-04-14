from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from settings import DATABASE_URL

engine = create_engine(DATABASE_URL) # conexión a la base de datos usando SQLAlchemy
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) # Se crea la sesión de la base de datos para manejar las transacciones y consultas.
Base = declarative_base() # Clase base para los modelos de la base de datos, que se utilizará para definir las tablas y sus relaciones.

# Recupera una sesión de base de datos para cada solicitud y la cierra al finalizar.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()