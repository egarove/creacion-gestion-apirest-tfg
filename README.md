# Sistema de Creación y Gestión de APIs REST

Trabajo Final de Grado — Desarrollo de Aplicaciones Multiplataforma  
IES · Curso 2024/2025

---

## Descripción

Este proyecto es una plataforma completa que permite a cualquier usuario crear, desplegar y gestionar sus propias APIs REST sin necesidad de escribir código ni administrar servidores. Desde una aplicación móvil o un panel web, el usuario define el nombre de su API, elige el lenguaje de programación en el que quiere que se genere, selecciona el motor de base de datos, diseña la estructura de tablas y configura los endpoints. El sistema se encarga del resto: genera el código fuente, construye la imagen Docker, levanta los contenedores y configura el proxy inverso para que la API sea accesible de inmediato a través de una URL pública.

El objetivo principal fue demostrar que es posible automatizar por completo el ciclo de vida de un microservicio backend usando únicamente herramientas de código abierto desplegadas en la nube.

---

## Funcionalidades principales

- Creación de APIs REST en **7 lenguajes**: Python, TypeScript, Go, Rust, Java, C y C++
- Soporte para **4 motores de base de datos**: PostgreSQL, MySQL, MariaDB y SQLite
- Diseño de esquema de base de datos mediante motor DDL integrado (tablas, columnas, tipos, foreign keys)
- Definición de endpoints con método HTTP, ruta, lógica CRUD, tabla destino y visibilidad pública/privada
- Validación estricta método↔lógica: `GET→select`, `POST→insert`, `PUT→update`, `DELETE→update|delete`
- Cada API se despliega con un **contenedor principal y uno de backup** en puertos distintos
- Sistema de autenticación con **Firebase Authentication** (correo/contraseña y Google)
- Control de acceso por roles: administrador (ve todas las APIs) y usuario (ve solo las suyas)
- Endpoints **públicos** accesibles desde el navegador sin token; endpoints **privados** protegidos por JWT
- Laboratorio de pruebas de endpoints integrado en la app móvil (path params, query filters, body)
- Visualización de logs en tiempo real por contenedor
- Panel de gestión del esquema de base de datos (añadir columnas, foreign keys, ver tablas)
- Panel web de administración accesible desde el navegador

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   Cliente                           │
│          App Flutter  /  Navegador web              │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
          ┌──────────▼──────────┐
          │   nginx (443/80)    │  ← TLS Let's Encrypt
          │  auth_request       │  ← valida JWT en cada petición
          └──┬───────┬──────────┘
             │       │
   ┌─────────▼─┐  ┌──▼──────────┐
   │  appWeb   │  │  API mgmt   │   FastAPI · puerto 8000
   │  React    │  │  (Python)   │   gestiona todo el ciclo de vida
   │  :3000    │  └──┬────┬─────┘
   └───────────┘     │    │ docker SDK
                     │  ┌─▼──────────────────────────┐
              ┌──────▼─▼┤    Contenedores generados   │
              │ PostgreSQL│  API_1 :8100  API_1_bk :8101│
              │ MySQL     │  API_2 :8102  API_2_bk :8103│
              │ MariaDB   │  ...         ...            │
              │ SQLite    └─────────────────────────────┘
              └────────────  red Docker api_default
```

### Flujo de una petición a una API generada

1. El cliente hace `GET https://tfg-dam.libertoguillen.com/app/mi_api/usuarios`
2. nginx intercepta la petición y llama a `/auth/verify` con `auth_request`
3. El verificador consulta la base de datos: si el endpoint es público devuelve 200 directamente; si es privado valida el JWT de Firebase contra las claves públicas de Google
4. Si la verificación pasa, nginx hace proxy al contenedor correspondiente (puerto asignado)
5. El contenedor ejecuta la lógica CRUD y devuelve la respuesta

---

## Estructura del proyecto

```
creacion-gestion-apirest-tfg/
├── server/
│   ├── api/                     # Backend de gestión (FastAPI)
│   │   ├── main.py              # Punto de entrada, middleware STRICT_MATRIX
│   │   ├── settings.py          # Configuración y lenguajes soportados
│   │   ├── routes/
│   │   │   ├── api_mgmt.py      # CRUD de APIs y endpoints
│   │   │   ├── auth.py          # Verificación JWT para nginx auth_request
│   │   │   ├── schema.py        # Motor DDL (tablas, columnas, FK)
│   │   │   ├── system.py        # Estadísticas del sistema
│   │   │   └── ui_proxy.py      # Proxy para la UI generada
│   │   ├── services/
│   │   │   ├── generator.py     # Motor de generación de código con Jinja2
│   │   │   ├── docker_service.py# Construcción y gestión de contenedores
│   │   │   ├── nginx_service.py # Generación dinámica de configs nginx
│   │   │   ├── db_manager.py    # Creación de usuarios y BDs en cada motor
│   │   │   └── firebase_auth.py # Validación de tokens Firebase (RS256)
│   │   ├── models/
│   │   │   ├── db_model.py      # Modelo SQLAlchemy (tabla api_data)
│   │   │   └── endpoint_model.py# Modelo Pydantic + STRICT_MATRIX
│   │   ├── templates/           # Plantillas Jinja2 por lenguaje
│   │   │   ├── python/
│   │   │   ├── typescript/
│   │   │   ├── go/
│   │   │   ├── rust/
│   │   │   ├── java/
│   │   │   ├── c/
│   │   │   └── cpp/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── nginx_main.conf      # Configuración nginx del contenedor API
│   ├── appWeb/                  # Panel web (React + TypeScript)
│   │   ├── src/
│   │   │   ├── screens/         # LoginScreen, MainScreen
│   │   │   ├── components/      # ApiCard, Panel, EndpointCard, tabs...
│   │   │   ├── services/        # apiService.ts, authService.ts
│   │   │   ├── contextZustand.ts# Estado global con Zustand
│   │   │   └── types/           # Tipos TypeScript compartidos
│   │   ├── Dockerfile
│   │   └── vite.config.ts
│   └── docker-compose.yml       # Orquestación de todos los servicios
├── app/                         # App móvil (Flutter)
│   ├── lib/
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   ├── dashboard_screen.dart
│   │   │   ├── api_detail_screen.dart
│   │   │   ├── crear_api_screen.dart
│   │   │   └── endpoint_tester_screen.dart
│   │   ├── services/
│   │   │   ├── api_service.dart
│   │   │   └── login_singup_methods.dart
│   │   └── main.dart
│   └── pubspec.yaml
└── nginx_tfg-dam.conf           # Config nginx del host (HTTPS + rutas)
```

---

## Stack tecnológico

### Backend de gestión

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11 | Lenguaje principal del backend |
| FastAPI | 0.115.6 | Framework de la API de gestión |
| Uvicorn | 0.32.1 | Servidor ASGI |
| SQLAlchemy | 2.0.36 | ORM para PostgreSQL (tabla de gestión) |
| Pydantic | 2.10.3 | Validación de modelos y requests |
| Jinja2 | 3.1.5 | Motor de plantillas para generación de código |
| Docker SDK | 7.1.0 | Control programático de contenedores |
| PyJWT | 2.10.1 | Verificación de tokens Firebase (RS256) |
| psycopg2 | 2.9.10 | Driver PostgreSQL |
| pymysql | 1.1.1 | Driver MySQL/MariaDB |

### Panel web

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Framework de UI |
| TypeScript | 5 | Tipado estático |
| Vite | 5 | Bundler y servidor de desarrollo |
| Tailwind CSS | 3 | Estilos utility-first |
| Zustand | 4 | Gestión de estado global |
| Firebase JS SDK | 10 | Autenticación en el navegador |

### Aplicación móvil

| Tecnología | Versión | Uso |
|---|---|---|
| Flutter | 3.x | Framework multiplataforma |
| Dart | 3.9 | Lenguaje de Flutter |
| firebase_auth | 5.7.0 | Autenticación con Firebase |
| cloud_firestore | 5.6.3 | Base de datos NoSQL de usuario |
| http | 1.6.0 | Peticiones HTTP a las APIs |
| google_sign_in | 6.2.1 | Inicio de sesión con Google |

### Infraestructura

| Componente | Detalle |
|---|---|
| Servidor | AWS EC2 (eu-north-1) |
| Sistema operativo | Ubuntu 24.04 LTS |
| Proxy inverso | nginx con módulo `auth_request` |
| TLS | Let's Encrypt (certbot) |
| Orquestación | Docker Compose |
| Autenticación | Firebase Authentication (RS256 JWT) |
| DB de gestión | PostgreSQL 16 |
| Red Docker | `api_default` (red externa compartida) |

---

## Motor de generación de código

El núcleo del sistema es un motor de generación basado en plantillas Jinja2. Cuando un usuario crea una API, el backend:

1. Valida la configuración contra la `STRICT_MATRIX` (middleware de seguridad)
2. Crea un usuario y base de datos específicos en el motor elegido
3. Ejecuta las sentencias DDL para crear las tablas definidas
4. Renderiza las plantillas del lenguaje elegido con los datos de la API (nombre, endpoints, conexión a BD)
5. Construye la imagen Docker a partir de las plantillas generadas
6. Levanta el contenedor principal y el de backup en puertos libres del rango 8100-9000
7. Genera la configuración nginx del nuevo `location /app/nombre_api/`
8. Recarga nginx sin interrupciones (`nginx -s reload`)

### STRICT_MATRIX

La plataforma impone una restricción semántica entre el método HTTP y la operación de base de datos para garantizar APIs coherentes:

```
GET    → select  (solo lectura)
POST   → insert  (solo creación)
PUT    → update  (solo modificación)
DELETE → update | delete  (modificar o eliminar)
```

Esta validación se aplica en dos capas: en el middleware de FastAPI antes de llegar a ningún controlador, y en el frontend para guiar al usuario antes de enviar el formulario.

---

## Modelo de seguridad

### Autenticación JWT con Firebase

Todos los endpoints privados requieren un token JWT generado por Firebase Authentication. El token viaja en la cabecera `Authorization: Bearer <token>`. nginx delega la validación al endpoint `/auth/verify` de la API de gestión antes de hacer proxy al contenedor:

```
nginx → auth_request /auth/verify
            ↓
        ¿is_public? → 200 (sin comprobar token)
            ↓ no
        ¿Bearer válido? → 200
            ↓ no
        401 Unauthorized
```

La verificación del token comprueba la firma RS256 contra las claves públicas de Google, el issuer y la expiración.

### Aislamiento de red

Los contenedores generados solo son accesibles a través de nginx gracias a reglas `iptables` en la cadena `DOCKER-USER` que bloquean el acceso externo directo a los puertos 8100-9000. Los usuarios solo pueden llegar a sus APIs a través del proxy, que aplica la validación de token.

### Separación por usuario

Cada usuario tiene asociadas sus APIs mediante su `uid` de Firebase, tanto en Firestore (app móvil) como en la base de datos de gestión (panel web para administradores). Un usuario con rol `usuario` solo puede ver y operar sobre sus propias APIs.

---

## Endpoints de la API de gestión

La API de gestión está documentada con Swagger UI en `https://tfg-dam.libertoguillen.com/docs`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/get-all-apis` | Lista todas las APIs registradas |
| `GET` | `/sync` | Sincroniza el estado de contenedores con la DB |
| `POST` | `/crear-api` | Crea una nueva API (código + contenedor + nginx) |
| `POST` | `/{api}/create-end-point` | Añade un endpoint y reconstruye el contenedor |
| `POST` | `/{api}/start` | Inicia los contenedores de una API |
| `POST` | `/{api}/stop` | Detiene los contenedores de una API |
| `GET` | `/{api}/status` | Obtiene el estado actual de los contenedores |
| `POST` | `/{api}/rebuild` | Reconstruye la imagen y reinicia |
| `POST` | `/{api}/restore` | Activa el contenedor de backup |
| `DELETE` | `/{api}/delete` | Elimina la API, contenedores, config y BD |
| `GET` | `/{api}/logs` | Devuelve los últimos logs del contenedor |
| `GET` | `/auth/verify` | Verificación de token para nginx (uso interno) |
| `GET` | `/schema/{api}/tables` | Lista las tablas de la BD de la API |
| `POST` | `/schema/{api}/create-table` | Crea una tabla con columnas y tipos |
| `POST` | `/schema/{api}/add-column` | Añade una columna a una tabla existente |
| `POST` | `/schema/{api}/add-fk` | Añade una foreign key entre tablas |
| `GET` | `/system/stats` | Estadísticas del sistema (CPU, RAM, disco) |

---

## Instalación y puesta en marcha

### Requisitos previos

- Docker Engine 24+ y Docker Compose v2
- nginx instalado en el host con el módulo `ngx_http_auth_request_module`
- Python 3.11+ (solo para desarrollo local del backend)
- Flutter 3.x con Dart SDK 3.9+ (para compilar la app móvil)
- Node.js 20+ (para desarrollo local del panel web)
- Una cuenta de Firebase con un proyecto configurado (Authentication + Firestore)

### Configuración inicial

**1. Clonar el repositorio**

```bash
git clone <url-del-repositorio>
cd creacion-gestion-apirest-tfg
```

**2. Configurar las variables de entorno del backend**

Crear o editar `server/api/.env`:

```env
API_IP=<ip-publica-del-servidor>
DATABASE_URL=postgresql://user:password@postgres:5432/postgres
HOST_API_PATH=/api
```

**3. Crear la red Docker externa**

```bash
docker network create api_default
```

Esta red es compartida entre los contenedores del sistema y los contenedores generados dinámicamente.

**4. Arrancar los servicios**

```bash
cd server/
docker compose up -d --build
```

Esto levanta: la API de gestión (`:8000`), el panel web (`:3000`), PostgreSQL (`:5432`), MySQL (`:5434`) y MariaDB (`:5433`).

**5. Configurar nginx en el host**

```bash
sudo cp nginx_tfg-dam.conf /etc/nginx/conf.d/tfg-dam.conf
sudo mkdir -p /etc/nginx/conf.d/apis
sudo nginx -t && sudo nginx -s reload
```

**6. Conectar las bases de datos a la red `api_default`**

Para que los contenedores generados puedan resolver los hostnames de las bases de datos:

```bash
docker network connect --alias postgres api_default server-postgres-1
docker network connect --alias mysql    api_default server-mysql-1
docker network connect --alias mariadb  api_default server-mariadb-1
```

### Desarrollo local del panel web

```bash
cd server/appWeb
npm install
npm run dev      # servidor en http://localhost:5173
```

### Compilar la app móvil

```bash
cd app
flutter pub get
flutter run          # dispositivo conectado o emulador
flutter build apk --release   # APK de producción
```

---

## Despliegue en producción (AWS EC2)

El servidor de producción es una instancia EC2 en la región `eu-north-1`. Para conectarse:

```bash
ssh -i "par_claves_servidor.pem" ubuntu@tfg-dam.libertoguillen.com
```

Una vez dentro, para actualizar y reiniciar los servicios:

```bash
cd creacion-gestion-apirest-tfg/server
git pull
docker compose up -d --build
```

> **Importante:** Si la instancia EC2 se reinicia y cambia de IP pública, hay que actualizar `server/api/.env` con la nueva IP.

La aplicación está disponible en **https://tfg-dam.libertoguillen.com**

---

## Uso rápido

### Crear una API desde el panel web

1. Acceder a `https://tfg-dam.libertoguillen.com` e iniciar sesión
2. Pulsar el botón **Nueva API**
3. Rellenar el nombre, elegir lenguaje y base de datos
4. Definir las columnas de la tabla principal (nombre y tipo SQL)
5. Añadir los endpoints necesarios indicando método, ruta, lógica, tabla destino y si es público
6. Confirmar — en unos segundos la API estará disponible en `/app/<nombre>/`

### Crear una API desde la app móvil

1. Iniciar sesión con correo/contraseña o cuenta Google
2. Ir a **Mis APIs** y pulsar el FAB (+)
3. Configurar nombre, lenguaje, base de datos, columnas y endpoints
4. Pulsar **Crear** y esperar a que el estado cambie a `running`

### Probar un endpoint desde la app

1. Abrir el **Laboratorio de endpoints** desde el detalle de una API
2. Seleccionar el endpoint del desplegable
3. Si el endpoint tiene parámetros de ruta (`{id}`), aparecerán campos individuales
4. Rellenar body (para POST/PUT) o filtros (para GET/DELETE sin path params)
5. Pulsar **Ejecutar** para ver la respuesta y el código de estado

---

## Configuración de Firebase

El proyecto usa Firebase para autenticación de usuarios. Para configurar un entorno propio:

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activar **Authentication** con los proveedores Email/Contraseña y Google
3. Activar **Cloud Firestore** en modo producción
4. Descargar `google-services.json` y colocarlo en `app/android/app/`
5. Actualizar `app/lib/firebase_options.dart` con los datos del proyecto
6. En la colección `usuarios` de Firestore, crear documentos con campo `rol: "usuario"` o `rol: "admin"`

---

## Contribución

Este proyecto fue desarrollado como Trabajo Final de Grado para el ciclo formativo de **Desarrollo de Aplicaciones Multiplataforma**. No está orientado a contribuciones externas, pero el código es completamente abierto y puede servir como referencia o punto de partida para proyectos similares.

---

## Licencia

Proyecto académico de uso educativo. Sin licencia de distribución comercial.
