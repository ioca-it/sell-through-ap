# Roadmap aprobado

## Phase1-107 — Reconcile Executive Inventory KPIs and Enforce EOL Discount Minimum Inventory

El bloque superior del Executive Dashboard mostraba 44 SKU mientras Resumen
Ejecutivo ya mostraba 38 (mismas seis filas con `Inventario Final = 0` de
Phase1-105/D-026): `ExecutiveReportService.buildExecutiveReport` seguía
derivando `executiveSummary.totalSKUs`/`totalUnidades`/`valorTotalInventario`
de `totales.*` en vez de `distribucionTier.inventario`, pese a que Phase1-105
ya había reconciliado el Resumen Excel y los seis KPI de Tier con ese mismo
dataset. Ahora los tres campos derivan de `distribucionTier.inventario`, y el
KPI se renombra de "Total SKU" a "SKU en inventario" en el Executive Dashboard.

La tabla "SKU Clasificados EOL que aplican regla de descuento" exige ahora
`Inventario Final ≥ EOL_DISCOUNT_MIN_INVENTORY` (constante nueva en
`eolEngine.js`, default vigente 12 unidades) además de `descPct > 0`, en vez de
solo `Inventario Final > 0`. El KPI EOL general (`eolTodos`) no se reduce por
este cambio; un SKU EOL bajo el umbral permanece clasificado como EOL pero
sale de la tabla operativa. El parámetro queda documentado en
`metricDefinitions.js` como candidato futuro a Configuration Center, sin
edición implementada en esta fase.

Excel y CSV no requirieron cambios de código: ya consumían
`eolConDescuentoAplicable` y `distribucionTier.inventario` directamente desde
Phase1-105. Configuration Center permanece pendiente y detenido por el
usuario; sus dos archivos no se modificaron. Backend 139/139, frontend 435/435
en 37 archivos y ambos builds PASS. Siguiente acción externa exacta: autorizar
por separado checkpoint, deploy y cualquier activación de
`VITE_PRODUCT_SOURCE=dataverse` o de Configuration Center (Phase1-101 sigue
fuera de alcance).

## Phase1-105 — Consolidate Tier KPIs, EOL Discount Scope, Pack-Rounded Replenishment and Export Reconciliation

Distribución por Tier sustituye sus dos KPI genéricos por seis KPI (SKU y
Unidades de Inventario Actual del Cliente, Ventas del Cliente y Reposición
Sugerida), derivados exactamente del dataset canónico de cada bloque. La causa
raíz confirmada de la divergencia previa UI 38 SKU / Excel 44 SKU (442
unidades iguales) fue que Tier excluye seis filas con `invFinal=0` que el
Resumen Excel contaba vía `recs.length`.

Product Master Dataverse incorpora Master Pack e Inner Pack
(`crbbe_aplicaamasterpack`, `crbbe_cantidadenmasterpack`,
`crbbe_aplicaainnerpack`, `crbbe_cantidadinnerpack`) sin usarlos en Brands. El
motor preserva íntegra la fórmula histórica como Pedido Sugerido Base y aplica
después, con precedencia Master válido → Inner válido → sin ajuste,
`CEIL(Base ÷ Pack) × Pack`; el valor operativo `reposicionSugerida` sigue
siendo el Pedido Final, con Base/tipo/cantidad de ajuste expuestos para
trazabilidad en tabla y exportaciones.

La tabla EOL se renombra a "SKU Clasificados EOL que aplican regla de
descuento" y consume el subconjunto `estado=EOL`, `invFinal>0`, `descPct>0`
derivado de `eolTodos`; el KPI EOL general no se reduce a ese subconjunto.
Excel y CSV reutilizan los mismos datasets canónicos que la UI en vez de
recalcular sus propios universos, y agregan columnas de trazabilidad de pack.

Configuration Center permanece pendiente y detenido por el usuario; sus dos
archivos no se modificaron. Backend 139/139, frontend 434/434 en 37 archivos y
ambos builds PASS. Siguiente acción externa exacta: autorizar por separado
checkpoint, deploy y cualquier activación de `VITE_PRODUCT_SOURCE=dataverse`
o de Configuration Center (Phase1-101 sigue fuera de alcance).

## Phase1-102 — Replace Product createdon With crbbe_validodesde

Product Master sustituye su campo de fecha funcional Dataverse por
`crbbe_validodesde` en `$select`, `$orderby`, mapping y precedencia
`MAX(crbbe_validodesde)` por `SKU + ORIGIN + BUYER COMPANY`. Se preservan
filtros, resolución independiente USA/CHINA/comprador, conflictos en empates,
Brands y contratos; `Product.creationDate` no cambia de nombre y no usa
`createdon` como fallback.

Producto Nuevo continúa con edad estricta `<90 días` y todas las superficies
consumen el mismo `creationDate`. Siguiente acción externa exacta: desplegar
backend y frontend solo con autorización separada, activar Product Dataverse si
corresponde al entorno y validar una vez Marca → Product Master → Producto
Nuevo contra un registro real con `crbbe_validodesde` conocido.

## Phase1-098 — Align EOL Definitions With Real Runtime Semantics

La presentación usa `SKU clasificados EOL` para el universo Product Master
`eolTodos`, independientemente de que exista una Fecha EOL válida. Fecha y Días
EOL ausentes muestran `N/D`; Fase EOL no calculable muestra `Sin fecha EOL`.
KPI, unidades, valor y detalle continúan reconciliados.

Las definiciones compartidas documentan fórmula/fuente/interpretación de SKU
EOL, Fecha, Días, Fase, Recomendación, Porcentaje de Rotación y Valor
Inventario. El hito queda validado localmente con 415/415 pruebas y build
correcto. No cambian EOL Engine, buckets, acciones, Pareto, reposición, Product
Master, Dataverse ni backend. Siguiente acción externa exacta: validar
visualmente una vez en desktop/mobile y autorizar por separado cualquier deploy.

## Phase1-096 — Finalize EOL Consistency and Simplify Data Load Screen

La presentación reconcilia KPI y detalle sobre todos los SKU con EOL definido,
con las fases VENCIDO, CRÍTICO, PRÓXIMO y PLANIFICADO provenientes de los
buckets vigentes. Carga de Información retira solo la entrada manual de Product
Master, centra y renumera Inventario del Cliente, y aclara `primerDiaMes()` como
Fecha base EOL.

Product/Dataverse, providers, repositories, fuente local técnica, precios,
acciones, descuentos, reposición, `fechaCorte`, timezone y motores no cambian.
Siguiente acción externa exacta: validar visualmente una vez en desktop/mobile
y autorizar separadamente cualquier deploy.

## Phase1-094 — Final Presentation Audit and Consolidated UX/Data Corrections

Hito consolidado para presentación: corrige agregados monetarios parciales,
separa EOL total/vencido, sustituye rotación por porcentaje, expone unidades y
fórmulas, y alinea Dashboard, Informe, Excel y CSV con los mismos contratos.
Mantiene el motor de reposición real de dos etapas y la prioridad EOL.

`ProductSkuCell` agrega lightbox, nowrap y seguridad HTTP(S). Excel usa
hyperlinks Product/imagen y hoja de definiciones; la imagen embebida queda fuera
porque SheetJS CE no la soporta sin reescritura/dependencia. CSV entrega datos y
definiciones en archivos separados.

Siguiente acción externa exacta: validar visualmente una vez desktop/mobile con
media real y, solo con autorización separada, desplegar. No se cambian backend,
Dataverse, Entra, Render/Vercel ni variables.

## Phase1-092 — Apply Product Images and SKU Hyperlinks Across Detail Tables

La presentación reutiliza el contrato normalizado Product para mostrar una
miniatura y convertir el SKU en link seguro en todas las vistas de detalle.
`ProductSkuCell` acepta únicamente `http:`/`https:`, abre `productUrl` en otra
pestaña con `noopener noreferrer` y usa fallback neutro ante ausencia, URL
inválida o fallo de imagen.

Se cubren once tablas SKU del Dashboard, tres del Informe y Producto Héroe.
Tránsito preserva ahora `imageUrl/productUrl`; el resto del pipeline ya los
mantenía. Datos Completos sigue siendo exportación Excel sin binarios y las
tablas agregadas no cambian.

Siguiente acción externa exacta: validar visualmente desktop/mobile con media
real y, si se autoriza, desplegar el frontend con Product Dataverse activo. El
hito no cambia backend, variables, Dataverse, Entra, Render o Vercel.

## Phase1-090 — Resolve Product Duplicates by Latest Record

Product Master aplica la precedencia funcional aprobada después de sus filtros
vigentes: `MAX(crbbe_validodesde)` por `SKU + ORIGIN + BUYER COMPANY`. USA y CHINA se
resuelven independientemente; los compradores también, antes de aplicar el
conflicto cross-buyer existente. Los empates exactos en el máximo conservan
todas las filas y siguen bloqueando cuando contienen valores incompatibles.

`Product.creationDate` queda en el mayor `crbbe_validodesde` entre las filas vigentes
del SKU. Producto Nuevo conserva la regla estricta `<90 días`. La muestra local
SKULLCANDY Phase1-089 queda con 0 conflictos y 362 productos; no se cambian la
query, los filtros, Brands, contratos, seguridad, fuentes o timeouts.

Siguiente acción externa exacta: autorizar deploy backend y frontend, activar
la fuente Product Dataverse si todavía no está activa en el entorno objetivo y
validar una vez Marca → Product Master → Producto Nuevo. Este hito no ejecuta
acciones externas.

## Phase1-087 — Add Valid Origin Filter and Close Presentation Gaps

Product Master incorpora en backend
`crbbe_origen ne null and crbbe_origen ne ''` dentro del universo comercial,
antes de `retrieveAll()` y consolidación. La defensa Node omite también origen
null, vacío o solo espacios. Así dejan de existir conflictos provocados
exclusivamente por esas filas, mientras los conflictos reales de precios
válidos continúan bloqueados sin precedencia.

Brands reutiliza el mismo universo dentro de `$apply/filter/groupby`, evitando
mostrar marcas sin registros Product válidos. El gap-check de Phase1-084 quedó
sin correcciones adicionales: sus ocho entregables permanecen visibles y
conectados, con Producto Nuevo `<90 días` sin cambios.

Siguiente acción externa exacta: si la presentación usa el entorno alojado,
autorizar el deploy y validar una vez Brands y Product Master contra Dataverse.
Este hito no despliega ni modifica Vercel, Render, Dataverse o Entra.

## Phase1-084 — Finalize Product Data Rules and Meeting Requirements

Hito implementado y validado localmente: backend 125/125, frontend 391/391 y
ambos builds correctos. Product Master y
Brands comparten el universo válido: comprador IOCA/SAND y
`crbbe_nombrecompania eq crbbe_companiacompradora`, evaluado por Dataverse antes
de consolidar o agrupar. La marca continúa obligatoria antes de
`retrieveAll()` y los conflictos que sobrevivan permanecen bloqueados sin regla
"más reciente gana".

Para presentación se reutiliza Producto Nuevo `<90 días`: KPI por cantidad de
SKU ausentes, tabla con atributos Product, `creationDate` en Datos Completos y
hojas Excel de Tránsito, Reposición y Nuevos no presentes. Se añadieron leyenda
real de rotación, explicación EOL y cobertura de Trimestral=13 sin motores
paralelos.

Siguiente acción exacta: mediante autorización separada, desplegar
backend/frontend y validar una vez Brands y SKULLCANDY en el flujo normal. Si
quedan conflictos después del filtro, requieren evidencia y decisión funcional
separadas; no se introduce precedencia temporal.

## Phase1-081 — Activate Real Dataverse Brand-to-Product Configuration Flow

El hito queda **PASS — NORMAL DATAVERSE PRODUCT FLOW READY / EXTERNAL SOURCE
ACTIVATION PENDING / LOCALLY VALIDATED / NOT DEPLOYED**. Se confirmó que
`VITE_PRODUCT_SOURCE=local` hacía que la Factory eligiera el Provider local y
por eso el ComboBox normal no consultaba `/api/products/brands`. La cadena
Application Service → Repository → Factory → Dataverse Product Provider ya
entrega las 33 marcas al ComboBox cuando la fuente es `dataverse`.

La selección explícita precarga Product Master con una única marca, reutiliza
la solicitud pendiente y conserva el dataset identificado por esa marca. El
cambio A→B vacía A de inmediato y descarta respuestas obsoletas; sin marca no
hay request, carga global ni fallback. Local, Customer, mappings, seguridad y
timeout Product de 35 s permanecen sin cambios; no aplicaron cambios backend.

Siguiente acción exacta: después del checkpoint autorizado, establecer
externamente `VITE_PRODUCT_SOURCE=dataverse` en Vercel y reconstruir/desplegar
el frontend para que la variable build-time sea efectiva; luego validar en la
presentación normal Configuración → Marca → Product Master, sin crear otro
smoke.

## Phase1-077 — Optimize Brand Query and Validate Brand-Filtered Product Master

El hito queda **PASS — SERVER-SIDE BRAND GROUPBY / FILTERED PRODUCT MASTER
PRESERVED / LOCALLY VALIDATED / NOT DEPLOYED / NOT MEASURED IN PRODUCTION**.
Brands sustituye cinco páginas/24.787 filas de la medición anterior por una
consulta Dataverse `$apply=filter(...)/groupby((marca))`. El filtro de los dos
compradores precede al groupby de un único campo; no existe `$distinct` OData
ni `retrieveAll()` global para esta ruta. El contrato `{ brands: [] }` y su
normalización defensiva permanecen intactos.

Product Master conserva marca obligatoria/escapada antes de `retrieveAll()`,
sin fallback global, cambios de `$orderby`, mappings, precios o conflictos. Las
pruebas A/B demuestran consultas y datasets independientes; sin marca se
responde 400 antes de Dataverse.

Phase1-066 registra para Brands un cierre agregado seguro con elapsed, conteo y
request completado; no fabrica eventos Phase1-068. Product Master conserva su
tracing paginado. UI, Customer, fuentes y timeouts permanecen sin cambios.

Siguiente acción exacta: después de revisión y autorización separada, crear el
checkpoint, desplegar sin activar `VITE_PRODUCT_SOURCE=dataverse` y ejecutar una
única medición Brands más una única medición Product filtrada por marca. Solo
esa evidencia puede autorizar una reducción posterior de timeouts.

## Phase1-075 — Add Authenticated Product Brands Smoke Test

El hito queda **PASS — TEMPORARY AUTHENTICATED BRANDS SMOKE / SANITIZED /
FRONTEND-ONLY / NOT DEPLOYED / NOT EXECUTED / PRODUCT SOURCE UNCHANGED**. El
trigger exacto `?phase1-075-brands-smoke=1` exige sesión MSAL, adquiere token
delegado y llama directamente `GET /api/products/brands`, sin Product Provider
Factory ni cambio de `VITE_PRODUCT_SOURCE=local`.

El arnés usa 35 000 ms, AbortController y cleanup. Publica únicamente status,
clasificación JWT/Dataverse, diagnóstico sanitizado y `brandsReturned` como
número; nunca el array de marcas, Product data, credenciales, identidad, URL,
headers, payload, nextLink o query. Sin trigger exacto no inicializa el smoke
ni genera tráfico. Product Master smoke, Product normal y Customer no cambian.

Una ejecución posterior autorizada deberá provocar las trazas Phase1-066/068
con `operation=PRODUCT_BRANDS` y permitir capturar páginas, registros y tiempos
solo en backend. El arnés debe retirarse después del diagnóstico.

Siguiente acción exacta: solicitar autorización separada para checkpoint/deploy
y, solo cuando esté Live, ejecutar una única vez el trigger Phase1-075 para
capturar evidencia sanitizada antes de decidir cualquier optimización.

## Phase1-073 — Instrument and Align Product Brands Loading

El hito queda **PASS — BRANDS TRACE ALIGNED / PRODUCT PROVIDER TEMPORARY 35 S /
QUERY UNCHANGED / NOT DEPLOYED / NOT ACTIVATED**. La infraestructura temporal
Phase1-066/068 cubre ahora también `GET /api/products/brands` y propaga el mismo
contexto desde API hasta Dataverse Client. `operation=PRODUCT_MASTER` y
`operation=PRODUCT_BRANDS` separan técnicamente ambos flujos sin ampliar el
contrato frontend; página, conteos, acumulados y totales continúan bajo un
esquema seguro.

El Dataverse Product Provider real usa temporalmente 35 000 ms para
`loadBrands()` y `loadProducts({ brand })`, con AbortController, error
sanitizado y cleanup intactos. Customer conserva 10 000 ms, el fetch backend
Dataverse 30 000 ms y el smoke Product 35 000 ms.

`/brands` conserva `retrieveAll()` sin cache, agregación, cambios de página,
orden, índices o paralelización. Siguiente acción exacta: después de checkpoint
y deploy autorizados por separado, ejecutar una única medición controlada de
`GET /api/products/brands` para obtener páginas/registros/tiempos reales; usar
esa evidencia para definir otro prompt de optimización sin activar todavía
`VITE_PRODUCT_SOURCE=dataverse`.

## Phase1-070 — Add Product Brand Prefilter

El hito queda **PASS — PRODUCT BRAND PREFILTER IMPLEMENTED / GLOBAL LOAD
BLOCKED / LOCAL PARITY / NOT DEPLOYED / NOT ACTIVATED**. Configuración incorpora
un ComboBox Marca searchable y accesible, con carga bajo demanda, selección
explícita y estados sanitizados. Customer y Brand conservan estados separados;
un cambio de marca invalida resultados Product anteriores.

La API añade `GET /api/products/brands` y cambia Maestro a
`GET /api/products/master?brand=<brand>`. La lista Dataverse usa solo marca y
compañía compradora, pagina dentro del backend, normaliza/deduplica/ordena y no
ejecuta la consolidación Product. La carga Product combina el filtro vigente de
`IOCA USA INC`/`SAND SPORTS, CORP.` con `crbbe_nombremarca` escapado antes de
`retrieveAll()`. Sin una marca válida responde 400 y no consulta Dataverse.

La fuente local ofrece los mismos contratos `loadBrands()` y
`loadProducts({ brand })`. Product Dataverse continúa sin activarse; no se
cambian `$orderby`, timeouts, variables, infraestructura ni trazas temporales.

Siguiente acción: revisar el hito y autorizar por separado cualquier checkpoint,
deploy o smoke controlado para comparar las páginas/registros de una marca con
la evidencia global anterior. Mantener `VITE_PRODUCT_SOURCE=local` hasta una
activación explícita posterior.

## Phase1-068 — Diagnose Product Dataverse Multi-Page Latency

El diagnóstico queda **PASS — MULTI-PAGE ROOT CAUSE PROVEN / TEMPORARY
PAGINATION TRACE ADDED / SANITIZED / PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED
/ NOT ACTIVATED**. Una única llamada Product Gateway a `retrieveAll()` sigue
secuencialmente los `@odata.nextLink` y explica los cinco fetch del mismo
`traceId`; no hay retries, consultas independientes ni llamadas Gateway
repetidas.

La consulta no cambia: conserva Entity Set, trece campos, filtro, orden y
FormattedValue, sin `$top` ni `odata.maxpagesize`. Los fetch aportados acumulan
51.534 s y promedian 10.307 s. `getToken()` se invoca por página, pero el
proveedor reutiliza token válido en cache y no demuestra OAuth de red por
página.

`PHASE1_068_PRODUCT_PAGINATION_TRACE` añade únicamente elapsed, número de
página, tiempo de fetch, conteos, booleano de next link y totales finales bajo
el `traceId` Product. No registra filas, valores, URL/query/next link,
credenciales o identidad; Customer queda excluido.

Siguiente acción exacta: después de revisión y autorización separada, crear el
checkpoint y desplegar solo esta instrumentación backend. Una captura Product
autenticada posterior deberá medir páginas/registros reales antes de autorizar
cualquier ajuste de page size, query, token o timeout.

## Phase1-066 — Trace Product Request Execution Path

Product API queda **TEMPORARY REQUEST TRACE IMPLEMENTED / SANITIZED /
PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED IN PRODUCTION / NOT ACTIVATED**. Un
UUID aleatorio y efímero correlaciona los checkpoints reales de recepción,
autenticación, Product Service, token/fetch Dataverse y envío de respuesta para
`GET /api/products/master`.

Los eventos contienen solo componente, identificador diagnóstico, stage,
elapsed entero, resultado técnico y `traceId`. El contexto se propaga de forma
explícita; Customer Master no lo crea y el Dataverse Client compartido no se
convierte en logging general. Los diagnósticos Dataverse existentes continúan
intactos y complementarios.

No cambia comportamiento funcional ni los timeouts temporales de 35 000 ms
frontend / 30 000 ms fetch Dataverse. Product Dataverse continúa sin activarse
como fuente normal y la instrumentación debe retirarse al determinar la causa
raíz.

Siguiente acción exacta: solicitar autorización separada para crear el
checkpoint y desplegar exclusivamente esta instrumentación temporal, sin
ejecutar todavía smoke productivo ni activar Product Dataverse.

## Phase1-064 — Align Product Smoke Test Timeout

El arnés temporal Product Phase1-042 queda **TEMPORARY 35 SECOND FRONTEND
TIMEOUT / BACKEND 30 SECOND TIMEOUT PRESERVED / NOT DEPLOYED / NOT EXECUTED /
NOT ACTIVATED**. Su timeout default aumenta de 10 000 ms a 35 000 ms para que
el navegador no aborte mientras Render aún puede esperar hasta 30 000 ms por
el fetch Dataverse, dejando 5 000 ms para Render, serialización, respuesta HTTP
y lectura de `response.json()`.

La ventana de 35 000 ms pertenece únicamente al smoke activado mediante
`?phase1-042-product-smoke=1`; no configura la aplicación Product normal.
Dependency injection, AbortController, cleanup y `REQUEST_TIMEOUT` sanitizado
permanecen vigentes. Backend, Dataverse Client, Product Gateway, mappings,
filtros, precios, conflictos, `fechaStr`, Customer Master, autenticación,
fuentes y variables no cambian.

Siguiente acción exacta: después de revisión y autorización separada, crear el
checkpoint y desplegar los cambios temporales Phase1-061 backend y Phase1-064
frontend. Solo cuando ambos estén Live ejecutar una única revalidación Product
autenticada, conservando `VITE_PRODUCT_SOURCE=local`; después del resultado,
reevaluar ambos timeouts temporales mediante otro hito.

## Phase1-061 — Temporarily Increase Dataverse Fetch Timeout

Dataverse Client queda **TEMPORARY 30 SECOND FETCH TIMEOUT / TOKEN BUDGET
ISOLATED / NOT DEPLOYED / NOT ACTIVATED**. El timeout HTTP aumenta de 10 000 ms
a 30 000 ms únicamente para permitir una validación posterior de Product
Master contra Dataverse real. `getToken()` y headers preceden al
AbortController/timer; estos abarcan solo `fetchImpl()` y se limpian antes de
procesar la respuesta. El timeout independiente de Entra Token Provider
permanece en 10 000 ms.

Clasificación, observabilidad Phase1-057/059, Product/Customer contracts,
gateways, mappings, filtros, fuentes y autenticación permanecen sin cambios.
Los 30 000 ms son temporales y deberán reevaluarse después de la validación;
cualquier optimización de consulta/paginación requiere otro hito autorizado.

Siguiente acción exacta: después de revisión y autorización separada, crear el
checkpoint, desplegar exclusivamente el backend con Phase1-061 y ejecutar una
única revalidación Product autenticada. Mantener
`VITE_PRODUCT_SOURCE=local`; no activar Product Dataverse ni iniciar otra
optimización durante este hito.

## Phase1-059 — Diagnose Render to Dataverse Network Failure

Dataverse Client queda **NETWORK CATCH ISOLATED / SAFE TRANSPORT CLASSIFICATION
ADDED / PRODUCTIVE CAUSE PENDING / NOT DEPLOYED / NOT ACTIVATED**. Solo el
rechazo de fetch después de adquirir el token backend puede emitir ahora
`DATAVERSE_NETWORK_ERROR`; token, preparación del request y respuesta HTTP
mantienen fronteras separadas. La señal se limita a cinco categorías seguras,
timeout configurado y estado booleano de token/base URL, sin error crudo ni
datos sensibles.

En Phase1-059, antes del ajuste temporal Phase1-061, el timeout se conservaba
en 10 000 ms y seguía compartido por las consultas Product/Customer. La
comparación Git confirma que Phase1-057 no modificó el transporte y no
introdujo la transición observada de HTTP 200 a fallo de red.
No se cambia lógica Product, mappings, filtros, fuentes, autenticación,
variables ni infraestructura.

Siguiente acción exacta: después de revisión y autorización separada, realizar
checkpoint/deploy solo del backend instrumentado y una única revalidación
Product autenticada para capturar la categoría segura. No ejecutar otro smoke
antes del deploy ni activar `VITE_PRODUCT_SOURCE=dataverse`.

## Phase1-055 — Correct Product URL Logical Name and Remove Temporary Diagnostics

Maestro Producto queda **PRODUCT URL LOGICAL NAME CORRECTED / TEMPORARY
DIAGNOSTICS REMOVED / NOT DEPLOYED / NOT ACTIVATED**. Product Price Level
Gateway sustituye el LogicalName anterior incorrecto `producturl` por el nombre
confirmado `crbbe_urlproducto` en `$select` y mapping, manteniendo el contrato
normalizado `productUrl`. Valores `null`, `undefined` o vacíos producen `""` y
los textos válidos se publican con `trim()`.

Phase1-046 y Phase1-048/050/052 quedan retirados por completo del runtime:
módulos, imports, hooks, estado once-per-process, métodos temporales de probe y
metadata en Dataverse Client, observabilidad Product temporal y pruebas
exclusivas. El diagnóstico general sanitizado Dataverse Phase1-020 permanece
vigente. Entity Set, mappings restantes, filtro de compañías, pivot USA/CHINA,
precios `0`/`null`, FormattedValue, conflictos, `fechaStr`, capas Product,
Customer Master, HTTP, autenticación y `VITE_PRODUCT_SOURCE=local` no cambian.

Cualquier checkpoint, deploy, smoke o activación de Product Dataverse requiere
autorización posterior e independiente.

## Phase1-052 — Fix Product Metadata Entity Resolution

Maestro Producto queda **PRODUCT METADATA ENTITY RESOLUTION FIXED / NOT
DEPLOYED / NOT EXECUTED / NOT ACTIVATED**. La evidencia productiva proporcionada
confirmó `TRIGGER/REACHED` y `ENTITY_DEFINITION/FAIL`. La consulta temporal
anterior combinaba el filtro válido por `EntitySetName=productpricelevels` con
`$top=2`; Dataverse no pagina ni limita la colección de metadata y ese parámetro
impedía resolver la EntityDefinition antes de llegar a `Attributes`.

Phase1-052 conserva `$select=LogicalName,EntitySetName` y el `$filter` exacto,
retira exclusivamente `$top`, revalida en memoria una única coincidencia exacta
y toma el LogicalName de esa respuesta para navegar a `Attributes`, sin
hardcodearlo. La telemetría emite ahora PASS o FAIL para `ENTITY_DEFINITION` y
`ATTRIBUTES` antes de `CANDIDATES/FOUND|NONE`; candidatos y fallos mantienen el
allowlist vigente. La guardia once-per-process continúa establecida antes del
primer `await`.

No cambia el Product Gateway definitivo: `productpricelevels`, `producturl`,
mappings, filtros y contrato `productUrl` permanecen intactos. Tampoco cambian
Customer Master, frontend, variables o infraestructura. El siguiente paso
requiere autorización separada para checkpoint/deploy backend y una única
ejecución del smoke Phase1-042 después de reiniciar el proceso.

## Phase1-050 — Fix Product URL Metadata Diagnostic Trigger

Maestro Producto queda **METADATA TRIGGER OBSERVABILITY FIXED / NOT DEPLOYED /
NOT EXECUTED / NOT ACTIVATED**. La ejecución productiva proporcionada confirmó
`select_field=producturl / FAIL`, pero ningún evento
`PHASE1_048_PRODUCT_URL_METADATA`. El diagnóstico anterior no registraba su
entrada y absorbía sin evento cualquier fallo de `EntityDefinitions` o
`Attributes`, por lo que el resultado cero no permitía distinguir un hook no
alcanzado de un fallo interno.

El enlace sigue inmediatamente después del `FAIL` individual y antes de los
probes posteriores. Phase1-048 emite ahora `TRIGGER/REACHED`, clasifica de forma
sanitizada `ENTITY_DEFINITION/FAIL` y `ATTRIBUTES/FAIL`, o registra
`CANDIDATES/FOUND|NONE` y los candidatos allowlisted. La guardia se establece
antes del primer `await`, preservando una sola ejecución por proceso incluso
con concurrencia.

No cambia el Product Gateway definitivo: `productpricelevels`, `producturl`,
mappings, filtros y contrato `productUrl` permanecen intactos. Tampoco cambia
Customer Master, frontend, variables o infraestructura. El siguiente paso,
después de revisión, requiere autorización separada para checkpoint/deploy
backend y una única ejecución del smoke Phase1-042 tras reiniciar el proceso.

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
