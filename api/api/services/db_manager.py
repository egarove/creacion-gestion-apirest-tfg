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
        return f"sqlite:///{api_name}.db"
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
            cursor.execute(f"CREATE USER IF NOT EXISTS '{usr}'@'%' IDENTIFIED BY %s;", (paswd,))
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

