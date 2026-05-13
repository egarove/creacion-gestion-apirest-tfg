# -*- coding: utf-8 -*-
"""
Gestor de Nginx para configurar reverse proxy de APIs.
"""
import os
import subprocess

from settings import NGINX_CONF_DIR




def _write_nginx_conf(api_name: str, port: int):
    """Escribe la configuración de nginx para una API."""
    os.makedirs(NGINX_CONF_DIR, exist_ok=True)
    conf = (
        # El location /ui es más específico (prefix más largo) y lo intercepta nginx
        # antes que /app/{api}/, redirigiendo a la meta-API que sirve el panel universal.
        f"location /app/{api_name}/ui {{\n"
        f"    proxy_pass http://localhost:8000/ui-proxy/{api_name};\n"
        f"    proxy_set_header Host $host;\n"
        f"    proxy_set_header X-Real-IP $remote_addr;\n"
        f"    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
        f"    proxy_set_header X-Forwarded-Proto $scheme;\n"
        f"}}\n"
        f"location /app/{api_name}/ {{\n"
        f"    auth_request /internal/auth;\n"
        f"    proxy_pass http://localhost:{port}/;\n"
        f"    proxy_set_header Host $host;\n"
        f"    proxy_set_header X-Real-IP $remote_addr;\n"
        f"    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
        f"    proxy_set_header X-Forwarded-Proto $scheme;\n"
        f"    proxy_connect_timeout 5s;\n"
        f"    proxy_read_timeout 30s;\n"
        f"    proxy_send_timeout 30s;\n"
        f"}}\n"
    )
    with open(f"{NGINX_CONF_DIR}/{api_name}.conf", "w") as f:
        f.write(conf)


def _remove_nginx_conf(api_name: str):
    """Elimina la configuración de nginx para una API."""
    path = f"{NGINX_CONF_DIR}/{api_name}.conf"
    if os.path.exists(path):
        os.remove(path)


def _reload_nginx():
    """Recarga la configuración de nginx."""
    try:
        subprocess.run(["sudo", "nginx", "-s", "reload"], check=False)
    except (FileNotFoundError, OSError):
        pass
