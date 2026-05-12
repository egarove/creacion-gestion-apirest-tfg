# API Generator Mobile + Docker Backend

Aplicación móvil desarrollada con Flutter que permite generar y administrar APIs REST dinámicamente mediante un backend desarrollado en Python y desplegado en contenedores Docker.  
El objetivo principal del proyecto es simplificar la creación automática de servicios backend desde una interfaz móvil intuitiva y centralizada.

---

## Descripción del proyecto

El directorio del proyecto está dividido en dos partes principales:

### Aplicación móvil Flutter
- Registro e inicio de sesión mediante Firebase Authentication  
- Gestión de APIs creadas por cada usuario  
- Creación dinámica de endpoints REST  
- Comunicación HTTP con el backend  
- Almacenamiento de datos en Cloud Firestore  

### Backend Python + Docker
- Recepción de configuraciones enviadas desde la app  
- Generación automática de APIs REST  
- Despliegue dinámico de servicios mediante Docker  
- Administración de endpoints y estructuras de datos  

---

## Tecnologías utilizadas

### Frontend
- Flutter  
- Dart  
- Firebase Authentication  
- Cloud Firestore  

### Backend
- Python  
- Docker  
- Docker Compose  

---

## Funcionamiento general

La aplicación permite que cada usuario genere sus propias APIs REST desde el dispositivo móvil.
Durante la creación de una API, el usuario puede definir endpoints HTTP de tipo GET, POST, PUT y DELETE, además de personalizar las rutas (paths) asociadas a cada endpoint.

---

## Infraestructura del servidor

A diferencia de versiones anteriores del proyecto, actualmente el backend y los contenedores Docker se encuentran desplegados permanentemente en un servidor remoto dedicado.
Esto significa que los usuarios no necesitan instalar Docker ni ejecutar contenedores localmente para utilizar la aplicación, ya que toda la infraestructura backend permanece activa en el servidor.

---

Para generar un APK en modo release (ejecutarlo en la raiz del proyecto):

flutter build apk --release
