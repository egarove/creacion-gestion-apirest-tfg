# -*- coding: utf-8 -*-
"""
Master API Generator Backend
Arquitectura de élite para la gestión dinámica de microservicios Docker.
"""
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager

from routes.router import router
from events.db import engine, Base


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

# Incluir todos los routers
app.include_router(router)



