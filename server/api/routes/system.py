# -*- coding: utf-8 -*-
"""
Endpoints de sistema, monitorización y UI.
"""
from fastapi import APIRouter, Depends, Path, Response
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from models import DBModel
from events.db import get_db
from routes.auth import firebase_dep
from services.docker_service import get_container_status, get_container_logs
from services.nginx_service import _write_nginx_conf, _reload_nginx

_API_NAME_PATH = Path(pattern=r'^[a-z][a-z0-9_]{1,49}$')

router = APIRouter()
templates = Environment(loader=FileSystemLoader("templates"))


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Obtiene estadísticas de las APIs (total, en ejecución, paradas, endpoints)."""
    apis = db.query(DBModel).all()
    running = stopped = total_endpoints = 0
    for api in apis:
        status = get_container_status(api.api_name)
        if status == "running":
            running += 1
        else:
            stopped += 1
        total_endpoints += len(api.endpoints or [])

    return {
        "total": len(apis),
        "running": running,
        "stopped": stopped,
        "total_endpoints": total_endpoints,
    }


@router.get("/{api}/logs")
def get_api_logs(api: str = _API_NAME_PATH, tail: int = 100, _auth: dict = Depends(firebase_dep)):
    """Obtiene los logs del contenedor de una API."""
    result = get_container_logs(api, tail)
    if isinstance(result, Response):
        return result
    return result


@router.post("/{api}/fix-nginx")
def fix_nginx(api: str = _API_NAME_PATH, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Regenera la configuración de nginx para una API específica."""
    api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
    if not api_data:
        return Response(status_code=404, content="API no encontrada")

    try:
        _write_nginx_conf(api, api_data.port)
        _reload_nginx()
        return {"mensaje": f"nginx conf regenerada para {api}", "puerto": api_data.port}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/fix-nginx-all")
def fix_nginx_all(db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Regenera la configuración de nginx para todas las APIs."""
    try:
        apis = db.query(DBModel).all()
        for api_data in apis:
            _write_nginx_conf(api_data.api_name, api_data.port)
        _reload_nginx()
        return {"mensaje": f"nginx conf regenerada para {len(apis)} APIs"}
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")
