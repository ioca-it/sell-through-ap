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

- Estado: conectividad real end-to-end validada por Phase1-011, UI preparada por Phase1-012 y mapping `customerType` completado por Phase1-016. Phase1-022 demostró en producción que los nombres de filtro `customertype` y `crbbe_estadocliente` son inválidos; Phase1-024 requiere metadata del entorno antes de corregirlos. La activación en Vercel sigue pendiente de revisión; `VITE_CUSTOMER_SOURCE=local` permanece vigente y el Provider Dataverse no es todavía la fuente efectiva de UI.
- Alcance aprobado: Maestro Cliente con búsqueda por código/nombre y contrato `{ customerCode, customerName, country, customerType }`.
- Frontend Provider: `src/providers/dataverse/dataverseCustomerProvider.js`, consumidor exclusivo de Customer API mediante `VITE_API_BASE_URL`; adjunta Bearer MSAL, aplica timeout de 10 segundos y clasifica de forma sanitizada sesión ausente, 401, 403, 429, 5xx, red y respuesta inválida.
- Selector de Provider: `src/providers/customerProviderFactory.js`, configurado mediante `VITE_CUSTOMER_SOURCE=local|dataverse`; `local` es el fallback cuando la variable no está definida.
- Repository: `src/repositories/customerRepository.js`.
- Consumidor: Customer Master Application Service; la UI no recibe nombres físicos Dataverse.
- Alternativa temporal: `localCustomerProvider.js`, con cinco clientes claramente ficticios desde `customerFixtures.js` e inyección opcional de otros fixtures.
- Backend: `server/`, portable y sin dependencias de Render/Azure.
- Entity Set confirmado: `accounts`.
- Mapping confirmado dentro de Account Customer Gateway: `new_codigocliente` → `customerCode`, `name` → `customerName`, `crbbe_nombrepais` → `country`, `new_tipocliente` → `customerType`.
- API: búsquedas específicas por código/nombre y lectura por código; select/filtro/orden/top se construyen solo en backend. Account Customer Gateway conserva provisionalmente `customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4`: las tres reglas siguen siendo obligatorias, `statecode eq 0` está confirmado y los otros dos nombres esperan metadata productiva. Ningún criterio se expone como parámetro frontend.
- Autenticación: OAuth 2.0 client_credentials contra Entra; scope derivado de `DV_BASE_URL` y token cacheado con margen de seguridad.
- Seguridad: variables, secretos y access token `DV_*` solo backend. MSAL usa `VITE_AUTH_TENANT_ID`, `VITE_AUTH_CLIENT_ID` y `VITE_AUTH_API_SCOPE`; `getAccessToken` intenta `acquireTokenSilent` y deriva a `loginRedirect` cuando falta sesión o se requiere interacción. El token delegado se limita al header Bearer del Provider frontend; UI, Repository y Service no conocen JWT, nombres lógicos ni OData.
- Cache frontend: administrado por MSAL en `sessionStorage`; no existe almacenamiento manual de access tokens ni client secret de SellThrough-Web.
- CORS: allowlist desde `ALLOWED_ORIGINS`; wildcard rechazado.
- Autenticación API: Bearer JWT delegado obligatorio en rutas Customer; firma/JWKS, issuer, audience, expiración, tenant y scope validados con configuración `AUTH_*` separada.
- Rate limiting: por IP antes de Auth y por identidad después de Auth; 429 con `Retry-After`. Store in-memory temporal e inyectable.
- Health: `GET /health` anónimo, sin consultas a Entra, Dataverse o Customer Service.
- Probe JWT Phase1-007: `GET /api/customers/search?type=code` sin `q`; después de autenticar debe responder `400 / INVALID_CUSTOMER_REQUEST` antes de Customer Gateway. Este resultado valida la frontera usuario→API, no Dataverse.
- Smoke Dataverse Phase1-010B/011: búsqueda protegida `GET /api/customers/search?type=code&q=CL0000041`, activada sólo mediante `?phase1-010b-smoke=1`; resultado real `HTTP 200`, JWT aceptado, request Dataverse intentado, exactamente un Customer y diagnóstico nulo. Se conserva sólo la cantidad, nunca el payload Customer, y el arnés permanece disponible temporalmente.
- Diagnóstico Phase1-024: después de `DATAVERSE_INVALID_FIELD_OR_FILTER` y una sola vez por proceso, el backend consulta metadata de atributos `account` limitada a `LogicalName`, `SchemaName` y `AttributeType`; para candidatos Choice/State/Status/Boolean conserva solo la presencia y etiqueta de la opción objetivo 3/4. No existe endpoint público, no se leen filas Customer y no se registran payloads completos, credenciales, URLs, queries o PII.
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
| Código, nombre, país y tipo del cliente | Fixtures locales o Customer API con Bearer MSAL → Account Customer Gateway → `accounts`, según `VITE_CUSTOMER_SOURCE`; Phase1-012 prepara ambos combobox y conserva `VITE_CUSTOMER_SOURCE=local` hasta revisión |
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

PHASE1-010B sustituye ese trigger por una búsqueda Customer controlada que sí
invoca la Customer API y su gateway Dataverse al habilitarse explícitamente. El
Provider efectivo de la UI permanece `local`; el arnés descarta el payload y
publica únicamente etapas, status HTTP y cantidad de resultados.

PHASE1-011 cierra esa ejecución como PASS. `CL0000041` devolvió exactamente una
coincidencia mediante la arquitectura validada, sin almacenar payload real,
JWT, headers `Authorization`, secretos ni claims sensibles. Permanecen
pendientes la activación del Provider Dataverse en UI, `customerType` real, la
búsqueda por nombre y los casos de error/cero resultados. Render sigue como
backend transitorio y Azure como migración futura.

PHASE1-012 cubre en frontend las búsquedas por código y nombre mediante la misma
Customer API, una única selección Customer, fallback `customerType: ''`, cero
resultados, sesión ausente, categorías HTTP, red, timeout, deduplicación y
respuestas obsoletas. La UI sigue consumiendo fixtures porque
`VITE_CUSTOMER_SOURCE=local`; la validación interactiva real desde ambos
combobox requiere una activación posterior en Vercel.

PHASE1-015 centraliza en Account Customer Gateway la elegibilidad obligatoria
de `accounts`: `customertype eq 3`, `statecode eq 0` y
`crbbe_estadocliente eq 4`. El filtro se combina con `contains` por código o
nombre y con la igualdad de la lectura exacta. `customertype=3` se usa solo
como criterio de elegibilidad; no agrega una columna al `$select`, no modifica
el mapping y no completa el `customerType` lógico.

PHASE1-016 agrega `new_tipocliente` al `$select` común de las tres consultas
Customer y lo normaliza dentro de Account Customer Gateway como
`customerType`. Un valor `null` o `undefined` produce `''`; el nombre lógico no
sale de la capa Dataverse. Los filtros de elegibilidad Phase1-015 permanecen
sin cambios.

PHASE1-024 incorpora la evidencia productiva de Phase1-022: `customertype` y
`crbbe_estadocliente` fallan como campos seleccionables, mientras `statecode` y
`new_tipocliente` pasan. El repositorio no contiene reemplazos ni tipos
confirmados; por ello la consulta productiva no se corrige por conjetura. El
diagnóstico temporal backend descubre candidatos desde metadata técnica de
`account` y reduce OptionSet solo al valor requerido 3/4. `statecode eq 0` y
`new_tipocliente -> customerType` conservan sus responsabilidades separadas.
