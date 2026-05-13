# -*- coding: utf-8 -*-
"""
Verificación de tokens Firebase.
- GET /auth/verify  → usado por nginx auth_request para las APIs generadas.
- firebase_dep      → dependencia FastAPI para rutas internas (ui-proxy CRUD).
"""
import re
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from events.db import get_db
from models import DBModel
from services.firebase_auth import verify_token

router = APIRouter()


def _path_matches(template: str, actual: str) -> bool:
    """True if actual path matches template that may have {param} placeholders."""
    parts = re.split(r'\{[^}]+\}', template)
    pattern = '^' + '[^/]+'.join(re.escape(p) for p in parts) + '$'
    return bool(re.match(pattern, actual))


@router.get("/auth/verify")
async def auth_verify(request: Request, db: Session = Depends(get_db)):
    """Nginx auth_request llama aquí. 200 → permitido, 401 → denegado."""
    # Check if the requested endpoint is public (no token required)
    original_uri = request.headers.get("X-Original-URI", "")
    if original_uri.startswith("/app/"):
        tail = original_uri[5:]  # strip "/app/"
        slash = tail.find("/")
        if slash != -1:
            api_name = tail[:slash]
            ep_path = "/" + tail[slash + 1:].split("?")[0]
        else:
            api_name = tail.split("?")[0]
            ep_path = "/"
        try:
            api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
            if api_data and api_data.endpoints:
                for ep in api_data.endpoints:
                    if ep.get("is_public") and _path_matches(ep.get("path", ""), ep_path):
                        return {"public": True, "api": api_name}
        except Exception:
            pass  # DB error → fall through to token check

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
