# Changelog de la Knowledge Base

## 2026-08-18 — PHASE1-066

### Implementado

- Contexto temporal por `GET /api/products/master` con `traceId` generado por
  `randomUUID()` y elapsed monotónico desde `performance.now()`.
- Ocho checkpoints allowlisted en los puntos reales de Product API,
  autenticación, Product Service, token/fetch Dataverse y `finish` HTTP.
- Propagación interna explícita Product Route → Service → Gateway → Dataverse
  Client, sin crear logging general en el cliente compartido.

### Seguridad y validación

- Eventos limitados a componente, diagnóstico, stage, elapsed entero,
  resultado y `traceId`; sin request, headers, identidad, URL/query, payload,
  error original, PII o datos comerciales.
- Pruebas dedicadas cubren orden completo, correlación intra-request,
  separación entre requests, respuesta realmente finalizada, fallo de fetch
  complementario a `DATAVERSE_NETWORK_ERROR` y ausencia total en Customer.
- Focalizadas 86/86, backend 110/110, frontend 344/344 y ambos builds
  aprobados.

### Temporalidad y alcance

- La instrumentación debe retirarse al identificar la causa raíz y no intenta
  corregir el timeout.
- Sin cambios funcionales, contratos, autenticación, CORS, paginación,
  mappings, filtros, precios, conflictos, fuentes o variables.
- Smoke frontend 35 000 ms y fetch Dataverse 30 000 ms permanecen intactos;
  Product Dataverse no se activa como fuente normal.
- Sin commit, push, deploy, smoke productivo ni cambios externos.

## 2026-08-18 — PHASE1-064

### Implementado

- El timeout default del arnés temporal Product Phase1-042 aumenta de
  10 000 ms a 35 000 ms para alinearse con la ventana backend Dataverse de
  30 000 ms y reservar 5 000 ms para completar la respuesta frontend.
- Se preservan dependency injection, AbortController, `REQUEST_TIMEOUT`
  sanitizado y cleanup del timer.
- Los 35 000 ms aplican exclusivamente al smoke temporal activado por
  `?phase1-042-product-smoke=1`; no configuran la aplicación Product normal.

### Validado

- Timers simulados cubren el default real de 35 000 ms, respuesta antes del
  límite, timeout inyectado, aborto exacto al vencer, cleanup y sanitización.
- La suite frontend completa conserva Customer smoke y el flujo normal sin
  trigger Product.

### Alcance

- Dataverse Client conserva sin cambios su timeout backend temporal de
  30 000 ms, aplicable únicamente al fetch hacia Dataverse.
- Sin cambios en Product Gateway, `productpricelevels`, `crbbe_urlproducto`,
  mappings, filtros, precios, conflictos, `fechaStr`, Customer Master, MSAL,
  JWT, Product Provider, `VITE_PRODUCT_SOURCE`, variables o infraestructura.
- Sin commit, push, deploy ni smoke productivo.

## 2026-08-18 — PHASE1-061

### Implementado

- Dataverse Client aumenta temporalmente su timeout HTTP default de 10 000 ms
  a 30 000 ms para permitir una validación posterior de Product Master contra
  Dataverse real.
- `getToken()` y la preparación de headers ocurren antes de crear
  AbortController/timer; el `finally` inmediato de fetch limpia el timer antes
  del procesamiento HTTP/JSON/shape. El presupuesto corresponde solo a
  `fetchImpl()`.
- Entra Token Provider conserva su timeout independiente de 10 000 ms.

### Validado

- Timers simulados cubren default 30 000, orden token → timer → fetch, token
  fuera del presupuesto, fetch a 29 999 ms, timeout al superar 30 000 ms,
  cleanup y fallo de token sin falso diagnóstico de red.
- Se preservan las cinco categorías de red, los cuatro indicadores seguros y
  la observabilidad `invalid_response` Phase1-057.
- Backend 106/106, frontend 342/342 y ambos builds aprobados; Product API y
  Customer Master no presentan regresión.

### Temporalidad y alcance

- Los 30 000 ms no constituyen una optimización definitiva; deberán
  reevaluarse después de validar Product Master y de definir por separado
  cualquier optimización de consulta/paginación.
- Sin cambios en Entity Set, mappings, filtros, consolidación/pivot, precios
  nullable, conflictos, FormattedValue, `fechaStr`, contratos, frontend,
  autenticación, variables o infraestructura.
- Sin commit, push, deploy ni smoke productivo.

## 2026-08-17 — PHASE1-059

### Diagnosticado

- El catch amplio de `retrievePage` emitía `DATAVERSE_NETWORK_ERROR` para toda
  excepción posterior a adquirir el token; no distinguía timeout, aborto,
  TypeError de fetch, URL inválida por código seguro u otro rechazo.
- La adquisición del token ocurre antes de fetch y sus fallos no producen un
  diagnóstico falso de red Dataverse.
- Phase1-057 no modificó fetch, AbortController, headers ni aceptación del
  response; no introdujo una regresión de transporte.

### Implementado

- Solo el catch estrecho de `fetchImpl` emite ahora el diagnóstico de red con
  `NETWORK_TIMEOUT`, `NETWORK_ABORTED`, `NETWORK_FETCH_FAILED`,
  `NETWORK_INVALID_URL` o `NETWORK_UNKNOWN`.
- El evento añade únicamente `timeoutConfiguredMs`, `tokenAcquired`,
  `baseUrlConfigured` y `baseUrlProtocolValid`; no registra error/message/stack
  originales ni URL, query, headers, tokens, secretos o datos de negocio.
- El timeout permanece en 10 000 ms, con la misma implementación mediante
  AbortController y el mismo cliente compartido por Product y Customer.

### Alcance

- Sin cambios en `productpricelevels`, `crbbe_urlproducto`, mappings, filtros,
  pivot USA/CHINA, precios nullable, conflictos, FormattedValue, `fechaStr`,
  contratos Product/Customer, MSAL/JWT, variables, frontend o infraestructura.
- La causa productiva exacta queda pendiente de una revalidación posterior al
  deploy instrumentado; no se asume que Dataverse esté caído.

## 2026-08-17 — PHASE1-055

### Corregido

- Product Price Level Gateway reemplaza el LogicalName anterior incorrecto
  `producturl` por `crbbe_urlproducto` tanto en `$select` como en el mapping
  exclusivo `crbbe_urlproducto` → `productUrl`.
- `productUrl` conserva `trim()` y fallback `""` para `null`, `undefined` o
  texto vacío; el contrato normalizado no expone el nombre físico Dataverse.
- Entity Set, mappings restantes, filtros de compradores, FormattedValue,
  pivot USA/CHINA, precios `0`/`null`, conflictos y `fechaStr` permanecen
  intactos.

### Retirado

- Diagnóstico Product Phase1-046: probes, módulo, import/hook del gateway,
  estado once-per-process y pruebas exclusivas.
- Diagnóstico metadata Product Phase1-048/050/052: consultas
  `EntityDefinitions`/`Attributes`, módulo, observabilidad, guard y pruebas
  exclusivas.
- Dataverse Client deja de exponer las tres rutas auxiliares temporales; sus
  operaciones productivas y el diagnóstico general sanitizado Phase1-020 se
  preservan.

### Alcance

- Product Domain, Provider, Repository, Application Service, Product API,
  Customer Master, autenticación, contratos HTTP y
  `VITE_PRODUCT_SOURCE=local` permanecen sin cambios funcionales.
- Sin commit, push, deploy, smoke, cambios de variables o modificación de
  Dataverse.

## 2026-08-17 — PHASE1-052

### Corregido

- La resolución temporal de Product EntityDefinition elimina `$top=2` de la
  colección `EntityDefinitions` y conserva el patrón soportado con
  `$select=LogicalName,EntitySetName` más el filtro exacto por
  `EntitySetName=productpricelevels`.
- La respuesta se filtra de nuevo en memoria, exige una única coincidencia
  exacta y el LogicalName validado que devuelve metadata es el único utilizado
  para navegar a `Attributes`; no se hardcodea el nombre lógico de la tabla.
- La observabilidad añade `ENTITY_DEFINITION/PASS` y `ATTRIBUTES/PASS` antes de
  `CANDIDATES/FOUND|NONE`, y conserva los `FAIL` sanitizados por etapa.

### Seguridad y alcance

- Los candidatos mantienen únicamente `LogicalName`, `SchemaName`,
  `AttributeType`, `IsValidForRead` y resultado técnico; no se registran datos
  Product, URLs almacenadas, payloads, mensajes OData, credenciales ni stacks.
- La guardia once-per-process continúa antes del primer `await` y las pruebas
  cubren concurrencia, resolución dinámica, fallos de ambas etapas y regresión
  Product/Customer.
- Product Gateway no fue modificado: `productpricelevels`, `producturl`,
  mapping, filtros, FormattedValue, precios nullable, conflictos y contrato
  Product permanecen iguales. No hubo smoke productivo, deploy, commit o push.

## 2026-08-17 — PHASE1-050

### Corregido

- Phase1-048 emite `TRIGGER/REACHED` inmediatamente después del evento
  Phase1-046 `select_field=producturl / FAIL`, antes de continuar los probes.
- Los fallos internos quedan clasificados como `ENTITY_DEFINITION/FAIL` o
  `ATTRIBUTES/FAIL`; una consulta completada emite
  `CANDIDATES/FOUND|NONE` con conteo técnico y conserva los eventos allowlisted
  por atributo.
- Dataverse Client marca la etapa de fallo mediante metadata privada no
  enumerable; no propaga mensajes, payloads, queries ni stack traces.

### Seguridad y alcance

- La guardia once-per-process continúa asignándose antes del primer `await` y
  las pruebas cubren concurrencia, continuación de Phase1-046 y fallos de ambas
  consultas de metadata.
- Product Gateway no fue modificado: `productpricelevels`, `producturl`,
  mapping, filtros, FormattedValue, precios nullable, conflictos y contrato
  Product permanecen iguales. Customer Master continúa sin regresión.
- No hubo consulta productiva, deploy, commit o push; el diagnóstico sigue
  siendo temporal y requiere revisión/autorización separada antes de desplegar.

## 2026-08-17 — PHASE1-048

### Implementado

- Diagnóstico metadata Product temporal activado únicamente después del probe
  individual `select_field=producturl / FAIL`, máximo una vez por proceso.
- Resolución acotada de la entidad por `EntitySetName=productpricelevels` y
  consulta de su navegación `Attributes` filtrada por LogicalNames que
  contienen `url`, `product` o `producto`.
- Evento `PHASE1_048_PRODUCT_URL_METADATA` limitado a `LogicalName`,
  `SchemaName`, `AttributeType`, `IsValidForRead` y
  `CANDIDATE|NOT_CANDIDATE`.

### Seguridad y alcance

- La metadata se reduce a las cuatro propiedades antes de llegar al logger;
  no se registran filas Product, SKU, nombres, precios, URLs almacenadas,
  payloads completos, tokens, Authorization, secretos o stack traces.
- No se añade endpoint y el HTTP público conserva el error Product sanitizado;
  la metadata nunca llega al frontend.
- Product Gateway no se corrige: `producturl` y `productUrl` permanecen en
  mapping/contrato. Product Domain, Provider, Repository, Application Service,
  Customer Master, variables e infraestructura no cambian.
- Diagnóstico no desplegado ni ejecutado contra Dataverse productivo; debe
  retirarse junto con Phase1-046 después de confirmar e implementar el
  LogicalName definitivo mediante otro prompt.

## 2026-08-17 — PHASE1-046

### Implementado

- Diagnóstico Product temporal activado solo después de
  `DATAVERSE_INVALID_FIELD_OR_FILTER / upstream 400`, máximo una vez por
  proceso.
- Secuencia de 26 probes con `$top=1`: Entity Set, 13 selects individuales,
  select compuesto, dos comparaciones textuales, filtro compuesto, cuatro
  órdenes individuales, orden compuesto, anotación, top y consulta compuesta.
- Dataverse Client ofrece una ruta interna de probe que observa únicamente el
  status y descarta el body sin parsear payload ni emitir mensajes upstream.

### Seguridad y alcance

- Eventos limitados a componente, identificador, secuencia, categoría,
  elemento técnico y `PASS|FAIL`; no registran valores Product, compañías,
  precios, URLs, payloads, queries, mensajes OData, tokens o PII.
- `productpricelevels` permanece intacto. No se corrigieron LogicalNames o tipos
  por suposición ni cambiaron mapping, filtro vigente, pivot, precios nullable,
  conflictos, FormattedValue, `fechaStr`, Customer Master o contratos públicos.
- Diagnóstico no desplegado ni ejecutado contra Dataverse productivo; sin
  commit, push, deploy o activación. Debe retirarse después de identificar y
  corregir con evidencia la consulta definitiva.

## 2026-08-17 — PHASE1-044

### Corregido

- Product Price Level Gateway sustituye exclusivamente el Entity Set runtime
  singular `productpricelevel` por el Entity Set confirmado
  `productpricelevels`.
- La prueba directa exige exactamente `productpricelevels` y una regresión
  independiente falla si se reintroduce `productpricelevel` en runtime.
- El smoke previo llegó a Render, aceptó el JWT e intentó Dataverse; el HTTP
  404 observado motivó la corrección. No se ejecutó otro smoke productivo.

### Alcance preservado

- Mappings, filtro de compradores, pivot USA/CHINA, semántica de precios
  nullable, FormattedValue, conflictos, contrato Product y `fechaStr` no
  cambian.
- Maestro Cliente permanece sin regresión; no se modificaron frontend, Product
  Provider, contratos HTTP, autenticación, variables, Vercel, Render ni
  Dataverse.
- Product Dataverse continúa no activado; no hubo commit, push o deploy.

## 2026-08-17 — PHASE1-042

### Preparado

- Arnés temporal Product activado exclusivamente por
  `?phase1-042-product-smoke=1`, aislado de Product Provider Factory y de
  `VITE_PRODUCT_SOURCE=local`.
- Reutiliza inicialización MSAL, adquisición del token delegado y el endpoint
  cerrado existente `GET /api/products/master`; no amplía el contrato público
  ni admite query strings.
- Aplica timeout y normaliza cero productos, 401, 403, 409
  `PRODUCT_MASTER_CONFLICT`, 429, 5xx, red y respuesta inválida.

### Sanitización y alcance

- Consola recibe únicamente status, conteo, etapas JWT/Dataverse, diagnóstico
  y booleanos estructurales; no recibe Product payload, SKU, atributos,
  precios, URLs, token, headers, PII o secretos.
- No se ejecutó el trigger, no se consultó Dataverse productivo y no se cambió
  Product Gateway, mapping, filtro, conflictos, FormattedValue, precios nullable
  o `fechaStr`.
- Product Dataverse continúa **NOT ACTIVATED**; sin cambios en Vercel, Render,
  Entra o Dataverse y sin commit, push o deploy.

## 2026-08-17 — PHASE1-040

### Normalizado

- `fechaStr` usa una única función compartida en ruta local, Product
  Dataverse, parser/adaptación y Record Assembler.
- Fechas válidas locales, ISO e ISO con hora producen `YYYY-MM-DD`; ausencia,
  string vacío e invalidez producen `""` sin crear fechas ficticias.
- Los strings con hora conservan el día calendario fuente sin shift de
  timezone.

### Contrato y consumidores

- Providers local/Dataverse y Repository preservan el mismo `fechaStr`
  canónico en el Product frontend.
- CSV, Excel y presentación consumen el valor canónico del record; la prueba
  de Excel verifica que el formato se preserve.
- `creationDate`, `discontinuationDate`, Producto Nuevo `<90 días`, EOL,
  Customer Master y precios nullable conservan su semántica.

### Alcance

- Product Dataverse continúa **NOT ACTIVATED**; no se modifican backend,
  filtros Product, Vercel, Render, Entra o Dataverse y no hay commit, push o
  deploy.

## 2026-08-17 — PHASE1-038

### Corregido

- Maestro Producto distingue `0` como precio real y `null` como precio no
  disponible en gateway, Product Domain y ruta local.
- `amount null|undefined`, fila USA ausente o fila CHINA ausente producen
  `null`; valores numéricos válidos, incluido cero, se conservan.
- Solo números distintos generan `PRODUCT_MASTER_CONFLICT`; cero contra otro
  número bloquea y null/ausente no crea conflicto falso con un precio real.

### Consumidores

- Provider, Repository, Application Service, adaptación al Maestro, Record
  Assembler, EOL, Portfolio, distribuciones y totales propagan `null` en
  valorizaciones dependientes sin usar fallback.
- UI y exportaciones usan presentación vacía/controlada para valores no
  disponibles; el formatter existente muestra `—` y nunca `$0` para `null`.
- Maestro Cliente, filtros de compañías, FormattedValue, Producto Nuevo, EOL y
  `fechaStr` no cambian.

### Alcance

- Product Dataverse continúa **NOT ACTIVATED**; no se modifican Vercel, Render,
  Entra ni Dataverse y no hay commit, push o deploy.

## 2026-08-17 — PHASE1-036

### Corregido

- Product Price Level Gateway deja de consolidar silenciosamente atributos
  descriptivos divergentes del mismo SKU.
- `productName`, `brand`, `category`, `level`, `status`,
  `discontinuationDate`, `creationDate`, `imageUrl` y `productUrl` bloquean la
  carga cuando contienen más de un valor no vacío distinto normalizado.
- Valores vacíos no generan conflicto y el primer valor no vacío solo
  inicializa; no se agrega precedencia por fila, comprador, fecha o mayoría.

### Contrato y normalización

- Strings, URLs y etiquetas FormattedValue se comparan trimmed; fechas válidas
  se comparan en representación ISO canónica y texto de fecha no vacío inválido
  se conserva únicamente para detectar divergencias internas.
- Precio y atributo reutilizan `409 / PRODUCT_MASTER_CONFLICT`, diferenciados
  internamente como `PRICE` y `ATTRIBUTE`; el contrato HTTP continúa estable y
  no expone metadata interna o nombres físicos Dataverse.
- Pivot USA/CHINA, `amount null/undefined -> 0` compatible y `fechaStr` no se
  modifican. Los dos últimos asuntos permanecen pendientes separados.

### Validación y alcance

- Se agregan casos para equivalencia normalizada, vacío/valor en ambos órdenes,
  los nueve atributos, precio, sanitización pública y regresión de Maestro
  Cliente.
- Product Dataverse permanece no activado; sin cambios en Inventario Cliente,
  Vercel, Render, Entra o Dataverse, y sin commit, push o deploy.

## 2026-08-17 — PHASE1-033

### Implementado

- Contrato Product normalizado con SKU, nombre, marca, categoría, fechas de
  descontinuación/creación, nivel, estado, URLs y precios USA/China.
- Product Provider Factory `local|dataverse`, Product Repository y Product
  Master Application Service; `local` permanece como default y reutiliza Master
  Parser.
- Dataverse Product Provider frontend sobre el transporte autenticado
  compartido y endpoint cerrado `GET /api/products/master`, sin OData frontend.
- Product Service y Product Price Level Gateway sobre el Dataverse Client,
  OAuth/cache/diagnóstico/JWT/rate limiter existentes.
- Paginación Dataverse validada y restringida al origen/ruta de la organización.

### Fuente y consolidación

- Entity Set `productpricelevel` y mapping completo encapsulado en el gateway.
- Filtro backend obligatorio por `IOCA USA INC` o `SAND SPORTS, CORP.`.
- Consolidación por SKU y pivot `USA -> priceUSA`, `CHINA -> priceChina`;
  `amount null|undefined` y origen ausente quedan en cero compatible.
- `level`/`status` priorizan FormattedValue; sin anotación solo aceptan texto
  fuente y nunca publican el código numérico de un posible Choice.
- Importes distintos para el mismo SKU/origen/comprador, o entre compradores
  sin precedencia autorizada, bloquean la carga con
  `409 / PRODUCT_MASTER_CONFLICT`; no se suman, promedian ni seleccionan.

### Compatibilidad, seguridad y validación

- El pipeline local, Master Parser, Producto Nuevo `<90 días`, fechas EOL,
  cálculos y contratos previos permanecen vigentes; `level`, `imageUrl` y
  `productUrl` quedan disponibles en el detalle normalizado/record SKU.
- Product API reutiliza MSAL/Bearer, autenticador JWT, CORS y rate limiting; no
  expone LogicalNames ni acepta parámetros arbitrarios.
- 302/302 pruebas frontend y 67/67 backend aprobadas; build frontend aprobado
  con Vite 5.4.21/1682 módulos y backend syntax check aprobado. Validaciones Git
  se registran en el log de Phase1-033 al cierre.
- `VITE_PRODUCT_SOURCE=local` permanece vigente. Sin activación productiva,
  consulta real, cambio en Vercel/Render/Entra/Dataverse, commit, push o deploy.

## 2026-08-14 — PHASE1-032

### Cierre productivo

- Maestro Cliente queda **IMPLEMENTED + PRODUCTION VALIDATED** sin cambios
  funcionales ni consultas productivas ejecutadas por este prompt.
- Vercel usa `VITE_CUSTOMER_SOURCE=dataverse`; MSAL/Microsoft Entra ID entrega
  el access token delegado de Customer API y el backend transitorio en Render
  usa su integración autorizada separada para Dataverse.
- Búsqueda por código validada, búsqueda por nombre implementada, selección de
  código/nombre/país/tipo sincronizada y manejo de cero resultados/errores
  implementado.

### Contrato registrado

- Fuente `accounts` y filtro obligatorio `customertypecode eq 3 and statecode
  eq 0 and crbbe_estadodelcliente eq 4`.
- `new_codigocliente` → `customerCode`, `name` → `customerName` y
  `crbbe_nombrepais` → `country`.
- `new_tipocliente@OData.Community.Display.V1.FormattedValue` → `trim()` →
  `customerType`, con fallback `''` y sin publicar el valor numérico. El Choice
  asociado `new_tipoclienteglobal` no se consulta por búsqueda.
- UI, Application Service y Domain continúan trabajando únicamente con el
  contrato Customer normalizado; los LogicalNames quedan en el gateway.

### Infraestructura y alcance

- Render continúa como infraestructura transitoria y Azure como siguiente hito
  de migración, sujeto a prompt independiente.
- No se modificaron código productivo, filtros, mappings, contratos,
  autenticación, providers, variables, Vercel, Render ni Dataverse.
- Sin commit, push ni deploy.

## 2026-08-14 — PHASE1-029

### Corregido

- `customerType` procede exclusivamente de
  `new_tipocliente@OData.Community.Display.V1.FormattedValue`, como string
  trimmed y con fallback `''` cuando la etiqueta no llega.
- El valor numérico de `new_tipocliente` deja de publicarse como si fuera la
  etiqueta Choice.
- Dataverse Client admite anotaciones solicitadas por consumidor y compone el
  header `Prefer`; Account Customer Gateway lo usa en sus tres operaciones sin
  consultas de metadata ni lógica HTTP duplicada.

### Preservado

- Filtro Phase1-026 exacto, `$select`, búsqueda por código/nombre, lectura
  exacta, límites, orden, escape OData, autenticación, JWT, contratos HTTP y
  diagnóstico sanitizado Phase1-020.
- Phase1-022 y Phase1-024 continúan retirados; no hubo probes productivos,
  cambios en Dataverse, variables, Render o Vercel.

### Validación

- Backend relevante: 24/24; backend completo: 50/50.
- Frontend completo: 282/282 en 24 archivos.
- Backend syntax check y frontend build aprobados; Vite transformó 1675 módulos.
- Sin commit, push ni deploy.

## 2026-08-14 — PHASE1-026

### Corregido

- Account Customer Gateway usa los LogicalNames productivos confirmados
  `customertypecode`, `statecode` y `crbbe_estadodelcliente` con los valores
  empresariales 3/0/4.
- Búsqueda por código, búsqueda por nombre y lectura exacta por código combinan
  su predicado específico mediante AND con el filtro definitivo.
- `$select` conserva `new_tipocliente`; el mapping definitivo de
  `customerType` desde FormattedValue quedó establecido por PHASE1-029 sin usar
  el valor numérico.

### Retirado

- Diagnóstico de probes Phase1-022, sus hooks, estado one-shot y pruebas.
- Diagnóstico de metadata Phase1-024, sus métodos de Dataverse Client, hooks,
  estado one-shot y pruebas.
- No quedan referencias runtime a `PHASE1_022_CUSTOMER_QUERY_PROBE` ni
  `PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA`.

### Preservado

- Diagnóstico seguro Phase1-020, incluido
  `DATAVERSE_INVALID_FIELD_OR_FILTER`, sin cambios en el contrato HTTP público.
- Contrato Customer, MSAL, JWT, Entra, Render, Vercel y variables. En
  PHASE1-026 `VITE_CUSTOMER_SOURCE=local`; la activación posterior queda
  registrada por PHASE1-032.

### Validación

- Backend relevante: 13/13; backend completo: 48/48.
- Frontend completo: 282/282 en 24 archivos.
- Backend syntax check y frontend build aprobados; Vite transformó 1675 módulos.
- Sin consultas adicionales a producción, commit, push o deploy.

## 2026-08-14 — PHASE1-012

### Preparado

- Búsquedas Customer por código y nombre conservan Provider → Repository → Application Service → UI y el mismo backend autenticado.
- Una única entidad Customer seleccionada sincroniza código, nombre, país y tipo; editar cualquier combobox invalida la selección anterior.
- Identificador monotónico protege respuestas asíncronas A→B→A y la misma solicitud pendiente no se duplica.
- Cero resultados mantiene la búsqueda disponible y no conserva datos anteriores.
- Provider clasifica sesión ausente, 401, 403, 429, 5xx, red, timeout y respuesta inválida; Application Service publica sólo mensajes claros y sanitizados.
- `customerType` conserva fallback vacío sin inventar mapping Dataverse.

### Pruebas

- 24 pruebas nuevas sobre Provider, factory, Application Service y UI.
- Suite frontend: 282/282 aprobadas en 24 archivos.
- Build Vite 5.4.21 aprobado con 1675 módulos transformados.

### Sin cambios

- En PHASE1-012 `VITE_CUSTOMER_SOURCE=local`; la activación productiva posterior
  queda registrada por PHASE1-032.
- Sin cambios en backend, autenticación, Render, Entra, Dataverse, Maestro Producto, Inventario Cliente, fórmulas o Dashboard.
- Los harness Phase1-007/Phase1-010B permanecen sin cambios.
- Sin commit, push ni deploy.

## 2026-08-14 — PHASE1-011

### Cierre

- Phase1-010B queda formalmente en **PASS — Real Dataverse connectivity validated end-to-end.**
- La búsqueda controlada `GET /api/customers/search?type=code&q=CL0000041` devolvió `HTTP 200` y exactamente una coincidencia, con JWT aceptado, request Dataverse intentado y diagnóstico nulo.
- Se valida la arquitectura Vercel → MSAL / Microsoft Entra ID → delegated access token → Render Customer API → JWT validation → backend `client_credentials` → Dataverse → `accounts`.

### Seguridad y alcance

- No se almacena payload real del cliente, JWT, headers `Authorization`, secretos ni claims sensibles.
- En ese hito `VITE_CUSTOMER_SOURCE=local` permaneció vigente y el Customer
  Provider Dataverse no se activó en UI; PHASE1-032 registra la activación
  productiva posterior. El smoke-test harness no se eliminó.
- Sin cambios en lógica funcional, backend, autenticación o Dataverse; sin commit, push ni deploy.

### Pendientes al cierre de PHASE1-011, cerrados por PHASE1-032

- Customer Provider Dataverse en UI: activado y validado en producción.
- `customerType`: resuelto por FormattedValue en PHASE1-029.
- Búsqueda por nombre y manejo de errores/cero resultados: implementados.
- Render permanece transitorio; solo la migración posterior a Azure continúa
  pendiente.

## 2026-08-13 — PHASE1-007

### Agregado

- Arnés temporal frontend activado sólo por `?phase1-007-smoke=1`, con estados separados para sesión MSAL, adquisición del access token, validación JWT de Render y acceso Dataverse.
- Probe sobre `GET /api/customers/search?type=code` sin `q`, diseñado para obtener `400 / INVALID_CUSTOMER_REQUEST` después de JWT y antes de Customer Gateway.
- Cinco pruebas dedicadas que verifican el Bearer, la sanitización del resultado y la separación de fallos por etapa.
- Suite frontend: 255/255 aprobadas; build Vite aprobado con 1675 módulos transformados.
- Suite backend adicional: 41/41 aprobadas; syntax check aprobado sin modificar `server/`.

### Validación externa controlada

- `/health` en Render respondió `200`.
- La ruta protegida sin Bearer respondió `401 / AUTHENTICATION_REQUIRED`.
- La ejecución con usuario/token real desde Vercel queda pendiente; no se realizó deploy ni se accedió a Dataverse.

### Sin cambios

- En PHASE1-007 `VITE_CUSTOMER_SOURCE=local`; la activación posterior del
  Provider Dataverse queda registrada por PHASE1-032.
- Sin cambios en backend, infraestructura, UI visible, contratos Customer, AP01, reglas, fórmulas, defaults o fuentes sell-through.
- Sin client secret frontend, persistencia manual o registro de tokens.
- Sin deploy, commit, push, merge, tag o cambio de rama.

## 2026-08-13 — PHASE1-005

### Agregado

- `@azure/msal-browser` y módulos desacoplados de configuración, cliente y servicio de sesión.
- Adquisición silenciosa del token delegado SellThrough-API con fallback a `loginRedirect` sin sesión o ante interacción requerida.
- Procesamiento de redirect, selección de cuenta activa y cierre de sesión mediante redirect al origen actual.
- Controles discretos en el header para iniciar sesión, mostrar nombre/cuenta y cerrar sesión.
- Variables públicas `VITE_AUTH_TENANT_ID`, `VITE_AUTH_CLIENT_ID`, `VITE_AUTH_API_SCOPE` y `VITE_API_BASE_URL`; sin client secret frontend.

### Pruebas

- Cobertura de configuración MSAL, scope, `acquireTokenSilent`, fallbacks de login, logout y controles UI.
- Bearer del Provider y Customer local permanecen cubiertos.
- Suite frontend: 249/249 aprobadas; build Vite aprobado con 1674 módulos transformados.

### Sin cambios

- En PHASE1-005 `VITE_CUSTOMER_SOURCE=local`; la activación posterior de
  Dataverse queda registrada por PHASE1-032. En ese hito no se modificaron
  backend, contratos Customer ni reglas de negocio.
- Sin deploy, commit, push o ramas.

### Pendiente operativo en PHASE1-005, cerrado por PHASE1-032

- La configuración pública en Vercel, el smoke real autorizado y el cambio de
  fuente Customer quedaron completados en hitos posteriores y cerrados por
  PHASE1-032.

## 2026-08-11 — Prompt Astrid Confirmed Changes

### Implementado

- Sustitución visual Por Vencer → Sin ventas con SKU, unidades y valor de inventario, conservando la temporalidad interna.
- Quiebres Activos como único indicador de quiebre en Resumen Dashboard y exclusión EOL de alertas/tablas/conteos de bajo inventario.
- Textos Vitales/Complementarios y colores Pareto A verde, B azul, C rojo sin cambiar el cálculo ABC.
- Totalización final de Productos de Reposición Sugerida con SKU incluidos y unidades ya calculadas.
- Valor en tránsito por SKU y total global mediante Compra por costo aplicado vigente, presentado sin decimales.
- Contrato Maestro Producto con `creationDate`, regla Producto Nuevo `< 90 días` y Nuevos no presentes sin reposición sugerida.
- Contrato Customer ampliado a `customerType`, fallback vacío y presentación en Configuración.
- Ayudas UI derivadas de las reglas vigentes para Merma, Ventas Pareto A, Reposición y Umbral de Merma.

### Pruebas

- Bordes de Producto Nuevo en 89/90/más de 90 días y fecha vacía/inválida.
- Cobertura de Sin ventas, exclusión EOL, Nuevos no presentes, tránsito, reposición, textos/colores Pareto, Customer y formato monetario.
- Suite frontend: 230/230 aprobadas antes de la validación final de build.

### Estado posterior de los elementos no implementados en este hito

- Continúan sin implementar: Sin origen, nuevos buckets/fases EOL, reposición
  para productos nuevos y fórmula por Tipo de Cliente.
- Mapping físico de `customerType`, MSAL, Entra, Render y Dataverse real se
  completaron posteriormente y quedaron cerrados por PHASE1-032. Azure sigue
  pendiente como migración; este hito no incluyó commit, push ni despliegue.

## 2026-08-10 — Phase1-004

### Seguridad corregida

- Customer API exige Bearer JWT delegado validado con firma/JWKS, issuer, audience, expiración, tenant y scope.
- Fronteras Usuario→API (`AUTH_*`) y API→Dataverse (`DV_*`) quedan explícitamente separadas.
- Rate limiting por IP e identidad con 429/Retry-After; store in-memory reemplazable.
- CORS admite `Authorization` pero continúa sin considerarse autenticación.
- Tokens, secretos y errores JWT técnicos no se registran ni exponen.

### Agregado

- `GET /health` anónimo, sin consultas externas ni exposición de configuración.
- Respuesta 400 para percent-encoding inválido en `customerCode`.
- Abstracción frontend `getAccessToken()` para futura integración MSAL.
- Dependencia backend `jose` 6.2.4, estándar mantenido JWT/JWKS, ESM y sin dependencias transitivas.
- Suite backend ampliada a 41 pruebas y frontend a 221 pruebas.

### Estado posterior del pendiente operativo

- Registro API/scope en Entra, integración MSAL e IDs reales quedaron cerrados
  por PHASE1-032. Sustituir el rate limiter in-memory continúa pendiente antes
  de escala horizontal.

### Sin cambios

- Customer contract, Repository, Customer Master Service, Maestro Producto, Inventario Cliente, Configuration Center, motores, fórmulas y reglas AP01.
- No se configuran credenciales reales ni se realiza commit, push o despliegue.

## 2026-08-10 — Phase1-003

### Agregado

- Backend Node portable con configuración validada, CORS allowlist y tres endpoints Customer.
- OAuth client_credentials, scope derivado, cache/expiración de token y cliente Dataverse con timeout.
- Gateway `accounts` con mapping confirmado, escape OData, select/orden/límite internos y errores normalizados.
- Guía de migración Render → Azure y `.env.example` sin valores sensibles.
- 24 pruebas backend; suite frontend ampliada a 219 pruebas.

### Modificado

- Dataverse Customer Provider frontend ahora consume exclusivamente Customer API mediante `VITE_API_BASE_URL`.
- App compone el Provider API cuando existe la variable y conserva el fallback local inyectable sin datos.
- Errores técnicos de búsqueda se sustituyen por un mensaje controlado al usuario.

### Pendiente operativo en Phase1-003, cerrado por PHASE1-032

- La configuración Entra/Dataverse/Render/Vercel, el despliegue autorizado y la
  validación real se completaron en hitos posteriores y quedaron cerrados por
  PHASE1-032.

### Sin cambios

- Customer contract, Customer Repository, Customer Master Application Service, Maestro Producto, Inventario Cliente, motores, fórmulas y reglas AP01.
- No se realiza commit, push ni despliegue.

## 2026-08-10 — Phase1-002

### Agregado

- Contrato normalizado Customer y Customer Master Application Service.
- Dataverse Customer Provider configurable, Customer Repository y Provider local temporal inyectable.
- Búsqueda UI por código/nombre con una selección sincronizada que carga código, nombre y país.
- 23 pruebas nuevas; suite total de 213 pruebas.

### Pendiente de conexión en Phase1-002, cerrado por PHASE1-032

- URL, tabla, campos reales, forma del país, autenticación, permisos y
  transporte seguro de Dataverse se resolvieron en hitos posteriores y quedaron
  cerrados por PHASE1-032.

### Sin cambios

- Maestro Producto, Inventario Cliente, Inventory/EOL Engine, fórmulas, parámetros, dependencias y Repository histórico de sell-through.
- No se realiza commit, push ni despliegue y el log local permanece fuera de Git.

## 2026-08-06 — Prompt 031

### Agregado

- Especificación funcional V2 de los acuerdos Astrid–Jesús.
- Inventario en Tránsito agregado por SKU, EOL Fase 4, temporalidad y Pareto A/B/C.
- Pares KPI SKU/unidades y ecuación completa de valorización para Dashboard e Informe.
- 18 pruebas funcionales nuevas; suite total de 179 pruebas.

### Modificado

- Inventory/EOL Engine, Record Assembler, Portfolio Analysis, Executive Report, Application Service, formatos, UI y exportación Excel.
- Reposición final descuenta Compra; seguridad compara Inventario Proyectado; EOL reemplaza el nivel previo.
- Porcentajes y KPI se muestran sin decimales; etiquetas de aportes eliminan `(20%)` y `(80%)`.

### Sin cambios

- Repository, Provider, Configuration Center, `datos.json`, dependencias y fuentes físicas.
- No se realiza push ni se agrega el log local a Git.

## 2026-08-06 — Prompt 029

### Corregido

- La impresión PDF oculta cabecera, navegación, controles y shell de aplicación.
- El contenido `.informe-pdf` conserva visibilidad, paginación, tablas y legibilidad.

### Sin cambios funcionales

- No se modificaron datos, cálculos, DTOs, navegación normal, servicios ni dependencias.

## 2026-08-06 — Prompt 028

### Agregado

- UX final responsive para presentación, estado de procesamiento y metadata deploy-ready.
- Favicon SVG, theme color y metadata Open Graph básica.
- Hito MVP de presentación con Dashboard, Configuration Center y exportaciones existentes.

### Sin cambios funcionales

- No se modificaron Domain, Repository, Provider, reglas ni Business Services.

## 2026-08-06 — Prompt 026

### Agregado

- Configuration Center MVP visible como nueva pestaña, con búsqueda, filtro, validación, restauración y mensajes de estado.
- Persistencia local encapsulada en `configurationService` y siete pruebas de contrato.

### Modificado

- `configurationService` amplía su contrato sin mover parámetros ni cambiar reglas.
- `CONFIGURATION_SCHEMA` incorpora nombres de presentación para sus tres registros existentes.
- Estado de arquitectura y configuración actualizados.

### Sin cambios funcionales

- Los tres parámetros permanecen no editables según `BUSINESS_PARAMETERS.md`.
- No se modificaron PortfolioAnalysisService, ExecutiveReportService, Repository, Provider, parsers, motores ni dependencias.

Este archivo registra cambios en la documentación consolidada. No reemplaza el historial de Git ni representa versiones funcionales del producto.

## 2026-08-06 — Prompt 024

### Agregado

- `src/domain/report/ExecutiveReportService.js` como Business Service MVP de presentación.
- DTO `executiveReport` con Executive Summary, KPIs, totales, indicadores generales y resumen para Dashboard.
- Registro en `docs/prompts/Prompt024-ExecutiveReportService.md` y evidencia local en `logs/Prompt024-ExecutiveReportService.log`.

### Modificado

- Application Service para orquestar Executive Report después de Portfolio Analysis.
- Architecture State, Roadmap e historial para registrar el nuevo servicio y sus límites.

### Sin cambios funcionales

- Se conservan resultados existentes, reglas, fórmulas, parámetros, contratos, UI y navegación.
- No se modifican PortfolioAnalysisService, Repository, Provider, Configuration Center, App.jsx o Domain restante.
- No se crean Recommendation Engine, exportaciones, hallazgos, persistencia, asincronía o dependencias.

## 2026-08-06 — Prompt 023

### Modificado

- `PortfolioAnalysisService.js` reemplaza el `deepFreeze` sobre referencias externas por clonación de estructuras y congelación exclusiva de objetos propios.
- `ARCHITECTURE.md`, `DECISIONS.md`, `ARCHITECTURE_STATE.md` e historial documentan el ownership de inmutabilidad y la decisión D-023.

### Sin cambios funcionales

- Se conservan resultados, forma de salida, reglas, fórmulas, contratos públicos, 154 pruebas y comportamiento síncrono.
- No se modifican App, Application Service, Repository, Provider, Configuration Center, Domain restante, parámetros o dependencias.

## 2026-08-06 — Prompt 022.5

### Agregado

- `INDEX.md` como índice documental único por propósito y momento de lectura.
- `ARCHITECTURE_STATE.md` como resumen vigente de fase, servicios, decisiones, métricas y siguiente hito.
- Registro en `docs/prompts/Prompt022.5-AIWorkflowOptimization.md` y evidencia local en `logs/Prompt022.5-AIWorkflowOptimization.log`.

### Modificado

- `AGENTS.md` para conservar solo reglas permanentes, estándares, roles, convenciones y estructura.
- `AI_WORKFLOW.md` para sustituir la lectura masiva por seis fuentes mínimas relacionadas y prohibir relecturas sin cambios dentro de la sesión.
- Roadmap e historial para oficializar el flujo ChatGPT/Codex/Claude/Copilot y el siguiente hito.

### Optimización

- Contexto documental fijo reducido de 292,831 a 8,917 bytes: estimación de 73,208 a 2,230 tokens, aproximadamente 97% menos antes de sumar el prompt, log y archivos específicos de cada tarea.

### Sin cambios funcionales

- No se modificaron `src`, pruebas, contratos, Configuration Center, Business Services, Repository, Provider, reglas, fórmulas, parámetros o dependencias.

## 2026-08-06 — Prompt 022

### Agregado

- `src/domain/portfolio/PortfolioAnalysisService.js` como Business Service puro para consolidación, alertas, agregados, métricas y estructura final inmutable.
- Contratos internos `consolidateRecords(records)` y `analyzePortfolio(...)`.
- Registro en `docs/prompts/Prompt022-PortfolioAnalysisService.md` y evidencia local en `logs/Prompt022-PortfolioAnalysisService.log`.

### Modificado

- Application Service para orquestar el nuevo servicio y conservar físicamente Distribution y Pareto.
- Arquitectura, reglas, roadmap e historial para registrar responsabilidades, dependencias y posición del Business Service.

### Sin cambios funcionales

- Se conservan resultados, filtros, ordenamientos, reglas, fórmulas, parámetros, errores y contrato público.
- No se modifican App/JSX, navegación, Repository, Provider, Configuration Center, motores, parsers, Executive Report, Recommendation Engine o exportaciones.
- No se agregan dependencias, persistencia, asincronía o integración directa con fuentes.

## 2026-08-06 — Prompt 021

### Agregado

- Validación unitaria de IDs duplicados, keys duplicadas y schema inconsistente en `src/configuration/__tests__/configurationSchema.test.js`.
- Decisión D-022 y registro ejecutable en `docs/prompts/Prompt021-SingleSourceOfTruth.md`.

### Modificado

- `configurationSchema.js` valida unicidad, campos obligatorios y coherencia de tipos/defaults.
- `configurationService.js` valida el schema una sola vez y deriva de él las claves autorizadas.
- Repository elimina `REQUIRED_PILOT_CONFIGURATION_KEYS` y consume exclusivamente el resultado central de integridad.
- Arquitectura, configuración e historial declaran oficialmente `CONFIGURATION_SCHEMA` como Single Source of Truth.

### Sin cambios funcionales

- Se conservan los tres pilotos, defaults, contratos públicos y comportamiento síncrono.
- No se modifican UI, Domain, parámetros, overrides, Provider, persistencia, dependencias ni integración Dataverse.

## 2026-08-06 — Prompt 020

### Agregado

- `src/configuration/configurationDefaults.js`, `configurationSchema.js` y `configurationService.js` como foundation limitada a PAR-001/PAR-002/PAR-003.
- Esquema explícito y cuatro contratos síncronos de lectura/validación, sin React, UI o persistencia.
- Registro en `docs/prompts/Prompt020-ConfigurationCenterFoundation.md` y evidencia local en `logs/Prompt020-ConfigurationCenterFoundation.log`.

### Modificado

- Repository para validar internamente las tres claves piloto, conservando sus seis contratos públicos.
- Arquitectura, configuración, decisiones e historial para registrar el patrón y los criterios de migración futura.

### Sin cambios funcionales

- No cambiaron `App.jsx`, JSX, navegación, Domain, motores, parsers, Provider, fuentes, reglas, fórmulas o defaults fuera de los tres pilotos.
- No se agregaron UI, dependencias, asincronía, persistencia, Provider nuevo, DataverseProvider o esquema Dataverse.

## 2026-08-06 — Prompt 019

### Agregado

- `BUSINESS_PARAMETERS.md` con 160 elementos correlativos y trazabilidad de JSON, estado React, Application Service, Domain, Repository, Provider, dashboard y exportaciones.
- Clasificación explícita en 82 parámetros configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos de UI y 2 valores derivados.
- Registro ejecutable en `docs/prompts/Prompt019-BusinessParametersCatalog.md` y evidencia local en `logs/Prompt019-BusinessParametersCatalog.log`.

### Modificado

- Configuración, reglas, fuentes, decisiones e historial para declarar el catálogo como fuente oficial del futuro Configuration Center.
- Riesgos documentados de duplicidad entre JSON y hardcodes, sin corregirlos dentro de este alcance.

### Sin cambios funcionales

- No se modificaron archivos de `src`, `package.json`, dependencias, reglas, fórmulas, defaults, fuentes físicas, UI, Application Service o Domain.
- No se creó Configuration Center ni se definieron entidades, campos, permisos o mapeos Dataverse.

## 2026-08-05 — Prompt 018

### Agregado

- 19 pruebas dedicadas de Repository para delegación, Provider incompleto, métodos ausentes y configuración del procesamiento.
- 15 pruebas dedicadas de Local Provider para sus seis lecturas y formas mínimas.
- Registro del prompt en `docs/prompts/Prompt018-RepositoryProviderContracts.md`.
- Evidencia local en `logs/Prompt018-RepositoryProviderContracts.log`.

### Modificado

- Repository para validar al construir los seis métodos obligatorios del Provider.
- Local Provider para validar strings y formas mínimas de parámetros, configuración, catálogos y ejemplos.
- Application Service para devolver errores controlados ante configuración ausente, inválida o incompleta.
- Arquitectura, fuentes, migración Dataverse, decisiones, estándares, configuración, baseline e historial para reflejar los contratos fortalecidos.

### Sin cambios funcionales

- `getConfiguracion()` continúa nullable en Repositories parciales, mientras el procesamiento exige las cinco claves que ya consumía.
- No cambiaron JSX, navegación, parsers, motores, fórmulas, defaults, resultados válidos, fuentes, dependencias o asincronía.
- Se mantuvieron las 117 pruebas previas y la suite total aumentó a 151.

## 2026-08-05 — Prompt 017

### Agregado

- `src/repositories/sellThroughRepository.js` como frontera estable para Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo.
- `src/providers/local/localDataProvider.js` como único adaptador de las fuentes locales actuales.
- Registro del prompt en `docs/prompts/Prompt017-RepositoryLayer.md`.
- Evidencia local en `logs/Prompt017-RepositoryLayer.log`.

### Modificado

- `src/App.jsx` y Application Service para consumir fuentes únicamente mediante Repository, sin modificar JSX o navegación.
- La prueba de Inventory/EOL que leía `dataService` para que use el contrato Repository.
- Arquitectura, fuentes, migración Dataverse, decisiones, baseline, descripción, roadmap, glosario, configuración e historial para reflejar la frontera implementada.

### Sin cambios funcionales

- No cambiaron parsers, Inventory Engine, EOL Engine, reglas, cálculos, defaults, resultados, dependencias ni fuentes físicas.
- Las 117 pruebas existentes continuaron aprobando.

## 2026-08-05 — Prompt 016

### Agregado

- `src/domain/parser/masterParser.js` y `inventoryParser.js` para normalizar ambas entradas.
- `src/domain/parser/recordAssembler.js` para construir cada `record` mediante los motores existentes.
- `src/application/sellThroughApplicationService.js` para coordinar validación, parsing, ensamblaje, agrupaciones, alertas, distribuciones y Pareto.
- Registro del prompt en `docs/prompts/Prompt016-ApplicationService.md`.
- Evidencia local en `logs/Prompt016-ApplicationService.log`.

### Modificado

- `src/App.jsx` para delegar el procesamiento al Application Service, sin modificar JSX o navegación.
- Arquitectura, reglas, fuentes, decisiones, baseline, descripción, roadmap, glosario e historial para reflejar las capas implementadas.

### Sin cambios funcionales

- Se conservaron aliases, errores, defaults, duplicados, forma de `record`, fórmulas, fecha base, agregaciones, Pareto, textos y resultados.
- Las 117 pruebas existentes aprobaron sin modificar casos; `dataService.js`, `datos.json`, JSX, dependencias y configuración permanecieron sin cambios.

## 2026-08-05 — Prompt 015

### Agregado

- `src/__tests__/parserRecordCharacterization.test.js` con 28 pruebas deterministas sobre los parsers y el ensamblaje real de `App`.
- Datasets controlados para delimitadores, encabezados, alias, faltantes, duplicados, precedencias, defaults y registros `SIN MAESTRO`.
- Registro del prompt en `docs/prompts/Prompt015-ParserRecordCharacterization.md`.
- Evidencia local en `logs/Prompt015-ParserRecordCharacterization.log`.

### Documentado

- Contrato actual de parsing y forma de `record` antes de extraer Parser o Application Service.
- Riesgo de colisiones por subcadena durante la detección parcial de columnas.
- Total acumulado de 117 pruebas: 49 de utilidades, 40 de motores y 28 de parsers/records.

### Sin cambios funcionales

- No se modificaron `src/App.jsx`, módulos de producción, JSX, fuentes, reglas, defaults o contratos.
- No se extrajeron parsers ni se agregaron dependencias o configuración.

## 2026-08-05 — Prompt 014

### Agregado

- `src/domain/inventory/inventoryEngine.js` con nueve contratos puros del Inventory Engine.
- `src/domain/eol/eolEngine.js` con cinco contratos puros del EOL Engine.
- Registro del prompt en `docs/prompts/Prompt014-ExtractInventoryEolEngines.md`.
- Evidencia local en `logs/Prompt014-ExtractInventoryEolEngines.log`.

### Modificado

- `src/App.jsx` para orquestar los nuevos motores sin modificar JSX, navegación, fuentes o fecha base.
- Las 40 pruebas de Prompt 013 para validar directamente los módulos y conservar una prueba puente desde `App`.
- Arquitectura, catálogo de reglas, decisiones e historial para registrar la extracción.

### Sin cambios funcionales

- Se conservaron fórmulas, defaults, límites, tablas, textos de acción y resultados numéricos caracterizados.
- `dataService.js`, `datos.json`, dependencias y configuración permanecieron sin cambios.

## 2026-08-05 — Prompt 013

### Agregado

- `src/__tests__/inventoryEolCharacterization.test.js` con 40 pruebas deterministas sobre el handler real de cálculo.
- Datasets TSV controlados con fecha base `2026-08-01`, límites de buckets/fases y rutas USA/CHINA/faltantes.
- Registro del prompt en `docs/prompts/Prompt013-InventoryEOLCharacterization.md`.
- Evidencia local en `logs/Prompt013-InventoryEOLCharacterization.log`.

### Documentado

- Baseline automatizada de BR-006 a BR-015 para Inventory Engine y EOL Engine.
- Arnés temporal de test, alcance de cobertura, dependencias y estrategia de reemplazo durante la futura extracción.
- Total acumulado de 89 pruebas: 49 de utilidades y 40 de motores.

### Sin cambios funcionales

- No se modificaron `src/App.jsx`, módulos de producción, JSX, fuentes, configuración, reglas ni resultados.
- No se agregaron dependencias o archivos de configuración.

## 2026-08-05 — Prompt 012

### Agregado

- Vitest `3.2.7` como herramienta de pruebas compatible con Vite 5.
- 49 pruebas de caracterización en `src/utils/__tests__/` para los ocho exports de utilidades.
- Script `npm test` en `package.json`.
- Registro del prompt en `docs/prompts/Prompt012-UtilityCharacterizationTests.md`.
- Evidencia local en `logs/Prompt012-UtilityCharacterizationTests.log`.

### Modificado

- `package-lock.json` para registrar el árbol de dependencias de Vitest.
- Arquitectura, estándares, decisiones, flujo AI-First, descripción general y baseline para reflejar la nueva validación automatizada.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 012.

### Sin cambios funcionales

- No se modificaron implementaciones, firmas públicas, reglas de negocio, JSX ni comportamiento visible.
- Las pruebas documentan incluso los fallbacks, formatos y normalizaciones actuales sin corregirlos.

## 2026-08-05 — Prompt 011

### Agregado

- `src/utils/formatters.js` para `fmtUSD`, `fmtPct`, `fmtIdx` y `fmtUSDInline`.
- `src/utils/dateUtils.js` para `parseFecha`, `diasEntre` y `primerDiaMes`.
- `src/utils/headerUtils.js` para `normalizeHeader`.
- Registro del prompt en `docs/prompts/Prompt011-ExtractPureFunctions.md`.
- Evidencia local en `logs/Prompt011-ExtractPureFunctions.log`.

### Modificado

- `src/App.jsx` para importar las funciones extraídas y eliminar únicamente sus definiciones locales.
- `docs/knowledge/ARCHITECTURE.md` para registrar la primera separación modular.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 011.

### Sin cambios funcionales

- Se conservaron nombres, firmas, parámetros y cuerpos de las ocho funciones.
- No se modificó JSX, estado React, reglas, cálculos, resultados ni comportamiento observable.

## 2026-08-05 — Prompt 010

### Agregado

- `FUNCTIONAL_BASELINE.md` como inventario oficial previo a la refactorización de `App.jsx`.
- Registro del prompt en `docs/prompts/Prompt010-FunctionalBaseline.md`.
- Evidencia local en `logs/Prompt010-FunctionalBaseline.log`.

### Documentado

- Pantallas, secciones, estados vacíos y estados condicionales.
- KPIs, tablas, botones y acciones observables.
- Contratos efectivos de entrada, CSV, Excel e impresión/PDF.
- Inventory Engine, EOL Engine, Pareto, Distribution, Executive Report y exportaciones.
- Responsabilidades concentradas en `App.jsx` e invariantes para la refactorización.

### Modificado

- `docs/README.md` para indexar la baseline.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 010.

### Sin cambios funcionales

- No se modificó `src/` ni `App.jsx`.
- No se movió código ni se crearon componentes.

## 2026-08-05 — Prompt 009.5

### Agregado

- Estructura oficial `docs/knowledge/` con doce documentos.
- Índice y reglas de lectura en `docs/README.md`.
- Registro ejecutable del prompt en `docs/prompts/Prompt009.5-KnowledgeBase.md`.
- Catálogos de reglas, fuentes, parámetros, decisiones y glosario basados en el código V1.
- Estado explícito de la preparación para Dataverse, sin entidades ni columnas asumidas.

### Modificado

- `AGENTS.md` para exigir la revisión de Knowledge Base, prompts y Git antes de modificar cualquier archivo.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 009.5.

### Sin cambios funcionales

- No se modificó `src/`.
- No se movió código.
- No se modificó la configuración de Git.

## Mantenimiento

Cada prompt que altere arquitectura, reglas, fuentes, parámetros, decisiones o roadmap debe agregar una entrada con fecha, alcance y efecto funcional.
