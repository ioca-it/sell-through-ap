# Fuentes de datos

## Principio vigente

La UI y la lógica de negocio no dependen directamente de una fuente. `sellThroughRepository.js` conserva los seis métodos del flujo analítico y `localDataProvider.js` sigue siendo el único consumidor de `dataService`. Maestro Producto usa `productRepository.js` y `VITE_PRODUCT_SOURCE=local|dataverse`, con `local` como default vigente; Maestro Cliente usa `customerRepository.js` y producción continúa en Dataverse. Ambos Providers remotos consumen endpoints funcionales del backend portable y nunca Dataverse directamente.

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

- Fuentes implementadas: texto local existente y Dataverse `productpricelevels`; `VITE_PRODUCT_SOURCE=local` conserva la fuente efectiva y Product Dataverse no está activado en producción. Phase1-055 confirma `crbbe_urlproducto` como LogicalName del URL de Product Master y corrige el nombre anterior incorrecto `producturl` sin ejecutar una lectura productiva ni cambiar el selector de fuente.
- Ruta local: texto pegado/muestra embebida -> `localDataProvider`/`masterParser.js`; `localProductProvider.js` reutiliza ese parser para exponer la lista única/ordenada de marcas y `Product[]` filtrado por `brand`, sin duplicar reglas. Un costo local vacío o inválido queda en `null`; el cero explícito se conserva. `fechaStr` se deriva mediante la normalización compartida.
- Ruta Dataverse preparada: `GET /api/products/brands` o `GET /api/products/master?brand=<brand>` -> Product Service -> Product Price Level Gateway -> Dataverse Client -> `productpricelevels`; el frontend solo envía el parámetro funcional `brand`, nunca OData.
- Selector: `productProviderFactory.js`, cerrado a `local|dataverse`.
- Repository/Application: `productRepository.js` y `productMasterService.js`.
- Contrato Product frontend: `{ sku, productName, brand, category, discontinuationDate, fechaStr, creationDate, level, status, imageUrl, productUrl, priceUSA, priceChina }`; la respuesta backend conserva sus campos físicos existentes y el normalizer frontend deriva `fechaStr`.
- Adaptación al motor: `sellThroughApplicationService.js` acepta el contrato normalizado como entrada opcional y lo adapta al Master vigente; el texto local conserva su recorrido y errores anteriores.
- Campo mínimo efectivo: SKU.
- Uso: estado, atributos, costo por origen, fechas de creación/descontinuación y URLs de producto/imagen disponibles en el detalle SKU.

### Mapping Dataverse de Maestro Producto

| Product | `productpricelevels` |
| --- | --- |
| `brand` | `crbbe_nombremarca` |
| `sku` | `crbbe_sku` |
| `productName` | `crbbe_nombreproducto` |
| `category` | `crbbe_nombrecategoria` |
| `discontinuationDate` | `crbbe_validohasta` |
| `creationDate` | `createdon` |
| `level` | `crbbe_clasificacioncomercial` / FormattedValue si existe |
| `status` | `crbbe_etapa` / FormattedValue si existe |
| `imageUrl` | `crbbe_imagenproducto` |
| `productUrl` | `crbbe_urlproducto` |
| `priceUSA` | `amount` cuando `crbbe_origen = USA` |
| `priceChina` | `amount` cuando `crbbe_origen = CHINA` |

El gateway aplica en `$filter` el comprador `IOCA USA INC` o `SAND SPORTS, CORP.` y, para Product Master, añade obligatoriamente `crbbe_nombremarca eq '<brand escapada>'` antes de `retrieveAll()`. Sin `brand` válida el Product Service responde 400 antes del Gateway; no existe fallback global. Consolida por SKU; `amount = 0` conserva un precio real igual a cero y `amount null|undefined`, una fila ausente USA o una fila ausente CHINA producen `null` en el precio correspondiente. Valores numéricos distintos del mismo SKU/origen/comprador, o entre ambos compradores sin precedencia autorizada, detienen la carga con `409 / PRODUCT_MASTER_CONFLICT`; cero contra otro número distinto también bloquea, mientras `null`/ausente no compite con un valor real. La misma protección aplica a divergencias no vacías de `productName`, `brand`, `category`, `level`, `status`, `discontinuationDate`, `creationDate`, `imageUrl` o `productUrl`. La lista de marcas usa `retrieveAll()` con solo `crbbe_nombremarca` y `crbbe_companiacompradora`; puede recorrer varias páginas, pero no descarga los trece campos ni consolida Product. Normaliza `trim()`, excluye null/vacío, deduplica coincidencias exactas y ordena determinísticamente. Los nombres físicos permanecen exclusivamente en Product Price Level Gateway.

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
- Contenido: selección de cliente, incluido `customerType`, selección independiente de `brand`, fecha de corte, período, detalle, semanas personalizadas, safety stock y lead times.
- Persistencia: ninguna para cliente o marca; Phase1-070 no añade persistencia local ni Dataverse para `selectedBrand`.
- Uso: cálculo del Inventario de Seguridad IOCA y contexto de dashboard/exportaciones.
- Futuro documentado: Configuration Center y Dataverse.

## DS-005 — Fecha y entorno del navegador

- `new Date()` inicializa la fecha de corte visible.
- El primer día del mes actual es la fecha base efectiva del cálculo EOL.
- La fecha/hora local también se usa en nombres, cabeceras e informe impreso.
- Esta dependencia no está abstraída.

## DS-006 — Dataverse

- Estado Customer: **IMPLEMENTED + PRODUCTION VALIDATED** por Phase1-032. Vercel usa `VITE_CUSTOMER_SOURCE=dataverse`; búsqueda/selección conservan el contrato Customer.
- Estado Product: **PRODUCT URL LOGICAL NAME CORRECTED / TEMPORARY DIAGNOSTICS REMOVED / NOT DEPLOYED / NOT ACTIVATED** por Phase1-055. `productpricelevels` permanece confirmado, `crbbe_urlproducto` reemplaza el nombre anterior incorrecto `producturl` solo en la integración backend y `VITE_PRODUCT_SOURCE=local` continúa como fuente efectiva.
- Fuentes autorizadas: `accounts` para Maestro Cliente y `productpricelevels` para Maestro Producto, cada una mediante su endpoint funcional y gateway backend.
- Frontend Providers: `dataverseCustomerProvider.js` y `dataverseProductProvider.js`, consumidores exclusivos del backend mediante `VITE_API_BASE_URL`; adjuntan Bearer MSAL a través del cliente HTTP compartido y normalizan fallos sin exponer detalles.
- Selectores: `VITE_CUSTOMER_SOURCE=local|dataverse` (producción `dataverse`) y `VITE_PRODUCT_SOURCE=local|dataverse` (default/producción `local`).
- Repositories/Application Services: Customer y Product separados; la UI no recibe nombres físicos Dataverse.
- Alternativa temporal: `localCustomerProvider.js`, con cinco clientes claramente ficticios desde `customerFixtures.js` e inyección opcional de otros fixtures.
- Backend: `server/`, portable y sin dependencias de Render/Azure; reutiliza OAuth, cache de token, Dataverse Client, diagnóstico general sanitizado, JWT, CORS y rate limiting para Customer/Product.
- Entity Sets confirmados: `accounts` para Customer y `productpricelevels` para Product.
- Mapping confirmado dentro de Account Customer Gateway: `new_codigocliente` → `customerCode`, `name` → `customerName`, `crbbe_nombrepais` → `country` y `new_tipocliente@OData.Community.Display.V1.FormattedValue` → `String(value).trim()` → `customerType`. El valor numérico de `new_tipocliente` no se expone; la ausencia de FormattedValue produce `customerType: ''`. El Choice global asociado es `new_tipoclienteglobal`, pero no se consulta por búsqueda porque la anotación entrega la etiqueta en la misma respuesta.
- API Customer: búsquedas por código/nombre y lectura por código. API Product: `GET /api/products/brands` y `GET /api/products/master?brand=<brand>`; `brand` es el único parámetro funcional de Maestro, obligatorio y máximo 100 caracteres. Select/filtro/orden/paginación se construyen solo en backend; parámetros desconocidos, duplicados y OData libre se rechazan.
- Autenticación: dos fronteras separadas. Vercel usa MSAL/Microsoft Entra ID y entrega al backend portable un Bearer delegado para Customer/Product; Render valida firma, issuer, audience, tenant y scope mediante `AUTH_*`. El backend obtiene aparte su token OAuth 2.0 `client_credentials` mediante `DV_*` para consultar Dataverse; su scope se deriva de `DV_BASE_URL` y se cachea con margen de seguridad.
- Seguridad: variables, secretos y access token `DV_*` solo backend. MSAL usa `VITE_AUTH_TENANT_ID`, `VITE_AUTH_CLIENT_ID` y `VITE_AUTH_API_SCOPE`; `getAccessToken` intenta `acquireTokenSilent` y deriva a `loginRedirect` cuando falta sesión o se requiere interacción. El token delegado se limita al header Bearer del Provider frontend; UI, Repository y Service no conocen JWT, nombres lógicos ni OData.
- Cache frontend: administrado por MSAL en `sessionStorage`; no existe almacenamiento manual de access tokens ni client secret de SellThrough-Web.
- CORS: allowlist desde `ALLOWED_ORIGINS`; wildcard rechazado.
- Autenticación API: Bearer JWT delegado obligatorio en rutas Customer y Product; firma/JWKS, issuer, audience, expiración, tenant y scope validados con configuración `AUTH_*` separada.
- Rate limiting: por IP antes de Auth y por identidad después de Auth; 429 con `Retry-After`. Store in-memory temporal e inyectable.
- Health: `GET /health` anónimo, sin consultas a Entra, Dataverse o Customer Service.
- Probe JWT Phase1-007: `GET /api/customers/search?type=code` sin `q`; después de autenticar debe responder `400 / INVALID_CUSTOMER_REQUEST` antes de Customer Gateway. Este resultado valida la frontera usuario→API, no Dataverse.
- Smoke Dataverse Phase1-010B/011: búsqueda protegida `GET /api/customers/search?type=code&q=CL0000041`, activada sólo mediante `?phase1-010b-smoke=1`; resultado real `HTTP 200`, JWT aceptado, request Dataverse intentado, exactamente un Customer y diagnóstico nulo. Se conserva sólo la cantidad, nunca el payload Customer, y el arnés permanece disponible temporalmente.
- Smoke Product Phase1-042: activado solo mediante `?phase1-042-product-smoke=1&brand=<marca explícita>` y dirigido a `GET /api/products/master?brand=<brand>`. Sin marca controlada devuelve `SMOKE_BRAND_REQUIRED` y no consulta la API. Conserva cuenta MSAL, Bearer delegado, timeout de 35 000 ms y resumen sanitizado sin publicar la marca ni datos Product, token, headers o query.
- Diagnóstico seguro Phase1-020/057/059/061: conserva `DATAVERSE_INVALID_FIELD_OR_FILTER` y la observabilidad derivada de `invalid_response`; un rechazo de fetch se reduce a `NETWORK_TIMEOUT`, `NETWORK_ABORTED`, `NETWORK_FETCH_FAILED`, `NETWORK_INVALID_URL` o `NETWORK_UNKNOWN`, más timeout configurado y booleanos de token/base URL. Un fallo del Entra Token Provider ocurre antes de fetch y no se clasifica como red Dataverse. No se registran error/message/stack originales, URL/host/query, Entity Set/filtros, tokens/Authorization, secretos, tenant/client id, payload, SKU ni datos Product/Customer. Phase1-061 eleva **temporalmente** el timeout Dataverse Client de 10 000 ms a 30 000 ms: `getToken()` y headers ocurren antes, `AbortController`/timer nacen inmediatamente antes de `fetchImpl()` y el cleanup inmediato excluye parse/shape del presupuesto. Aplica al fetch HTTP del cliente compartido por Product y Customer; el Token Provider conserva su timeout independiente de 10 000 ms. Los 30 000 ms deberán reevaluarse después de validar Product Master y de definir por separado cualquier optimización de consulta/paginación. Los diagnósticos temporales Product Phase1-046/048/050/052 y Customer Phase1-022/024 continúan fuera del runtime.
- Hosting: Render temporal mediante `VITE_API_BASE_URL`, Azure objetivo; ningún hostname de hosting está codificado en módulos Customer/Product/Dataverse.

Los secretos, tokens y permisos no se versionan. Los IDs públicos de la SPA, scope delegado y endpoint temporal se documentan como variables frontend; los comentarios históricos de `dataService.js` no constituyen otra integración ni un contrato adicional.

## DS-007 — Business Central

No existe acceso implementado ni contrato documentado. Solo rige la restricción arquitectónica de que los componentes React no accedan directamente a esta fuente.

## Salidas, no fuentes

CSV, Excel y la impresión del informe se generan desde resultados en memoria. No se vuelven a ingerir ni se consideran sistemas de registro.

## Trazabilidad de procedencia

| Dato calculado | Procedencia principal |
| --- | --- |
| Estado, categoría, fechas y URLs de producto | Maestro local o contrato Product; Product Dataverse permanece no activado |
| Origen | Inventario; USA por defecto si falta |
| Costo aplicado | `priceUSA`/`priceChina` del Maestro, seleccionado por origen del Inventario; `null` se preserva cuando el precio elegido no está disponible |
| Inventarios, compras y ventas | Inventario |
| Semanas estándar y umbral de merma | JSON local vía Local Provider y Repository |
| Safety stock y lead times | Configuración de sesión vía Local Provider y Repository |
| Código, nombre, país y tipo del cliente | En producción: Vercel → Customer API con Bearer MSAL → Account Customer Gateway → Dataverse `accounts`; `customerType` procede exclusivamente de la etiqueta FormattedValue de `new_tipocliente`. Fixtures locales quedan como fallback de desarrollo |
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

PHASE1-005 no activó una fuente remota ni modificó mappings Dataverse. En ese hito `VITE_CUSTOMER_SOURCE=local` mantuvo fixtures exclusivamente locales y ficticios; Phase1-032 registra la activación productiva posterior y `datos.json` conserva las fuentes del flujo sell-through.

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
JWT, headers `Authorization`, secretos ni claims sensibles. Los pendientes que
ese hito dejó sobre activación del Provider, `customerType`, búsqueda por nombre
y estados de error/cero resultados quedaron implementados y cerrados por
Phase1-032. Render sigue como backend transitorio y Azure como migración futura.

PHASE1-012 cubre en frontend las búsquedas por código y nombre mediante la misma
Customer API, una única selección Customer, fallback `customerType: ''`, cero
resultados, sesión ausente, categorías HTTP, red, timeout, deduplicación y
respuestas obsoletas. En ese hito la UI aún consumía fixtures; Phase1-032
registra `VITE_CUSTOMER_SOURCE=dataverse` y la integración productiva validada.

PHASE1-015 centralizó originalmente en Account Customer Gateway las tres reglas
de elegibilidad de `accounts`. Phase1-022 demostró después que los nombres
provisionales `customertype` y `crbbe_estadocliente` eran inválidos; los valores
3/0/4 y la combinación mediante AND con el predicado específico permanecieron
como reglas obligatorias.

PHASE1-016 agrega `new_tipocliente` al `$select` común de las tres consultas
Customer y mantiene el nombre lógico dentro de Account Customer Gateway.
Phase1-029 finaliza el contrato: solo la anotación FormattedValue se normaliza
como `customerType`; el valor numérico se ignora y el nombre lógico no sale de
la capa Dataverse.

PHASE1-024 habilitó la lectura temporal y reducida de metadata que confirmó en
producción `customertypecode` (`CustomerTypeCode`, Picklist, opción 3 = Cliente)
y `crbbe_estadodelcliente` (`crbbe_EstadoDelCliente`, Picklist, opción 4 =
Cliente). También confirmó separadamente `statecode eq 0` y que
`new_tipocliente` es seleccionable.

PHASE1-026 aplica definitivamente `customertypecode eq 3 and statecode eq 0 and
crbbe_estadodelcliente eq 4` en búsqueda por código, búsqueda por nombre y
lectura exacta por código. Conserva `$select` con `new_tipocliente`, retira por
completo los diagnósticos temporales Phase1-022/024 y preserva los diagnósticos
sanitizados Phase1-020.

PHASE1-029 obtiene `customerType` exclusivamente desde
`new_tipocliente@OData.Community.Display.V1.FormattedValue`, aplica `trim()` y
usa `''` cuando la anotación no existe. `new_tipoclienteglobal` no se consulta
por búsqueda y el valor numérico no forma parte del contrato Customer.

PHASE1-032 registra la fuente Dataverse activa y validada en producción, sin
cambiar filtros, mappings, contratos, autenticación ni providers. Render es el
hosting transitorio actual del backend portable; Azure sigue siendo el destino
de migración y requerirá un hito independiente.
