# -*- coding: utf-8 -*-
"""
Verificación de tokens Firebase.
- GET /auth/verify  → usado por nginx auth_request para las APIs generadas.
- firebase_dep      → dependencia FastAPI para rutas internas (ui-proxy CRUD).
"""
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from services.firebase_auth import verify_token

router = APIRouter()


@router.get("/auth/verify")
async def auth_verify(request: Request):
    """Nginx auth_request llama aquí. 200 → permitido, 401 → denegado."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid Authorization header"},
        )
    token = auth_header.split(" ", 1)[1]
    try:
        payload = verify_token(token)
        return {"uid": payload.get("sub"), "email": payload.get("email")}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(status_code=401, content={"detail": str(exc)})


async def firebase_dep(authorization: str = Header(default="")) -> dict:
    """FastAPI Depends: exige token Firebase válido en el header Authorization."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    token = authorization.split(" ", 1)[1]
    try:
        return verify_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=str(exc)) from exc
