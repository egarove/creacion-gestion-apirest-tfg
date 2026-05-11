# -*- coding: utf-8 -*-
"""
Endpoints de sistema, monitorización y UI.
"""
import httpx
from fastapi import APIRouter, Depends, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from settings import APPWEB_URL
from models import DBModel
from events.db import get_db
from services.docker_service import get_container_status, get_container_logs
from services.nginx_service import _write_nginx_conf, _reload_nginx


router = APIRouter()
templates = Environment(loader=FileSystemLoader("templates"))


def _fetch_appweb_with_retry(url: str, retries: int = 3) -> str:
    """Intenta conectar a appWeb con reintentos."""
    last_error = None
    
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url, follow_redirects=True)
                response.raise_for_status()
                return response.text
        except httpx.ConnectError as e:
            last_error = e
        except httpx.TimeoutException as e:
            last_error = e
        except Exception as e:
            last_error = e
            break
    
    raise last_error or Exception("No se pudo conectar a appWeb")


@router.get("/", response_class=HTMLResponse)
def root_dashboard():
    """Dashboard principal - proxy a appWeb."""
    try:
        html = _fetch_appweb_with_retry(APPWEB_URL, retries=2)
        return html
    except Exception as e:
        return f"""<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Error</title>
            <style>
                body {{ font-family: sans-serif; padding: 20px; background: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
                h1 {{ color: #d32f2f; }}
                p {{ color: #666; }}
                code {{ background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚠️ Dashboard no disponible</h1>
                <p>No se puede conectar al servicio <code>appWeb</code> en <code>{APPWEB_URL}</code></p>
                <p><strong>Verifica que:</strong></p>
                <ul>
                    <li>El contenedor <code>appweb</code> esté corriendo: <code>docker ps | grep appweb</code></li>
                    <li>El puerto 3000 esté abierto internamente en Docker</li>
                    <li>Los contenedores estén en la misma red de Docker</li>
                </ul>
                <details style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    <summary>Detalles del error</summary>
                    <pre>{str(e)}</pre>
                </details>
            </div>
        </body>
        </html>"""


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
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
def get_api_logs(api: str, tail: int = 100):
    """Obtiene los logs del contenedor de una API."""
    result = get_container_logs(api, tail)
    if isinstance(result, Response):
        return result
    return result


@router.post("/{api}/fix-nginx")
def fix_nginx(api: str, db: Session = Depends(get_db)):
    """Regenera la configuración de nginx para una API específica."""
    api_data = db.query(DBModel).filter(DBModel.api_name == api).first()
    if not api_data:
        return Response(status_code=404, content=f"No se encontró la API {api}")
    
    try:
        _write_nginx_conf(api, api_data.port)
        _reload_nginx()
        return {"mensaje": f"nginx conf regenerada para {api}", "puerto": api_data.port}
    except Exception as e:
        return Response(status_code=500, content=str(e))


@router.post("/fix-nginx-all")
def fix_nginx_all(db: Session = Depends(get_db)):
    """Regenera la configuración de nginx para todas las APIs."""
    try:
        apis = db.query(DBModel).all()
        for api_data in apis:
            _write_nginx_conf(api_data.api_name, api_data.port)
        _reload_nginx()
        return {"mensaje": f"nginx conf regenerada para {len(apis)} APIs"}
    except Exception as e:
        return Response(status_code=500, content=str(e))
