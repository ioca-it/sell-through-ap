# Fuentes de datos

## Principio vigente

La UI y la lógica de negocio no dependen directamente de una fuente. `sellThroughRepository.js` conserva los seis métodos del flujo analítico y `localDataProvider.js` sigue siendo el único consumidor de `dataService`. Para Maestro Cliente, `customerRepository.js` consume el Provider seleccionado por `VITE_CUSTOMER_SOURCE`: fixtures ficticios locales o la Customer API existente; Customer Service y Account Customer Gateway encapsulan Dataverse en backend.

## DS-001 — Configuración institucional local

- Fuente física: `src/data/datos.json`.
- Acceso físico: importación y caché síncrono en `src/services/dataService.js`.
- Provider: `src/providers/local/localDataProvider.js`, único consumidor de `dataService`.
- Repository: `src/repositories/sellThroughRepository.js`, único consumidor del Provider.
- Consumidores del contrato: `src/App.jsx` para catálogos/muestras y Application Service para parámetros del procesamiento.
- Contenido: umbral de merma, semanas por período, nota del motor de inventario de seguridad, países, períodos, buckets EOL, tabla de fases y dos muestras TSV.
- Estado: temporal y embebido en el bundle.
- Persistencia: versionada con el código.
- Futuro aprobado: Configuration Center y Dataverse, sin esquema confirmado.

## DS-002 — Maestro de Productos

- Entrada efectiva: texto pegado en un `textarea` o muestra embebida cargada desde DS-001.
- Estado: `rawMaestro` en React.
- Acceso al caso de uso: `getMaestro()` del Repository, respaldado por `readMaestro()` del Local Provider.
- Contrato de borde: Local Provider exige que el valor recibido sea `string`.
- Procesamiento: `masterParser.js`, coordinado por `sellThroughApplicationService.js`.
- Campo mínimo efectivo: SKU.
- Campos reconocidos: marca, SKU, modelo/nombre/descripción, categoría, fecha EOL, estado, costo USA y costo China.
- Uso: estado del producto, atributos, costo por origen y fecha de descontinuación.
- Futuro documentado: Dataverse.

### Alias reconocidos del Maestro

| Concepto | Encabezados buscados después de normalizar |
| --- | --- |
| Marca | `marca` |
| SKU | `sku` |
| Modelo | `modelos`, `modelo`, `nombre`, `descripcion` |
| Categoría | `categorias`, `categoria`, `category`, `cat` |
| Fecha EOL | `fechadescontinuacion`, `fechaeol`, `fecha` |
| Estado | `estado`, `status` |
| Costo USA | `usa`, `exwmia` |
| Costo China | `china` |

## DS-003 — Inventario del Cliente

- Entrada efectiva: texto pegado en un `textarea` o muestra embebida cargada desde DS-001.
- Estado: `rawInventario` en React.
- Acceso al caso de uso: `getInventario()` del Repository, respaldado por `readInventario()` del Local Provider.
- Contrato de borde: Local Provider exige que el valor recibido sea `string`.
- Procesamiento: `inventoryParser.js`, coordinado por `sellThroughApplicationService.js`.
- Campos mínimos efectivos: SKU e Inventario Final.
- Uso: tienda, códigos, Tier, origen, inventarios, compras y ventas.
- Futuro documentado: Dataverse o una integración autorizada.

### Alias reconocidos del Inventario

| Concepto | Encabezados buscados después de normalizar |
| --- | --- |
| Tienda | `tienda`, `cuenta`, `sucursal` |
| Código | `codigo`, `codigocliente` |
| EAN | `ean13`, `ean` |
| SKU | `sku` |
| Marca | `marca` |
| Tier | `tier` |
| Indicador EOL | `eol` |
| Nombre | `nombre`, `modelo`, `descripcion` |
| Origen | `origen` |
| Inventario seguridad | `inventarioseguridad`, `invseguridad`, `safetystock` |
| Inventario inicial | `invinicial`, `inventarioinicial` |
| Compra | `compra`, `compras`, `recibido` |
| Ventas | `ventas`, `sales` |
| Inventario proyectado | `invproyectado`, `inventarioproyectado`, `proyectado` |
| Inventario final | `invfinal`, `inventariofinal`, `final` |

## DS-004 — Configuración de sesión

- Fuente: estado de sesión dentro de `src/App.jsx`; código, nombre, país y tipo se cargan desde una única selección de Customer Master.
- Estado: objeto `config` de React.
- Acceso al caso de uso: `getConfiguracion()` del Repository, respaldado por `readConfiguracion()` del Local Provider.
- Nulabilidad: puede ser `null` en un Repository parcial usado solo para catálogos o ejemplos.
- Procesamiento: Application Service exige un objeto con `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA`; si falta devuelve error controlado.
- Contenido: selección de cliente, incluido `customerType`, fecha de corte, período, detalle, semanas personalizadas, safety stock y lead times.
- Persistencia: ninguna.
- Uso: cálculo del Inventario de Seguridad IOCA y contexto de dashboard/exportaciones.
- Futuro documentado: Configuration Center y Dataverse.

## DS-005 — Fecha y entorno del navegador

- `new Date()` inicializa la fecha de corte visible.
- El primer día del mes actual es la fecha base efectiva del cálculo EOL.
- La fecha/hora local también se usa en nombres, cabeceras e informe impreso.
- Esta dependencia no está abstraída.

## DS-006 — Dataverse

- Estado: transporte frontend asegurado con JWT delegado y MSAL integrado; Phase1-007 prepara un probe protegido que se detiene antes de Dataverse. Render respondió `/health=200` y rechazó el probe sin Bearer con `401 / AUTHENTICATION_REQUIRED`; la ejecución autenticada real desde Vercel y cualquier smoke posterior contra Dataverse permanecen pendientes.
- Alcance aprobado: Maestro Cliente con búsqueda por código/nombre y contrato `{ customerCode, customerName, country, customerType }`.
- Frontend Provider: `src/providers/dataverse/dataverseCustomerProvider.js`, consumidor exclusivo de Customer API mediante `VITE_API_BASE_URL`.
- Selector de Provider: `src/providers/customerProviderFactory.js`, configurado mediante `VITE_CUSTOMER_SOURCE=local|dataverse`; `local` es el fallback cuando la variable no está definida.
- Repository: `src/repositories/customerRepository.js`.
- Consumidor: Customer Master Application Service; la UI no recibe nombres físicos Dataverse.
- Alternativa temporal: `localCustomerProvider.js`, con cinco clientes claramente ficticios desde `customerFixtures.js` e inyección opcional de otros fixtures.
- Backend: `server/`, portable y sin dependencias de Render/Azure.
- Entity Set confirmado: `accounts`.
- Mapping confirmado dentro de Account Customer Gateway: `new_codigocliente` → `customerCode`, `name` → `customerName`, `crbbe_nombrepais` → `country`.
- API: búsquedas específicas por código/nombre y lectura por código; select/filtro/orden/top se construyen solo en backend.
- Autenticación: OAuth 2.0 client_credentials contra Entra; scope derivado de `DV_BASE_URL` y token cacheado con margen de seguridad.
- Seguridad: variables, secretos y access token `DV_*` solo backend. MSAL usa `VITE_AUTH_TENANT_ID`, `VITE_AUTH_CLIENT_ID` y `VITE_AUTH_API_SCOPE`; `getAccessToken` intenta `acquireTokenSilent` y deriva a `loginRedirect` cuando falta sesión o se requiere interacción. El token delegado se limita al header Bearer del Provider frontend; UI, Repository y Service no conocen JWT, nombres lógicos ni OData.
- Cache frontend: administrado por MSAL en `sessionStorage`; no existe almacenamiento manual de access tokens ni client secret de SellThrough-Web.
- CORS: allowlist desde `ALLOWED_ORIGINS`; wildcard rechazado.
- Autenticación API: Bearer JWT delegado obligatorio en rutas Customer; firma/JWKS, issuer, audience, expiración, tenant y scope validados con configuración `AUTH_*` separada.
- Rate limiting: por IP antes de Auth y por identidad después de Auth; 429 con `Retry-After`. Store in-memory temporal e inyectable.
- Health: `GET /health` anónimo, sin consultas a Entra, Dataverse o Customer Service.
- Probe JWT Phase1-007: `GET /api/customers/search?type=code` sin `q`; después de autenticar debe responder `400 / INVALID_CUSTOMER_REQUEST` antes de Customer Gateway. Este resultado valida la frontera usuario→API, no Dataverse.
- Hosting: Render temporal mediante `VITE_API_BASE_URL`, Azure objetivo; ningún endpoint está codificado en módulos Customer/Dataverse.

Los secretos, tokens y permisos no se versionan. Los IDs públicos de la SPA, scope delegado y endpoint temporal se documentan como variables frontend; los comentarios históricos de `dataService.js` no constituyen otra integración ni un contrato adicional.

## DS-007 — Business Central

No existe acceso implementado ni contrato documentado. Solo rige la restricción arquitectónica de que los componentes React no accedan directamente a esta fuente.

## Salidas, no fuentes

CSV, Excel y la impresión del informe se generan desde resultados en memoria. No se vuelven a ingerir ni se consideran sistemas de registro.

## Trazabilidad de procedencia

| Dato calculado | Procedencia principal |
| --- | --- |
| Estado, categoría y fecha EOL | Maestro |
| Origen | Inventario; USA por defecto si falta |
| Costo aplicado | Maestro, seleccionado por origen del Inventario |
| Inventarios, compras y ventas | Inventario |
| Semanas estándar y umbral de merma | JSON local vía Local Provider y Repository |
| Safety stock y lead times | Configuración de sesión vía Local Provider y Repository |
| Código, nombre, país y tipo del cliente | Fixtures locales o Customer API con Bearer MSAL → Account Customer Gateway → `accounts`, según `VITE_CUSTOMER_SOURCE`; Phase1-007 no cambia la fuente y su probe JWT no consulta Dataverse |
| Bucket y fase | JSON local vía Local Provider/Repository + EOL Engine coordinado por `recordAssembler.js` |
| Fecha base EOL | Reloj del navegador |

## Contrato caracterizado de los parsers

Prompt 015 agregó 28 pruebas deterministas que ejercitan DS-002 y DS-003 mediante el handler real de `App`. La baseline confirma:

- filas separadas por salto de línea y columnas por tab, coma o punto y coma;
- encabezados normalizados sin mayúsculas, tildes, espacios ni símbolos;
- búsqueda de cada grupo de alias primero por igualdad exacta y luego por subcadena;
- SKU obligatorio en ambas entradas e Inventario Final obligatorio en DS-003;
- columnas opcionales con sus defaults actuales;
- último duplicado en Maestro y todas las filas duplicadas en Inventario;
- omisión de SKU vacío;
- atributos y costos efectivos desde Maestro, origen y cantidades desde Inventario;
- registro `SIN MAESTRO` cuando no existe cruce.

Prompt 016 trasladó el contrato a `masterParser.js` e `inventoryParser.js`, sin modificar su semántica. Los parsers no implementan quoted CSV y pueden presentar colisiones por subcadena en la búsqueda parcial. Prompt 017 incorporó Repository y Local Provider delante de estas fuentes; no cambió los parsers ni sus entradas normalizadas. Prompt 018 agregó validación estructural de seis métodos del Provider y formas locales mínimas antes de que los datos lleguen al pipeline.

## Catálogo de procedencia de parámetros

Prompt 019 consolidó en `docs/knowledge/BUSINESS_PARAMETERS.md` la procedencia actual de los parámetros y contratos observables: JSON local, estado React, reloj del navegador y literales de App/Application Service/Domain. El catálogo es la fuente oficial para planificar Configuration Center y una migración posterior mediante Repository/Provider.

PHASE1-005 no activa una fuente remota nueva ni modifica mappings Dataverse. `VITE_CUSTOMER_SOURCE=local` mantiene fixtures exclusivamente locales y ficticios; MSAL queda preparado para una activación posterior autorizada y `datos.json` conserva las fuentes del flujo sell-through.

PHASE1-007 tampoco activa una fuente remota. El arnés temporal realiza sólo un
request protegido explícito cuando el query parameter de control está presente;
la ruta elegida falla por validación antes del gateway y no constituye una
lectura Customer ni una validación de Dataverse.
