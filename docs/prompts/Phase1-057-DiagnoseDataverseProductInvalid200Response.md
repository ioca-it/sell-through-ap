# Phase1-057 — Diagnose Dataverse Product Invalid 200 Response

## Estado

**PASS — INVALID 200 CONDITION IDENTIFIED / PRODUCT ROOT CAUSE NOT YET
CONFIRMED / SAFE RESPONSE-SHAPE OBSERVABILITY ADDED / NOT DEPLOYED / NOT
ACTIVATED.**

## Objetivo ejecutado

Diagnosticar por código y pruebas por qué una respuesta Dataverse Product con
HTTP 200 puede clasificarse como `DATAVERSE_UPSTREAM_ERROR`,
`failureType=invalid_response`, sin solicitar ni registrar el payload Product
real y sin reabrir Entity Set, LogicalNames, filtros o mappings.

## Condición exacta

Después de comprobar `response.ok`, `retrievePage` produce exactamente el mismo
diagnóstico sanitizado en dos ramas:

1. `await response.json()` lanza una excepción. Esto incluye JSON inválido y
   body vacío.
2. El parse termina, pero `!Array.isArray(payload?.value)` es `true`. Esto
   incluye `null`, arrays como body raíz, escalares, objetos sin `value` y
   objetos donde `value` no es un array.

Ambas ramas lanzan después `DataverseRequestError`, que Product API conserva
como `502 / DATAVERSE_REQUEST_FAILED`. El evento previo no incluía una señal
que permitiera distinguir parse fallido de shape inválido.

## Shape esperado y contrato Dataverse

El payload aceptado por `retrievePage` es un objeto JSON con:

```json
{
  "@odata.context": "opcional e ignorado por el cliente",
  "value": [],
  "@odata.nextLink": "opcional"
}
```

- `value` es obligatorio y debe ser un array; puede estar vacío.
- `@odata.context` no se valida ni modifica el resultado.
- `@odata.nextLink` se conserva solo cuando es string.
- `retrieveMultiple` devuelve el array `value` de la primera página.
- `retrieveAll`, usado por Product Price Level Gateway, acumula páginas y solo
  sigue un nextLink cuyo origen coincide con Dataverse y cuyo path comienza en
  `/api/data/v9.2/`.

Por tanto, el contrato estándar Dataverse Web API
`{ "@odata.context": "...", "value": [...] }` ya estaba soportado antes de
Phase1-057. No se demostró un defecto de compatibilidad que justifique cambiar
el parser o la paginación.

## Matriz demostrada

| Respuesta 200 | Resultado actual |
| --- | --- |
| `{ "value": [{...}] }` | válida; devuelve las filas |
| `{ "value": [] }` | válida; devuelve `[]` |
| `value` array + `@odata.nextLink` | válida; `retrieveAll` pagina |
| JSON válido con `value` no-array | `invalid_response` |
| JSON inválido | `invalid_response`, parse fallido |
| body vacío | `invalid_response`, parse fallido |
| JSON válido con Content-Type no JSON | se acepta; Content-Type no es condición funcional |

## Causa raíz

La causa de la **clasificación** queda confirmada por código y pruebas: solo
puede ser una de las dos ramas anteriores cuando `response.ok=true`.

La causa específica de la respuesta Product observada **no queda confirmada**
con el evento histórico disponible. El shape estándar pasa en una prueba del
flujo completo Dataverse Client → Product Price Level Gateway → Product Service
→ Product API, por lo que no corresponde modificar la lógica funcional ni
suponer que Dataverse devolvió un shape distinto.

## Observabilidad segura agregada

Solo para eventos `invalid_response`, Dataverse Client añade:

- `hasValueArray`;
- `hasNextLink`;
- `bodyType`;
- `contentTypeValid`;
- `parseSuccess`.

No se registra body, payload, URL, query, fila, SKU, atributo, precio, token,
header ni valor comercial. `contentTypeValid` es únicamente diagnóstico y no
cambia la aceptación de la respuesta.

## Corrección funcional

No se aplica ninguna. El contrato estándar, `value` vacío, nextLink y la
paginación ya funcionan. Phase1-057 añade solo pruebas de caracterización y
observabilidad derivada para que una revalidación posterior distinga la rama
real sin exponer datos.

## Alcance y archivos

### Creados

- `docs/prompts/Phase1-057-DiagnoseDataverseProductInvalid200Response.md`.
- `logs/Phase1-057-DiagnoseDataverseProductInvalid200Response.log` (evidencia
  local excluida de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productApi.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.

Product Price Level Gateway, Product Service/ruta, Account Customer Gateway,
frontend y todos los archivos de mapping/filtros permanecen sin cambios.

## Reglas, fuentes y parámetros preservados

No cambian `productpricelevels`, mappings, filtros, `crbbe_urlproducto`,
precios, conflictos, FormattedValue, `fechaStr`, contrato Product, Customer
Master, frontend, autenticación, variables ni fuentes. La reversión consiste
en retirar los cinco campos derivados y las pruebas/documentación de este
hito; no requiere cambios externos.

## Validaciones

- Pruebas focalizadas Dataverse/Product/Customer: 62/62 aprobadas.
- `npm --prefix server test`: 97/97 aprobadas.
- `npm --prefix server run build`: `Backend syntax check passed.`
- `npm test -- --run`: 342/342 aprobadas en 32 archivos.
- `npm run build`: Vite 5.4.21, 1683 módulos transformados, aprobado.
- `git diff --check`: aprobado sin errores; avisos LF/CRLF informativos.
- `git status --short`: solo contiene los archivos documentados de
  Phase1-057; el log está excluido de Git.

La evidencia final se registra en
`logs/Phase1-057-DiagnoseDataverseProductInvalid200Response.log`.

## Siguiente acción exacta

Después de revisión y autorización separada: checkpoint/deploy del backend y
una única revalidación Product para capturar exclusivamente los cinco campos
sanitizados. Con `parseSuccess` y `hasValueArray` se decidirá si existe una
corrección posterior. `VITE_PRODUCT_SOURCE=local` debe permanecer vigente.

No hubo commit, push, deploy ni smoke productivo.

Prompt ejecutado: Phase1-057 — Diagnose Dataverse Product Invalid 200 Response
