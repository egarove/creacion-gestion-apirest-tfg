# -*- coding: utf-8 -*-
"""
Gestor de Docker para creación, arranque, parada y gestión de contenedores de APIs.
"""
import subprocess
import time
import docker
from fastapi import Response

from settings import DB_CONFIGS, LANG_CONFIG


def get_docker_client():
    """Obtiene el cliente de Docker."""
    return docker.from_env()


def _build_docker_env_args(lang: str, db_type: str, url: str, usr: str, paswd: str, api_name: str) -> list:
    """Genera los argumentos -e para docker run según el lenguaje."""
    env_args = ["-e", f"DATABASE_URL={url}"]
    if lang == "java" and db_type in DB_CONFIGS:
        config = DB_CONFIGS[db_type]
        env_args.extend([
            "-e", f"DB_HOST={config['host']}",
            "-e", f"DB_PORT={config['port']}",
            "-e", f"DB_NAME={api_name}_db",
            "-e", f"DB_USER={usr}",
            "-e", f"DB_PASS={paswd}",
        ])
    return env_args


def build_docker_image(api_name: str, project_path: str):
    """Construye la imagen Docker para una API."""
    result = subprocess.run(
        ["docker", "build", "-t", f"api-{api_name}", project_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Docker build failed:\n{result.stderr[-3000:]}")


def start_api_containers(api_name: str, port: int, backup_port: int, env_args: list):
    """Arranca el contenedor principal y de backup de una API."""
    subprocess.Popen([
        "docker", "run", "-d",
        "--name", api_name,
        "--restart", "unless-stopped",
        "--network", "api_default",
        *env_args,
        "-p", f"{port}:8000",
        f"api-{api_name}"
    ])
    subprocess.Popen([
        "docker", "run", "-d",
        "--name", f"{api_name}_backup",
        "--restart", "unless-stopped",
        "--network", "api_default",
        *env_args,
        "-p", f"{backup_port}:8000",
        f"api-{api_name}"
    ])


def get_container_status(api_name: str, suffix: str = ""):
    """Obtiene el estado de un contenedor. Si suffix es vacio, obtiene el principal."""
    try:
        client = get_docker_client()
        container_name = f"{api_name}{suffix}"
        status = client.containers.get(container_name).status
        return status
    except docker.errors.NotFound:
        return "not_found"
    except Exception:
        return "unknown"


def start_container(api_name: str):
    """Arranca un contenedor detenido."""
    try:
        client = get_docker_client()
        container = client.containers.get(api_name)
        container.start()
        return {"status": "running"}
    except Exception as e:
        return Response(status_code=500, content=str(e))


def stop_container(api_name: str):
    """Para un contenedor en ejecución."""
    try:
        client = get_docker_client()
        container = client.containers.get(api_name)
        if container.status == "exited":
            return {"status": container.status}
        container.stop()
        time.sleep(2)
        return {"status": container.status}
    except Exception as e:
        return Response(status_code=500, content=str(e))


def remove_containers(api_name: str):
    """Elimina los contenedores principal y de backup."""
    try:
        client = get_docker_client()
        for suffix in ["", "_backup"]:
            try:
                client.containers.get(f"{api_name}{suffix}").remove(force=True)
            except docker.errors.NotFound:
                pass
    except Exception as e:
        raise e


def get_container_logs(api_name: str, tail: int = 100):
    """Obtiene los logs de un contenedor."""
    try:
        client = get_docker_client()
        container = client.containers.get(api_name)
        logs = container.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
        return {"logs": logs, "api_name": api_name}
    except Exception as e:
        return Response(status_code=500, content=str(e))