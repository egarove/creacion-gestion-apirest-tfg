# API Generator Mobile + Docker Backend

Aplicación móvil desarrollada con Flutter que permite generar APIs dinámicamente a través de un backend ejecutado en Docker.  
El objetivo del proyecto es simplificar la creación automática de servicios API desde una interfaz móvil intuitiva.

---

## Descripción del proyecto

Este proyecto está compuesto por dos partes principales:

### Aplicación móvil Flutter
- Interfaz para crear y eliminar APIs
- Comunicación con el backend
- Gestión del flujo desde el dispositivo móvil

### Backend en Docker
- Recibe la configuración enviada desde la app
- Genera automáticamente la API
- Levanta el servicio en contenedores Docker

---

## Requisitos previos

Antes de ejecutar el proyecto necesitas tener instalado:

- Docker Desktop
- Flutter SDK
- Visual Studio Code

---

## Cómo ejecutar el backend

### 1. Instalar Docker Desktop

Descarga e instala Docker Desktop desde la web oficial y asegúrate de que Docker esté en ejecución antes de continuar.

---

### 2. Configurar la IP del servidor

En la ruta 'api/api/.env' modifica la variable 'API_IP' y sustituyela por tu IP.
Puedes obtener tu IP ejecutando en una terminal: 'ipconfig'

---

### 3. Levantar el servicio Docker

Abre una terminal y navega hasta la carpeta 'api' en la raíz del proyecto. 
Ahí ejecuta: 'docker-compose up -d' para iniciar el servicio docker con la IP indicada en el paso anterior.

---

### 4. Lanzaer la APP Flutter

Una vez iniciado el servicio Docker ya podemos generar el APK de nuestra APP Flutter y gestionar desde ahí las APIS. 
Para ello vamos a la carpeta ‘app’ de raíz del proyecto y ejecutamos:	
flutter build apk (esto nos genera el APK en build/app/outputs/flutter-apk/app-release.apk)


