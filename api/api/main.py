import shutil
import subprocess
import time
from fastapi import Depends, FastAPI, Response
import os

from fastapi.concurrency import asynccontextmanager
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import text
from events.db import get_db
from models import ApiModel, DBModel, UpdateApiModel
from models.endpoint_model import Endpoint
from sqlalchemy.orm import Session
from settings import API_IP
from events.db import engine, Base, get_db
import docker

# Configuración de eventos para manejar la conexión a la base de datos y la creación de tablas al iniciar el contenedor, y cerrar conexiones al apagarlo.
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("Base de datos conectada y tablas sincronizadas.")
    
    yield 
    
    engine.dispose()
    print("Conexiones de base de datos cerradas.")

app = FastAPI(lifespan=lifespan)

@app.post("/crear-api")
def crear_nueva_api(proyect: ApiModel, db: Session = Depends(get_db)):
    """Crea una nueva API en Docker basada en el modelo proporcionado."""
    try:
        if db.query(DBModel).filter(DBModel.api_name == proyect.api_name).first():
            print(f"DEBUG: API {proyect.api_name} ya existe en la base de datos.", flush=True)
            return Response(status_code=400, content=f"Ya existe una API con el nombre {proyect.api_name}")
        
        proyect_path = f"deployments/{proyect.api_name}"
        os.makedirs(proyect_path, exist_ok=True)

        env = Environment(loader=FileSystemLoader("templates"))
        template = env.get_template("api_template.jinja")
        codigo = template.render(api_name=proyect.api_name, endpoints=proyect.endpoints)

        with open(f"{proyect_path}/main.py", "w") as f:
            f.write(codigo)

        # Crear Dockerfile
        dockerfile_content = env.get_template("docker_template.jinja").render()
        
        with open(f"{proyect_path}/Dockerfile", "w") as f:
            f.write(dockerfile_content)

        # Construir la imagen Docker
        subprocess.run(["docker", "build", "-t", f"api-{proyect.api_name}", proyect_path])
        
        db_configs = {
            "postgresql": {"port": "5432", "driver": "postgresql"},
            "mysql":      {"port": "5433", "driver": "mysql+pymysql"},
            "mariadb":    {"port": "5434", "driver": "mysql+pymysql"},
        }
        
        motor = proyect.db
        
        if motor == "sqlite":
            url = f"sqlite:///{proyect.api_name}.db"
        elif motor in db_configs:
            config = db_configs[motor]
            url = f"{config['driver']}://{proyect.usr}:{proyect.paswd}@{API_IP}:{config['port']}/{proyect.api_name}_db"
        else:
            raise Exception("Motor no configurado")
    
        subprocess.Popen([
            "docker", "run", "-d", 
            "--name", f"{proyect.api_name}",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{proyect.port}:8000", 
            f"api-{proyect.api_name}"
        ])
        
        # Guardamos el registro de la API en la base de datos
        db_data = DBModel(
            api_name=proyect.api_name,
            port=proyect.port,
            db=proyect.db,
            usr=proyect.usr,
            columns=proyect.columns,
            paswd=proyect.paswd  # Hay que hacer la encriptación de la contraseña antes de guardarla en la base de datos.
        )
        
        db.add(db_data)
        

        # Devolvemos la información de la API creada, incluyendo el ID generado en la base de datos.
        sql_columns = ", ".join([col for col in proyect.columns])
        
        query = text(f"CREATE TABLE IF NOT EXISTS data_{proyect.api_name} (id SERIAL PRIMARY KEY, {sql_columns});")
        
        db.execute(query)
        
        db.commit()
        db.refresh(db_data)
        
        return {
            "mensaje": f"API {proyect.api_name} creada",
            "puerto": proyect.port,
            "id_db": db_data.id,
            "columnas": proyect.columns
        }
    except Exception as e:
        db.rollback()
        print(e, flush=True)
        return Response(status_code=500, content=str(e))

@app.get("/{api}")
def get_api_data(api: str):
    return {
        
    }

@app.post("/{api}/update")
def update_api(api: str, item: UpdateApiModel):
    return {
        
    }
    
@app.post("/{api}/start")
def start_api(api: str):
    """Iniciar una api"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        if container.status == "running":
            return {
                "status" : "running"
            }
        
        container.start()
        time.sleep(2)
        
        return {
            "status" : container.status
        }
    except Exception as e:
        return Response(status_code=500, content=str(e))

@app.post("/{api}/stop")
def start_api(api: str):
    """Parar una api"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        if container.status == "exited":
            return {
                "status" : container.status
            }
        
        container.stop()
        time.sleep(2)
        
        return {
            "status" : container.status
        }
    except Exception as e:
        return Response(status_code=500, content=str(e))   

@app.post("/{api}/status")
def start_api(api: str):
    """Estado de una api"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        return {
            "status" : container.status
        }
    except Exception as e:
        return Response(status_code=500, content=str(e)) 

    
@app.post("/{api}/create-end-point")
def create_end_point(api: str, endpoint: Endpoint, db: Session = Depends(get_db)):
    """Añade un nuevo endpoint a una API existente."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        # Código del nuevo endpoint con indentación correcta
        if endpoint.logic == "select":
            logic_body = (
                f'res = conn.execute(text("SELECT * FROM data_{api}")).fetchall()\n'
                f'        return [dict(row) for row in res]'
            )
        elif endpoint.logic == "insert":
            logic_body = 'return {"msg": "inserted"}'
        elif endpoint.logic == "update":
            logic_body = 'return {"msg": "updated"}'
        else:
            logic_body = 'return {"msg": "deleted"}'

        new_code = (
            f'\n@app.{endpoint.method}("{endpoint.path}")\n'
            f'def {endpoint.function_name}():\n'
            f'    with engine.connect() as conn:\n'
            f'        {logic_body}\n'
        )

        proyect_path = f"deployments/{api}"
        with open(f"{proyect_path}/main.py", "a") as f:
            f.write(new_code)

        # Reconstruir imagen
        subprocess.run(["docker", "build", "-t", f"api-{api}", proyect_path])

        # Parar y eliminar contenedor viejo
        subprocess.run(["docker", "rm", "-f", api])

        # Puerto según tipo de BD
        db_ports = {
            "postgresql": 5432,
            "mariadb": 5433,
            "mysql": 5434,
        }
        db_port = db_ports.get(api_data.db, 5432)

        # Relanzar contenedor con los mismos parámetros
        subprocess.Popen([
            "docker", "run", "-d",
            "--name", api,
            "-e", f"DATABASE_URL={api_data.db}://{api_data.usr}:{api_data.paswd}@{API_IP}:{db_port}/{api}_db",
            "-p", f"{api_data.port}:8000",
            f"api-{api}",
        ])

        return {"mensaje": "Endpoint añadido", "endpoint": endpoint.path}
    except Exception as e:
        print(f"DEBUG ERROR CREATE ENDPOINT: {str(e)}", flush=True)
        return Response(status_code=500, content=str(e))

@app.post("/{api}/delete")
def delete_api(api: str, db: Session = Depends(get_db)):
    try:
        if not db.query(DBModel).filter(DBModel.api_name == api).first():
            return Response(status_code=404, content=f"No se encontró la API {api}")

        subprocess.run(["docker", "rm", "-f", api])
        proyect_path = f"deployments/{api}"
        
        if os.path.exists(proyect_path):
            shutil.rmtree(proyect_path)
            
        db.query(DBModel).filter(DBModel.api_name == api).delete()
        drop = text(f"DROP TABLE IF EXISTS data_{api}")
        db.execute(drop)
        db.commit()
        
        return Response(status_code=200, content=f"API {api} eliminada exitosamente")
    except Exception as e:
        db.rollback()
        print(f"DEBUG ERROR DELETE: {str(e)}", flush=True)
        return Response(status_code=500, content=f"Error al eliminar la API {api}: {str(e)}")