# Roadmap aprobado

## Phase1-048 — Resolve Dataverse Product URL Logical Name

Maestro Producto queda **METADATA DIAGNOSTIC IMPLEMENTED / NOT DEPLOYED / NOT
EXECUTED / NOT ACTIVATED**. La evidencia productiva proporcionada de
Phase1-046 confirma que `productpricelevels`, los otros doce campos, filtros,
orden, FormattedValue y `$top` pasan, mientras `producturl` falla de forma
individual y arrastra las dos composiciones que lo incluyen.

Phase1-048 añade una consulta backend temporal de metadata que se dispara solo
después de ese `FAIL`, máximo una vez por proceso. Resuelve la entidad por
`EntitySetName=productpricelevels` y consulta únicamente sus atributos cuyos
LogicalNames contienen `url`, `product` o `producto`; los eventos
`PHASE1_048_PRODUCT_URL_METADATA` quedan reducidos a LogicalName, SchemaName,
AttributeType, IsValidForRead y `CANDIDATE|NOT_CANDIDATE`.

No cambia el Gateway definitivo: `producturl` permanece en `$select`, mapping
y contrato `productUrl`. Tampoco cambia frontend, Product Domain/Provider/
Repository/Application Service, Customer Master, variables o infraestructura.
El siguiente paso requiere checkpoint/deploy backend autorizado y una única
captura; la corrección del LogicalName y el retiro de Phase1-046/048 exigen un
prompt posterior basado en metadata real.

## Phase1-046 — Isolate Dataverse Product Invalid Field or Filter

Maestro Producto queda **DIAGNOSTIC IMPLEMENTED / NOT DEPLOYED / NOT EXECUTED /
NOT ACTIVATED**. La evidencia productiva proporcionada confirma que
`productpricelevels` responde y que la consulta actual falla con
`HTTP 400 / DATAVERSE_INVALID_FIELD_OR_FILTER`. El backend prepara 26 probes
sanitizados en 10 categorías para aislar campos, comparaciones textuales,
filtro, orden, anotación, top y composición, exclusivamente después del error
exacto y máximo una vez por proceso.

No cambia ningún LogicalName, mapping, literal funcional, regla Product o
contrato público. Phase1-046 es temporal y debe retirarse al confirmar e
implementar la corrección definitiva. El siguiente paso requiere autorización
separada para checkpoint/deploy y una única ejecución del smoke Phase1-042; la
activación normal de Product Dataverse continúa fuera de alcance.

## Phase1-044 — Correct Dataverse Product EntitySetName

Maestro Producto queda **ENTITY SET CORRECTED / NOT REVALIDATED / NOT
ACTIVATED**. El smoke Product confirmado alcanzó Render, aceptó el JWT e
intentó la consulta Dataverse, que respondió HTTP 404 porque el Product Price
Level Gateway usaba el Entity Set singular `productpricelevel`. El runtime
consulta ahora exactamente `productpricelevels` y una prueba independiente
falla si se reintroduce el singular.

Mappings, filtro de compradores, semántica `0`/`null`, pivot USA/CHINA,
FormattedValue, conflictos, contrato Product, `fechaStr` y Maestro Cliente no
cambian. `VITE_PRODUCT_SOURCE=local` permanece vigente. Deploy, smoke
productivo de revalidación y activación Dataverse requieren autorización
posterior e independiente.

## Phase1-042 — Prepare Real Dataverse Product Master Smoke Test

Maestro Producto queda **SMOKE PREPARED / NOT EXECUTED / NOT ACTIVATED**. El
trigger temporal `?phase1-042-product-smoke=1` reutiliza sesión MSAL y token
delegado para ejecutar exclusivamente `GET /api/products/master`; no añade un
endpoint, no envía parámetros y no pasa por `VITE_PRODUCT_SOURCE`.

El resultado de consola contiene solo status, cantidad, etapas sanitizadas,
diagnóstico y booleanos estructurales. Se cubren ausencia de trigger/sesión,
token, request autenticada, cero productos, 401, 403, 409
`PRODUCT_MASTER_CONFLICT`, 429, 5xx, red/timeout y respuesta inválida, sin
exponer Product payload. Customer smoke-test y navegación normal permanecen
sin regresión. La ejecución productiva y cualquier activación global de
Product Dataverse requieren autorización posterior e independiente.

## Phase1-040 — Normalize fechaStr Across Data Sources

Maestro Producto queda **IMPLEMENTED / NOT ACTIVATED** con una única regla de
presentación de `fechaStr`: fecha válida local, ISO o ISO con hora produce
`YYYY-MM-DD`; ausencia o invalidez produce `""`. `normalizeFechaStr` se
reutiliza en Master Parser, Product normalizer y Record Assembler, y preserva
el día fuente de strings con hora sin shift de timezone.

Providers local/Dataverse, Repository, Application Service, records,
presentación y exportaciones conservan el mismo formato. `creationDate`,
`discontinuationDate`, EOL, Producto Nuevo `<90 días`, filtros Product,
Customer Master y precios nullable no cambian. Product Dataverse continúa sin
activarse.

## Phase1-038 — Preserve Missing Product Prices as Null

Maestro Producto queda **IMPLEMENTED / NOT ACTIVATED** con semántica explícita
de precios: `0` es un precio real y `null` representa precio no disponible.
`amount null|undefined` se normaliza a `null`; un SKU sin fila USA o CHINA deja
en `null` el precio de ese origen. Gateway, Product Domain, Provider,
Repository, Application Service, parser/adaptación, Record Assembler,
valorizaciones, exportaciones y formatter preservan esa diferencia sin usar
cero ni el otro origen como fallback.

Solo valores numéricos distintos participan en conflictos; cero contra otro
número distinto bloquea con `PRODUCT_MASTER_CONFLICT`, mientras ausencia/null
no genera un falso conflicto con un valor real. Filtros de compañías, pivot,
FormattedValue, atributos Phase1-036, Customer Master, Producto Nuevo y EOL se
preservan. Product Dataverse sigue sin activarse y `fechaStr` continúa como
pendiente separado.

## Phase1-036 — Detect Product Attribute Conflicts

Maestro Producto queda **IMPLEMENTED / NOT ACTIVATED** con protección contra la
consolidación silenciosa de atributos divergentes. Para un mismo SKU,
`productName`, `brand`, `category`, `level`, `status`, `discontinuationDate`,
`creationDate`, `imageUrl` y `productUrl` admiten valores vacíos, inicializan con
el primer valor no vacío y bloquean si aparece otro valor no vacío distinto
después de normalizar. No se define precedencia.

Los conflictos de precio y atributo reutilizan `PRODUCT_MASTER_CONFLICT`, se
distinguen solo en metadata interna y conservan el contrato público sanitizado.
El pivot USA/CHINA no cambia. `amount null/undefined -> 0` y `fechaStr` tampoco
cambian y continúan pendientes de decisión separada antes de autorizar una
activación productiva o validación real de Product Dataverse.

## Phase1-033 — Implement Dataverse Product Master

Maestro Producto queda **IMPLEMENTED / NOT ACTIVATED** sobre el backend portable.
La fuente autorizada es Dataverse `productpricelevel`; Product Price Level
Gateway encapsula el mapping físico, filtra en backend exclusivamente `IOCA USA
INC` o `SAND SPORTS, CORP.`, pagina el conjunto y consolida por SKU el pivot
`USA -> priceUSA` / `CHINA -> priceChina`.

El contrato externo es `{ sku, productName, brand, category,
discontinuationDate, creationDate, level, status, imageUrl, productUrl,
priceUSA, priceChina }`. `level` y `status` solicitan FormattedValue sin asumir
que los campos sean Choice: la anotación tiene prioridad, un valor fuente
textual es el único fallback y un código numérico nunca se expone como label.

Si existen importes distintos para un mismo SKU/origen/comprador —o entre los
dos compradores sin precedencia autorizada— la carga se bloquea con
`PRODUCT_MASTER_CONFLICT`; no suma, promedia o elige precios. El provider local
y Master Parser permanecen vigentes, y `VITE_PRODUCT_SOURCE=local` es el default.
No se modifican Inventario Cliente, EOL, fórmulas, Vercel, Render, Entra o
Dataverse; no se activa tráfico Product real.

El siguiente paso requiere revisión y autorización separada para activar
`VITE_PRODUCT_SOURCE=dataverse` y validar el contrato contra el entorno real.
Render continúa como backend transitorio y Azure como destino definitivo.

## Phase1-032 — Close Dataverse Customer Master Integration

Maestro Cliente queda cerrado como **IMPLEMENTED + PRODUCTION VALIDATED**. En
producción, Vercel usa `VITE_CUSTOMER_SOURCE=dataverse`, MSAL/Microsoft Entra ID
entrega el token delegado requerido por Customer API y el backend portable
alojado transitoriamente en Render accede a Dataverse con su integración
autorizada separada. La búsqueda por código fue validada, la búsqueda por nombre
está implementada, la selección sincroniza código, nombre, país y tipo, y la UI
conserva manejo controlado de cero resultados y errores.

La fuente autorizada es `accounts`; Account Customer Gateway aplica
`customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4` y
encapsula todos los nombres físicos. `customerType` procede exclusivamente de
`new_tipocliente@OData.Community.Display.V1.FormattedValue`, con `trim()` y
fallback `''`; el valor numérico no se publica y `new_tipoclienteglobal` no se
consulta por búsqueda.

Siguiente hito lógico: definir y autorizar la migración del Customer API
portable desde Render hacia Azure, sin seleccionar por anticipado un servicio
Azure ni cambiar filtros, mappings, contratos, autenticación o providers.

## Phase1-029 — Resolve Dataverse Customer Type Global Choice Label

Account Customer Gateway obtiene `customerType` desde
`new_tipocliente@OData.Community.Display.V1.FormattedValue`, convierte la
etiqueta a string, aplica trimming y usa `''` cuando la anotación falta, es
`null` o `undefined`. El valor numérico almacenado nunca se publica como
etiqueta.

Las tres operaciones solicitan
`OData.Community.Display.V1.FormattedValue` mediante una opción genérica de
Dataverse Client que compone el header `Prefer`. No se consulta metadata ni el
Global Choice `new_tipoclienteglobal`; permanecen intactos `$select`, filtros
Phase1-026, límites, orden, escape OData, contratos, autenticación y
diagnósticos Phase1-020. Phase1-032 registra la activación y validación
productiva posterior, sin alterar esta implementación.

## Phase1-026 — Correct Dataverse Customer Filters

La metadata productiva confirma `customertypecode` y
`crbbe_estadodelcliente` como LogicalNames de las reglas empresariales 3 y 4;
`statecode eq 0` permanece confirmado. Account Customer Gateway aplica el
filtro definitivo `customertypecode eq 3 and statecode eq 0 and
crbbe_estadodelcliente eq 4` en búsqueda por código, búsqueda por nombre y
lectura exacta por código.

Phase1-022 y Phase1-024 se retiran por completo después de cumplir su propósito;
Phase1-020 permanece disponible para observabilidad segura. El `$select`,
el campo seleccionado `new_tipocliente`, contratos, autenticación y variables
no cambian. La activación productiva y el mapping final por FormattedValue se
registran posteriormente en Phase1-032 y Phase1-029, respectivamente.

## Phase1-016 — Map Dataverse Customer Type

Phase1-016 incorporó `new_tipocliente` al `$select` exclusivamente dentro de
Account Customer Gateway. Phase1-029 sustituyó su normalización inicial por el
mapping definitivo desde FormattedValue, con fallback `''` y sin exponer el
valor numérico. UI, autenticación y despliegue permanecieron sin cambios.

La activación de `VITE_CUSTOMER_SOURCE=dataverse` y la validación productiva
posteriores quedan cerradas por Phase1-032.

## Phase1-012 — Activate Dataverse Customer Provider in UI

La UI de Configuración queda preparada para usar Dataverse mediante la cadena
Dataverse → Render Customer API → DataverseCustomerProvider →
CustomerRepository → Customer Application Service → UI. Código y nombre,
selección única, sincronización de cuatro campos, cero resultados, sesión
ausente, errores sanitizados, timeout, deduplicación y respuestas obsoletas
quedan implementados y cubiertos.

En ese hito no se activó todavía la fuente. Phase1-032 registra posteriormente
`VITE_CUSTOMER_SOURCE=dataverse` en producción y el cierre de la integración;
Phase1-029 ya había confirmado el mapping FormattedValue de `customerType`.
Render continúa transitorio y Azure permanece como destino futuro.

## Phase1-011 — Close Real Dataverse Smoke Test

Phase1-010B queda cerrado como **PASS — Real Dataverse connectivity validated
end-to-end.** La ejecución real validó Vercel → MSAL / Microsoft Entra ID →
delegated access token → Render Customer API → JWT validation → backend
`client_credentials` → Dataverse → `accounts`. La búsqueda controlada de
`CL0000041` devolvió exactamente una coincidencia sin almacenar el payload real
del cliente, JWT, headers `Authorization`, secretos ni claims sensibles.

En ese hito `VITE_CUSTOMER_SOURCE=local` permaneció vigente y el arnés temporal
no se eliminó. Phase1-032 cierra posteriormente la activación del Customer
Provider Dataverse, `customerType`, búsqueda por nombre y manejo de
errores/cero resultados. Render se mantiene como backend transitorio y Azure
como destino futuro.

## Hito Astrid 2026-08-11 — Cambios confirmados de Dashboard

Implementado sin ampliar fuentes ni infraestructura:

- Sin ventas sustituye únicamente la presentación Por Vencer en Dashboard y Resumen Ejecutivo, usando la clasificación existente `Ventas = 0`.
- Resumen Dashboard y alertas/tablas de bajo inventario muestran solo quiebres ACTIVO.
- Pareto conserva su cálculo y presenta Vitales/Complementarios con A verde, B azul y C rojo.
- Reposición Sugerida totaliza SKU incluidos y unidades ya calculadas; Inventario en Tránsito agrega valor por SKU y total con el costo aplicado vigente.
- Maestro Producto incorpora `creationDate`; Producto Nuevo aplica con antigüedad estrictamente menor a 90 días y Nuevos no presentes cruza Maestro contra Inventario sin generar reposición.
- Customer incorpora `customerType` con fallback vacío y presentación en Configuración; el mapping físico, ausente en ese hito, quedó resuelto por Phase1-029 y cerrado en producción por Phase1-032.

Pendientes vigentes de esa lista: significado de Sin origen, redefinición de buckets o fases EOL, reposición de productos nuevos, fórmula por Tipo de Cliente y migración a Azure. Mapping Dataverse de `customerType`, MSAL, Entra, Render y conexión real de Maestro Cliente quedaron resueltos posteriormente y cerrados por Phase1-032.

## Fase 1.1B — Phase1-003 Real Customer Transport

Se implementa una Customer API Node portable entre Vercel y Dataverse, con
OAuth client_credentials en backend, cache de token, timeout, errores
normalizados, CORS allowlist y rutas específicas sin OData libre. El Entity Set
confirmado es `accounts`; el mapping físico queda encapsulado en el gateway
Dataverse y el frontend conserva Customer Repository, Application Service,
combobox y protección de respuestas obsoletas.

Render queda como hosting temporal configurable y Azure como migración futura;
ninguno forma parte de la lógica Customer. Despliegue, secretos, permisos y
validación real, pendientes al finalizar este hito, quedaron completados para
la integración vigente y cerrados por Phase1-032.

## Fase 1.1 — Phase1-002 Dataverse Maestro Cliente

Se implementó la primera frontera Dataverse exclusivamente para Maestro Cliente:
contrato normalizado `Customer`, Dataverse Customer Provider configurable,
Customer Repository, servicio de aplicación y búsqueda UI por código/nombre con
selección única. Phase1-003 confirma tabla/campos e implementa el transporte real
backend; el Provider local inyectable se conserva como fallback de desarrollo.

No se modifica Maestro Producto, Inventario Cliente, motores, fórmulas,
parámetros ni el Repository histórico de sell-through.

## Hito Prompt 031 — Reglas funcionales Astrid–Jesús

Se implementan como alcance aprobado Inventario en Tránsito, reposición descontando Compra, EOL F4, Mix GOOD/BETTER/BEST/EOL, Pareto A/B/C, temporalidad, KPIs de unidades y valorización completa. Repository, Provider, Configuration Center y fuentes permanecen sin cambios.

Estado funcional después del hito:

- AP-1.2 Inventario en Tránsito: implementado en DTO y Dashboard con valorización por costo aplicado vigente.
- AP-1.3 Reposición Inteligente: implementada la deducción de Compra y los bloqueos EOL/Sin Maestro.
- AP-1.5 Pareto y Tier: implementado Pareto A/B/C por unidades y EOL como cuarta categoría.
- AP-1.6 Motor EOL Fase 4: implementado para más de 365 días.
- KPIs, temporalidad y valorización V2: implementados en Dashboard/Informe y exportación Excel.

## Hito Prompt 028 — MVP Final

La versión de presentación ejecutiva queda lista para demo con Dashboard ejecutivo basado en DTOs, Configuration Center MVP, exportación Excel/PDF, navegación responsive, estados UX y metadata/favicón para despliegue. No se altera la arquitectura ni se migran parámetros adicionales.

Este documento consolida únicamente las líneas ya registradas en `docs/ROADMAP.md`. La documentación existente no asigna estado individual de completado a cada ítem; por lo tanto, aquí no se infiere uno.

## Línea Foundation 1.0

- Arquitectura modular.
- Registro de fuentes.
- Configuration Center.
- Repositorios y proveedores.
- Catálogo de parámetros.
- Catálogo de reglas.
- Trazabilidad.
- Documentación AI-First.

## Roadmap funcional registrado

1. AP-1.0: base actual.
2. AP-1.1: Dashboard Ejecutivo.
3. AP-1.2: Inventario en Tránsito.
4. AP-1.3: Reposición Inteligente.
5. AP-1.4: Maestro de Productos.
6. AP-1.5: Pareto y Tier.
7. AP-1.6: Motor EOL Fase 4.
8. AP-1.7: Dashboard Operativo.

## Lectura del estado actual

- El código V1 ya contiene dashboard, informe ejecutivo, reposición sugerida, Maestro de Productos, Pareto, Tier y motor EOL hasta F3.
- No se observa una capacidad separada de Inventario en Tránsito.
- No se observa Fase 4 en la tabla de fases actual.
- Application Service y Domain Service están implementados parcialmente; desde Prompt 022 existe Portfolio Analysis y desde Prompt 024 Executive Report MVP como Business Services separados. Repository y Local Provider de sell-through conservan su versión síncrona; Configuration Center posee una foundation limitada a tres pilotos. Phase1-002 agregó la frontera asíncrona de Maestro Cliente, Phase1-003 su API/transport real portable y Phase1-032 cierra configuración, despliegue y validación productiva de esa integración.

### Posición de Portfolio Analysis Service

El servicio pertenece a Foundation 1.0 como avance de arquitectura modular y separación de Domain/Application. Su contrato síncrono e inmutable prepara consumidores futuros como Executive Report y Recommendation Engine, pero no declara entregados nuevos hitos funcionales ni mueve las reglas actuales de Distribution, Pareto o exportaciones.

### Optimización del flujo de IA

Prompt 022.5 establece `INDEX.md` como índice documental único y `ARCHITECTURE_STATE.md` como resumen vigente por hito. El contexto fijo deja de incluir toda la Knowledge Base y todo el historial: cada IA usa estado, roadmap y únicamente el prompt, log y archivos relacionados.

### Executive Report MVP

Prompt 024 crea un Business Service de presentación que consume exclusivamente el DTO de Portfolio Analysis y construye Executive Summary, KPIs, totales, indicadores generales y resumen para Dashboard. No modifica App.jsx ni presenta el DTO en UI; no crea hallazgos, recomendaciones, exportaciones, Pareto o Distribution.

### Siguiente hito técnico

Revisar y autorizar por separado cualquier activación productiva y validación
real de Maestro Producto, preservando la normalización canónica de `fechaStr`.
En paralelo, la
migración del backend portable de Render a Azure continúa pendiente, sin definir
por anticipado el servicio Azure ni alterar contratos o fronteras. Executive
Report y Recommendation Engine permanecen como líneas funcionales
independientes.

La presencia parcial de nombres del roadmap en el código no equivale a declarar entregado un hito. Solo un acuerdo o prompt aprobado puede cambiar su estado formal.

## Restricciones para avanzar

- No inventar alcance funcional para ningún hito.
- Definir criterios de aceptación antes de implementar.
- Identificar reglas, fuentes y parámetros afectados.
- Mantener compatibilidad con el comportamiento actual salvo cambio funcional aprobado.
- Actualizar este documento, `DECISIONS.md`, `CHANGELOG.md` y el prompt correspondiente cuando cambie el roadmap.
