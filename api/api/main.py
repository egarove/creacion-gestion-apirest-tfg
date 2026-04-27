import shutil
import subprocess
import time
from fastapi import Depends, FastAPI, Response
import os
import psycopg2
import psycopg2.errors
import pymysql

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

db_configs = {
    "postgresql": {"port": "5432", "driver": "postgresql", "host": "postgres"},
    "mysql":      {"port": "3306", "driver": "mysql+pymysql", "host": "mysql"},
    "mariadb":    {"port": "3306", "driver": "mysql+pymysql", "host": "mariadb"},
}

# Configuración de plantillas por lenguaje
LANG_CONFIG = {
    "python": {
        "template_dir": "templates/python",
        "main_file": "main.py",
        "extra_files": [],
    },
    "typescript": {
        "template_dir": "templates/typescript",
        "main_file": "index.js",
        "extra_files": [("package_template.jinja", "package.json")],
    },
    "go": {
        "template_dir": "templates/go",
        "main_file": "main.go",
        "extra_files": [("go_mod_template.jinja", "go.mod")],
    },
    "rust": {
        "template_dir": "templates/rust",
        "main_file": "src/main.rs",
        "extra_files": [("cargo_template.jinja", "Cargo.toml")],
    },
    "java": {
        "template_dir": "templates/java",
        "main_file": "src/main/java/com/api/App.java",
        "extra_files": [
            ("pom_template.jinja", "pom.xml"),
            ("application_properties_template.jinja", "src/main/resources/application.properties"),
        ],
    },
    "c": {
        "template_dir": "templates/c",
        "main_file": "main.c",
        "extra_files": [("makefile_template.jinja", "Makefile")],
    },
    "cpp": {
        "template_dir": "templates/cpp",
        "main_file": "main.cpp",
        "extra_files": [("cmake_template.jinja", "CMakeLists.txt")],
    },
}

def _build_database_url(motor: str, usr: str, paswd: str, api_name: str) -> str:
    if motor == "sqlite":
        return f"sqlite:///{api_name}.db"
    elif motor in db_configs:
        config = db_configs[motor]
        return f"{config['driver']}://{usr}:{paswd}@{config['host']}:{config['port']}/{api_name}_db"
    else:
        raise Exception("Motor no configurado")

def _crear_usuario_y_bd(db_type: str, api_name: str, usr: str, paswd: str):
    if db_type == "sqlite":
        return

    if db_type == "postgresql":
        conn = psycopg2.connect(
            host="postgres", port=5432, dbname="postgres",
            user="user", password="password"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        try:
            cursor.execute(f"CREATE USER {usr} WITH PASSWORD '{paswd}';")
        except psycopg2.errors.DuplicateObject:
            cursor.execute(f"ALTER USER {usr} WITH PASSWORD '{paswd}';")
        try:
            cursor.execute(f"CREATE DATABASE {api_name}_db OWNER {usr};")
        except psycopg2.errors.DuplicateDatabase:
            pass
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {api_name}_db TO {usr};")
        cursor.close()
        conn.close()

    elif db_type in ("mariadb", "mysql"):
        port = 3306 # El puerto interno en Docker siempre es 3306 para ambos
        conn = pymysql.connect(host=db_type, port=port, user="root", password="password")
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {api_name}_db;")
        cursor.execute(f"CREATE USER IF NOT EXISTS '{usr}'@'%' IDENTIFIED BY '{paswd}';")
        cursor.execute(f"ALTER USER '{usr}'@'%' IDENTIFIED BY '{paswd}';")
        cursor.execute(f"GRANT ALL PRIVILEGES ON {api_name}_db.* TO '{usr}'@'%';")
        cursor.execute("FLUSH PRIVILEGES;")
        conn.commit()
        cursor.close()
        conn.close()

def _crear_tabla_en_bd_usuario(db_type: str, api_name: str, usr: str, paswd: str, sql_columns: str):
    """Crea la tabla data_{api_name} en la BD del usuario, no en api_db."""
    if db_type == "sqlite":
        return
    if db_type == "postgresql":
        conn = psycopg2.connect(
            host="postgres", port=5432, dbname=f"{api_name}_db",
            user=usr, password=paswd
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS data_{api_name} (id SERIAL PRIMARY KEY, {sql_columns});")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        port = 3306 # Puerto interno en Docker
        conn = pymysql.connect(host=db_type, port=port, user=usr, password=paswd, database=f"{api_name}_db")
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS data_{api_name} (id INT AUTO_INCREMENT PRIMARY KEY, {sql_columns});")
        conn.commit()
        cursor.close()
        conn.close()

def _eliminar_usuario_y_bd(db_type: str, api_name: str, usr: str):
    if db_type == "sqlite":
        return

    if db_type == "postgresql":
        conn = psycopg2.connect(
            host=API_IP, port=5432, dbname="postgres",
            user="user", password="password"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {api_name}_db;")
        cursor.execute(f"DROP USER IF EXISTS {usr};")
        cursor.close()
        conn.close()

    elif db_type in ("mariadb", "mysql"):
        port = 5433 if db_type == "mariadb" else 5434
        conn = pymysql.connect(host=API_IP, port=port, user="root", password="password")
        cursor = conn.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {api_name}_db;")
        cursor.execute(f"DROP USER IF EXISTS '{usr}'@'%';")
        cursor.execute("FLUSH PRIVILEGES;")
        conn.commit()
        cursor.close()
        conn.close()

@app.post("/crear-api")
def crear_nueva_api(proyect: ApiModel, db: Session = Depends(get_db)):
    """Crea una nueva API en Docker basada en el modelo proporcionado."""
    try:
        if db.query(DBModel).filter(DBModel.api_name == proyect.api_name).first():
            print(f"DEBUG: API {proyect.api_name} ya existe en la base de datos.", flush=True)
            return Response(status_code=400, content=f"Ya existe una API con el nombre {proyect.api_name}")

        # Obtener configuración del lenguaje seleccionado
        lang = proyect.language
        if lang not in LANG_CONFIG:
            return Response(status_code=400, content=f"Lenguaje '{lang}' no soportado")
        config = LANG_CONFIG[lang]

        proyect_path = f"deployments/{proyect.api_name}"
        os.makedirs(proyect_path, exist_ok=True)

        # Cargar plantillas del lenguaje seleccionado
        env = Environment(loader=FileSystemLoader(config["template_dir"]))
        template = env.get_template("api_template.jinja")
        codigo = template.render(
            api_name=proyect.api_name,
            endpoints=proyect.endpoints,
            generar_ui=proyect.generar_ui,
            db=proyect.db,
        )

        # Guardar archivo principal con el nombre correcto según el lenguaje
        main_file_path = os.path.join(proyect_path, config["main_file"])
        os.makedirs(os.path.dirname(main_file_path), exist_ok=True)
        with open(main_file_path, "w") as f:
            f.write(codigo)

        # Generar archivos extra del lenguaje (package.json, go.mod, Cargo.toml, pom.xml, etc.)
        for template_name, output_name in config["extra_files"]:
            extra_template = env.get_template(template_name)
            extra_content = extra_template.render(
                api_name=proyect.api_name,
                db=proyect.db,
            )
            extra_path = os.path.join(proyect_path, output_name)
            os.makedirs(os.path.dirname(extra_path), exist_ok=True)
            with open(extra_path, "w") as f:
                f.write(extra_content)

        # Crear Dockerfile
        dockerfile_content = env.get_template("docker_template.jinja").render(
            api_name=proyect.api_name,
            db=proyect.db,
        )

        with open(f"{proyect_path}/Dockerfile", "w") as f:
            f.write(dockerfile_content)

        # Construir la imagen Docker
        subprocess.run(["docker", "build", "-t", f"api-{proyect.api_name}", proyect_path])

        url = _build_database_url(proyect.db, proyect.usr, proyect.paswd, proyect.api_name)
        backup_port = proyect.port + 1

        _crear_usuario_y_bd(proyect.db, proyect.api_name, proyect.usr, proyect.paswd)

        # Lanzar contenedor principal
        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{proyect.api_name}",
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{proyect.port}:8000",
            f"api-{proyect.api_name}"
        ])

        # Lanzar contenedor de respaldo
        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{proyect.api_name}_backup",
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{backup_port}:8000",
            f"api-{proyect.api_name}"
        ])

        # Guardamos el registro de la API en la base de datos
        db_data = DBModel(
            api_name=proyect.api_name,
            port=proyect.port,
            backup_port=backup_port,
            language=proyect.language,
            db=proyect.db,
            usr=proyect.usr,
            columns=proyect.columns,
            paswd=proyect.paswd
        )

        db.add(db_data)
        db.commit()

        # Crear tabla en la BD del usuario (no en api_db)
        sql_columns = ", ".join([col for col in proyect.columns])
        _crear_tabla_en_bd_usuario(proyect.db, proyect.api_name, proyect.usr, proyect.paswd, sql_columns)
        db.refresh(db_data)

        return {
            "mensaje": f"API {proyect.api_name} creada en {lang}",
            "puerto": proyect.port,
            "backup_port": backup_port,
            "id_db": db_data.id,
            "columnas": proyect.columns,
            "language": lang
        }
    except Exception as e:
        db.rollback()
        print(e, flush=True)
        return Response(status_code=500, content=str(e))

@app.get("/{api}")
def get_api_data(api: str):
    return {}

@app.post("/{api}/update")
def update_api(api: str, item: UpdateApiModel):
    return {}

@app.post("/{api}/start")
def start_api(api: str):
    """Iniciar una api"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        if container.status == "running":
            return {"status": "running"}

        container.start()
        time.sleep(2)

        return {"status": container.status}
    except Exception as e:
        return Response(status_code=500, content=str(e))

@app.post("/{api}/stop")
def stop_api(api: str):
    """Parar una api"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        if container.status == "exited":
            return {"status": container.status}

        container.stop()
        time.sleep(2)

        return {"status": container.status}
    except Exception as e:
        return Response(status_code=500, content=str(e))

@app.post("/{api}/status")
def post_api_status(api: str):
    """Estado de una api (legacy POST)"""
    try:
        client = docker.from_env()
        container = client.containers.get(api)
        return {"status": container.status}
    except Exception as e:
        return Response(status_code=500, content=str(e))

@app.get("/{api}/status")
def get_api_status(api: str):
    """Estado del contenedor principal y del respaldo"""
    try:
        client = docker.from_env()

        try:
            main = client.containers.get(api)
            main_status = main.status
        except Exception:
            main_status = "not_found"

        try:
            backup = client.containers.get(f"{api}_backup")
            backup_status = backup.status
        except Exception:
            backup_status = "not_found"

        return {
            "status": main_status,
            "backup_status": backup_status,
        }
    except Exception as e:
        return Response(status_code=500, content=str(e))

@app.post("/{api}/restore")
def restore_api(api: str, db: Session = Depends(get_db)):
    """Para ambos contenedores y los relanza desde cero."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        subprocess.run(["docker", "rm", "-f", api])
        subprocess.run(["docker", "rm", "-f", f"{api}_backup"])

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)

        subprocess.Popen([
            "docker", "run", "-d",
            "--name", api,
            "-e", f"DATABASE_URL={url}",
            "-p", f"{port}:8000",
            f"api-{api}"
        ])

        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{api}_backup",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{backup_port}:8000",
            f"api-{api}"
        ])

        return {
            "mensaje": "API restaurada",
            "puerto": port,
            "backup_port": backup_port,
        }
    except Exception as e:
        print(f"DEBUG ERROR RESTORE: {str(e)}", flush=True)
        return Response(status_code=500, content=str(e))

# Snippets de código para añadir endpoints dinámicamente por lenguaje
def _generar_snippet_endpoint(lang: str, api: str, endpoint: Endpoint, db_type: str) -> str:
    """Genera el snippet de código para un nuevo endpoint según el lenguaje."""
    if lang == "python":
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
        return (
            f'\n@app.{endpoint.method}("{endpoint.path}")\n'
            f'def {endpoint.function_name}():\n'
            f'    with engine.connect() as conn:\n'
            f'        {logic_body}\n'
        )
    elif lang == "typescript":
        if endpoint.logic == "select":
            logic = f"const rows = await query('SELECT * FROM data_{api}');\n        res.json(rows);"
        elif endpoint.logic == "insert":
            logic = 'res.json({ msg: "inserted" });'
        elif endpoint.logic == "update":
            logic = 'res.json({ msg: "updated" });'
        else:
            logic = 'res.json({ msg: "deleted" });'
        return (
            f"\napp.{endpoint.method}('{endpoint.path}', async (req, res) => {{\n"
            f"    try {{\n"
            f"        {logic}\n"
            f"    }} catch (err) {{\n"
            f"        res.status(500).json({{ error: err.message }});\n"
            f"    }}\n"
            f"}});\n"
        )
    else:
        # Para lenguajes compilados (Go, Rust, C, C++, Java), regeneramos desde plantilla
        return None


def _regenerar_api_desde_plantilla(api: str, api_data, endpoint: Endpoint, db_session: Session):
    """Para lenguajes compilados, regenera toda la API desde la plantilla con el nuevo endpoint."""
    lang = api_data.language or "python"
    config = LANG_CONFIG[lang]
    proyect_path = f"deployments/{api}"

    # Leer los endpoints existentes del archivo actual no es práctico,
    # así que reconstruimos el código completo con el nuevo endpoint añadido.
    # Almacenamos los endpoints en la BD para poder regenerar.
    env = Environment(loader=FileSystemLoader(config["template_dir"]))
    template = env.get_template("api_template.jinja")

    # Crear un endpoint temporal para renderizar
    existing_endpoints = []
    # Intentar parsear los endpoints del archivo existente no es viable,
    # así que simplemente añadimos el nuevo y reconstruimos la imagen
    new_endpoint = {
        "method": endpoint.method,
        "path": endpoint.path,
        "function_name": endpoint.function_name,
        "logic": endpoint.logic,
    }
    existing_endpoints.append(new_endpoint)

    # No regeneramos el código principal, solo reconstruimos Docker
    return None


@app.post("/{api}/create-end-point")
def create_end_point(api: str, endpoint: Endpoint, db: Session = Depends(get_db)):
    """Añade un nuevo endpoint a una API existente."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        lang = api_data.language or "python"
        config = LANG_CONFIG.get(lang)
        if not config:
            return Response(status_code=400, content=f"Lenguaje '{lang}' no soportado")

        proyect_path = f"deployments/{api}"
        main_file = os.path.join(proyect_path, config["main_file"])

        # Generar snippet de código para el nuevo endpoint
        snippet = _generar_snippet_endpoint(lang, api, endpoint, api_data.db)

        if snippet is not None:
            # Lenguajes interpretados: append al archivo
            with open(main_file, "a") as f:
                f.write(snippet)
        else:
            # Lenguajes compilados: no se puede hacer append simple,
            # se notifica que se debe recrear la API con los endpoints deseados
            return Response(
                status_code=400,
                content=f"Para APIs en {lang}, recrea la API con todos los endpoints deseados. "
                        f"No se soporta añadir endpoints dinámicamente a lenguajes compilados."
            )

        subprocess.run(["docker", "build", "-t", f"api-{api}", proyect_path])
        subprocess.run(["docker", "rm", "-f", api])
        subprocess.run(["docker", "rm", "-f", f"{api}_backup"])

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)

        subprocess.Popen([
            "docker", "run", "-d",
            "--name", api,
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{port}:8000",
            f"api-{api}",
        ])

        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{api}_backup",
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{backup_port}:8000",
            f"api-{api}",
        ])

        return {"mensaje": "Endpoint añadido", "endpoint": endpoint.path}
    except Exception as e:
        print(f"DEBUG ERROR CREATE ENDPOINT: {str(e)}", flush=True)
        return Response(status_code=500, content=str(e))

@app.post("/{api}/delete")
def delete_api(api: str, db: Session = Depends(get_db)):
    try:
        registro = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not registro:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        usr = registro.usr
        db_type = registro.db

        subprocess.run(["docker", "rm", "-f", api])
        subprocess.run(["docker", "rm", "-f", f"{api}_backup"])

        proyect_path = f"deployments/{api}"

        if os.path.exists(proyect_path):
            shutil.rmtree(proyect_path)

        db.query(DBModel).filter(DBModel.api_name == api).delete()
        drop = text(f"DROP TABLE IF EXISTS data_{api}")
        db.execute(drop)

        try:
            _eliminar_usuario_y_bd(db_type, api, usr)
        except Exception as e_clean:
            print(f"WARN: no se pudo limpiar BD/usuario para {api}: {e_clean}", flush=True)

        db.commit()

        return Response(status_code=200, content=f"API {api} eliminada exitosamente")
    except Exception as e:
        db.rollback()
        print(f"DEBUG ERROR DELETE: {str(e)}", flush=True)
        return Response(status_code=500, content=f"Error al eliminar la API {api}: {str(e)}")
