# -*- coding: utf-8 -*-
"""
Generador de código para APIs usando plantillas Jinja2.
"""
import os
from jinja2 import Environment, FileSystemLoader

from settings import LANG_CONFIG
from models.endpoint_model import Endpoint


def generate_api_project(api_name: str, language: str, db: str, endpoints: list, generar_ui: bool, columns: list = None):
    """Genera la estructura de proyecto para una nueva API."""
    if language not in LANG_CONFIG:
        raise ValueError(f"Lenguaje '{language}' no soportado")

    config = LANG_CONFIG[language]
    project_path = f"deployments/{api_name}"
    os.makedirs(project_path, exist_ok=True)

    # Generar main file
    env = Environment(loader=FileSystemLoader(config["template_dir"]))
    template = env.get_template("api_template.jinja")
    codigo = template.render(
        api_name=api_name,
        endpoints=endpoints,
        generar_ui=generar_ui,
        db=db,
        columns=columns or [],
    )
    
    main_file_path = os.path.join(project_path, config["main_file"])
    os.makedirs(os.path.dirname(main_file_path), exist_ok=True)
    with open(main_file_path, "w") as f:
        f.write(codigo)
    
    # Generar archivos extras (package.json, pom.xml, go.mod, etc.)
    for template_name, output_name in config["extra_files"]:
        extra_template = env.get_template(template_name)
        extra_content = extra_template.render(api_name=api_name, db=db)
        extra_path = os.path.join(project_path, output_name)
        os.makedirs(os.path.dirname(extra_path), exist_ok=True)
        with open(extra_path, "w") as f:
            f.write(extra_content)
    
    # Generar Dockerfile
    dockerfile_content = env.get_template("docker_template.jinja").render(
        api_name=api_name,
        db=db,
    )
    with open(os.path.join(project_path, "Dockerfile"), "w") as f:
        f.write(dockerfile_content)
    
    return project_path


def regenerate_api_code(api_name: str, language: str, db: str, endpoints: list, columns: list, generar_ui: bool):
    """Regenera el código de una API existente con nuevos endpoints."""
    if language not in LANG_CONFIG:
        raise ValueError(f"Lenguaje '{language}' no soportado")
    
    config = LANG_CONFIG[language]
    project_path = f"deployments/{api_name}"
    os.makedirs(project_path, exist_ok=True)
    
    # Convertir endpoints dict a objetos Endpoint
    endpoint_objs = [Endpoint(**ep) if isinstance(ep, dict) else ep for ep in endpoints]
    
    # Regenerar main file
    env = Environment(loader=FileSystemLoader(config["template_dir"]))
    template = env.get_template("api_template.jinja")
    codigo = template.render(
        api_name=api_name,
        endpoints=endpoint_objs,
        generar_ui=generar_ui,
        db=db,
        columns=columns,
    )
    
    main_file_path = os.path.join(project_path, config["main_file"])
    os.makedirs(os.path.dirname(main_file_path), exist_ok=True)
    with open(main_file_path, "w") as f:
        f.write(codigo)
    
    # Regenerar extras
    for template_name, output_name in config["extra_files"]:
        extra_template = env.get_template(template_name)
        extra_content = extra_template.render(api_name=api_name, db=db)
        extra_path = os.path.join(project_path, output_name)
        os.makedirs(os.path.dirname(extra_path), exist_ok=True)
        with open(extra_path, "w") as f:
            f.write(extra_content)
    
    # Regenerar Dockerfile
    dockerfile_content = env.get_template("docker_template.jinja").render(
        api_name=api_name,
        db=db,
    )
    with open(os.path.join(project_path, "Dockerfile"), "w") as f:
        f.write(dockerfile_content)


def _generar_snippet_endpoint(lang: str, api: str, endpoint: Endpoint, db_type: str):
    """Genera el snippet de código para un nuevo endpoint según el lenguaje."""
    if lang == "python":
        if endpoint.logic == "select":
            logic_body = (
                f'res = conn.execute(text("SELECT * FROM data_{api}")).fetchall()\n'
                f'        return [dict(row) for row in res]'
            )
        elif endpoint.logic == "insert":
            logic_body = 'return {"msg": "inserted"}'
        elif endpoint.logic == "update":
            logic_body = 'return {"msg": "updated"}'
        else:
            logic_body = 'return {"msg": "deleted"}'
        return (
            f'\n@app.{endpoint.method}("{endpoint.path}")\n'
            f'def {endpoint.function_name}():\n'
            f'    with engine.connect() as conn:\n'
            f'        {logic_body}\n'
        )
    elif lang == "typescript":
        if endpoint.logic == "select":
            logic = f"const rows = await query('SELECT * FROM data_{api}');\n        res.json(rows);"
        elif endpoint.logic == "insert":
            logic = 'res.json({ msg: "inserted" });'
        elif endpoint.logic == "update":
            logic = 'res.json({ msg: "updated" });'
        else:
            logic = 'res.json({ msg: "deleted" });'
        return (
            f"\napp.{endpoint.method}('{endpoint.path}', async (req, res) => {{\n"
            f"    try {{\n"
            f"        {logic}\n"
            f"    }} catch (err) {{\n"
            f"        res.status(500).json({{ error: err.message }});\n"
            f"    }}\n"
            f"}});\n"
        )
    return None


def add_endpoint_to_project(api_name: str, language: str, endpoint: Endpoint):
    """Añade un endpoint al archivo main de un proyecto existente."""
    if language not in LANG_CONFIG:
        raise ValueError(f"Lenguaje '{language}' no soportado")
    
    config = LANG_CONFIG[language]
    project_path = f"deployments/{api_name}"
    main_file = os.path.join(project_path, config["main_file"])
    
    snippet = _generar_snippet_endpoint(language, api_name, endpoint, "")
    
    if snippet is not None:
        with open(main_file, "a") as f:
            f.write(snippet)
        return True
    
    return False
