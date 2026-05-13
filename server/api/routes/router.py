# -*- coding: utf-8 -*-
"""
Router centralizado que agrega todos los sub-routers de la API.
"""
from fastapi import APIRouter

from . import api_mgmt, system, ui_proxy, schema


router = APIRouter()

# Incluir routers de sub-módulos
router.include_router(api_mgmt.router, prefix="", tags=["api_management"])
router.include_router(system.router, prefix="", tags=["system"])
router.include_router(ui_proxy.router, prefix="", tags=["ui_proxy"])
router.include_router(schema.router, prefix="", tags=["schema"])
