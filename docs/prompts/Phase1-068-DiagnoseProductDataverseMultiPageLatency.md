# Phase1-068 — Diagnose Product Dataverse Multi-Page Latency

## Estado

**PASS — MULTI-PAGE ROOT CAUSE PROVEN / TEMPORARY PAGINATION TRACE ADDED /
SANITIZED / PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED IN PRODUCTION / NOT
ACTIVATED.**

## Objetivo ejecutado

Diagnosticar los múltiples ciclos token/fetch observados bajo un mismo
`traceId` Product después de Phase1-066, sin aumentar timeouts, optimizar,
cambiar la consulta funcional, alterar reglas de negocio ni activar Product
Dataverse como fuente normal.

## Causa demostrada

Los cinco `DATAVERSE_FETCH_STARTED` aportados son cinco páginas consecutivas de
una única recuperación Product. No son consultas independientes del Gateway,
retries ni múltiples llamadas al Product Service.

```text
ProductService.loadMaster (una llamada)
  -> ProductPriceLevelGateway.loadProducts (una llamada)
    -> DataverseClient.retrieveAll (una llamada)
      -> while (url)
        -> DataverseClient.retrievePage (una llamada por página)
          -> tokenProvider.getToken (una llamada por página)
          -> fetchImpl (un fetch por página)
        -> page.nextLink ? validateNextLink(page.nextLink) : null
      -> termina cuando no existe nextLink
```

`retrieveMultiple()` no participa en Product Master. El Gateway exige y usa
`retrieveAll()`. No hay lógica de retry en este recorrido. El único guard
adicional es un máximo defensivo de 1 000 páginas; al superarlo se lanza
`DataverseRequestError`.

`retrievePage()` inicia cada fetch mediante `fetchImpl()`. `retrieveAll()`
decide la página siguiente dentro de `while (url)`. La respuesta normaliza
`@odata.nextLink` exclusivamente cuando es string; `validateNextLink()` la
convierte en URL y exige el mismo origen Dataverse y un path bajo
`/api/data/v9.2/`. El enlace se usa como URL opaca de la página siguiente, sin
registrarlo ni reconstruir su query. La secuencia termina asignando `url =
null` cuando la página no contiene un next link string utilizable.

## Evidencia temporal aportada

| Página | Inicio–fin fetch | Duración |
| --- | --- | ---: |
| 1 | 0.542–10.433 s | 9.891 s |
| 2 | 11.091–22.322 s | 11.231 s |
| 3 | 22.990–33.635 s | 10.645 s |
| 4 | 34.097–45.225 s | 11.128 s |
| 5 | 45.892–54.531 s | 8.639 s |

Los fetch acumulan **51.534 s** y promedian **10.307 s por página**. Hasta el
último `FETCH_COMPLETED`, el tiempo conocido fuera de fetch es **2.997 s**; ese
residuo incluye entrada/auth, token, parse y avance de páginas, y no permite
atribuirlo íntegramente a token. Falta el elapsed de `PRODUCT_RESPONSE_SENT`
para cuantificar una posible cola posterior al último fetch. Los fetch
representan aproximadamente **94.5 %** de los 54.531 s conocidos.

## Consulta Product vigente, sin cambios

- Entity Set: `productpricelevels`.
- `$select`: `crbbe_nombremarca`, `crbbe_sku`, `crbbe_nombreproducto`,
  `crbbe_nombrecategoria`, `crbbe_validohasta`, `createdon`,
  `crbbe_clasificacioncomercial`, `crbbe_etapa`, `crbbe_imagenproducto`,
  `crbbe_urlproducto`, `amount`, `crbbe_origen` y
  `crbbe_companiacompradora`.
- `$filter`: `(crbbe_companiacompradora eq 'IOCA USA INC' or
  crbbe_companiacompradora eq 'SAND SPORTS, CORP.')`.
- `$orderby`: `crbbe_sku asc,crbbe_origen asc,crbbe_companiacompradora
  asc,createdon asc`.
- `$top`: ausente.
- `Prefer`: solo
  `odata.include-annotations="OData.Community.Display.V1.FormattedValue"`.
- `odata.maxpagesize`: ausente.
- Configuración explícita de tamaño de página: ninguna.

Por tanto Dataverse determina el tamaño efectivo de página. La documentación
oficial indica que, sin `odata.maxpagesize`, cada request puede devolver hasta
5 000 filas y entrega `@odata.nextLink` cuando existen más resultados; el
número real sigue sin poder inferirse estáticamente y será capturado por esta
instrumentación. Fuente: [Microsoft Learn — Page results using OData](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/page-results).

## Token por página

`retrieveAll()` llama `retrievePage()` por iteración y `retrievePage()` llama
siempre `tokenProvider.getToken()` antes de preparar headers y ejecutar fetch.
Por eso Phase1-066 emite `TOKEN_REQUEST/TOKEN_ACQUIRED` antes de cada página.
Es una llamada al proveedor por página, no prueba una solicitud OAuth de red
por página.

`EntraTokenProvider` guarda `cachedToken` y `validUntil`, aplica un margen de
seguridad y comparte `pendingToken` cuando existe una adquisición concurrente.
Mientras el token siga vigente, `getToken()` retorna `Promise.resolve` con el
token cacheado. En una secuencia de aproximadamente 55 s se espera una sola
adquisición OAuth si el cache estaba frío, salvo que el token ya estuviera en
su ventana de renovación. El tracing aportado no entrega deltas individuales
de token, pero limita token + parse + avance entre páginas a gaps de
0.462–0.668 s; no es una parte material frente a 8.639–11.231 s por fetch.

## Instrumentación temporal Phase1-068

La inspección estática prueba la causa, pero no puede obtener los registros
reales por página ni el acumulado productivo. Se agregó el diagnóstico
`PHASE1_068_PRODUCT_PAGINATION_TRACE` al mismo contexto Product efímero de
Phase1-066.

Eventos y metadata allowlisted:

- `PRODUCT_PAGE_FETCH_STARTED`: `component`, `diagnosticId`, `stage`,
  `elapsedMs`, `traceId`, `pageNumber`.
- `PRODUCT_PAGE_FETCH_COMPLETED`: `component`, `diagnosticId`, `stage`,
  `elapsedMs`, `traceId`, `pageNumber`, `fetchElapsedMs`, `recordsReturned`,
  `hasNextLink`, `cumulativeRecords`.
- `PRODUCT_PAGINATION_COMPLETED`: `component`, `diagnosticId`, `stage`,
  `elapsedMs`, `traceId`, `totalPages`, `totalRecords`,
  `totalFetchElapsedMs`.

`fetchElapsedMs` mide únicamente `fetchImpl()` con reloj monotónico. El evento
de página completada se emite después de validar el payload y acumular sus
filas; el resumen solo se emite al terminar exitosamente `retrieveAll()`.
Customer no crea ni propaga este contexto. Nada se envía al frontend.

## Sanitización

El evento se construye por esquema cerrado y nunca recibe filas, SKU, nombres,
precios, URLs, imageUrl, next link, query, URL Dataverse, filtros, payload,
headers, Authorization, JWT, tokens, customerId, oid, IP, secretos, PII, error
o stack. La prueba usa deliberadamente filas, enlaces y tokens sintéticos
sensibles y demuestra que no aparecen en los eventos.

## Hipótesis de performance, sin implementar

1. **Reducir páginas mediante page size, impacto potencial alto pero
   condicionado.** Si Phase1-068 demuestra un tamaño efectivo menor que el
   máximo aceptado, solicitar explícitamente un `odata.maxpagesize` mayor
   podría reducir round trips conservando dataset, filtro, orden y paginación.
   Si las primeras páginas ya tienen 5 000 filas, esta vía no reducirá páginas.
2. **Revisar costo de `$orderby`, impacto potencial alto.** Cada página evalúa
   un orden de cuatro columnas de negocio y no incluye una clave única. La
   documentación oficial advierte que órdenes no únicos o complejos pueden
   generar overhead y paginación menos determinística. Cualquier cambio exige
   un prompt separado y preservar exactamente el dataset/contrato.
3. **Revisar selectividad/índices del filtro de compañías, impacto potencial
   medio-alto.** El predicado OR textual es obligatorio; solo metadata o
   telemetría Dataverse podría demostrar si carece de soporte eficiente. No se
   modifica el filtro.
4. **Payload y FormattedValue, impacto potencial medio-bajo.** Se seleccionan
   trece campos, incluidos textos/URLs, y se solicitan anotaciones. Todos
   pertenecen al contrato vigente; no se propone retirarlos sin decisión
   funcional separada.
5. **Evitar `getToken()` por página, impacto esperado bajo.** Reduciría llamadas
   locales al cache, pero la evidencia conocida está dominada por fetch y no
   justifica optimizar token en este hito.

No es seguro paralelizar páginas porque cada siguiente URL depende del
`@odata.nextLink` anterior. La estrategia segura candidata es medir primero el
tamaño efectivo y, solo si hay margen, solicitar un page size mayor conservando
el seguimiento íntegro de next links y todas las reglas actuales.

## Pruebas y validaciones

- Focalizadas Product trace/Dataverse/Gateway/API/Entra: **71/71 PASS**.
- Backend completo: **111/111 PASS**.
- Backend syntax/build: **PASS**.
- Frontend completo: **344/344 PASS en 32 archivos**.
- Frontend build: **PASS**, Vite 5.4.21, 1 683 módulos.
- `git diff --check`: **PASS**.
- `logs/` confirmado excluido por `.gitignore`.

El intento genérico `npm test -- --run` en `server/` no ejecuta pruebas porque
el script backend es `node --test` y Node exige un argumento para su opción
`--run`; la suite correcta `npm test` aprobó 111/111.

## Archivos y reversión

Productivos modificados:

- `server/src/observability/productRequestTrace.js`.
- `server/src/integrations/dataverse/dataverseClient.js`.

Pruebas modificadas:

- `server/tests/productRequestTrace.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.

Documentación:

- `docs/prompts/Phase1-068-DiagnoseProductDataverseMultiPageLatency.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-068-DiagnoseProductDataverseMultiPageLatency.log` (local y
  excluido de Git).
- `logs/Phase1-068-Validation.ps1` (helper local y excluido de Git).

La reversión elimina exclusivamente constantes/método/eventos Phase1-068 y sus
pruebas/documentación. No requiere migración, cambio de variables ni acción
externa.

## Alcance preservado y siguiente acción

No cambiaron Entity Set, `$select`, `$filter`, `$orderby`, `$top`, Prefer,
page size, timeouts, mappings, compradores, consolidación/pivot, conflictos,
FormattedValue, `fechaStr`, contratos, reglas de precios, Customer,
autenticación, CORS, frontend ni `VITE_PRODUCT_SOURCE=local`.

Siguiente acción exacta recomendada: después de revisión y autorización
separada, crear el checkpoint y desplegar exclusivamente la instrumentación
backend Phase1-068; una vez Live, ejecutar una única captura Product autenticada
controlada para obtener `totalPages`, filas por página y tiempos, sin activar
Product Dataverse como fuente normal ni aplicar optimizaciones.

No hubo commit, push, deploy, smoke productivo ni cambios en variables,
Render, Vercel, Dataverse o Entra.

Prompt ejecutado: Phase1-068 — Diagnose Product Dataverse Multi-Page Latency
