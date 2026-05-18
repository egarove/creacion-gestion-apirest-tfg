# -*- coding: utf-8 -*-
"""
Rutas DDL para gestión dinámica del esquema de bases de datos de usuario.
SOLO accesible desde el panel web (no expuesto a la app móvil).
"""
from fastapi import APIRouter, Depends, Path, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import DBModel
from events.db import get_db
from routes.auth import firebase_dep
from services.db_manager import (
    _get_user_schema,
    _ddl_create_table,
    _ddl_drop_table,
    _ddl_add_column,
    _ddl_add_fk,
)

_API_NAME_PATH = Path(pattern=r'^[a-z][a-z0-9_]{1,49}$')

router = APIRouter(prefix="/schema", tags=["schema"])


class ColumnDef(BaseModel):
    name: str
    type: str
    nullable: bool = True
    ref_table: str | None = None
    ref_col: str | None = None


class TableCreate(BaseModel):
    name: str
    columns: list[ColumnDef]


class ColumnAdd(BaseModel):
    name: str
    type: str


class FKCreate(BaseModel):
    column: str
    ref_table: str
    ref_column: str


def _get_api_or_404(api: str, db: Session):
    record = db.query(DBModel).filter(DBModel.api_name == api).first()
    if not record:
        raise ValueError(f"API '{api}' no encontrada")
    return record


@router.get("/{api}")
def get_schema(api: str = _API_NAME_PATH, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Devuelve el esquema completo (tablas + columnas + FKs) de la BD de usuario."""
    try:
        record = _get_api_or_404(api, db)
        schema = _get_user_schema(record.db, api, record.usr, record.paswd)
        return {"api": api, "db_type": record.db, "tables": schema}
    except ValueError as e:
        return Response(status_code=404, content=str(e))
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/tables")
def create_table(api: str = _API_NAME_PATH, body: TableCreate = ..., db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Crea una nueva tabla en la BD de usuario."""
    try:
        record = _get_api_or_404(api, db)
        cols = [{"name": c.name, "type": c.type, "nullable": c.nullable,
                  "ref_table": c.ref_table, "ref_col": c.ref_col} for c in body.columns]
        _ddl_create_table(record.db, api, record.usr, record.paswd, body.name, cols)
        return {"ok": True, "table": body.name}
    except ValueError as e:
        return Response(status_code=400, content=str(e))
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.delete("/{api}/tables/{table_name}")
def drop_table(api: str = _API_NAME_PATH, table_name: str = Path(pattern=r'^[a-zA-Z_][a-zA-Z0-9_]{0,63}$'), db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Elimina una tabla de la BD de usuario."""
    try:
        record = _get_api_or_404(api, db)
        _ddl_drop_table(record.db, api, record.usr, record.paswd, table_name)
        return {"ok": True, "dropped": table_name}
    except ValueError as e:
        return Response(status_code=400, content=str(e))
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/tables/{table_name}/columns")
def add_column(api: str = _API_NAME_PATH, table_name: str = Path(pattern=r'^[a-zA-Z_][a-zA-Z0-9_]{0,63}$'), body: ColumnAdd = ..., db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Añade una columna a una tabla existente."""
    try:
        record = _get_api_or_404(api, db)
        _ddl_add_column(record.db, api, record.usr, record.paswd, table_name, body.name, body.type)
        return {"ok": True, "column": body.name, "table": table_name}
    except ValueError as e:
        return Response(status_code=400, content=str(e))
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")


@router.post("/{api}/tables/{table_name}/fk")
def add_foreign_key(api: str = _API_NAME_PATH, table_name: str = Path(pattern=r'^[a-zA-Z_][a-zA-Z0-9_]{0,63}$'), body: FKCreate = ..., db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    """Añade una Foreign Key a una tabla."""
    try:
        record = _get_api_or_404(api, db)
        _ddl_add_fk(record.db, api, record.usr, record.paswd,
                    table_name, body.column, body.ref_table, body.ref_column)
        return {"ok": True, "fk": f"{table_name}.{body.column} → {body.ref_table}.{body.ref_column}"}
    except ValueError as e:
        return Response(status_code=400, content=str(e))
    except Exception:
        return Response(status_code=500, content="Error interno del servidor")
