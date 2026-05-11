"""Settings."""
from starlette.config import Config

config = Config(".env")

API_IP = config("API_IP", default="127.0.0.1")
DATABASE_URL = config("DATABASE_URL", default="postgresql://postgres:password@localhost:5432/mi_base_de_datos")
# Configuración de plantillas por lenguaje
LANG_CONFIG = {
    "python": {
        "template_dir": "templates/python",
        "main_file": "main.py",
        "extra_files": [],
    },
    "typescript": {
        "template_dir": "templates/typescript",
        "main_file": "index.js",
        "extra_files": [("package_template.jinja", "package.json")],
    },
    "go": {
        "template_dir": "templates/go",
        "main_file": "main.go",
        "extra_files": [("go_mod_template.jinja", "go.mod")],
    },
    "rust": {
        "template_dir": "templates/rust",
        "main_file": "src/main.rs",
        "extra_files": [("cargo_template.jinja", "Cargo.toml")],
    },
    "java": {
        "template_dir": "templates/java",
        "main_file": "src/main/java/com/api/App.java",
        "extra_files": [
            ("pom_template.jinja", "pom.xml"),
            ("application_properties_template.jinja", "src/main/resources/application.properties"),
        ],
    },
    "c": {
        "template_dir": "templates/c",
        "main_file": "main.c",
        "extra_files": [("makefile_template.jinja", "Makefile")],
    },
    "cpp": {
        "template_dir": "templates/cpp",
        "main_file": "main.cpp",
        "extra_files": [("cmake_template.jinja", "CMakeLists.txt")],
    },
}
NGINX_CONF_DIR = "/etc/nginx/conf.d/apis"
# URL base de appWeb (dentro de Docker)
APPWEB_URL = "https://appweb:3000"
# Hostnames Docker para conexiones dentro de la red api_default
DB_CONFIGS = {
    "postgresql": {"port": "5432", "driver": "postgresql", "host": "postgres"},
    "mysql":      {"port": "3306", "driver": "mysql+pymysql", "host": "mysql"},
    "mariadb":    {"port": "3306", "driver": "mysql+pymysql", "host": "mariadb"},
}