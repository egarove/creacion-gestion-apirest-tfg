# -*- coding: utf-8 -*-
"""
Gestor de base de datos para creación y configuración de usuarios y tablas.
Soporta SQLite, PostgreSQL, MySQL y MariaDB.
"""
import os
import sqlite3 as sqlite3_lib
import psycopg2
import psycopg2.errors
from psycopg2.extensions import quote_ident
import pymysql
from sqlalchemy.orm import Session

from settings import DB_CONFIGS
from models import DBModel


def _build_database_url(motor: str, usr: str, paswd: str, api_name: str) -> str:
    if motor == "sqlite":
        return f"sqlite:////data/{api_name}.db"
    elif motor in DB_CONFIGS:
        config = DB_CONFIGS[motor]
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
            cursor.execute(f"CREATE USER IF NOT EXISTS '{usr}'@'%%' IDENTIFIED BY %s;", (paswd,))
            cursor.execute(f"GRANT ALL PRIVILEGES ON `{api_name}_db`.* TO '{usr}'@'%';")
            cursor.execute("FLUSH PRIVILEGES;")
        finally:
            conn.commit()
            cursor.close()
            conn.close()

def _crear_tabla_en_bd_usuario(db_type: str, api_name: str, usr: str, paswd: str, sql_columns: str):
    table_name = f"data_{api_name}"
    db_name = f"{api_name}_db"

    if db_type == "sqlite":
        # SQLite: crear la tabla dentro del directorio de deployment para que el contenedor la monte
        project_path = f"deployments/{api_name}"
        os.makedirs(project_path, exist_ok=True)
        db_path = os.path.join(project_path, f"{api_name}.db")
        conn = sqlite3_lib.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} (id INTEGER PRIMARY KEY AUTOINCREMENT, {sql_columns});")
        conn.commit()
        cursor.close()
        conn.close()
    elif db_type == "postgresql":
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


def _drop_user_database(db_type: str, api_name: str, usr: str):
    """Elimina la base de datos y el usuario creados para la API."""
    if db_type == "sqlite":
        db_path = f"deployments/{api_name}/{api_name}.db"
        if os.path.exists(db_path):
            os.remove(db_path)
        return
    db_name = f"{api_name}_db"
    if db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname="postgres", user="user", password="password")
        conn.autocommit = True
        cursor = conn.cursor()
        try:
            cursor.execute(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s;", (db_name,))
            cursor.execute(f"DROP DATABASE IF EXISTS {quote_ident(db_name, conn)};")
        except Exception:
            pass
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user="root", password="password")
        cursor = conn.cursor()
        try:
            cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`;")
            cursor.execute(f"DROP USER IF EXISTS '{usr}'@'%';")
            cursor.execute("FLUSH PRIVILEGES;")
        except Exception:
            pass
        finally:
            conn.commit()
            cursor.close()
            conn.close()


# ─────────────────────────────────────────────
# DDL ENGINE: gestión dinámica del esquema de BD
# ─────────────────────────────────────────────

def _get_user_schema(db_type: str, api_name: str, usr: str, paswd: str) -> list[dict]:
    """Devuelve lista de tablas con sus columnas para la BD de usuario."""
    if db_type == "sqlite":
        db_path = f"deployments/{api_name}/{api_name}.db"
        conn = sqlite3_lib.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [row[0] for row in cursor.fetchall()]
        result = []
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table});")
            cols = [{"name": r[1], "type": r[2], "nullable": not r[3], "pk": bool(r[5])} for r in cursor.fetchall()]
            # FK info
            cursor.execute(f"PRAGMA foreign_key_list({table});")
            fks = [{"column": r[3], "ref_table": r[2], "ref_column": r[4]} for r in cursor.fetchall()]
            result.append({"table": table, "columns": cols, "foreign_keys": fks})
        conn.close()
        return result

    db_name = f"{api_name}_db"
    if db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name;
        """)
        tables = [r[0] for r in cursor.fetchall()]
        result = []
        for table in tables:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = %s ORDER BY ordinal_position;
            """, (table,))
            cols = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cursor.fetchall()]
            cursor.execute("""
                SELECT kcu.column_name, ccu.table_name, ccu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = %s;
            """, (table,))
            fks = [{"column": r[0], "ref_table": r[1], "ref_column": r[2]} for r in cursor.fetchall()]
            result.append({"table": table, "columns": cols, "foreign_keys": fks})
        cursor.close()
        conn.close()
        return result

    if db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES;")
        tables = [r[0] for r in cursor.fetchall()]
        result = []
        for table in tables:
            cursor.execute(f"DESCRIBE `{table}`;")
            cols = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cursor.fetchall()]
            cursor.execute(f"""
                SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND REFERENCED_TABLE_NAME IS NOT NULL;
            """, (db_name, table))
            fks = [{"column": r[0], "ref_table": r[1], "ref_column": r[2]} for r in cursor.fetchall()]
            result.append({"table": table, "columns": cols, "foreign_keys": fks})
        cursor.close()
        conn.close()
        return result

    return []


def _safe_identifier(name: str) -> str:
    """Valida que un identificador SQL solo contiene caracteres seguros."""
    import re
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        raise ValueError(f"Identificador inválido: '{name}'")
    return name


def _ddl_create_table(db_type: str, api_name: str, usr: str, paswd: str,
                       table_name: str, columns: list[dict]) -> None:
    """Crea una nueva tabla en la BD de usuario, con soporte de FK inline."""
    table_name = _safe_identifier(table_name)
    col_parts = []
    fk_clauses = []  # For MySQL/MariaDB: separate FOREIGN KEY clauses

    for col in columns:
        col_name = _safe_identifier(col["name"])
        col_type = col["type"]
        nullable = "" if col.get("nullable", True) else " NOT NULL"
        ref_table = col.get("ref_table")
        ref_col = col.get("ref_col")

        if ref_table and ref_col:
            ref_table = _safe_identifier(ref_table)
            ref_col = _safe_identifier(ref_col)
            if db_type in ("sqlite", "postgresql"):
                col_parts.append(f"{col_name} {col_type}{nullable} REFERENCES {ref_table}({ref_col})")
            else:  # mysql / mariadb
                col_parts.append(f"`{col_name}` {col_type}{nullable}")
                fk_clauses.append(f"FOREIGN KEY (`{col_name}`) REFERENCES `{ref_table}`(`{ref_col}`)")
        else:
            if db_type in ("mariadb", "mysql"):
                col_parts.append(f"`{col_name}` {col_type}{nullable}")
            else:
                col_parts.append(f"{col_name} {col_type}{nullable}")

    db_name = f"{api_name}_db"

    if db_type == "sqlite":
        db_path = f"deployments/{api_name}/{api_name}.db"
        cols_sql = ", ".join(col_parts)
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} (id INTEGER PRIMARY KEY AUTOINCREMENT, {cols_sql});"
        conn = sqlite3_lib.connect(db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(sql)
        conn.commit()
        conn.close()
    elif db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        conn.autocommit = True
        cursor = conn.cursor()
        cols_sql = ", ".join(col_parts)
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} (id SERIAL PRIMARY KEY, {cols_sql});")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        all_parts = col_parts + fk_clauses
        cols_sql = ", ".join(all_parts)
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` (id INT AUTO_INCREMENT PRIMARY KEY, {cols_sql});")
        conn.commit()
        cursor.close()
        conn.close()


def _ddl_drop_table(db_type: str, api_name: str, usr: str, paswd: str, table_name: str) -> None:
    """Elimina una tabla de la BD de usuario."""
    table_name = _safe_identifier(table_name)
    db_name = f"{api_name}_db"

    if db_type == "sqlite":
        db_path = f"deployments/{api_name}/{api_name}.db"
        conn = sqlite3_lib.connect(db_path)
        conn.execute(f"DROP TABLE IF EXISTS {table_name};")
        conn.commit()
        conn.close()
    elif db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"DROP TABLE IF EXISTS {quote_ident(table_name, conn)} CASCADE;")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`;")
        conn.commit()
        cursor.close()
        conn.close()


def _ddl_add_column(db_type: str, api_name: str, usr: str, paswd: str,
                    table_name: str, col_name: str, col_type: str) -> None:
    """Añade una columna a una tabla existente."""
    table_name = _safe_identifier(table_name)
    col_name = _safe_identifier(col_name)
    db_name = f"{api_name}_db"

    if db_type == "sqlite":
        db_path = f"deployments/{api_name}/{api_name}.db"
        conn = sqlite3_lib.connect(db_path)
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};")
        conn.commit()
        conn.close()
    elif db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"ALTER TABLE {quote_ident(table_name, conn)} ADD COLUMN {quote_ident(col_name, conn)} {col_type};")
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col_name}` {col_type};")
        conn.commit()
        cursor.close()
        conn.close()


def _ddl_add_fk(db_type: str, api_name: str, usr: str, paswd: str,
                table_name: str, col_name: str, ref_table: str, ref_col: str) -> None:
    """Añade una Foreign Key a una tabla."""
    table_name = _safe_identifier(table_name)
    col_name = _safe_identifier(col_name)
    ref_table = _safe_identifier(ref_table)
    ref_col = _safe_identifier(ref_col)
    db_name = f"{api_name}_db"
    constraint_name = f"fk_{table_name}_{col_name}_{ref_table}"

    if db_type == "sqlite":
        raise ValueError("SQLite no soporta ADD CONSTRAINT FK en tablas existentes. Recrea la tabla con la FK definida.")
    elif db_type == "postgresql":
        conn = psycopg2.connect(host="postgres", port=5432, dbname=db_name, user=usr, password=paswd)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(
            f"ALTER TABLE {quote_ident(table_name, conn)} "
            f"ADD CONSTRAINT {quote_ident(constraint_name, conn)} "
            f"FOREIGN KEY ({quote_ident(col_name, conn)}) "
            f"REFERENCES {quote_ident(ref_table, conn)} ({quote_ident(ref_col, conn)});"
        )
        cursor.close()
        conn.close()
    elif db_type in ("mariadb", "mysql"):
        conn = pymysql.connect(host=db_type, port=3306, user=usr, password=paswd, database=db_name)
        cursor = conn.cursor()
        cursor.execute(
            f"ALTER TABLE `{table_name}` "
            f"ADD CONSTRAINT `{constraint_name}` "
            f"FOREIGN KEY (`{col_name}`) REFERENCES `{ref_table}` (`{ref_col}`);"
        )
        conn.commit()
        cursor.close()
        conn.close()


def _is_port_available(port: int) -> bool:
    """Comprueba que el puerto no está en uso en el sistema."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(('0.0.0.0', port))
            return True
        except OSError:
            return False


def _get_free_port(db: Session) -> int:
    used = set()
    for row in db.query(DBModel).all():
        used.add(row.port)
        if row.backup_port:
            used.add(row.backup_port)
    port = 8100
    while port in used or (port + 1) in used:
        port += 2
    return port

