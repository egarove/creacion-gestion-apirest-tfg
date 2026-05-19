# -*- coding: utf-8 -*-
"""
Endpoints para la gestión CRUD de APIs.
"""
import os
import re
import shutil
import subprocess
from fastapi import APIRouter, Depends, Path, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from models import ApiModel, DBModel
from models.endpoint_model import Endpoint
from settings import LANG_CONFIG, HOST_API_PATH
from events.db import get_db
from routes.auth import firebase_dep
from services.db_manager import (
    _build_database_url,
    _crear_usuario_y_bd,
    _crear_tabla_en_bd_usuario,
    _crear_tabla_adicional,
    _get_free_port,
    _is_port_available,
)
from services.docker_service import (
    _build_docker_env_args,
    build_docker_image,
    start_api_containers,
    remove_containers,
    get_container_status,
)
from services.nginx_service import _write_nginx_conf, _remove_nginx_conf, _reload_nginx
from services.generator import (
    generate_api_project,
    regenerate_api_code,
)

_API_NAME_PATH = Path(pattern=r'^[a-z][a-z0-9_]{1,49}$')

router = APIRouter()


@router.get("/get-all-apis")
def get_all_apis(db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Obtiene todas las APIs registradas con su estado."""
    apis = db.query(DBModel).all()
    result = []
    for api in apis:
        main_status = get_container_status(api.api_name)
        backup_status = get_container_status(api.api_name, "_backup")
        result.append({
            "api_name": api.api_name,
            "port": api.port,
            "backup_port": api.backup_port,
            "db": api.db,
            "language": api.language or "python",
            "columns": api.columns or [],
            "tables": api.tables or [],
            "endpoints": api.endpoints or [],
            "generar_ui": bool(api.generar_ui),
            "status": main_status,
            "backup_status": backup_status,
        })
    return result


@router.get("/sync")
def sync_apis(db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Sincroniza el estado de todas las APIs con Docker."""
    apis = db.query(DBModel).all()
    result = []
    for api in apis:
        main_status = get_container_status(api.api_name)
        backup_status = get_container_status(api.api_name, "_backup")
        result.append({
            "api_name": api.api_name,
            "port": api.port,
            "backup_port": api.backup_port,
            "db": api.db,
            "language": api.language or "python",
            "columns": api.columns or [],
            "tables": api.tables or [],
            "endpoints": api.endpoints or [],
            "generar_ui": bool(api.generar_ui),
            "status": main_status,
            "backup_status": backup_status,
        })
    return result


@router.post("/crear-api")
def crear_nueva_api(project: ApiModel, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Crea una nueva API con la configuración proporcionada."""
    try:
        if db.query(DBModel).filter(DBModel.api_name == project.api_name).first():
            return Response(status_code=400, content="La API ya existe.")

        if project.db != "sqlite":
            if db.query(DBModel).filter(DBModel.usr == project.usr, DBModel.db == project.db).first():
                return Response(status_code=400, content=f"El usuario de base de datos '{project.usr}' ya existe. Usa un nombre diferente.")

        lang = project.language
        if lang not in LANG_CONFIG:
            return Response(status_code=400, content=f"Lenguaje '{lang}' no soportado")

        if project.port is not None:
            port = project.port
            # Comprobar que el puerto y el de backup no están ya en BD
            used_ports = set()
            for row in db.query(DBModel).all():
                used_ports.add(row.port)
                if row.backup_port:
                    used_ports.add(row.backup_port)
            if port in used_ports:
                return Response(status_code=400, content=f"El puerto {port} ya está en uso por otra API.")
            if port + 1 in used_ports:
                return Response(status_code=400, content=f"El puerto {port + 1} (backup) ya está en uso por otra API.")
            # Comprobar que los puertos están libres en el sistema
            if not _is_port_available(port):
                return Response(status_code=400, content=f"El puerto {port} ya está en uso en el sistema.")
            if not _is_port_available(port + 1):
                return Response(status_code=400, content=f"El puerto {port + 1} (backup) ya está en uso en el sistema.")
        else:
            port = _get_free_port(db)

        generar_ui = project.generar_ui

        # Generar proyecto desde plantillas
        generate_api_project(
            project.api_name,
            lang,
            project.db,
            project.endpoints,
            generar_ui,
            project.columns,
        )

        # Construir imagen Docker
        project_path = f"deployments/{project.api_name}"
        build_docker_image(project.api_name, project_path)

        # Crear usuario y base de datos
        url = _build_database_url(project.db, project.usr, project.paswd, project.api_name)
        backup_port = port + 1
        _crear_usuario_y_bd(project.db, project.api_name, project.usr, project.paswd)

        # Para SQLite: crear el fichero .db ANTES de arrancar contenedores
        # (Docker crearía un directorio si el path no existe en el host)
        sql_columns = ", ".join(project.columns)
        if project.db == "sqlite":
            _crear_tabla_en_bd_usuario(project.db, project.api_name, project.usr, project.paswd, sql_columns)

        # Generar argumentos de entorno para Docker
        env_args = _build_docker_env_args(lang, project.db, url, project.usr, project.paswd, project.api_name)

        # Arrancar contenedores
        volume_args = []
        if project.db == "sqlite":
            host_db = f"{HOST_API_PATH}/deployments/{project.api_name}/{project.api_name}.db"
            volume_args = ["-v", f"{host_db}:/data/{project.api_name}.db"]
        start_api_containers(project.api_name, port, backup_port, env_args, volume_args)

        # Guardar en base de datos
        endpoints_data = [ep.model_dump() for ep in project.endpoints]
        tables_data = [tbl.model_dump() for tbl in project.tables]
        db_data = DBModel(
            api_name=project.api_name,
            port=port,
            backup_port=backup_port,
            language=project.language,
            db=project.db,
            usr=project.usr,
            columns=project.columns,
            paswd=project.paswd,
            endpoints=endpoints_data,
            tables=tables_data,
            generar_ui=int(generar_ui),
        )
        db.add(db_data)
        db.commit()

        # Crear tabla para motores distintos de SQLite (ya hecho arriba para sqlite)
        if project.db != "sqlite":
            _crear_tabla_en_bd_usuario(project.db, project.api_name, project.usr, project.paswd, sql_columns)

        # Crear tablas adicionales
        for tbl in project.tables:
            extra_cols = ", ".join(tbl.columns)
            try:
                _crear_tabla_adicional(project.db, project.api_name, project.usr, project.paswd, tbl.name, extra_cols)
            except Exception:
                pass

        # Configurar nginx
        try:
            _write_nginx_conf(project.api_name, port)
        except Exception:
            pass

        return {
            "mensaje": f"API {project.api_name} creada en {lang}",
            "puerto": port,
            "backup_port": backup_port,
            "id": db_data.id,
            "language": lang,
        }
    except Exception:
        db.rollback()
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/start")
def start_api(api: str = _API_NAME_PATH, _auth: dict = Depends(firebase_dep)):
    """Inicia los contenedores de una API detenida."""
    try:
        from services.docker_service import start_container
        result = start_container(api)
        if isinstance(result, Response):
            return result
        return result
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/stop")
def stop_api(api: str = _API_NAME_PATH, _auth: dict = Depends(firebase_dep)):
    """Para los contenedores de una API en ejecución."""
    try:
        from services.docker_service import stop_container
        result = stop_container(api)
        if isinstance(result, Response):
            return result
        return result
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.get("/{api}/status")
def get_api_status(api: str = _API_NAME_PATH, _auth: dict = Depends(firebase_dep)):
    """Obtiene el estado del contenedor principal y del respaldo."""
    try:
        main_status = get_container_status(api)
        backup_status = get_container_status(api, "_backup")
        return {"status": main_status, "backup_status": backup_status}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/rebuild")
def rebuild_api(api: str = _API_NAME_PATH, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Regenera el código con el template actual y reconstruye la imagen Docker."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        lang = api_data.language or "python"
        
        # Regenerar código
        regenerate_api_code(
            api,
            lang,
            api_data.db,
            api_data.endpoints or [],
            api_data.columns or [],
            bool(api_data.generar_ui),
        )

        # Construir imagen
        project_path = f"deployments/{api}"
        build_docker_image(api, project_path)

        # Eliminar y relanzar contenedores
        remove_containers(api)

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)
        env_args = _build_docker_env_args(lang, api_data.db, url, api_data.usr, api_data.paswd, api)

        volume_args = []
        if api_data.db == "sqlite":
            host_db = f"{HOST_API_PATH}/deployments/{api}/{api}.db"
            volume_args = ["-v", f"{host_db}:/data/{api}.db"]
        start_api_containers(api, port, backup_port, env_args, volume_args)

        _write_nginx_conf(api, port)
        _reload_nginx()

        return {"mensaje": "API reconstruida", "puerto": port, "backup_port": backup_port}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/restore")
def restore_api(api: str = _API_NAME_PATH, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Para ambos contenedores y los relanza desde cero."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        remove_containers(api)

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)
        env_args = _build_docker_env_args(
            api_data.language or "python",
            api_data.db,
            url,
            api_data.usr,
            api_data.paswd,
            api
        )

        volume_args = []
        if api_data.db == "sqlite":
            host_db = f"{HOST_API_PATH}/deployments/{api}/{api}.db"
            volume_args = ["-v", f"{host_db}:/data/{api}.db"]
        start_api_containers(api, port, backup_port, env_args, volume_args)

        _write_nginx_conf(api, port)
        _reload_nginx()

        return {"mensaje": "API restaurada", "puerto": port, "backup_port": backup_port}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/create-end-point")
def create_end_point(api: str = _API_NAME_PATH, endpoint: Endpoint = ..., db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Añade un nuevo endpoint a una API existente."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        lang = api_data.language or "python"

        # Persist endpoint in DB first
        current_endpoints = list(api_data.endpoints or [])
        current_endpoints.append(endpoint.model_dump())
        api_data.endpoints = current_endpoints
        db.commit()

        # Regenerate full code from template (ensures correct logic + table handling)
        eps_objs = [Endpoint(**ep) for ep in current_endpoints]
        regenerate_api_code(api, lang, api_data.db, eps_objs, list(api_data.columns or []), bool(api_data.generar_ui))

        # Reconstruir imagen y contenedores
        project_path = f"deployments/{api}"
        build_docker_image(api, project_path)
        remove_containers(api)

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)

        env_args = _build_docker_env_args(
            api_data.language or "python",
            api_data.db,
            url,
            api_data.usr,
            api_data.paswd,
            api,
        )
        volume_args = []
        if api_data.db == "sqlite":
            host_db = f"{HOST_API_PATH}/deployments/{api}/{api}.db"
            volume_args = ["-v", f"{host_db}:/data/{api}.db"]
        start_api_containers(api, port, backup_port, env_args, volume_args)

        _write_nginx_conf(api, port)
        _reload_nginx()

        return {"mensaje": "Endpoint añadido", "endpoint": endpoint.path}
    except Exception as e:
        return Response(status_code=500, content=f"Error interno del servidor: {e}")


@router.delete("/{api}/endpoint")
def delete_endpoint(api: str = _API_NAME_PATH, function_name: str = "", db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Elimina un endpoint de una API existente y reconstruye el contenedor."""
    try:
        api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not api_data:
            return Response(status_code=404, content=f"No se encontró la API {api}")

        current_endpoints = list(api_data.endpoints or [])
        updated_endpoints = [ep for ep in current_endpoints if ep.get("function_name") != function_name]

        if len(updated_endpoints) == len(current_endpoints):
            return Response(status_code=404, content=f"Endpoint '{function_name}' no encontrado")

        api_data.endpoints = updated_endpoints
        db.commit()

        lang = api_data.language or "python"
        eps_objs = [Endpoint(**ep) for ep in updated_endpoints]
        regenerate_api_code(api, lang, api_data.db, eps_objs, list(api_data.columns or []), bool(api_data.generar_ui))

        project_path = f"deployments/{api}"
        build_docker_image(api, project_path)
        remove_containers(api)

        url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api)
        port = api_data.port
        backup_port = api_data.backup_port or (port + 1)
        env_args = _build_docker_env_args(lang, api_data.db, url, api_data.usr, api_data.paswd, api)
        volume_args = []
        if api_data.db == "sqlite":
            host_db = f"{HOST_API_PATH}/deployments/{api}/{api}.db"
            volume_args = ["-v", f"{host_db}:/data/{api}.db"]
        start_api_containers(api, port, backup_port, env_args, volume_args)
        _write_nginx_conf(api, port)
        _reload_nginx()

        return {"mensaje": "Endpoint eliminado", "function_name": function_name}
    except Exception as e:
        return Response(status_code=500, content=f"Error interno del servidor: {e}")


@router.post("/{api}/delete")
def delete_api(api: str = _API_NAME_PATH, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Elimina la API y sus recursos (contenedores, archivos, BD)."""
    try:
        reg = db.query(DBModel).filter(DBModel.api_name == api).first()
        if not reg:
            return Response(status_code=404)

        # Eliminar contenedores
        remove_containers(api)

        # Eliminar archivos del proyecto
        project_path = f"deployments/{api}"
        if os.path.exists(project_path):
            shutil.rmtree(project_path)

        # Eliminar registro de BD
        db.delete(reg)
        db.commit()

        # Limpiar la BD del usuario de la API
        from services.db_manager import _drop_user_database
        try:
            _drop_user_database(reg.db, api, reg.usr)
        except Exception:
            pass

        # Eliminar configuración de nginx
        try:
            _remove_nginx_conf(api)
        except Exception:
            pass

        return {"mensaje": "Eliminado"}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")