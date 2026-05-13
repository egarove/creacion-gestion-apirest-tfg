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

## Autenticación de usuarios y almacenamiento de datos

La aplicación implementa un sistema de autenticación de usuarios basado en Firebase Authentication, lo que permite gestionar de forma segura el registro e inicio de sesión de los usuarios mediante correo electrónico y cuenta de Google. Este servicio se encarga de verificar la identidad del usuario y mantener la sesión activa de forma persistente en el dispositivo, evitando que sea necesario volver a autenticarse cada vez que se abre la aplicación.

Una vez autenticado, cada usuario dispone de un identificador único (`uid`) generado por Firebase, el cual se utiliza como clave principal para asociar toda la información relacionada con su cuenta. De esta forma, los datos de cada usuario quedan completamente aislados y organizados dentro de la base de datos.

Para el almacenamiento de información se utiliza Cloud Firestore, donde se guardan los datos relacionados con las APIs creadas por cada usuario. Cada usuario tiene su propia colección de APIs vinculada a su `uid`, lo que permite mantener una estructura jerárquica y segura. Dentro de esta colección se almacenan los datos necesarios para la configuración de cada API, como el nombre, el puerto, los endpoints definidos, las columnas de datos y otros parámetros de configuración.

Este enfoque garantiza que cada usuario solo pueda acceder y gestionar sus propias APIs, asegurando la separación de datos, la escalabilidad del sistema y la correcta organización de la información dentro de la base de datos NoSQL.

---

## Para generar un APK en modo release 

flutter build apk --release

(ejecutarlo en la raiz del proyecto)
