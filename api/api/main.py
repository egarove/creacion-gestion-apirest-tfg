# -*- coding: utf-8 -*-
"""
Master API Generator Backend
Arquitectura de élite para la gestión dinámica de microservicios Docker.
"""
import os
import shutil
import subprocess
import time
import docker
import psycopg2
import psycopg2.errors
from psycopg2.extensions import quote_ident
import pymysql
from fastapi import Depends, FastAPI, Response, Request
from fastapi.responses import HTMLResponse
from fastapi.concurrency import asynccontextmanager
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import text
from sqlalchemy.orm import Session

from settings import API_IP
from events.db import engine, Base, get_db
from models import ApiModel, DBModel, UpdateApiModel
from models.endpoint_model import Endpoint

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

# Hostnames Docker para conexiones dentro de la red api_default
db_configs = {
    "postgresql": {"port": "5432", "driver": "postgresql", "host": "postgres"},
    "mysql":      {"port": "3306", "driver": "mysql+pymysql", "host": "mysql"},
    "mariadb":    {"port": "3306", "driver": "mysql+pymysql", "host": "mariadb"},
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()

app = FastAPI(lifespan=lifespan)
templates = Environment(loader=FileSystemLoader("templates"))

def _build_database_url(motor: str, usr: str, paswd: str, api_name: str) -> str:
    if motor == "sqlite":
        return f"sqlite:///{api_name}.db"
    elif motor in db_configs:
        config = db_configs[motor]
        return f"{config['driver']}://{usr}:{paswd}@{config['host']}:{config['port']}/{api_name}_db"
    raise ValueError(f"Motor '{motor}' no soportado.")

def _crear_usuario_y_bd(db_type: str, api_name: str, usr: str, paswd: str):
    if db_type == "sqlite": return
    db_name = f"{api_name}_db"

    if db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname="postgres", user="user", password="password")
        conn.autocommit = True
        cursor = conn.cursor()
        try:
            cursor.execute(f"CREATE USER {quote_ident(usr, conn)} WITH PASSWORD %s;", (paswd,))
        except psycopg2.errors.DuplicateObject:
            cursor.execute(f"ALTER USER {quote_ident(usr, conn)} WITH PASSWORD %s;", (paswd,))
        try:
            cursor.execute(f"CREATE DATABASE {quote_ident(db_name, conn)} OWNER {quote_ident(usr, conn)};")
        except psycopg2.errors.DuplicateDatabase:
            pass
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {quote_ident(db_name, conn)} TO {quote_ident(usr, conn)};")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user="root", password="password")
        cursor = conn.cursor()
        try:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{api_name}_db`;")
            cursor.execute(f"CREATE USER IF NOT EXISTS '{usr}'@'%' IDENTIFIED BY %s;", (paswd,))
            cursor.execute(f"GRANT ALL PRIVILEGES ON `{api_name}_db`.* TO '{usr}'@'%';")
            cursor.execute("FLUSH PRIVILEGES;")
        finally:
            conn.commit()
            cursor.close()
            conn.close()

def _crear_tabla_en_bd_usuario(db_type: str, api_name: str, usr: str, paswd: str, sql_columns: str):
    if db_type == "sqlite": return
    table_name = f"data_{api_name}"
    db_name = f"{api_name}_db"

    if db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {quote_ident(table_name, conn)} (id SERIAL PRIMARY KEY, {sql_columns});")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` (id INT AUTO_INCREMENT PRIMARY KEY, {sql_columns});")
        conn.commit()
        cursor.close()
        conn.close()

@app.get("/", response_class=HTMLResponse)
def root_dashboard():
    template = templates.get_template("dashboard.jinja")
    return template.render()

@app.get("/get-all-apis")
def get_all_apis(db: Session = Depends(get_db)):
    client = docker.from_env()
    apis = db.query(DBModel).all()
    result = []
    for api in apis:
        try:
            container = client.containers.get(api.api_name)
            status = container.status
        except:
            status = "not_found"
        result.append({
            "api_name": api.api_name,
            "port": api.port,
            "db": api.db,
            "status": status
        })
    return result

@app.post("/crear-api")
def crear_nueva_api(project: ApiModel, db: Session = Depends(get_db)):
    try:
        if db.query(DBModel).filter(DBModel.api_name == project.api_name).first():
            return Response(status_code=400, content="La API ya existe.")

        lang = project.language
        if lang not in LANG_CONFIG:
            return Response(status_code=400, content=f"Lenguaje '{lang}' no soportado")
        config = LANG_CONFIG[lang]

        project_path = f"deployments/{project.api_name}"
        os.makedirs(project_path, exist_ok=True)

        env = Environment(loader=FileSystemLoader(config["template_dir"]))
        template = env.get_template("api_template.jinja")
        codigo = template.render(
            api_name=project.api_name,
            endpoints=project.endpoints,
            generar_ui=project.generar_ui,
            db=project.db,
        )

        main_file_path = os.path.join(project_path, config["main_file"])
        os.makedirs(os.path.dirname(main_file_path), exist_ok=True)
        with open(main_file_path, "w") as f:
            f.write(codigo)

        for template_name, output_name in config["extra_files"]:
            extra_template = env.get_template(template_name)
            extra_content = extra_template.render(api_name=project.api_name, db=project.db)
            extra_path = os.path.join(project_path, output_name)
            os.makedirs(os.path.dirname(extra_path), exist_ok=True)
            with open(extra_path, "w") as f:
                f.write(extra_content)

        dockerfile_content = env.get_template("docker_template.jinja").render(
            api_name=project.api_name,
            db=project.db,
        )
        with open(os.path.join(project_path, "Dockerfile"), "w") as f:
            f.write(dockerfile_content)

        subprocess.run(["docker", "build", "-t", f"api-{project.api_name}", project_path], check=True)

        url = _build_database_url(project.db, project.usr, project.paswd, project.api_name)
        backup_port = project.port + 1

        _crear_usuario_y_bd(project.db, project.api_name, project.usr, project.paswd)

        subprocess.Popen([
            "docker", "run", "-d",
            "--name", project.api_name,
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{project.port}:8000",
            f"api-{project.api_name}"
        ])
        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{project.api_name}_backup",
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{backup_port}:8000",
            f"api-{project.api_name}"
        ])

        endpoints_data = [ep.model_dump() for ep in project.endpoints]
        db_data = DBModel(
            api_name=project.api_name,
            port=project.port,
            backup_port=backup_port,
            language=project.language,
            db=project.db,
            usr=project.usr,
            columns=project.columns,
            paswd=project.paswd,
            endpoints=endpoints_data,
            generar_ui=int(project.generar_ui),
        )
        db.add(db_data)
        db.commit()

        sql_columns = ", ".join(project.columns)
        _crear_tabla_en_bd_usuario(project.db, project.api_name, project.usr, project.paswd, sql_columns)

        return {
            "mensaje": f"API {project.api_name} creada en {lang}",
            "puerto": project.port,
            "backup_port": backup_port,
            "id": db_data.id,
            "language": lang,
        }
    except Exception as e:
        db.rollback()
        return Response(status_code=500, content=str(e))

@app.post("/{api}/start")
def start_api(api: str):
    try:
        client = docker.from_env()
        c = client.containers.get(api)
        c.start()
        return {"status": "running"}
    except Exception as e: return Response(status_code=500, content=str(e))

@app.post("/{api}/stop")
def stop_api(api: str):
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

@app.get("/{api}/status")
def get_api_status(api: str):
    """Estado del contenedor principal y del respaldo."""
    try:
        client = docker.from_env()
        try:
            main_status = client.containers.get(api).status
        except Exception:
            main_status = "not_found"
        try:
            backup_status = client.containers.get(f"{api}_backup").status
        except Exception:
            backup_status = "not_found"
        return {"status": main_status, "backup_status": backup_status}
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
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{port}:8000",
            f"api-{api}"
        ])
        subprocess.Popen([
            "docker", "run", "-d",
            "--name", f"{api}_backup",
            "--network", "api_default",
            "-e", f"DATABASE_URL={url}",
            "-p", f"{backup_port}:8000",
            f"api-{api}"
        ])

        return {"mensaje": "API restaurada", "puerto": port, "backup_port": backup_port}
    except Exception as e:
        return Response(status_code=500, content=str(e))

def _generar_snippet_endpoint(lang: str, api: str, endpoint: Endpoint, db_type: str):
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

        project_path = f"deployments/{api}"
        main_file = os.path.join(project_path, config["main_file"])

        snippet = _generar_snippet_endpoint(lang, api, endpoint, api_data.db)

        if snippet is not None:
            with open(main_file, "a") as f:
                f.write(snippet)
        else:
            return Response(
                status_code=400,
                content=f"Para APIs en {lang}, recrea la API con todos los endpoints deseados. "
                        f"No se soporta añadir endpoints dinámicamente a lenguajes compilados."
            )

        subprocess.run(["docker", "build", "-t", f"api-{api}", project_path])
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
        return Response(status_code=500, content=str(e))

@app.post("/{api}/delete")
def delete_api(api: str, db: Session = Depends(get_db)):
    """Elimina la API y sus recursos."""
    try:
        reg = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not reg: return Response(status_code=404)

        client = docker.from_env()
        for suffix in ["", "_backup"]:
            try: client.containers.get(f"{api}{suffix}").remove(force=True)
            except: pass

        project_path = f"deployments/{api}"
        if os.path.exists(project_path): shutil.rmtree(project_path)

        db.delete(reg)
        db.execute(text(f"DROP TABLE IF EXISTS data_{api}"))
        db.commit()
        return {"mensaje": "Eliminado"}
    except Exception as e: return Response(status_code=500, content=str(e))
