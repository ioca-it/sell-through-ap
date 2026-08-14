# Estado vigente de arquitectura

## Fase actual

PHASE1-012 deja la UI de Configuración preparada para activar el Customer Provider Dataverse después de revisión. Código y nombre usan la cadena Provider→Repository→Application Service, una única entidad seleccionada sincroniza los cuatro campos Customer, y cero resultados, sesión ausente, 401/403/429/5xx, red, timeout, deduplicación y respuestas obsoletas quedan controlados y cubiertos. No se realizó activación ni deploy: `VITE_CUSTOMER_SOURCE=local` permanece sin cambios.

## Último prompt aprobado

PHASE1-012 — Activate Dataverse Customer Provider in UI.

## Última auditoría aprobada

Claude 004 — Portfolio Analysis Service, ejecutada el 2026-08-06. Verificó 154 pruebas y build aprobados; su hallazgo de congelamiento cruzado fue resuelto por Prompt 023.

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
- Customer Provider Factory: selecciona `local` o `dataverse` mediante `VITE_CUSTOMER_SOURCE` y rechaza valores no soportados.
- Local Customer Provider: alternativa temporal con cinco fixtures ficticios normalizados e inyección opcional para pruebas.
- Customer API backend portable: rutas cerradas, CORS por allowlist, Customer Service y composición independiente de hosting.
- Entra Token Provider y Dataverse Client: client_credentials, scope derivado, cache/expiración, timeout y errores normalizados.
- Account Customer Gateway: único módulo productivo que conoce `accounts`, `new_codigocliente`, `name` y `crbbe_nombrepais`.
- Customer API Authenticator: frontera reusable JWT/JWKS con `jose`, separada del OAuth API→Dataverse, con diagnósticos internos normalizados y seguros por etapa de rechazo.
- Rate Limiter: límites por IP y `oid/sub`, store in-memory inyectable y respuesta 429/Retry-After.
- Health endpoint: `/health` anónimo y sin dependencias externas.
- Configuration Center Foundation: PAR-001, PAR-002 y PAR-003 con schema como fuente única de IDs/keys.

## Servicios pendientes

- Extracción futura de las narrativas consultivas restantes de `App.jsx` y Recommendation Engine: pendientes de alcance específico.
- Extracción futura de Distribution y Pareto: pendiente de prompt independiente.
- Revisión y activación en Vercel de `VITE_CUSTOMER_SOURCE=dataverse`: pendientes; la fuente efectiva continúa en `local`.
- Validación interactiva real de búsqueda por código/nombre y estados de cero/error desde los combobox después de activar la fuente: pendiente.
- Render se mantiene como backend transitorio; la migración futura a Azure permanece pendiente.
- Store distribuido de rate limiting: obligatorio antes de múltiples instancias o escala horizontal en Azure.
- DataverseProvider para Maestro Producto y cualquier otra entidad: no implementados.
- Mapping/nombre lógico real de `customerType`: pendiente de confirmación; el contrato usa fallback vacío y no selecciona una columna Dataverse nueva.
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

Arquitectura Customer validada mediante el smoke real:

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

Cadena Customer preparada para activación en UI:

```text
Dataverse
  → Render Customer API
  → DataverseCustomerProvider
  → CustomerRepository
  → Customer Application Service
  → UI Configuración
```

Distribution y Pareto permanecen en Application Service. Executive Report consume el DTO de Portfolio Analysis; presentación, narrativas y exportaciones permanecen en `App.jsx` sin acceder directamente a fuentes físicas.

## Siguiente hito

Revisar Phase1-012 y, sólo mediante autorización posterior, cambiar `VITE_CUSTOMER_SOURCE=dataverse` en Vercel para validar interactivamente ambos combobox y los estados de cero/error. `customerType` continúa vacío hasta confirmar su mapping; Render permanece transitorio y Azure sigue como destino futuro.

## Decisiones congeladas

- Preservar comportamiento, fórmulas, defaults, ordenamientos y contratos públicos durante refactorizaciones.
- `BUSINESS_PARAMETERS.md` es el catálogo oficial del Configuration Center.
- `CONFIGURATION_SCHEMA` es la fuente única de IDs, keys y metadatos migrados; defaults se declaran una sola vez.
- Repository/Provider son la frontera obligatoria de fuentes; Customer es el único contrato Dataverse normalizado aprobado. `customerType` pertenece al contrato lógico, pero su nombre físico no está confirmado y no se agregó al gateway backend.
- La UI mantiene una única selección de cliente; código, nombre, país y tipo se reemplazan juntos desde Customer Master Application Service.
- Las búsquedas Customer de UI invalidan toda selección previa al editar, deduplican el mismo request pendiente y sólo permiten que el identificador de request más reciente publique resultados.
- Los errores Customer públicos son mensajes estáticos por categoría; detalles originales de MSAL, red o API nunca llegan a la UI.
- `VITE_CUSTOMER_SOURCE` selecciona exclusivamente `local` o `dataverse`; `local` es el fallback compatible cuando la variable no está definida.
- La configuración pública MSAL usa exclusivamente variables `VITE_AUTH_*`; SellThrough-Web no tiene client secret y los access tokens quedan bajo el cache de MSAL en `sessionStorage`, sin almacenamiento manual.
- Render es hosting temporal y no una dependencia arquitectónica; Azure podrá sustituirlo manteniendo handler, variables neutrales y contratos.
- Tenant, client secret y access token Dataverse existen solo en backend. El token delegado de usuario se limita al Provider frontend; la UI no interpreta JWT, consulta Dataverse ni envía OData.
- Usuario→Customer API usa JWT delegado `AUTH_*`; API→Dataverse usa `DV_*` y client_credentials. Las credenciales nunca se reutilizan entre fronteras.
- Los diagnósticos JWT de backend son exclusivamente internos y estáticos: no reciben ni registran tokens, Authorization, payloads completos, identidades, emails o secretos; los contratos HTTP públicos permanecen sin detalle técnico.
- CORS no es autenticación; toda ruta Customer exige Bearer válido. `/health` es la única ruta funcional anónima.
- El probe Phase1-007 usa `GET /api/customers/search?type=code` sin `q`: `400 / INVALID_CUSTOMER_REQUEST` confirma que JWT y scope fueron aceptados y que la validación se detuvo antes de Dataverse.
- El smoke Phase1-010B quedó cerrado por Phase1-011 como PASS: la búsqueda controlada `type=code&q=CL0000041` validó Vercel → MSAL/Entra → token delegado → Render Customer API → JWT → `client_credentials` backend → Dataverse → `accounts`, con `HTTP 200` y exactamente una coincidencia. Sólo se conserva el conteo; no se activa el Provider Dataverse de la UI ni se elimina todavía el arnés.
- Rate limiting in-memory solo es válido para una instancia temporal; Azure horizontal requiere store distribuido.
- El procesamiento vigente es síncrono y local.
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
- F4 aplica después de 365 días con descuento 15% y umbral de 12 unidades.
- La Tabla de Descuento por Fase y su hoja Excel consumen todas las fases efectivas entregadas por Application Service; F4 se resuelve con la regla de Domain y `datos.json` conserva F0–F3.
- Executive Report, Recommendation Engine y Configuration Center UI requieren prompts separados.
- `sell-through-ap` permanece separado de NEXUS.

## Métricas actuales

- 160 elementos en el catálogo de parámetros: 82 configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos UI y 2 valores derivados.
- Tres parámetros piloto visibles en Configuration Center MVP; todos permanecen no editables según el catálogo aprobado.
- MVP de presentación listo para demo: Dashboard ejecutivo, exportaciones Excel/PDF y metadata/favicons de producción.
- Veinticuatro archivos de pruebas frontend y siete archivos de pruebas backend.

## Cantidad de pruebas

Frontend: 282/282 aprobadas en 24 archivos. Backend: 42/42 aprobadas.

## Estado del build

Frontend aprobado con Vite 5.4.21 y 1675 módulos transformados. Backend syntax check aprobado en el último hito backend. `git diff --check` aprobado. Última validación frontend: PHASE1-012, 2026-08-14.
