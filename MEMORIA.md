# Memoria del Proyecto — TFG
## Sistema de Creación y Gestión de APIs REST

**Ciclo formativo:** Desarrollo de Aplicaciones Multiplataforma  
**Curso:** 2025/2026  
**Despliegue:** https://tfg-dam.libertoguillen.com

---

## Índice

1. [TAREA 3.1 — Interactividad con JavaScript/Framework](#tarea-31)
2. [TAREA 3.2 — Consumo de Datos (APIs)](#tarea-32)
3. [TAREA 3.3 — Formularios y Validaciones](#tarea-33)
4. [TAREA 3.4 — Mejoras de Experiencia de Usuario](#tarea-34)
5. [TAREA 3.5 — Pruebas y Depuración](#tarea-35)
6. [TAREA 3.6 — Despliegue](#tarea-36)
7. [TAREA 3.7 — Documentación Final y Presentación](#tarea-37)

---

<a name="tarea-31"></a>
## TAREA 3.1 — Interactividad con JavaScript/Framework

El panel web del proyecto está construido con **React 18** y **TypeScript**, usando **Vite** como bundler y **Tailwind CSS** para los estilos. La elección de este stack frente a otras opciones como Vue o Angular se tomó por su ecosistema, su modelo de componentes y la familiaridad con JSX que reduce la fricción entre lógica y plantilla.

### A. Estado y ciclo de vida

El estado del panel se divide en dos niveles: **estado global** gestionado con Zustand y **estado local** en cada componente con los hooks estándar de React.

#### Estado global con Zustand

El archivo `contextZustand.ts` define el store global con `persist` para que los datos del usuario sobrevivan a recargas del navegador sin tener que volver a autenticarse:

```typescript
export const useContextStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      apis: [],
      toastList: [],
      addToast: (newToast: Toast) => {
        set((state) => ({ toastList: [...state.toastList, newToast] }));
        setTimeout(() => {
          set((state) => ({
            toastList: state.toastList.filter((t) => t.id !== newToast.id),
          }));
        }, 4000);
      },
      // ...
    }),
    {
      name: "storage",
      partialize: (state) => {
        const { apis, ...rest } = state;
        return rest; // las APIs no se persisten, se cargan siempre del servidor
      },
    },
  ),
);
```

La lista de APIs no se persiste en localStorage intencionalmente: al cargar la página siempre se hace un fetch al servidor para obtener el estado real de los contenedores Docker. Solo se persisten los datos de sesión del usuario.

Los toasts se autoeliminan a los 4 segundos mediante un `setTimeout` que despacha la acción `removeToast` con el identificador UUID del toast creado.

#### Estado local en componentes

El componente `Panel.tsx` es un buen ejemplo del uso de estado local con múltiples `useState` y efectos:

```typescript
const [tab, setTab] = useState<Tabs>("info");
const [logs, setLogs] = useState<string>("");
const [logsLoading, setLogsLoading] = useState(false);
const [addingEp, setAddingEp] = useState<boolean>(false);
const [isClosing, setIsClosing] = useState(false);

useEffect(() => {
  if (tab === "logs") fetchLogs();
}, [tab]);
```

El efecto que carga los logs solo se dispara cuando el usuario cambia a la pestaña de logs, evitando peticiones innecesarias al backend. El estado `isClosing` controla la animación de cierre: se pone a `true` antes de llamar a `close()`, dando tiempo a que la animación CSS se complete.

El componente `MainScreen.tsx` tiene un intervalo que actualiza el estado de las APIs cada 15 segundos de forma automática, lo cual permite ver en tiempo real si un contenedor ha caído o se ha levantado:

```typescript
useEffect(() => {
  fetchApis();
  const interval = setInterval(() => fetchApis(), 15000);
  return () => clearInterval(interval);
}, []);
```

El `return () => clearInterval(interval)` es la función de limpieza del efecto, que evita que el intervalo siga ejecutándose si el componente se desmonta (por ejemplo, al cerrar sesión).

El componente `SchemaTab.tsx` gestiona un estado complejo con múltiples formularios inline simultáneos: creación de tabla, añadir columna a una tabla concreta, añadir foreign key. Se usa el patrón de guardar el identificador de la tabla activa (`addColFor: string | null`) en lugar de un booleano para que solo pueda haber un formulario abierto a la vez:

```typescript
const [addColFor, setAddColFor] = useState<string | null>(null);
const [addFkFor, setAddFkFor] = useState<string | null>(null);
```

### B. Eventos y controladores

#### Eventos de UI básicos

Todos los controles interactivos del panel usan manejadores de eventos JSX. Los más comunes son `onClick` para botones y `onChange` para inputs y selects. Por ejemplo, en el formulario de creación de API, el campo de nombre sanitiza el valor en tiempo real para que solo se admitan caracteres válidos (minúsculas, números y guión bajo), previniendo errores antes de que lleguen al backend:

```typescript
<input
  value={name}
  onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
  placeholder="mi_api_rest"
/>
```

#### Controladores de acciones asíncronas

La mayoría de acciones importantes (crear API, añadir endpoint, eliminar API) son funciones async que muestran feedback visual mientras se ejecutan. El controlador `handleToggleApi` en `MainScreen.tsx` llama al servicio, muestra un toast con el resultado y actualiza la lista:

```typescript
const handleToggleApi = async (name: string, status: string) => {
  try {
    await ApiService.toggleApi(name, status);
    showToast(`API ${name} ${status === "running" ? "detenida" : "iniciada"}`, "success");
    fetchApis();
  } catch (e) {
    showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
  }
};
```

#### Propagación de eventos

El panel lateral (`Panel.tsx`) se cierra al hacer clic en el overlay oscuro que cubre el resto de la pantalla. Esto se consigue con un `div` de posición fija que ocupa toda la pantalla y tiene `onClick={handleClose}`:

```typescript
<div
  className="fixed inset-0 bg-black/50 z-[190] backdrop-blur-[2px]"
  onClick={handleClose}
></div>
```

El panel en sí tiene un z-index superior (200) para evitar que el clic en el panel se propague al overlay.

### C. Lógica de negocio en frontend

Una decisión de diseño importante fue replicar parte de la lógica de negocio en el cliente para mejorar la experiencia de usuario sin sacrificar la seguridad del servidor.

#### STRICT_MATRIX en cliente

La misma matriz de restricciones método/lógica que el servidor valida en su middleware también está implementada en `apiService.ts`:

```typescript
export const STRICT_MATRIX: Record<string, string[]> = {
  get:    ['select'],
  post:   ['insert'],
  put:    ['update'],
  delete: ['update', 'delete'],
};

export function autoLogic(method: string): string {
  const allowed = STRICT_MATRIX[method.toLowerCase()] ?? [];
  return allowed[0] ?? 'select';
}
```

Cuando el usuario cambia el método HTTP de un endpoint, el campo de lógica se actualiza automáticamente al primer valor permitido para ese método. Las opciones no permitidas aparecen en el select con el símbolo `✗` y el atributo `disabled`. Esto evita que el usuario envíe una combinación inválida y reciba un error 403 del servidor.

#### Filtrado y ordenación de APIs

En `MainScreen.tsx` se aplican múltiples filtros combinables sobre la lista de APIs sin hacer peticiones adicionales al servidor. Se mantiene una lista maestra en `apis` y se deriva `displayedApis` aplicando los filtros de estado, búsqueda por nombre, lenguaje y motor de base de datos, y la ordenación elegida:

```typescript
let displayedApis = [...apis];
if (filter === "running")
  displayedApis = displayedApis.filter((a) => a.status === "running");
if (search)
  displayedApis = displayedApis.filter((a) =>
    a.api_name.includes(search.toLowerCase()),
  );
if (langFilter)
  displayedApis = displayedApis.filter((a) => a.language === langFilter);
// ...
if (sortParam === "name")
  displayedApis.sort((a, b) => a.api_name.localeCompare(b.api_name));
```

#### Control de acceso por rol

La lógica de qué APIs puede ver cada usuario se aplica en el cliente comparando la lista completa del servidor con las APIs registradas en Firestore para ese usuario:

```typescript
if (user?.role === "admin") {
  myApis = data; // admin ve todo
} else {
  const userApiEntries = await firebaseServiceUser.getUserApis(data);
  const userApiNames = new Set(userApiEntries.map((a) => a.api_name));
  myApis = data.filter((a) => userApiNames.has(a.api_name));
}
```

### D. Componentes dinámicos

#### Panel lateral con animación

El componente `Panel.tsx` es un drawer lateral que se muestra y oculta con animaciones CSS definidas en la configuración de Tailwind. El componente recibe el objeto `api` seleccionado como prop y renderiza su contenido; si `panelApi` es `null`, el componente no se monta:

```typescript
{panelApi && (
  <Panel
    api={panelApi}
    close={() => setPanelApi(null)}
    // ...
  />
)}
```

#### Sistema de pestañas dinámico

`PanelTabs.tsx` renderiza el menú de pestañas del panel, incluyendo el recuento de endpoints en la pestaña correspondiente. El contenido del panel se renderiza condicionalmente según el tab activo:

```typescript
{tab === "info" && <InfoTab api={api} ... />}
{tab === "endpoints" && <EndpointsTab endpoints={eps} ... />}
{tab === "logs" && <LogsTab logs={logs} loading={logsLoading} ... />}
{tab === "schema" && <SchemaTab apiName={api.api_name} ... />}
```

#### ApiCard dinámica

Cada tarjeta de API en el grid muestra el estado en tiempo real (running/stopped) con un indicador visual de color y animación de pulso para los contenedores activos. Los botones de inicio/parada y el badge de lenguaje se adaptan según los datos de la API.

#### Grid de estadísticas

Los `StatCard` en la cabecera del panel se recalculan a partir de la lista de APIs cada vez que esta se actualiza:

```typescript
const runCount = apis.filter((a) => a.status === "running").length;
const stopCount = apis.length - runCount;
const epsCount = apis.reduce((s, x) => s + (x.endpoints || []).length, 0);
```

---

<a name="tarea-32"></a>
## TAREA 3.2 — Consumo de Datos (APIs)

### A. Elección de la API

El proyecto no consume una API externa de terceros: consume su propia API de gestión construida con **FastAPI** (Python). Esta decisión es coherente con el propósito del TFG, que es precisamente crear y gestionar APIs. La API de gestión expone todos los endpoints necesarios para el ciclo de vida completo de una API generada: crear, listar, parar, iniciar, añadir endpoints, gestionar esquema de base de datos y consultar logs.

La API de gestión está disponible en el mismo dominio que el panel web. Vite se configura en desarrollo con un proxy hacia `localhost:8000`, y en producción nginx enruta las peticiones sin prefijo `/app/` directamente hacia el puerto 8000.

### B. Peticiones HTTP

Todas las llamadas HTTP del panel web están centralizadas en `apiService.ts`, que actúa como capa de acceso a datos. Cada función es un wrapper sobre `fetch` que gestiona el header `Content-Type`, la serialización del body y el manejo de errores HTTP:

```typescript
export async function createApi(body: CreateApiBody): Promise<{ puerto: number }> {
  const res = await fetch('/crear-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      msg = parsed.detail || parsed.error || text;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return JSON.parse(text) as { puerto: number };
}
```

Se usa `res.text()` en lugar de `res.json()` directamente para poder manejar tanto respuestas JSON como texto plano en caso de error, ya que algunos errores del servidor (como los de nginx) no devuelven JSON válido.

Las operaciones de esquema de base de datos tienen sus propias funciones dedicadas:

```typescript
export async function createTable(
  apiName: string,
  name: string,
  columns: { name: string; type: string; nullable: boolean; ref_table?: string; ref_col?: string }[],
): Promise<void> {
  const res = await fetch(`/schema/${apiName}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, columns }),
  });
  if (!res.ok) throw new Error(await res.text());
}
```

### C. Gestión de estados de carga

Se distinguen dos tipos de operaciones según su duración:

**Operaciones rápidas** (toggle de estado, añadir endpoint): usan el estado local del componente con un booleano `saving` que deshabilita el botón mientras la petición está en curso y cambia el texto del botón a "Guardando..." o similar.

**Operaciones lentas** (crear API, eliminar API): muestran el componente `LoadingOverlay`, que es un modal de pantalla completa con un spinner, bloqueando toda la interacción con la interfaz mientras la operación se procesa en el servidor (que puede tardar 10-30 segundos mientras Docker construye la imagen):

```typescript
const showLoading = (msg: string) => setLoadingMsg(msg);
const hideLoading = () => setLoadingMsg(null);

// En handleDeleteApi:
showLoading(`Eliminando ${deleteTarget}...`);
try {
  await ApiService.deleteApi(deleteTarget);
  // ...
} finally {
  hideLoading();
}
```

**Logs**: la pestaña de logs tiene su propio estado `logsLoading` que muestra un spinner dentro del panel sin bloquear el resto de la interfaz. El botón de refresco muestra retroalimentación visual al pulsarlo.

### D. Autenticación

El panel web usa Firebase Authentication para la sesión del usuario. El token JWT de Firebase se obtiene llamando a `auth.currentUser.getIdToken()` (que renueva automáticamente el token si ha expirado) y se envía en la cabecera `Authorization: Bearer <token>` en las peticiones que requieren autenticación.

En el panel web la autenticación es principalmente en el sentido de identificar al usuario para filtrar sus APIs por Firestore. Las peticiones al backend de gestión no requieren token porque el panel web corre en el mismo servidor y nginx no aplica `auth_request` a las rutas de gestión internas (solo lo aplica a las rutas `/app/<nombre_api>/`).

En el laboratorio de endpoints de la app móvil sí se adjunta el token en cada petición para poder acceder a endpoints privados:

```typescript
export async function executeEndpoint(
  baseUrl: string, method: string, path: string,
  body: Record<string, string> | null,
): Promise<{ status: number; data: unknown }> {
  const idToken = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  // ...
}
```

---

<a name="tarea-33"></a>
## TAREA 3.3 — Formularios y Validaciones

### A. Formularios completos

El panel web tiene tres formularios principales:

**Formulario de creación de API** (`CreateModal.tsx`): el más completo. Agrupa cinco secciones (configuración básica, credenciales de BD, columnas, endpoints, opciones adicionales) en un modal con scroll interno. Permite añadir y eliminar filas dinámicamente tanto en columnas como en endpoints mediante arrays en el estado de React y funciones `addCol`, `removeCol`, `addEp`, `removeEp`.

**Formulario de nuevo endpoint** (`EndpointForm.tsx`): se muestra inline en la pestaña de endpoints del panel lateral. Permite añadir endpoints a una API ya existente sin necesidad de reconstruir la API desde cero. Incluye los campos método, lógica de BD, path, nombre de función, tabla destino y visibilidad pública/privada.

**Formularios del gestor de esquema** (`SchemaTab.tsx`): hay tres formularios inline integrados en la vista de tablas: crear nueva tabla (con N columnas y posibilidad de definir FK en la misma operación), añadir columna a tabla existente y añadir foreign key entre tablas existentes. Estos formularios se abren y cierran dentro de la misma vista sin navegar a otra pantalla.

### B. Validaciones en cliente

Las validaciones se aplican antes de enviar cualquier petición al servidor, mostrando mensajes de error específicos mediante el sistema de toasts.

**Nombre de API**: solo se admiten letras minúsculas, números y guión bajo. La validación se aplica en dos momentos: en tiempo real al escribir (el `onChange` elimina los caracteres no permitidos directamente del `value`) y antes del envío:

```typescript
// Sanitización en tiempo real al escribir:
onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}

// Validación antes de enviar:
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  showToast('Nombre: solo letras minúsculas, números y _', 'error');
  return;
}
```

**Credenciales de base de datos**: se exige usuario y contraseña solo cuando el motor seleccionado no es SQLite (que no requiere autenticación):

```typescript
if (db !== 'sqlite' && (!dbUser || !dbPass)) {
  showToast('Usuario y contraseña de BD obligatorios', 'error');
  return;
}
```

**Columnas**: no pueden tener espacios ni estar vacías:

```typescript
for (const col of columns) {
  if (!col.name || /\s/.test(col.name)) {
    showToast('Nombre de columna inválido', 'error');
    return;
  }
}
```

**Endpoints**: el path debe empezar por `/` y el nombre de función no puede tener espacios. Además, el campo `function_name` sanitiza los espacios en tiempo real:

```typescript
onChange={e => updateEp(i, 'function_name', e.target.value.replace(/\s/g, ''))}
```

**Validación STRICT_MATRIX en cliente**: al cambiar el método HTTP, la lógica de BD se actualiza automáticamente al primer valor permitido. Las opciones no permitidas aparecen deshabilitadas en el select con indicador visual:

```typescript
{['select', 'insert', 'update', 'delete'].map(l => {
  const allowed = STRICT_MATRIX[ep.method] ?? [];
  const disabled = !allowed.includes(l);
  return (
    <option key={l} value={l} disabled={disabled}>
      {l}{disabled ? ' ✗' : ''}
    </option>
  );
})}
```

**Nombre de tabla y columnas en SchemaTab**: expresión regular `^[a-z_][a-z0-9_]*$` para garantizar identificadores SQL válidos. Nombre de tabla se sanitiza también en tiempo real:

```typescript
onChange={e => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
```

**Foreign keys en SQLite**: se detecta cuando el motor de la API es SQLite y se muestra un aviso explicativo en lugar de intentar la operación (SQLite no soporta `ALTER TABLE ADD FOREIGN KEY`):

```typescript
if (dbType === "sqlite") {
  showToast("SQLite no soporta ALTER TABLE ADD FK. Recrea la tabla con la FK.", "error");
  return;
}
```

### C. Feedback visual

Cada acción que modifica datos tiene al menos dos niveles de feedback:

**Nivel 1 — Botón**: el botón se deshabilita mientras la petición está en curso (`disabled={saving}`) y cambia su texto a "Guardando...", "Creando..." o similar. Esto evita envíos duplicados.

**Nivel 2 — Toast**: al completarse la operación (con éxito o con error) se muestra una notificación en la esquina inferior derecha con el resultado. Los toasts tienen tres tipos (`success`, `error`, `info`) con colores diferenciados y se eliminan automáticamente a los 4 segundos.

**Nivel 3 — Overlay**: para operaciones largas como la creación o eliminación de una API se muestra `LoadingOverlay`, un modal de pantalla completa con spinner y mensaje descriptivo, que impide que el usuario haga clic en otra cosa mientras la operación está en progreso.

**Estados vacíos**: cuando no hay APIs que mostrar (por no haber creado ninguna o porque los filtros no tienen resultados) se muestra un estado vacío con icono, texto explicativo y, en el caso de la pantalla sin APIs, un botón directo para crear la primera.

### D. Persistencia local (opcional)

El estado de sesión del usuario (datos del usuario autenticado y la ruta de la colección de Firestore) se persiste en `localStorage` mediante el middleware `persist` de Zustand. Esto permite que al recargar la página el usuario no tenga que volver a iniciar sesión y el panel cargue directamente con su información:

```typescript
persist(
  (set) => ({ /* ... */ }),
  {
    name: "storage",
    partialize: (state) => {
      const { apis, ...rest } = state;
      return rest; // excluye el array de APIs de la persistencia
    },
  },
)
```

La lista de APIs no se persiste porque su fuente de verdad es el estado real de Docker en el servidor; persistirla daría información desactualizada sobre el estado de los contenedores.

Firebase Authentication también mantiene la sesión localmente en `IndexedDB` de forma automática, de modo que el token se renueva silenciosamente en segundo plano sin que el usuario tenga que volver a introducir sus credenciales.

---

<a name="tarea-34"></a>
## TAREA 3.4 — Mejoras de Experiencia de Usuario

### A. Animaciones y transiciones

**Drawer lateral**: el panel de detalle de una API se abre y cierra con animaciones CSS personalizadas definidas en la configuración de Tailwind (`animate-drawer-in` y `animate-drawer-out`). La animación de cierre se dispara antes de que el componente se desmonte:

```typescript
const handleClose = () => {
  setIsClosing(true);
  setTimeout(close, 300); // espera a que acabe la animación CSS (300ms)
};
```

```typescript
className={`fixed top-0 right-0 w-[520px] h-screen bg-surface ...
  ${isClosing ? "animate-drawer-out" : "animate-drawer-in"}`}
```

**Overlay con blur**: el fondo al abrir el panel lateral aplica `backdrop-blur-[2px]` para dar sensación de profundidad y enfocar la atención en el panel.

**Transiciones en botones**: todos los botones interactivos tienen `transition-all` o `transition-colors` para que los cambios de color al hacer hover sean suaves en lugar de bruscos.

**Hover elevación**: el botón principal de "Nueva API" aplica `hover:-translate-y-px` para que se eleve ligeramente al pasar el cursor, dando retroalimentación táctil visual.

**Spinner de carga**: el indicador de carga en los logs (`animate-spin`) y en el overlay principal usan la clase de animación de rotación de Tailwind.

**Pulso en APIs activas**: el indicador de estado de las APIs en ejecución tiene una animación de pulso (`animate-pulse`) para distinguirlas visualmente de las detenidas.

**Indicador de tabla expandida**: en SchemaTab las tablas tienen un chevron animado que gira según si están expandidas o colapsadas (`fa-chevron-up` / `fa-chevron-down`).

### B. Notificaciones y feedback

El sistema de toasts está integrado en el store global de Zustand. Cualquier componente puede disparar un toast llamando a `showToast(mensaje, tipo)` sin necesidad de props adicionales. Los toasts se apilan verticalmente en la esquina inferior derecha y cada uno tiene un indicador de tipo:

- **success**: verde — operación completada correctamente
- **error**: rojo — algo ha fallado, con el mensaje de error del servidor
- **info**: azul/neutro — información no crítica (por ejemplo, "Restaurando API...")

El componente `ToastList.tsx` renderiza la lista de toasts del store y cada toast tiene un botón de cierre manual además del cierre automático a los 4 segundos.

Se usa `uuid` para generar IDs únicos para cada toast, lo que permite eliminarlos individualmente aunque lleguen múltiples al mismo tiempo.

**Overlay de carga**: para operaciones que tardan varios segundos (creación de API implica construir una imagen Docker), el `LoadingOverlay` bloquea la UI con un mensaje descriptivo ("Creando API...", "Eliminando mi_api..."). Esto es más informativo que simplemente deshabilitar un botón porque el usuario entiende que el sistema está trabajando.

**Modal de confirmación de borrado**: eliminar una API es una acción irreversible. Se usa `DeleteModal.tsx` para pedir confirmación explícita antes de ejecutar la operación, mostrando el nombre de la API que se va a eliminar.

**Estados vacíos con acción**: cuando el grid de APIs no tiene resultados se muestra un estado vacío diferenciado según si es porque no hay APIs creadas o porque los filtros no tienen resultados, incluyendo un botón de acción directa en el primer caso.

### C. Atajos de teclado (opcional)

El panel web no implementa atajos de teclado en la versión actual dado que la aplicación está orientada principalmente a uso puntual (crear y gestionar APIs) en lugar de a flujos de trabajo continuos. Sin embargo, el cierre del panel lateral con la tecla `Escape` se podría implementar fácilmente añadiendo un `useEffect` con un listener de `keydown` en el componente `Panel.tsx`.

---

<a name="tarea-35"></a>
## TAREA 3.5 — Pruebas y Depuración

### A. Pruebas funcionales

Las pruebas del proyecto fueron manuales y exploratorias, dada la naturaleza del TFG académico. Se realizaron las siguientes pruebas:

**Creación de APIs en todos los lenguajes**

Se crearon APIs de prueba en los 7 lenguajes soportados (Python, TypeScript, Go, Rust, Java, C, C++) con los 4 motores de base de datos (PostgreSQL, MySQL, MariaDB, SQLite) para verificar que los templates Jinja2 generan código correcto y que Docker puede construir y ejecutar los contenedores resultantes.

**Pruebas de endpoints generados**

Para cada combinación de método/lógica se verificó que el endpoint generado se comporta correctamente:
- `GET /ruta` → devuelve registros con filtrado por query params
- `GET /ruta/{id}` → devuelve el registro con ese id
- `POST /ruta` con body JSON → inserta el registro y devuelve el id
- `PUT /ruta/{id}` con body JSON → actualiza el registro
- `DELETE /ruta/{id}` → elimina el registro

**Pruebas del sistema de autenticación**

Se verificó que:
- Un endpoint marcado como privado devuelve 401 sin token
- Un endpoint marcado como privado devuelve 200 con token válido
- Un endpoint marcado como público devuelve 200 sin token
- Un token expirado devuelve 401

**Pruebas del motor DDL**

Se probó la creación de tablas con distintos tipos de columnas, la adición de columnas a tablas existentes y la creación de foreign keys entre tablas. Se verificó también que el mensaje de error apropiado aparece al intentar añadir una FK en SQLite.

**Pruebas de aislamiento de red**

Se verificó que los contenedores generados no son accesibles directamente por los puertos 8100-9000 desde el exterior (las reglas de iptables bloquean el acceso externo a esos puertos), pero sí son accesibles a través de nginx en la ruta `/app/<nombre>/`.

**Pruebas de visibilidad de APIs por rol**

Se probó que un usuario con rol `admin` puede ver todas las APIs del sistema, mientras que un usuario con rol `usuario` solo ve las APIs que él ha creado.

**Pruebas del laboratorio de endpoints (app móvil)**

Se verificó el laboratorio de endpoints con:
- Path params (`/usuarios/{id}`) → aparece campo de texto por cada parámetro
- Query filters para GET → se construye la query string correctamente
- Body JSON para POST/PUT → se serializa el objeto correctamente
- Endpoints privados → se adjunta el token automáticamente

### B. Optimización de rendimiento

**Polling selectivo**: el intervalo de actualización del estado de las APIs es de 15 segundos, que es un equilibrio entre actualidad de los datos y carga en el servidor. En lugar de hacer WebSocket o long-polling, el polling periódico es suficiente para el caso de uso (las APIs no cambian de estado con mucha frecuencia).

**Carga diferida de logs**: los logs de un contenedor solo se cargan cuando el usuario abre la pestaña de logs, no al abrir el panel. Esto evita una petición extra en cada apertura de panel cuando el usuario solo quiere ver información básica.

**Caché de claves públicas de Firebase**: en `firebase_auth.py` del backend las claves públicas de Google para verificar tokens RS256 se cachean en memoria con un TTL basado en la cabecera `Cache-Control` de la respuesta de Google. Esto evita una petición HTTP a Google en cada verificación de token.

**Build de producción con Vite**: el panel web se sirve desde una build de producción de Vite (`npm run build`), que minifica y tree-shakes el JavaScript, eliminando el código no utilizado. El resultado son unos pocos ficheros estáticos servidos por nginx directamente.

**nginx como proxy**: nginx maneja la terminación TLS, la compresión gzip y el buffering de respuestas, descargando al servidor FastAPI de esas tareas.

### C. Depuración

Durante el desarrollo surgieron varios problemas que requirieron depuración:

**Problema de red Docker (Internal Server Error)**

El problema más relevante fue que los contenedores generados (en la red `api_default`) no podían resolver el hostname "postgres" (que solo era visible en la red `server_default`). Los logs del contenedor mostraban `sqlalchemy.exc.OperationalError: could not connect to server: Name or service not known`. La solución fue conectar los contenedores de base de datos a ambas redes:

```bash
docker network connect --alias postgres api_default server-postgres-1
```

Y hacer esto permanente en `docker-compose.yml`:
```yaml
postgres:
  networks:
    - default
    - api_default
```

**Herramientas utilizadas para depuración**:
- `docker logs <nombre_contenedor>` para ver los errores del contenedor en tiempo real
- `docker inspect <contenedor>` para verificar las redes a las que está conectado un contenedor
- Swagger UI en `/docs` para probar endpoints del backend de gestión
- La consola del navegador y la pestaña Network de DevTools para depurar peticiones del panel web
- Los logs de nginx en `/var/log/nginx/tfg-dam-error.log` para problemas de proxy o autenticación
- `curl` desde dentro del contenedor de la API de gestión para verificar conectividad con las bases de datos

### D. Checklist de calidad

| Item | Estado |
|---|---|
| Todas las APIs creadas se despliegan correctamente | ✓ |
| Los endpoints generados responden con datos de la BD | ✓ |
| La autenticación bloquea accesos sin token | ✓ |
| Los endpoints públicos son accesibles sin token | ✓ |
| El panel web carga y muestra las APIs del usuario | ✓ |
| Los toasts muestran resultado de todas las operaciones | ✓ |
| El formulario de creación valida todos los campos | ✓ |
| Los contenedores backup se crean junto al principal | ✓ |
| La eliminación de API limpia contenedores y nginx | ✓ |
| El panel de esquema lista tablas y columnas reales de la BD | ✓ |
| El laboratorio de endpoints sustituye path params | ✓ |
| La sesión persiste entre recargas del navegador | ✓ |
| Los usuarios no admin solo ven sus propias APIs | ✓ |
| El acceso directo a puertos 8100-9000 está bloqueado | ✓ |
| La aplicación funciona con HTTPS sin warnings de certificado | ✓ |

---

<a name="tarea-36"></a>
## TAREA 3.6 — Despliegue

### A. Preparación para producción

**Panel web**: se genera una build de producción con `npm run build` dentro del Dockerfile del servicio `appWeb`. Vite produce los assets estáticos en `dist/`, que se sirven con el servidor de Node integrado en el contenedor. La separación entre entornos de desarrollo (servidor Vite con HMR) y producción (build estática) está gestionada por las variables de entorno de Vite (`import.meta.env.PROD`).

**Backend FastAPI**: se ejecuta con Uvicorn en modo producción dentro del contenedor Docker. El `Dockerfile` de la API instala las dependencias de `requirements.txt` y arranca el proceso con `uvicorn main:app --host 0.0.0.0 --port 8000`.

**Variables de entorno**: los valores sensibles (URL de la base de datos, IP del servidor) se configuran en `server/api/.env`, que no se versiona en el repositorio (incluido en `.gitignore`).

**Docker Compose**: el archivo `docker-compose.yml` define todos los servicios con `restart: unless-stopped`, de forma que se reinician automáticamente si el servidor se reinicia o si el proceso falla.

### B. Selección de plataforma de despliegue

Se eligió **AWS EC2** por los siguientes motivos:

- **Control total**: al ser una VM, se tiene acceso completo al sistema operativo, lo que es necesario para instalar Docker, configurar nginx con módulos específicos (`ngx_http_auth_request_module`), gestionar reglas de iptables y el socket de Docker.
- **Coste**: la instancia `t3.micro` de la región `eu-north-1` tiene un coste muy bajo, adecuado para un proyecto académico.
- **Persistencia de datos**: los volúmenes Docker para PostgreSQL, MySQL y MariaDB persisten en el disco de la instancia entre reinicios.
- **IP elástica / DNS**: se configuró un registro DNS (`tfg-dam.libertoguillen.com`) apuntando a la IP de la instancia para tener una URL estable.

Se descartaron plataformas como Heroku o Railway porque no permiten ejecutar Docker dentro de Docker (necesario para que la API de gestión cree contenedores dinámicamente) y porque no ofrecen acceso al socket de Docker del host.

### C. Configuración del despliegue

#### Servidor nginx del host

El servidor nginx del host (`nginx_tfg-dam.conf`) tiene dos bloques server:

El primero redirige todo el tráfico HTTP (puerto 80) a HTTPS:
```nginx
server {
    listen 80;
    server_name tfg-dam.libertoguillen.com;
    return 301 https://$server_name$request_uri;
}
```

El segundo atiende en HTTPS (puerto 443) con certificado Let's Encrypt y enruta las peticiones:
- `/` → panel web en `localhost:3000`
- `/docs`, `/openapi.json` → API de gestión en `localhost:8000`
- `/app/<nombre_api>/` → API generada en su puerto asignado (configuración dinámica incluida con `include /etc/nginx/conf.d/apis/*.conf`)

Cada vez que se crea una API, el backend de gestión genera automáticamente un fichero de configuración nginx en `/etc/nginx/conf.d/apis/<nombre>.conf` con la ubicación del contenedor y la directiva `auth_request`:

```nginx
location /app/mi_api/ {
    auth_request /internal/auth;
    proxy_pass http://localhost:8122/;
}
location = /internal/auth {
    proxy_pass http://localhost:8000/auth/verify;
    proxy_set_header X-Original-URI $request_uri;
}
```

Después ejecuta `nginx -s reload` para que nginx recargue la configuración sin interrumpir las conexiones activas.

#### TLS con Let's Encrypt

Los certificados SSL se gestionan con `certbot` y se renuevan automáticamente. Las rutas a los ficheros de certificado se especifican en la configuración de nginx:

```nginx
ssl_certificate /etc/letsencrypt/live/tfg-dam.libertoguillen.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tfg-dam.libertoguillen.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
```

#### iptables para aislamiento de puertos

Los puertos del rango 8100-9000 (donde escuchan los contenedores generados) son accesibles desde la red interna del servidor pero no desde el exterior. Esto se consigue con reglas en la cadena `DOCKER-USER` de iptables, que se procesa antes de que Docker aplique sus propias reglas de NAT:

```bash
iptables -I DOCKER-USER -p tcp --dport 8100:9000 -j DROP
iptables -I DOCKER-USER -p tcp --dport 8100:9000 -s 127.0.0.1 -j ACCEPT
```

Esto garantiza que el único punto de entrada a las APIs generadas sea el proxy nginx, que aplica la autenticación.

#### Docker y red compartida

La red Docker `api_default` se crea una sola vez manualmente y se declara como `external: true` en `docker-compose.yml`. Esta red es compartida entre los servicios del compose (API de gestión, bases de datos) y los contenedores que se crean dinámicamente. Gracias a esto los contenedores generados pueden resolver los hostnames `postgres`, `mysql` y `mariadb` por DNS de Docker.

### D. Post-despliegue

Tras cada despliegue se realizaron las siguientes comprobaciones:

1. **Acceso HTTPS**: verificar que `https://tfg-dam.libertoguillen.com` carga el panel de login sin warnings de certificado
2. **Inicio de sesión**: verificar que Firebase Authentication funciona con email/contraseña y con Google
3. **Creación de API de prueba**: crear una API mínima con un endpoint GET y verificar que el contenedor arranca
4. **Acceso al endpoint**: hacer `curl https://tfg-dam.libertoguillen.com/app/prueba/` y verificar que devuelve 200 si el endpoint es público o 401 si es privado
5. **Logs en panel**: verificar que la pestaña de logs muestra los logs del contenedor
6. **Eliminación**: eliminar la API de prueba y verificar que el contenedor desaparece y la ruta nginx deja de responder
7. **Persistencia**: reiniciar los servicios con `docker compose restart` y verificar que las APIs siguen registradas y los contenedores vuelven a arrancar

---

<a name="tarea-37"></a>
## TAREA 3.7 — Documentación Final y Presentación

### A. README.md profesional

El fichero `README.md` en la raíz del proyecto documenta:

- Descripción del proyecto y su motivación
- Diagrama ASCII de la arquitectura con el flujo de una petición
- Lista completa de funcionalidades
- Estructura de directorios comentada
- Stack tecnológico en tablas por capa (backend, web, móvil, infraestructura)
- Explicación del motor de generación de código y la STRICT_MATRIX
- Modelo de seguridad (JWT, nginx auth_request, iptables)
- Tabla de endpoints de la API de gestión
- Guía de instalación paso a paso (red Docker, variables de entorno, nginx, conexión de BDs a la red)
- Instrucciones de despliegue en producción (AWS EC2)
- Guía de uso rápido desde el panel web y desde la app móvil
- Configuración de Firebase para un entorno propio

### B. Memoria del proyecto

Este documento es la memoria del proyecto. Recoge las decisiones técnicas tomadas en cada área del desarrollo, los problemas encontrados y cómo se resolvieron, las herramientas y patrones utilizados y los criterios de calidad seguidos.

---

## Reflexión final

El proyecto ha permitido aplicar de forma práctica un conjunto amplio de tecnologías: desde el backend (Python, FastAPI, SQLAlchemy, Jinja2, Docker SDK) hasta el frontend web (React, TypeScript, Zustand, Tailwind) y la app móvil (Flutter, Dart, Firebase). La parte más compleja técnicamente fue el sistema de generación de código y despliegue automatizado, que requirió entender bien cómo funciona Docker desde dentro de un contenedor, cómo se gestiona nginx de forma dinámica y cómo aislar correctamente los contenedores generados a nivel de red.

La parte del modelo de seguridad (nginx `auth_request` con validación JWT de Firebase) fue especialmente interesante porque implicó coordinar tres sistemas distintos (nginx, FastAPI y Firebase) para conseguir una autenticación transparente que ni el contenedor generado ni el usuario tienen que gestionar explícitamente.

El resultado es una plataforma funcional, desplegada en producción, que cumple el objetivo planteado: cualquier usuario puede crear y acceder a su propia API REST en cuestión de segundos, sin necesidad de escribir código ni administrar servidores.
