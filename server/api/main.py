# -*- coding: utf-8 -*-
"""
Master API Generator Backend
Arquitectura de élite para la gestión dinámica de microservicios Docker.
"""
import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.concurrency import asynccontextmanager

from routes.router import router
from events.db import engine, Base
from models.endpoint_model import STRICT_MATRIX


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa las tablas de BD al arrancar la app."""
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


app = FastAPI(
    title="API Generator",
    description="Gestor de generación dinámica de APIs con Docker",
    version="1.0.0",
    lifespan=lifespan
)


@app.middleware("http")
async def strict_matrix_middleware(request: Request, call_next):
    """
    Capa 1 de seguridad: bloquea configuraciones método/lógica ilegales.
    Ningún controlador puede evadir esta validación.
    """
    path = request.url.path
    method = request.method

    is_crear_api = path == "/crear-api" and method == "POST"
    is_crear_endpoint = path.endswith("/create-end-point") and method == "POST"

    if is_crear_api or is_crear_endpoint:
        try:
            # Lee y cachea el body (Starlette lo almacena internamente)
            raw = await request.body()
            data = json.loads(raw)

            endpoints_to_check = data.get("endpoints", []) if is_crear_api else [data]

            for ep in endpoints_to_check:
                ep_method = ep.get("method", "").lower()
                ep_logic = ep.get("logic", "").lower()
                allowed = STRICT_MATRIX.get(ep_method, [])
                if ep_logic not in allowed:
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": "STRICT_MATRIX_VIOLATION",
                            "detail": (
                                f"Método {ep_method.upper()} no permite la lógica "
                                f"'{ep_logic}'. Permitido: {allowed}"
                            ),
                        },
                    )
        except (json.JSONDecodeError, Exception):
            pass  # El controlador devolverá el error de validación correspondiente

    return await call_next(request)


# Incluir todos los routers
app.include_router(router)
