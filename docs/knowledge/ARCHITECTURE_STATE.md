# Estado vigente de arquitectura

## Fase actual

PHASE1-052 queda **PASS — PRODUCT METADATA ENTITY RESOLUTION FIXED / NOT DEPLOYED / NOT EXECUTED / NOT ACTIVATED**. La evidencia productiva proporcionada confirma `TRIGGER/REACHED` seguido de `ENTITY_DEFINITION/FAIL`. La causa técnica exacta estaba en la consulta temporal de Phase1-048: añadía `$top=2` a `EntityDefinitions`, aunque las consultas de metadata Dataverse usan `$select`/`$filter` y esa colección devuelve todas las coincidencias sin paginación. El fallo ocurría antes de resolver el `LogicalName`, no en el Entity Set productivo confirmado `productpricelevels`.

La resolución consulta ahora `EntityDefinitions?$select=LogicalName,EntitySetName&$filter=EntitySetName eq 'productpricelevels'`, sin `$top`; filtra de nuevo en memoria por igualdad exacta, exige una única coincidencia y valida el `LogicalName` recibido. Solo entonces consulta `EntityDefinitions(LogicalName='<resuelto>')/Attributes`; no existe un LogicalName de tabla hardcodeado. La observabilidad queda en `TRIGGER/REACHED`, `ENTITY_DEFINITION/PASS|FAIL`, `ATTRIBUTES/PASS|FAIL` y `CANDIDATES/FOUND|NONE`, seguida únicamente de propiedades técnicas allowlisted. La guardia se fija antes del primer `await`, por lo que sigue siendo once-per-process y segura ante concurrencia. Product Gateway, `productpricelevels`, `producturl`, mappings, filtros y contratos permanecen sin cambios, y no se ejecutó metadata contra Dataverse productivo.

Maestro Producto dispone de una ruta intercambiable `local|dataverse` mediante `VITE_PRODUCT_SOURCE`, con `local` como default vigente. El backend portable incorpora `GET /api/products/master`; Product Price Level Gateway consulta exclusivamente `productpricelevels`, aplica en backend el filtro de compradores `IOCA USA INC` o `SAND SPORTS, CORP.`, pagina mediante Dataverse Client y consolida por SKU el pivot `USA -> priceUSA` / `CHINA -> priceChina`. La UI no envía OData; los LogicalNames permanecen en la integración backend y Phase1-046 los replica temporalmente solo como candidatos de probe.

El contrato normalizado frontend es `{ sku, productName, brand, category, discontinuationDate, fechaStr, creationDate, level, status, imageUrl, productUrl, priceUSA, priceChina }`. `fechaStr` se deriva con la única función `normalizeFechaStr`: fecha válida local/ISO/con hora produce `YYYY-MM-DD`, y ausencia o invalidez produce `""`, sin desplazar el día escrito por timezone. `discontinuationDate` y `creationDate` conservan `Date|null`. `level` y `status` solicitan FormattedValue; si falta, solo aceptan como fallback un valor fuente que ya sea texto y nunca publican códigos Choice numéricos. La consolidación ignora valores descriptivos vacíos, compara strings/URLs trimmed, fechas canónicas y etiquetas FormattedValue trimmed, e impide que valores no vacíos divergentes de cualquiera de los nueve atributos Product se consoliden silenciosamente. Tanto los conflictos de precio como los de atributo reutilizan `409 / PRODUCT_MASTER_CONFLICT`, se distinguen solo en metadata interna y mantienen el contrato público sanitizado. Phase1-038 fija `0 = precio real` y `null = precio no disponible`: `amount null|undefined` y un origen sin fila quedan en `null`, mientras las valorizaciones dependientes propagan `null` sin fallback. Render continúa transitorio, Azure sigue siendo el destino definitivo y no se activó Product Dataverse en producción.

## Último prompt aprobado

PHASE1-052 — Fix Product Metadata Entity Resolution.

## Última auditoría aprobada

Claude Phase1-034 — Audit Dataverse Product Master, ejecutada el 2026-08-17. Sus tres observaciones previas a activación quedaron resueltas sin activar Dataverse: Phase1-036 protege atributos divergentes, Phase1-038 preserva precios ausentes como `null` y Phase1-040 normaliza `fechaStr` entre fuentes.

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
- Real Dataverse Product Master Smoke Test: el arnés temporal `?phase1-042-product-smoke=1` confirmó llegada a Render, JWT aceptado e intento Dataverse. La evidencia posterior a Phase1-044 confirma que `productpricelevels` eliminó el 404 y que la consulta Product actual recibe `HTTP 400 / DATAVERSE_INVALID_FIELD_OR_FILTER`. Consulta únicamente `GET /api/products/master`, exige sesión/token MSAL y publica solo `{ httpStatus, productsReturned, renderJwtValidation, dataverseRequest, diagnostic, hasPriceUSA, hasPriceChina, hasNullPrice, hasFormattedLevel, hasFormattedStatus }`; el arnés puede retirarse eliminando su módulo, prueba y llamada aislada en `main.jsx`.
- Customer Provider Factory: selecciona `local` o `dataverse` mediante `VITE_CUSTOMER_SOURCE` y rechaza valores no soportados.
- Local Customer Provider: alternativa temporal con cinco fixtures ficticios normalizados e inyección opcional para pruebas.
- Product normalizer, Repository y Product Master Application Service: contrato normalizado independiente de la fuente y adaptación hacia Master Parser/Record Assembler que preserva `0` como precio real, `null` como no disponible y `fechaStr` canónico sin perder el día fuente.
- Product Provider Factory: selecciona `local` o `dataverse` mediante `VITE_PRODUCT_SOURCE`; `local` continúa como default y reutiliza `masterParser.js` sin duplicar sus reglas.
- Dataverse Product Provider frontend: consume únicamente `GET /api/products/master` mediante el transporte HTTP autenticado compartido; no construye OData ni conoce `productpricelevels` o sus LogicalNames.
- Product Price Level Gateway backend: encapsula mapping, filtro de compañías, paginación, FormattedValue, consolidación USA/CHINA, nulabilidad de precios ausentes y detección determinística de conflictos de precio o de cualquiera de los nueve atributos únicos por SKU.
- Product Service/API: endpoint funcional cerrado, protegido por el JWT/rate limiter existentes y compuesto con el Dataverse Client/OAuth/diagnóstico ya implementados.
- Customer API backend portable: rutas cerradas, CORS por allowlist, Customer Service y composición independiente de hosting.
- Entra Token Provider y Dataverse Client: client_credentials, scope derivado, cache/expiración, timeout y errores normalizados.
- Diagnóstico seguro Dataverse Phase1-020: clasifica fallos HTTP/OData, respuesta inválida y red en siete identificadores internos; los Application Logs reciben solo identificador, operación, tipo de fallo, status upstream opcional y presencia de metadata estructurada, nunca error/payload/URL/query/credenciales/PII.
- Diagnóstico temporal Product Phase1-046: después de `DATAVERSE_INVALID_FIELD_OR_FILTER / 400`, prueba una vez por proceso el Entity Set, 13 campos individuales, select compuesto, dos comparaciones textuales, filtro compuesto, cuatro órdenes individuales, orden compuesto, anotación, top y consulta compuesta. Cada probe usa `$top=1`, descarta el body sin leerlo y emite únicamente `sequence`, `category`, `element` y `PASS|FAIL`; debe retirarse tras la corrección definitiva.
- Diagnóstico temporal Product Phase1-048/050/052: inmediatamente después del `select_field=producturl / FAIL` de Phase1-046 emite `TRIGGER/REACHED`; resuelve la definición mediante la colección `EntityDefinitions` con `$select`/`$filter`, sin `$top`, validación exacta/única de `EntitySetName=productpricelevels` y LogicalName obtenido de metadata. Después consulta sus atributos filtrados por `url|product|producto` y emite PASS/FAIL por `ENTITY_DEFINITION` y `ATTRIBUTES`, o candidatos encontrados. Registra únicamente etapas/resultados técnicos, conteo y las cinco propiedades allowlisted por atributo; corre máximo una vez por proceso y debe retirarse al resolver/corregir el LogicalName definitivo.
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
            -> Product API portable (`GET /api/products/master`)
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

Arnés Product ejecutado previamente; Entity Set confirmado y consulta Product en HTTP 400:

```text
Vercel + `?phase1-042-product-smoke=1`
  -> initializeAuthentication / sesión MSAL existente
    -> getAccessToken / delegated access token
      -> GET Render `/api/products/master`
        -> JWT Authenticator / Rate Limiter
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client -> `productpricelevels`
                -> resumen sanitizado en consola (sin Product payload)
```

Distribution y Pareto permanecen en Application Service. Executive Report consume el DTO de Portfolio Analysis; presentación, narrativas y exportaciones permanecen en `App.jsx` sin acceder directamente a fuentes físicas.

## Siguiente hito

Después de revisar Phase1-052, solicitar autorización separada para checkpoint y deploy exclusivo del backend, sin cambiar `VITE_PRODUCT_SOURCE=local`. Tras reiniciar el proceso, ejecutar exactamente una vez el arnés existente `?phase1-042-product-smoke=1` y capturar los eventos JSON `PHASE1_048_PRODUCT_URL_METADATA`. La secuencia esperada es `TRIGGER/REACHED`, `ENTITY_DEFINITION/PASS` y luego `ATTRIBUTES/PASS` más `CANDIDATES/FOUND|NONE`, o el `FAIL` sanitizado de la etapa exacta. Solo con candidatos reales se debe preparar otro prompt para corregir el Gateway y retirar simultáneamente Phase1-046/048/050/052. La activación normal de Product Dataverse permanece como decisión posterior e independiente.

## Decisiones congeladas

- Preservar comportamiento, fórmulas, defaults, ordenamientos y contratos públicos durante refactorizaciones.
- `BUSINESS_PARAMETERS.md` es el catálogo oficial del Configuration Center.
- `CONFIGURATION_SCHEMA` es la fuente única de IDs, keys y metadatos migrados; defaults se declaran una sola vez.
- Repository/Provider son la frontera obligatoria de fuentes. Customer y Product son contratos Dataverse normalizados aprobados; los LogicalNames permanecen en la integración Dataverse backend. La única réplica temporal permitida es la lista de candidatos de probes Phase1-046.
- Toda consulta Product usa `productpricelevels` y filtra en Product Price Level Gateway `crbbe_companiacompradora` por `IOCA USA INC` o `SAND SPORTS, CORP.`. El frontend no puede enviar filtros, selects, órdenes ni parámetros OData.
- Product consolida por SKU y pivota únicamente `USA -> priceUSA` y `CHINA -> priceChina`; `0` es precio real y un precio/origen ausente queda en `null`. Solo números distintos participan en conflictos: cero contra otro número bloquea con `PRODUCT_MASTER_CONFLICT`, mientras null/ausente no compite con un valor real. No existe fallback entre orígenes.
- `productName`, `brand`, `category`, `level`, `status`, `discontinuationDate`, `creationDate`, `imageUrl` y `productUrl` son únicos por SKU: vacío más valor puede inicializar, pero dos valores no vacíos distintos después de normalizar bloquean con `PRODUCT_MASTER_CONFLICT`; no existe precedencia por fila, comprador, fecha, mayoría ni otro criterio.
- `level` y `status` Product usan FormattedValue cuando está presente. Sin anotación, solo un valor fuente textual puede usarse como fallback; un Choice numérico nunca se publica como etiqueta.
- `VITE_PRODUCT_SOURCE` selecciona `local|dataverse`; `local` es el default vigente y Product Dataverse no está activado en producción.
- El smoke-test Phase1-042 solo puede ejecutarse con `?phase1-042-product-smoke=1`, llama al endpoint Product existente sin parámetros y no consulta mediante Product Provider Factory; su presencia no modifica la fuente global ni el flujo normal.
- Phase1-046 es diagnóstico Product temporal: solo se activa tras `DATAVERSE_INVALID_FIELD_OR_FILTER` con upstream 400, corre máximo una vez por proceso y nunca expone sus probes al frontend. Debe retirarse después de identificar y corregir con evidencia los LogicalNames, tipos, literales o composiciones definitivos.
- Phase1-048/050/052 es diagnóstico Product temporal: se activa inmediatamente tras el `FAIL` individual de `producturl` dentro de Phase1-046, antes de los probes posteriores; emite entrada y PASS/FAIL sanitizados por resolución de entidad y consulta de atributos, o candidatos obtenidos. Resuelve metadata por el `EntitySetName` confirmado `productpricelevels` mediante `$select`/`$filter` sin `$top`, exige una única coincidencia exacta y usa únicamente el LogicalName devuelto para navegar a `Attributes`. Corre máximo una vez por proceso y no expone metadata al frontend. `producturl` no se corrige ni elimina hasta disponer de evidencia real; el diagnóstico debe retirarse con la corrección definitiva.
- Account Customer Gateway encapsula `new_tipocliente@OData.Community.Display.V1.FormattedValue` y expone su etiqueta únicamente como `customerType`, con fallback vacío cuando la anotación falta, es `null` o `undefined`; el valor numérico `new_tipocliente` nunca sustituye la etiqueta.
- Toda consulta Customer a `accounts` usa en Account Customer Gateway el filtro fijo confirmado `customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4`. Las tres reglas siguen siendo obligatorias y no amplían el `$select`, el mapping ni el contrato Customer.
- La UI mantiene una única selección de cliente; código, nombre, país y tipo se reemplazan juntos desde Customer Master Application Service.
- Las búsquedas Customer de UI invalidan toda selección previa al editar, deduplican el mismo request pendiente y sólo permiten que el identificador de request más reciente publique resultados.
- Los errores Customer públicos son mensajes estáticos por categoría; detalles originales de MSAL, red o API nunca llegan a la UI.
- Los diagnósticos Dataverse Phase1-020 son internos y seguros: solo registran campos allowlisted derivados y mantienen disponible `DATAVERSE_INVALID_FIELD_OR_FILTER`. No registran tokens, headers Authorization, secretos, JWT, cookies, payloads Dataverse, PII Customer, customerCode, URLs/query strings, mensajes upstream ni stack traces.
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
- Treinta y dos archivos de pruebas frontend y doce archivos de pruebas backend.

## Cantidad de pruebas

Frontend: 342/342 aprobadas en 32 archivos. Backend: 101/101 aprobadas en 12 archivos.

## Estado del build

Phase1-052: pruebas focalizadas Product/Customer 75/75, backend 104/104 y frontend 342/342 en 32 archivos; build frontend aprobado con Vite 5.4.21 y 1683 módulos transformados; backend syntax check aprobado. Phase1-032 permanece como último cierre productivo de Maestro Cliente; Product Dataverse no fue activado y la corrección metadata Phase1-052 no se desplegó ni ejecutó contra producción.
