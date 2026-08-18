# Phase1-061 — Temporarily Increase Dataverse Fetch Timeout

## Estado

**PASS — TEMPORARY 30 SECOND DATAVERSE FETCH TIMEOUT / TOKEN BUDGET ISOLATED /
PRODUCT AND CUSTOMER REGRESSION COVERED / NOT DEPLOYED / NOT ACTIVATED.**

## Objetivo ejecutado

Aumentar temporalmente de 10 000 ms a 30 000 ms el timeout HTTP del
Dataverse Client para permitir una validación posterior de Product Master
contra Dataverse real. Este cambio no constituye una optimización definitiva.

## Alcance exacto del timer

En cada página, `retrievePage()` conserva este orden:

1. adquirir el token backend mediante `tokenProvider.getToken()`;
2. preparar los headers internos;
3. crear `AbortController` y programar el timer de 30 000 ms inmediatamente
   antes de `fetchImpl()`;
4. ejecutar exclusivamente el fetch HTTP Dataverse;
5. limpiar el timer en el `finally` inmediato de fetch;
6. procesar después el status HTTP, JSON, shape y paginación.

Por tanto, `getToken()` no consume el presupuesto del fetch. Tampoco quedan
dentro de esa ventana la preparación previa ni el parse/validación posterior
de la respuesta. El Entra Token Provider conserva sin cambios su timeout
independiente de 10 000 ms.

El Dataverse Client continúa siendo compartido por Product y Customer. El
nuevo valor afecta únicamente su fetch HTTP hacia Dataverse; no cambia
gateways, fuentes, contratos ni autenticación.

## Clasificación y observabilidad preservadas

Se mantienen sin cambios:

- `NETWORK_TIMEOUT`;
- `NETWORK_ABORTED`;
- `NETWORK_FETCH_FAILED`;
- `NETWORK_INVALID_URL`;
- `NETWORK_UNKNOWN`;
- `timeoutConfiguredMs`;
- `tokenAcquired`;
- `baseUrlConfigured`;
- `baseUrlProtocolValid`.

Phase1-057 permanece vigente para HTTP 200 inválido con `parseSuccess`,
`hasValueArray`, `hasNextLink`, `bodyType` y `contentTypeValid`. No se amplían
eventos con payload, URL, query, token, secretos ni datos Product/Customer.

## Pruebas

Las pruebas Dataverse Client usan timers simulados, sin esperas reales de 30
segundos, y demuestran:

1. default y diagnóstico configurados en 30 000 ms;
2. secuencia token → timer → fetch;
3. ausencia de timer mientras `getToken()` está pendiente;
4. fetch completado a 29 999 ms permitido;
5. fetch que supera 30 000 ms abortado como `NETWORK_TIMEOUT`;
6. cleanup del timer en éxito y timeout;
7. fallo de token sin timer, fetch ni diagnóstico de red Dataverse;
8. preservación de todas las categorías de red;
9. preservación de `invalid_response` Phase1-057;
10. Product API/Product Gateway sin regresión;
11. Customer API/Account Gateway sin regresión.

Resultados ejecutados:

- focalizadas Dataverse/Product/Customer: 40/40;
- backend completo: 106/106;
- backend build: `Backend syntax check passed.`;
- frontend completo: 342/342 en 32 archivos;
- frontend build: Vite 5.4.21, 1683 módulos transformados;
- `git diff --check`: aprobado.

## Archivos

### Creado

- `docs/prompts/Phase1-061-TemporarilyIncreaseDataverseFetchTimeout.md`;
- `logs/Phase1-061-TemporarilyIncreaseDataverseFetchTimeout.log` (local y
  excluido de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`;
- `server/tests/dataverseClient.node-test.js`;
- `server/tests/dataverseDiagnostics.node-test.js`;
- `docs/knowledge/ARCHITECTURE_STATE.md`;
- `docs/knowledge/DATA_SOURCES.md`;
- `docs/knowledge/ROADMAP.md`;
- `docs/knowledge/CHANGELOG.md`.

## Alcance preservado

No cambian `productpricelevels`, `crbbe_urlproducto`, mappings Product, filtro
`IOCA USA INC` / `SAND SPORTS, CORP.`, consolidación SKU, pivot USA/CHINA,
semántica `amount` 0/null, `PRODUCT_MASTER_CONFLICT`, conflictos de atributos,
FormattedValue de level/status, `fechaStr`, contratos Product/Customer,
frontend, MSAL/JWT ni `VITE_PRODUCT_SOURCE`.

No hubo commit, push, deploy, smoke productivo, cambio de variables ni
modificación de Render, Vercel, Entra o Dataverse. La reversión local consiste
en restaurar el default de 10 000 ms y la ubicación previa del timer retirando
el diff de Phase1-061; no requiere cambios externos.

## Temporalidad y siguiente acción exacta

Los 30 000 ms son **TEMPORALES** y deberán reevaluarse después de validar
Product Master contra Dataverse real. Si la consulta lo requiere, cualquier
optimización de consulta o paginación deberá definirse y autorizarse en otro
hito.

Después de revisión y autorización separada: crear el checkpoint, desplegar
exclusivamente el backend con Phase1-061 y ejecutar una única revalidación
Product autenticada. Mantener `VITE_PRODUCT_SOURCE=local`; no activar Product
Dataverse ni iniciar optimizaciones en este hito.

Prompt ejecutado: Phase1-061 — Temporarily Increase Dataverse Fetch Timeout
