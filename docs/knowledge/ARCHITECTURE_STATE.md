# Estado vigente de arquitectura

## Fase actual

PHASE1-092 queda **PASS / IMPLEMENTED LOCALLY / NOT DEPLOYED**. La UI consume
exclusivamente `imageUrl` y `productUrl` del contrato
Product normalizado mediante `ProductSkuCell`: miniatura compacta con fallback,
alt basado en SKU y enlace seguro en nueva pestaña. Solo `http:`/`https:` son
válidos; otros esquemas o URLs inválidas nunca se renderizan como imagen/link.

El componente se aplica a las once tablas SKU del Dashboard, las tres tablas
SKU del Informe Ejecutivo y Producto Héroe. El único gap derivado encontrado,
Inventario en tránsito, conserva ahora ambos campos al agregarse. Datos
Completos continúa como hoja Excel sin imágenes binarias; distribuciones,
diagnóstico y referencias agregadas no cambian porque no contienen filas por
producto. Providers local/Dataverse, mappings backend, Customer, precios,
filtros, New, EOL, reposición, Brands y exportaciones permanecen intactos.

La validación local cierra con frontend 405/405 y build Vite correcto; backend
no se ejecuta porque no cambió ningún archivo bajo `server/`.

La validación visual desktop/mobile y cualquier deploy requieren autorización
externa separada. Phase1-092 no modifica backend ni sistemas externos.

PHASE1-090 queda **IMPLEMENTED LOCALLY / NOT DEPLOYED**. Después de los filtros
comerciales y de marca vigentes, Product Price Level Gateway agrupa por
`SKU + ORIGIN + BUYER COMPANY` y conserva únicamente las filas empatadas en
`MAX(createdon)`. La selección precede a conflictos PRICE, conflictos de
atributos y consolidación Product; una fila histórica ya no compite con la
vigente. Un empate incompatible en el máximo conserva
`PRODUCT_MASTER_CONFLICT`, sin segunda precedencia.

USA y CHINA se resuelven independientemente antes del pivot. Compradores
distintos también se resuelven por separado y luego conservan el conflicto
cross-buyer vigente si sus filas actuales son incompatibles. `creationDate`
representa el mayor `createdon` entre todas las filas vigentes del SKU y
Producto Nuevo mantiene su comparación estricta `<90 días` sobre esa fecha.

La muestra local SKULLCANDY Phase1-089 consolida 426 filas en 362 productos con
0 conflictos restantes. No cambian query, filtros, Brands, contratos, mappings,
semántica `0|null`, Customer, providers, seguridad, timeouts, tracing ni
infraestructura. La validación local cierra con backend 137/137, frontend
391/391 y ambos builds correctos. La evidencia final queda en el log
Phase1-090; deploy y validación alojada requieren autorización externa separada.

PHASE1-087 queda **IMPLEMENTED LOCALLY / NOT DEPLOYED**. Product Master amplía
el filtro Dataverse previo a paginación con
`crbbe_origen ne null and crbbe_origen ne ''`, además de compradores,
comparación compañía-comprador y marca obligatoria. Brands comparte ese mismo
universo antes de `$apply/filter/groupby`, por lo que no ofrece marcas que solo
tengan filas Product sin origen válido. Node conserva una defensa equivalente
para respuestas upstream inesperadas.

Las filas de origen null, vacío o solo espacios no participan en consolidación
ni conflictos. Los conflictos debidos exclusivamente a esas filas desaparecen;
precios diferentes dentro del universo válido continúan bloqueando sin
precedencia ni regla de último precio. El gap-check de Phase1-084 no encontró
conexiones rotas en KPI/tabla de nuevos, `creationDate`, Excel de tránsito y
reposición, rotación, EOL o Trimestral=13; no se reimplementó ninguno.

No cambian contratos, pivot USA/CHINA, semántica `0|null`, Customer, providers,
seguridad, fuentes, timeouts, infraestructura ni la regla Producto Nuevo
`<90 días`. La evidencia final queda en el log Phase1-087; la validación real
posterior a un deploy autorizado permanece externa.

PHASE1-084 queda **PASS LOCAL / REAL DATAVERSE VALIDATION PENDING / NOT
DEPLOYED**. El
Product Price Level Gateway restringe el universo comercial en Dataverse con
los dos compradores autorizados y la comparación de columnas de la misma fila
`crbbe_nombrecompania eq crbbe_companiacompradora`; Product Master añade luego
la marca obligatoria y Brands aplica la misma condición dentro de
`$apply=filter(...)/groupby((crbbe_nombremarca))`. Node conserva una defensa
equivalente, sin sustituir el filtro upstream ni descargar el conjunto global.

Producto Nuevo reutiliza la regla aprobada `<90 días` desde `creationDate` del
Product Master. El Application Service ya cruza esos SKU contra Inventario y el
Dashboard presenta el KPI y la nueva tabla de ausentes sin calcular reposición.
El record analítico conserva `creationDate` para Datos Completos. Excel reutiliza
los datasets calculados para Tránsito, Reposición sugerida y Nuevos no
presentes. SKU Activos explica índice/colores; la base EOL documenta los cuatro
estados reales y mantiene descuentos como referencia interna. Trimestral
permanece en el motor vigente con 13 semanas.

No cambian contratos HTTP, mappings Product públicos, pivot USA/CHINA,
semántica `0|null`, conflictos residuales, Customer, seguridad, fuentes,
timeouts o infraestructura. La validación local cerró con backend 125/125,
frontend 391/391, ambos builds y `git diff --check` sin errores. La validación
real de SKULLCANDY después de un deploy autorizado permanece externa a este
hito; Phase1-084 no despliega.

PHASE1-081 queda **PASS — REAL DATAVERSE BRAND-TO-PRODUCT FLOW READY /
FRONTEND ACTIVATION PENDING / LOCALLY VALIDATED / NOT DEPLOYED**. La causa del
ComboBox vacío era la selección efectiva `VITE_PRODUCT_SOURCE=local` (también
default cuando falta la variable): la Factory construía `LocalProductProvider`
y la cadena normal nunca alcanzaba `DataverseProductProvider` ni
`GET /api/products/brands`. No existía un bypass UI ni un error del endpoint.

Con fuente `dataverse`, el flujo normal queda `App -> Product Application
Service -> Repository -> Provider Factory -> DataverseProductProvider ->
/api/products/brands`; las 33 marcas pueden llegar al ComboBox sin límites ni
transformaciones físicas. Seleccionar una marca inicia inmediatamente
`loadProducts({ brand })`, conserva una sola solicitud pendiente por marca y
usa exclusivamente `/api/products/master?brand=<marca codificada>`.

El dataset Product queda asociado a la marca seleccionada. A→B invalida y
vacía A antes de iniciar B; una respuesta tardía de A se descarta y no puede
alimentar el análisis. Sin marca no se carga Product Master y no existe carga
global o fallback. `VITE_PRODUCT_SOURCE` conserva `local|dataverse`; no se
modificó la variable externa y producción requiere todavía activarla y
reconstruir el frontend. Customer, Provider local, mappings Product,
MSAL/Bearer, AbortController y timeout Product de 35 000 ms permanecen
intactos. No hubo cambios backend.

PHASE1-079 queda **PASS — EXISTING PRODUCT MASTER SMOKE REQUIRES BRAND /
SANITIZED / FRONTEND-ONLY / LOCALLY VALIDATED / NOT DEPLOYED / NOT EXECUTED**.
El arnés Phase1-042 se activa exclusivamente con
`?phase1-042-product-smoke=1&brand=<marca>`; lee `brand` mediante
`URLSearchParams`, aplica `trim()`, exige entre 1 y 100 caracteres y construye
con `URL.searchParams` únicamente
`GET /api/products/master?brand=<marca codificada>`. Sin trigger exacto o con
marca inválida no existe autenticación ni request.

Se preservan MSAL/Bearer, timeout de 35 000 ms, AbortController/cleanup y el
resultado Product sanitizado. No se registran marca, URL completa, token,
claims, headers ni Product data. Product Provider normal, backend, Customer,
Dataverse, mappings, filtros, Brands/groupby, tracing, variables y el smoke
Phase1-075 permanecen intactos. `VITE_PRODUCT_SOURCE=local` continúa vigente.

PHASE1-077 queda **PASS — SERVER-SIDE BRAND GROUPBY IMPLEMENTED / FILTERED
PRODUCT MASTER PRESERVED / LOCALLY VALIDATED / NOT DEPLOYED / NOT MEASURED IN
PRODUCTION**. `GET /api/products/brands` sustituye el recorrido global de
`retrieveAll()` por una consulta Dataverse estructurada con
`$apply=filter(...)/groupby((marca))`: los dos compradores autorizados se
filtran antes de agrupar exclusivamente la marca. OData no ofrece `$distinct`.
El backend conserva trim, exclusión de vacíos, deduplicación defensiva, orden y
el contrato `{ brands: [] }` sin publicar OData o LogicalNames.

Dataverse Client incorpora `retrieveGrouped` con `groupBy` validado; el Gateway
construye filtro/campo desde constantes internas y el frontend continúa sin
enviar OData. Brands deja de generar trazas de paginación y emite un cierre
agregado seguro Phase1-066 con operación, elapsed, registros retornados y
`requestCompleted`; Phase1-068 permanece intacto para Product Master.

Product Master conserva marca obligatoria/escapada antes de `retrieveAll()`,
sin fallback global ni cambios en `$orderby`, mappings, precios, conflictos o
Customer. La prueba A→B confirma consultas y datasets independientes. UI y
timeouts 30.000/35.000 ms permanecen intactos; solo una medición posterior al
deploy permitirá decidir su reducción.

PHASE1-075 queda **PASS — TEMPORARY AUTHENTICATED PRODUCT BRANDS SMOKE /
SANITIZED / FRONTEND-ONLY / NOT DEPLOYED / NOT EXECUTED / PRODUCT SOURCE
UNCHANGED**. El trigger exacto `?phase1-075-brands-smoke=1` reutiliza la sesión
MSAL y el token delegado para ejecutar exclusivamente
`GET /api/products/brands` contra la API configurada. Sin ese valor no
inicializa autenticación, no adquiere token y no genera tráfico. El request es
directo y no pasa por Product Provider Factory.

El timeout exclusivo del arnés es 35 000 ms, con AbortController, señal en el
fetch y cleanup. La consola recibe únicamente `httpStatus`,
`renderJwtValidation`, `dataverseRequest`, `diagnostic` y `brandsReturned`.
Este último es solo un número: cuenta strings en `brands`; el array, Product
data, SKU, precios, URLs, tokens, claims, headers, payloads, nextLink y query no
se publican. Errores HTTP, red, timeout y respuestas inválidas usan la
taxonomía sanitizada del smoke Product existente.

Phase1-075 no modifica backend ni los eventos
`PHASE1_066_PRODUCT_REQUEST_TRACE` / `PHASE1_068_PRODUCT_PAGINATION_TRACE`, que
una futura ejecución única y autorizada deberá provocar con
`operation=PRODUCT_BRANDS`. `VITE_PRODUCT_SOURCE=local` continúa vigente; el
Product normal, Product Master smoke y Customer no cambiaron. El arnés debe
retirarse después del diagnóstico.

PHASE1-073 queda **PASS — PRODUCT BRANDS TRACE ALIGNED / PRODUCT PROVIDER
TEMPORARY 35 S TIMEOUT / BRANDS QUERY UNCHANGED / NOT DEPLOYED / NOT
ACTIVATED**. `GET /api/products/brands` crea ahora el mismo contexto efímero y
allowlisted de Phase1-066/068 que Product Master y lo propaga por Product Route
→ Product Service → Product Price Level Gateway → Dataverse Client. Los eventos
de request y paginación comparten un único `traceId` por request e incorporan
la clasificación técnica interna `PRODUCT_BRANDS`; Product Master conserva
`PRODUCT_MASTER`. La clasificación no forma parte de la respuesta frontend.

Brands emite recepción, autenticación, inicio de servicio, token, fetch y
respuesta, además de página incremental, elapsed de fetch, registros devueltos,
presencia booleana de next link, acumulado y totales. Los esquemas permanecen
cerrados a metadata técnica segura; Customer no crea ni propaga el contexto y
no genera `PHASE1_066_PRODUCT_REQUEST_TRACE` ni
`PHASE1_068_PRODUCT_PAGINATION_TRACE`.

El timeout default del Dataverse Product Provider real aumenta temporalmente de
10 000 a 35 000 ms tanto para `loadBrands()` como para
`loadProducts({ brand })`. Conserva AbortController, error sanitizado, inyección
y cleanup. Customer Provider permanece en 10 000 ms, el fetch backend
Dataverse en 30 000 ms y el smoke Product en 35 000 ms. Los 35 s del Provider
Product deben reevaluarse después de medir y optimizar Brands/Product Master.

La consulta Brands no se optimiza en este hito: continúa sobre
`productpricelevels`, filtro de compradores, proyección vigente y
`retrieveAll()`, seguida por selección de marca, `trim()`, deduplicación y
orden. No se añadieron cache, `$apply/groupby`, índices, tabla auxiliar, page
size, `$orderby` alternativo ni paralelización. Product Dataverse sigue sin
activarse; la optimización queda pendiente de medición productiva autorizada.

PHASE1-070 queda **PASS — PRODUCT BRAND PREFILTER IMPLEMENTED / GLOBAL PRODUCT
LOAD BLOCKED / LOCAL PARITY PRESERVED / NOT DEPLOYED / NOT ACTIVATED**. La UI
de Configuración mantiene `selectedCustomer` y `selectedBrand` separados y
consulta marcas mediante Application Service → Repository → Product Provider.
El Provider Dataverse consume exclusivamente `GET /api/products/brands`; el
backend obtiene la lista desde `productpricelevels` con una proyección limitada
a `crbbe_nombremarca` y `crbbe_companiacompradora`, aplica el filtro empresarial
de compradores antes de `retrieveAll()`, normaliza con `trim()`, excluye vacíos,
deduplica exactamente y ordena de forma determinística. No usa el Product
Master completo ni su consolidación para construir la lista.

`GET /api/products/master?brand=<brand>` exige un único `brand` string, trimmed,
no vacío y de máximo 100 caracteres; parámetros desconocidos, duplicados y
OData libre se rechazan. Product Service valida antes del Gateway y este añade
`crbbe_nombremarca eq '<valor escapado>'` al filtro de compradores antes de la
primera llamada `retrieveAll()`. Sin marca no existe consulta Dataverse ni
fallback global. El Provider local expone la misma lista normalizada y filtra
su Product Master por la marca seleccionada.

El ComboBox Marca carga una sola vez bajo demanda, deduplica la solicitud
pendiente, filtra la lista de marcas para búsqueda local, ofrece estados de
loading/cero/error sanitizado y selección por mouse o teclado. Cambiar o editar
la marca limpia resultados dependientes; la siguiente carga envía solo
`{ brand }`. `VITE_PRODUCT_SOURCE=local` sigue siendo el default y Product
Dataverse no se activó. `PHASE1_066_PRODUCT_REQUEST_TRACE`,
`PHASE1_068_PRODUCT_PAGINATION_TRACE`, el fetch backend de 30 000 ms y el smoke
frontend de 35 000 ms permanecen intactos.

PHASE1-068 queda **PASS — PRODUCT MULTI-PAGE ROOT CAUSE PROVEN / TEMPORARY
PAGINATION TRACE ADDED / SANITIZED / PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED
/ NOT ACTIVATED**. Los cinco ciclos secuenciales aportados bajo un mismo
`traceId` nacen de una única llamada Gateway a `retrieveAll()`: su `while
(url)` ejecuta una página mediante `retrievePage()`, acumula `value` y continúa
exclusivamente con el `@odata.nextLink` validado del mismo origen/path. Product
no usa `retrieveMultiple()`, no contiene retries y no repite el Gateway.

Los cinco fetch acumulan 51.534 s, promedian 10.307 s y representan cerca del
94.5 % de los 54.531 s conocidos hasta el último fetch. La consulta conserva
`productpricelevels`, sus trece campos, el filtro de dos compañías y el orden
vigente; no define `$top` ni `odata.maxpagesize`. `Prefer` contiene únicamente
FormattedValue, por lo que Dataverse decide el tamaño efectivo de página.

Cada página sí llama `getToken()`, pero Entra Token Provider reutiliza
`cachedToken` hasta `validUntil` y comparte `pendingToken`: los checkpoints
Phase1-066 no demuestran una solicitud OAuth de red por página. La etapa no es
material frente a los 8.639–11.231 s de cada fetch con la evidencia disponible.

Como el código no revela registros reales por página, el contexto temporal
Product incorpora `PHASE1_068_PRODUCT_PAGINATION_TRACE`: inicio de página,
final con número/tiempo/conteos/next-link booleano/acumulado y resumen con
páginas/registros/fetch total. Los esquemas son allowlisted, no reciben datos,
URLs/query/next link/identidad/credenciales y Customer no los genera. No se
envían al frontend. Timeouts, consulta, reglas y fuente normal permanecen sin
cambios.

PHASE1-066 queda **PASS — TEMPORARY PRODUCT REQUEST TRACE IMPLEMENTED /
SANITIZED / PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED IN PRODUCTION / NOT
ACTIVATED**. `GET /api/products/master` genera un `traceId` aleatorio mediante
`randomUUID()` y lo propaga solo por argumentos internos desde Product API
hasta Product Service, Product Price Level Gateway y Dataverse Client. Ocho
checkpoints permiten distinguir recepción, JWT validado, inicio del servicio,
adquisición del token, fetch Dataverse y `finish` de la respuesta HTTP.

Cada evento `PHASE1_066_PRODUCT_REQUEST_TRACE` queda limitado a `component`,
`diagnosticId`, `stage`, `elapsedMs`, `result` y `traceId`; no recibe request,
identidad, headers, URL/query, payload, error ni dato comercial. Customer no
crea el contexto y el cliente compartido solo emite checkpoints cuando Product
lo propaga explícitamente. La observabilidad `DATAVERSE_*`, `NETWORK_*` e
`invalid_response` permanece intacta y complementaria.

La instrumentación es temporal, no corrige todavía el timeout y debe retirarse
al identificar la causa raíz. Product Dataverse continúa sin activarse como
fuente normal. La evidencia de entrada confirma que producción conserva el
smoke frontend temporal de 35 000 ms y el fetch Dataverse de 30 000 ms; este
hito no modifica ninguno.

PHASE1-064 queda **PASS — TEMPORARY PRODUCT SMOKE TIMEOUT ALIGNED / FRONTEND-ONLY / NOT DEPLOYED / NOT EXECUTED / NOT ACTIVATED**. El arnés temporal Phase1-042 eleva exclusivamente su timeout default de **10 000 ms** a **35 000 ms** para permitir que el backend complete su ventana Dataverse temporal de 30 000 ms y disponga de 5 000 ms adicionales para Render, serialización, respuesta HTTP y lectura de `response.json()`.

La ventana se crea inmediatamente antes del único `fetch` Product smoke, conserva dependency injection, pasa el `AbortSignal` al request y limpia siempre el timer. Al vencer continúa abortando el fetch y devolviendo únicamente `REQUEST_TIMEOUT` sanitizado. El cambio no configura la aplicación normal, Product Provider, Product Gateway ni Dataverse Client; el backend conserva 30 000 ms exclusivamente para su fetch hacia Dataverse.

PHASE1-061 queda **PASS — TEMPORARY 30 SECOND DATAVERSE FETCH TIMEOUT / TOKEN BUDGET ISOLATED / PRODUCT AND CUSTOMER REGRESSION COVERED / NOT DEPLOYED / NOT ACTIVATED**. Dataverse Client eleva temporalmente su timeout HTTP de **10 000 ms** a **30 000 ms** para permitir una validación posterior de Product Master contra Dataverse real. No es una optimización definitiva y deberá reevaluarse después de esa validación, junto con consulta/paginación si corresponde mediante autorización separada.

`retrievePage()` adquiere primero el token backend y prepara los headers; solo entonces crea `AbortController` y timer inmediatamente antes de `fetchImpl()`. El `finally` inmediato de fetch limpia el timer antes de clasificar la respuesta, parsear JSON o validar shape. Los 30 000 ms pertenecen exclusivamente al fetch HTTP Dataverse: `getToken()` no consume ese presupuesto y Entra Token Provider conserva su timeout independiente de 10 000 ms. El cliente compartido aplica esta ventana de transporte a Product y Customer sin cambiar sus gateways o contratos.

Se preservan `NETWORK_TIMEOUT`, `NETWORK_ABORTED`, `NETWORK_FETCH_FAILED`, `NETWORK_INVALID_URL`, `NETWORK_UNKNOWN` y los indicadores `timeoutConfiguredMs`, `tokenAcquired`, `baseUrlConfigured`, `baseUrlProtocolValid`. También permanece intacta la observabilidad Phase1-057 para HTTP 200 inválido: `parseSuccess`, `hasValueArray`, `hasNextLink`, `bodyType` y `contentTypeValid`. Timers simulados cubren la frontera 29 999/30 000 ms, cleanup, fallo de token y regresión Product/Customer sin esperas reales.

PHASE1-059 queda **PASS — NETWORK CATCH ISOLATED / SAFE TRANSPORT CLASSIFICATION ADDED / PHASE1-057 TRANSPORT REGRESSION DISCARDED / PRODUCTIVE CAUSE PENDING / NOT DEPLOYED / NOT ACTIVATED**. El `DATAVERSE_NETWORK_ERROR` previo nacía en el catch amplio de `retrievePage` después de asignar `dataverseRequestStarted=true`: agrupaba cualquier excepción posterior a `getToken()`, incluidos rechazo de `fetch`, aborto/timeout y construcción inválida de headers. La frontera queda explícita: solo una excepción lanzada por `fetchImpl` emite ahora el diagnóstico de red y se reduce a `NETWORK_TIMEOUT`, `NETWORK_ABORTED`, `NETWORK_FETCH_FAILED`, `NETWORK_INVALID_URL` o `NETWORK_UNKNOWN` usando únicamente tipo, nombre, código seguro y el estado interno del timer.

El evento de red conserva el contrato público genérico y añade exclusivamente `networkCategory`, `timeoutConfiguredMs`, `tokenAcquired`, `baseUrlConfigured` y `baseUrlProtocolValid`; no incorpora error original, message, stack, URL, host, query, Entity Set, filtros, tokens, Authorization, secretos, tenant, client id, SKU, Product data o payload. Las pruebas demuestran el orden token → fetch y que un fallo de token no ejecuta fetch ni se clasifica como red Dataverse. En Phase1-059, antes del ajuste temporal Phase1-061, el timeout Dataverse Client permanecía en **10 000 ms** y se iniciaba antes de solicitar el token; el Entra Token Provider ya mantenía su timeout independiente de 10 000 ms. El único Dataverse Client compartido por Product y Customer aplica la misma ventana a ambos gateways. Un timeout podía explicar técnicamente una ejecución sin `Response`, pero la evidencia productiva disponible todavía no demostraba esa categoría.

La comparación de `791c8b7^` con Phase1-057 (`791c8b7`) confirma que ese hito no cambió fetch, AbortController, headers ni las condiciones funcionales de parse/aceptación: solo añadió metadata derivada después de una respuesta inválida. Por ello Phase1-057 **no introdujo una regresión de transporte** capaz de explicar HTTP 200 → network error. La causa productiva concreta queda pendiente de una ejecución posterior y autorizada con la nueva clasificación; no se asume una caída de Dataverse.

PHASE1-057 queda **PASS — INVALID 200 CONDITION IDENTIFIED / PRODUCT ROOT CAUSE NOT YET CONFIRMED / SAFE RESPONSE-SHAPE OBSERVABILITY ADDED / NOT DEPLOYED / NOT ACTIVATED**. Con `response.ok = true`, Dataverse Client emite `DATAVERSE_UPSTREAM_ERROR / invalid_response` en dos casos: `response.json()` lanza durante el parse, o el JSON parseado no cumple `Array.isArray(payload?.value)`. El evento previo no distinguía ambas rutas, por lo que la causa específica de la respuesta Product observada no puede confirmarse sin una nueva ejecución autorizada.

El contrato estándar Dataverse `{ "@odata.context": "...", "value": [...] }` ya es compatible. `value: []` también es válido; `retrieveAll` sigue un `@odata.nextLink` string del mismo origen y path API permitido, mientras `retrieveMultiple` devuelve solo `value`. Content-Type no participa en la aceptación actual: `response.json()` decide el parse. Sin cambiar esa lógica, el diagnóstico inválido incorpora exclusivamente `hasValueArray`, `hasNextLink`, `bodyType`, `contentTypeValid` y `parseSuccess`; no registra body, payload Product ni valores comerciales.

PHASE1-055 queda **PASS — PRODUCT URL LOGICAL NAME CORRECTED / TEMPORARY DIAGNOSTICS REMOVED / NOT DEPLOYED / NOT ACTIVATED**. El LogicalName Dataverse confirmado para el URL de Product Master es `crbbe_urlproducto`; el nombre anterior `producturl` era incorrecto. Product Price Level Gateway usa ahora `crbbe_urlproducto` en `$select` y lo normaliza exclusivamente como `productUrl`, con `trim()` y fallback `""` para `null`, `undefined` o texto vacío. El contrato público conserva `productUrl` y no expone el nombre físico.

Phase1-046 y Phase1-048/050/052 quedaron retirados del runtime: se eliminaron los módulos de probes/metadata, sus imports y hooks en el gateway, el estado once-per-process, las rutas temporales del Dataverse Client y las pruebas exclusivas del diagnóstico. No quedan consultas runtime a `EntityDefinitions`/`Attributes` ni eventos `PHASE1_046_PRODUCT_QUERY_PROBE` o `PHASE1_048_PRODUCT_URL_METADATA`. El diagnóstico general sanitizado Dataverse de Phase1-020 permanece intacto y continúa clasificando fallos HTTP/OData, respuestas inválidas y red.

Maestro Producto dispone de una ruta intercambiable `local|dataverse` mediante `VITE_PRODUCT_SOURCE`, con `local` como default vigente. El backend portable incorpora `GET /api/products/master`; Product Price Level Gateway consulta exclusivamente `productpricelevels`, aplica en backend el filtro de compradores `IOCA USA INC` o `SAND SPORTS, CORP.`, pagina mediante Dataverse Client y consolida por SKU el pivot `USA -> priceUSA` / `CHINA -> priceChina`. La UI no envía OData y los LogicalNames permanecen exclusivamente en la integración backend.

El contrato normalizado frontend es `{ sku, productName, brand, category, discontinuationDate, fechaStr, creationDate, level, status, imageUrl, productUrl, priceUSA, priceChina }`. `fechaStr` se deriva con la única función `normalizeFechaStr`: fecha válida local/ISO/con hora produce `YYYY-MM-DD`, y ausencia o invalidez produce `""`, sin desplazar el día escrito por timezone. `discontinuationDate` y `creationDate` conservan `Date|null`. `level` y `status` solicitan FormattedValue; si falta, solo aceptan como fallback un valor fuente que ya sea texto y nunca publican códigos Choice numéricos. Antes de consolidar, Dataverse Product conserva `MAX(createdon)` por `SKU + ORIGIN + BUYER COMPANY`; los empates máximos permanecen para detectar incompatibilidades. Después, la consolidación ignora valores descriptivos vacíos, compara strings/URLs trimmed, `discontinuationDate` canónica y etiquetas FormattedValue trimmed, e impide que valores no vacíos divergentes de los ocho atributos Product restantes se consoliden silenciosamente. `creationDate` es el mayor `createdon` entre las filas vigentes del SKU. Tanto los conflictos de precio como los de atributo reutilizan `409 / PRODUCT_MASTER_CONFLICT`, se distinguen solo en metadata interna y mantienen el contrato público sanitizado. Phase1-038 fija `0 = precio real` y `null = precio no disponible`: `amount null|undefined` y un origen sin fila quedan en `null`, mientras las valorizaciones dependientes propagan `null` sin fallback. Render continúa transitorio, Azure sigue siendo el destino definitivo y no se activó Product Dataverse en producción.

## Último prompt aprobado

PHASE1-090 — Resolve Product Duplicates by Latest Record.

## Última auditoría aprobada

Claude Phase1-071 — Audit Product Brand Prefilter, ejecutada el 2026-08-18.
Sus tres blockers de observabilidad/timeout quedan resueltos por Phase1-073 sin
optimizar `/brands`, desplegar ni activar Product Dataverse.

## Servicios implementados

- `sellThroughApplicationService`: orquesta Repository, parsers, ensamblaje, Portfolio Analysis, Distribution Tier GOOD/BETTER/BEST/EOL y Pareto A/B/C.
- `PortfolioAnalysisService`: consolidación, tránsito, sin rotación, alertas, temporalidad agregada, KPIs, valorización y estructura final.
- `ExecutiveReportService`: Executive Summary con pares SKU/unidades/valores aplicables, valorización, KPIs, indicadores generales y resumen para Dashboard.
- Inventory Engine y EOL Engine: necesidad/reposición final, seguridad sobre proyectado, temporalidad, ciclo EOL, F4 y lista efectiva de fases para presentación.
- Master Parser, Inventory Parser y Record Assembler: normalización y records procesados.
- New Product Domain Service: regla estricta `< 90 días` desde `creationDate` y cruce de Nuevos no presentes sin calcular reposición.
- `sellThroughRepository` y Local Provider: frontera síncrona vigente de fuentes.
- `customerRepository`, Customer Master Application Service y contrato `Customer`: frontera asíncrona de búsqueda/selección con `{ customerCode, customerName, country, customerType }`; traduce códigos internos a mensajes UI seguros.
- Dataverse Customer Provider frontend: consume exclusivamente la Customer API configurada por `VITE_API_BASE_URL`, usa Bearer MSAL, aborta por timeout y normaliza sesión ausente, 401, 403, 429, 5xx, red y respuestas inválidas.
- UI Customer de Configuración: una única entidad seleccionada sincroniza código, nombre, país y tipo; invalida respuestas obsoletas A→B→A, deduplica el mismo request pendiente y controla cero resultados sin conservar la selección previa.
- MSAL frontend: configuración/cliente desacoplados, procesamiento de redirect, cuenta activa y adquisición silenciosa mediante `VITE_AUTH_TENANT_ID`, `VITE_AUTH_CLIENT_ID` y `VITE_AUTH_API_SCOPE`.
- Authentication Controls: inicio de sesión, identidad discreta y cierre de sesión sin almacenamiento manual de tokens.
- Real Dataverse Customer Smoke Test: validado end-to-end como PASS mediante el arnés temporal `?phase1-010b-smoke=1`; `CL0000041` produjo `HTTP 200`, exactamente un Customer, JWT aceptado y request Dataverse intentado, sin exponer token o payload Customer. El arnés se conserva temporalmente.
- Real Dataverse Product Master Smoke Test: el arnés temporal
  `?phase1-042-product-smoke=1&brand=<marca>` confirmó previamente llegada a
  Render, JWT aceptado e intento Dataverse. Phase1-079 exige ahora una marca
  trimmed de máximo 100 caracteres y consulta únicamente
  `GET /api/products/master?brand=<marca codificada>`, con `URLSearchParams` y
  sin OData libre. Exige sesión/token MSAL y publica solo `{ httpStatus,
  productsReturned, renderJwtValidation, dataverseRequest, diagnostic,
  hasPriceUSA, hasPriceChina, hasNullPrice, hasFormattedLevel,
  hasFormattedStatus }`. Su timeout temporal frontend es 35 000 ms, con
  AbortController y cleanup, y no configura la aplicación Product normal;
  puede retirarse eliminando su módulo, prueba y llamada aislada en `main.jsx`.
- Authenticated Product Brands Smoke Test: arnés temporal
  `?phase1-075-brands-smoke=1` que reutiliza sesión/token MSAL y llama
  directamente `GET /api/products/brands`, sin Product Provider Factory. Su
  timeout frontend es 35 000 ms con AbortController/cleanup y publica solo
  status, etapas técnicas, diagnóstico y el conteo numérico de strings; nunca
  el array de marcas. Está preparado, no desplegado ni ejecutado, y debe
  retirarse después del diagnóstico.
- Customer Provider Factory: selecciona `local` o `dataverse` mediante `VITE_CUSTOMER_SOURCE` y rechaza valores no soportados.
- Local Customer Provider: alternativa temporal con cinco fixtures ficticios normalizados e inyección opcional para pruebas.
- Product normalizer, Repository y Product Master Application Service: contratos `loadBrands()` y `loadProducts({ brand })` independientes de la fuente, con marca obligatoria para cargar Product y adaptación hacia Master Parser/Record Assembler que preserva `0`, `null` y `fechaStr`.
- Product Provider Factory: selecciona `local` o `dataverse` mediante `VITE_PRODUCT_SOURCE`; `local` continúa como default y reutiliza `masterParser.js` sin duplicar sus reglas.
- Dataverse Product Provider frontend: consume `GET /api/products/brands` y `GET /api/products/master?brand=...` mediante el transporte autenticado; solo conoce el contrato funcional `brand` y nunca OData o LogicalNames.
- Product Price Level Gateway backend: encapsula `crbbe_nombremarca` → `brand`,
  la consulta Brands `filter/groupby`, `crbbe_urlproducto` → `productUrl`, los
  demás mappings y el filtro compradores + marca aplicado antes de paginar,
  además de FormattedValue, consolidación y conflictos vigentes.
- Product Service/API: endpoints funcionales cerrados de marcas y Maestro filtrado, `brand` obligatoria de máximo 100 caracteres, JWT/CORS/rate limiter compartidos y rechazo de parámetros/OData no autorizados.
- Customer API backend portable: rutas cerradas, CORS por allowlist, Customer Service y composición independiente de hosting.
- Entra Token Provider y Dataverse Client: client_credentials, scope derivado, cache/expiración, timeout y errores normalizados.
- Diagnóstico seguro Dataverse Phase1-020/057/059/061: clasifica fallos HTTP/OData, respuesta inválida y red; para red añade solo categoría de transporte, timeout configurado y tres booleanos de estado seguros, nunca error/payload/URL/query/credenciales/PII.
- Trace temporal Product Phase1-066/073: correlaciona las rutas
  `GET /api/products/master` y `GET /api/products/brands` entre API,
  autenticación, Product Service y Dataverse Client mediante UUID efímero,
  eventos allowlisted y operación interna `PRODUCT_MASTER|PRODUCT_BRANDS`;
  Brands registra el cierre agregado y no fabrica páginas. No modifica
  contratos ni habilita logging general para Customer.
- Diagnóstico temporal Product Phase1-068: demuestra para Product Master que
  los múltiples fetch son páginas secuenciales de `retrieveAll()` y registra solo número de página,
  elapsed/fetch elapsed, conteos y presencia booleana de next link, más totales
  finales; no registra el enlace, query, filas ni datos Product/Customer.
- Diagnósticos temporales Product Phase1-046 y Phase1-048/050/052: retirados del gateway, Dataverse Client, runtime y pruebas después de confirmar `crbbe_urlproducto`; no quedan probes, consultas de metadata, guards one-shot ni observabilidad temporal Product.
- Diagnósticos temporales Customer Phase1-022/024: retirados del runtime, Dataverse Client y pruebas después de confirmar los nombres productivos; no quedan probes, consultas de metadata ni estado one-shot.
- Account Customer Gateway: único módulo productivo que conoce `accounts`, `new_codigocliente`, `name`, `crbbe_nombrepais`, `new_tipocliente` y su propiedad FormattedValue; normaliza los cuatro campos Customer, obtiene `customerType` exclusivamente desde la etiqueta Choice y aplica los LogicalNames confirmados `customertypecode`, `statecode` y `crbbe_estadodelcliente` con valores empresariales 3/0/4.
- Integración productiva de Maestro Cliente: fuente Dataverse activa en Vercel, Customer API autenticada en Render y acceso backend autorizado a Dataverse; búsqueda/selección preservan el contrato normalizado y no filtran nombres físicos fuera del gateway.
- Customer API Authenticator: frontera reusable JWT/JWKS con `jose`, separada del OAuth API→Dataverse, con diagnósticos internos normalizados y seguros por etapa de rechazo.
- Rate Limiter: límites por IP y `oid/sub`, store in-memory inyectable y respuesta 429/Retry-After.
- Health endpoint: `/health` anónimo y sin dependencias externas.
- Configuration Center Foundation: PAR-001, PAR-002 y PAR-003 con schema como fuente única de IDs/keys.

## Servicios pendientes

- Extracción futura de las narrativas consultivas restantes de `App.jsx` y Recommendation Engine: pendientes de alcance específico.
- Extracción futura de Distribution y Pareto: pendiente de prompt independiente.
- Render se mantiene como backend transitorio; la migración futura a Azure permanece pendiente.
- Store distribuido de rate limiting: obligatorio antes de múltiples instancias o escala horizontal en Azure.
- Activación productiva y validación real de `VITE_PRODUCT_SOURCE=dataverse`: pendientes de autorización separada; producción continúa en `local`.
- Redefinición de Sin origen, buckets/fases EOL, reposición para productos nuevos y fórmulas por Tipo de Cliente: no definidas y no implementadas.
- Configuration Center completo: pendiente migrar parámetros adicionales; el MVP visual y local está habilitado solo para el schema actual.

## Arquitectura vigente

```text
UI (App.jsx)
  -> Application Service
    -> Domain: Parsers / Record Assembler / Inventory / EOL / Portfolio / Executive Report
    -> Repository
      -> Local Provider
        -> fuentes locales y datos de sesión

Configuration Schema -> Configuration Service -> Repository

Carga Maestro Producto
  -> Product Master Application Service
    -> Product Repository
      -> Product Provider Factory (`VITE_PRODUCT_SOURCE`, default `local`)
        -> Local Product Provider -> Master Parser
        -> Dataverse Product Provider frontend
          -> Authenticated API Client / getAccessToken / MSAL
            -> Product API portable (`GET /api/products/brands` o
               `GET /api/products/master?brand=...`)
              -> Product Service
                -> Product Price Level Gateway
                  -> Dataverse Client / Entra Token Provider
                    -> Dataverse `productpricelevels`

Configuración UI
  -> Customer Master Application Service
    -> Customer Repository
      -> Customer Provider Factory (`VITE_CUSTOMER_SOURCE`)
        -> Local Customer Provider (fallback con fixtures ficticios)
        -> Dataverse Customer Provider frontend
          -> getAccessToken / MSAL Client (acquireTokenSilent + loginRedirect)
            -> Microsoft Entra ID (JWT delegado)
            -> Customer API portable / JWT Authenticator / Rate Limiter
              -> Customer Service
                -> Account Customer Gateway
                  -> Dataverse Client
                    -> Entra Token Provider (client_credentials separado)
                      -> Microsoft Entra ID / Dataverse
```

Arquitectura Customer validada en producción:

```text
Vercel
  → MSAL / Microsoft Entra ID
  → delegated access token
  → Render Customer API
  → JWT validation
  → backend client_credentials
  → Dataverse
  → accounts
```

Arnés Product ejecutado previamente; Entity Set confirmado y consulta anterior con `producturl` en HTTP 400:

```text
Vercel + `?phase1-042-product-smoke=1&brand=<marca>`
  -> initializeAuthentication / sesión MSAL existente
    -> getAccessToken / delegated access token
      -> GET Render `/api/products/master?brand=<marca codificada>`
        -> JWT Authenticator / Rate Limiter
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client -> `productpricelevels`
                -> resumen sanitizado en consola (sin Product payload)
```

Arnés Brands preparado y todavía no ejecutado:

```text
Vercel + `?phase1-075-brands-smoke=1`
  -> initializeAuthentication / sesión MSAL existente
    -> getAccessToken / delegated access token
      -> GET Render `/api/products/brands`
        -> JWT Authenticator / Rate Limiter
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client -> `productpricelevels`
                -> conteo sanitizado en consola (sin array Brands)
```

Distribution y Pareto permanecen en Application Service. Executive Report consume el DTO de Portfolio Analysis; presentación, narrativas y exportaciones permanecen en `App.jsx` sin acceder directamente a fuentes físicas.

## Siguiente hito

Revisar Phase1-079 y autorizar por separado checkpoint/deploy. Con la versión
Live y `VITE_PRODUCT_SOURCE=local` aún vigente, ejecutar una única medición
autenticada de Brands y una única medición Product Master con marca controlada;
comparar elapsed/conteos y decidir en otro hito si se reducen los timeouts
temporales. No activar Product Dataverse como fuente normal durante esas
mediciones.

## Decisiones congeladas

- Preservar comportamiento, fórmulas, defaults, ordenamientos y contratos públicos durante refactorizaciones.
- `BUSINESS_PARAMETERS.md` es el catálogo oficial del Configuration Center.
- `CONFIGURATION_SCHEMA` es la fuente única de IDs, keys y metadatos migrados; defaults se declaran una sola vez.
- Repository/Provider son la frontera obligatoria de fuentes. Customer y Product son contratos Dataverse normalizados aprobados; los LogicalNames permanecen exclusivamente en la integración Dataverse backend.
- Toda consulta Product usa `productpricelevels`, selecciona `crbbe_urlproducto` para exponer únicamente `productUrl` y filtra en Product Price Level Gateway `crbbe_companiacompradora` por `IOCA USA INC` o `SAND SPORTS, CORP.`. El frontend no puede enviar filtros, selects, órdenes ni parámetros OData.
- Product selecciona primero `MAX(createdon)` por `SKU + ORIGIN + BUYER COMPANY`, conserva todos los empates máximos y solo entonces consolida por SKU y pivota `USA -> priceUSA` / `CHINA -> priceChina`. `0` es precio real y un precio/origen ausente queda en `null`; null/ausente no compite con un valor real. No existe fallback entre orígenes ni precedencia entre compradores.
- `productName`, `brand`, `category`, `level`, `status`, `discontinuationDate`, `imageUrl` y `productUrl` son únicos por SKU entre las filas vigentes: vacío más valor puede inicializar, pero dos valores no vacíos distintos después de normalizar bloquean con `PRODUCT_MASTER_CONFLICT`. `creationDate` es el mayor `createdon` de las filas vigentes del SKU.
- `level` y `status` Product usan FormattedValue cuando está presente. Sin anotación, solo un valor fuente textual puede usarse como fallback; un Choice numérico nunca se publica como etiqueta.
- `VITE_PRODUCT_SOURCE` selecciona `local|dataverse`; `local` es el default vigente y Product Dataverse no está activado en producción.
- El smoke-test Phase1-042 solo puede ejecutarse con
  `?phase1-042-product-smoke=1&brand=<marca>`; exige una marca trimmed de 1 a
  100 caracteres, envía únicamente `brand` mediante `URLSearchParams` al
  endpoint Product existente y no consulta mediante Product Provider Factory.
  Su presencia no modifica la fuente global ni el flujo normal.
- El smoke-test Phase1-075 solo puede ejecutarse con
  `?phase1-075-brands-smoke=1`; llama directamente al endpoint Brands
  existente, usa sesión/token delegado y publica solo metadata allowlisted y
  conteo. No consulta mediante Product Provider Factory, no modifica la fuente
  global y debe retirarse después del diagnóstico.
- Phase1-055 retiró por completo los diagnósticos temporales Product Phase1-046/048/050/052 después de corregir el LogicalName anterior incorrecto `producturl` por `crbbe_urlproducto`; solo permanece el diagnóstico general sanitizado Phase1-020.
- Account Customer Gateway encapsula `new_tipocliente@OData.Community.Display.V1.FormattedValue` y expone su etiqueta únicamente como `customerType`, con fallback vacío cuando la anotación falta, es `null` o `undefined`; el valor numérico `new_tipocliente` nunca sustituye la etiqueta.
- Toda consulta Customer a `accounts` usa en Account Customer Gateway el filtro fijo confirmado `customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4`. Las tres reglas siguen siendo obligatorias y no amplían el `$select`, el mapping ni el contrato Customer.
- La UI mantiene una única selección de cliente; código, nombre, país y tipo se reemplazan juntos desde Customer Master Application Service.
- Las búsquedas Customer de UI invalidan toda selección previa al editar, deduplican el mismo request pendiente y sólo permiten que el identificador de request más reciente publique resultados.
- Los errores Customer públicos son mensajes estáticos por categoría; detalles originales de MSAL, red o API nunca llegan a la UI.
- Los diagnósticos Dataverse Phase1-020/057/059 son internos y seguros: mantienen `DATAVERSE_INVALID_FIELD_OR_FILTER`, la metadata derivada de `invalid_response` y las cinco categorías de red allowlisted. No registran tokens, headers Authorization, secretos, JWT, cookies, payloads Dataverse, PII Customer, customerCode, URLs/query strings, mensajes originales ni stack traces.
- Los probes Phase1-022 y la consulta de metadata Phase1-024 eran temporales y quedaron retirados después de cumplir su propósito; no forman parte del runtime vigente.
- `VITE_CUSTOMER_SOURCE` selecciona exclusivamente `local` o `dataverse`; producción usa `dataverse` y `local` permanece como fallback compatible cuando la variable no está definida y como alternativa de desarrollo.
- La configuración pública MSAL usa exclusivamente variables `VITE_AUTH_*`; SellThrough-Web no tiene client secret y los access tokens quedan bajo el cache de MSAL en `sessionStorage`, sin almacenamiento manual.
- Render es hosting temporal y no una dependencia arquitectónica; Azure podrá sustituirlo manteniendo handler, variables neutrales y contratos.
- Tenant, client secret y access token Dataverse existen solo en backend. El token delegado de usuario se limita al Provider frontend; la UI no interpreta JWT, consulta Dataverse ni envía OData.
- Usuario→Customer API usa JWT delegado `AUTH_*`; API→Dataverse usa `DV_*` y client_credentials. Las credenciales nunca se reutilizan entre fronteras.
- Los diagnósticos JWT de backend son exclusivamente internos y estáticos: no reciben ni registran tokens, Authorization, payloads completos, identidades, emails o secretos; los contratos HTTP públicos permanecen sin detalle técnico.
- CORS no es autenticación; toda ruta Customer exige Bearer válido. `/health` es la única ruta funcional anónima.
- El probe Phase1-007 usa `GET /api/customers/search?type=code` sin `q`: `400 / INVALID_CUSTOMER_REQUEST` confirma que JWT y scope fueron aceptados y que la validación se detuvo antes de Dataverse.
- El smoke Phase1-010B quedó cerrado por Phase1-011 como PASS: la búsqueda controlada `type=code&q=CL0000041` validó Vercel → MSAL/Entra → token delegado → Render Customer API → JWT → `client_credentials` backend → Dataverse → `accounts`, con `HTTP 200` y exactamente una coincidencia. Phase1-032 registra posteriormente la activación productiva del Provider Dataverse; el arnés temporal permanece como deuda de retiro, no como requisito de la integración.
- Rate limiting in-memory solo es válido para una instancia temporal; Azure horizontal requiere store distribuido.
- Los motores conservan procesamiento síncrono. Product Dataverse, cuando se active, se precarga de forma asíncrona por su Application Service y luego se adapta al contrato vigente; la ruta local continúa usando el texto/parser existente.
- Portfolio Analysis clona estructuras externas y congela únicamente objetos de su propia salida; las referencias originales del llamador nunca se congelan.
- Executive Report sólo consume el DTO de Portfolio Analysis y no accede a UI, Repository, Provider o fuentes físicas.
- Distribution y Pareto no pertenecen actualmente a Portfolio Analysis Service.
- Compra es Inventario en Tránsito y la reposición final la descuenta de la necesidad vigente.
- La seguridad usa Inventario Proyectado; Estado EOL fuerza nivel EOL y temporalidad VENCIDO.
- Pareto A/B/C usa unidades vendidas y cortes acumulados 80%/95%.
- SheetJS CE queda fijado en `0.20.3` mediante el tarball versionado oficial; `App.jsx` conserva el import `xlsx` y su contrato de exportación.
- La presentación Pareto usa Vitales/Complementarios y colores A verde, B azul, C rojo sin alterar cortes ni cálculo.
- Las alertas y tablas de bajo inventario exponen solo ACTIVO; el Inventory Engine no cambia.
- Producto Nuevo compara `creationDate` con la fecha oficial de procesamiento y exige menos de 90 días; Nuevos no presentes no genera reposición.
- `fechaStr` usa exclusivamente `normalizeFechaStr`: fecha válida local/ISO/con hora se representa como `YYYY-MM-DD`, ausencia o invalidez como `""`; `creationDate`, `discontinuationDate`, Producto Nuevo y EOL conservan su semántica.
- F4 aplica después de 365 días con descuento 15% y umbral de 12 unidades.
- La Tabla de Descuento por Fase y su hoja Excel consumen todas las fases efectivas entregadas por Application Service; F4 se resuelve con la regla de Domain y `datos.json` conserva F0–F3.
- Executive Report, Recommendation Engine y Configuration Center UI requieren prompts separados.
- `sell-through-ap` permanece separado de NEXUS.

## Métricas actuales

- 160 elementos en el catálogo de parámetros: 82 configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos UI y 2 valores derivados.
- Tres parámetros piloto visibles en Configuration Center MVP; todos permanecen no editables según el catálogo aprobado.
- MVP de presentación listo para demo: Dashboard ejecutivo, exportaciones Excel/PDF y metadata/favicons de producción.
- Treinta y tres archivos de pruebas frontend y diez archivos de pruebas backend.

## Cantidad de pruebas

Frontend: 383/383 aprobadas en 33 archivos. Backend: 124/124 aprobadas en 10
archivos.

## Estado del build

Phase1-079: frontend 383/383 en 33 archivos y build PASS con Vite 5.4.21 y
1.684 módulos transformados. Backend no se ejecutó porque no fue modificado;
su baseline Phase1-077 permanece en 124/124. Product Dataverse no fue activado
y Phase1-079 no se desplegó ni ejecutó contra producción.
