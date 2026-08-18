# Phase1-079 — Add Brand Parameter to Existing Product Master Smoke

## Estado

**PASS — EXISTING PRODUCT MASTER SMOKE REQUIRES BRAND / SANITIZED /
FRONTEND-ONLY / LOCALLY VALIDATED / NOT DEPLOYED / NOT EXECUTED.**

## Objetivo ejecutado

Se ajustó exclusivamente el arnés temporal Phase1-042 existente para que una
ejecución de Product Master requiera la marca funcional recibida en el query:

```text
?phase1-042-product-smoke=1&brand=SKULLCANDY
```

No se creó otro smoke. El launcher lee `brand` con `URLSearchParams`; el runner
aplica `trim()`, rechaza ausencia, vacío o más de 100 caracteres y construye el
único request mediante `URL` y `URL.searchParams`:

```text
GET /api/products/master?brand=SKULLCANDY
```

El frontend envía exclusivamente `brand`; no acepta ni concatena OData.

## Aislamiento y seguridad

Sin el valor exacto `phase1-042-product-smoke=1`, el launcher retorna antes de
inicializar MSAL, adquirir token o ejecutar `fetch`. Una marca inválida también
retorna antes de autenticación y red con `SMOKE_BRAND_REQUIRED`, dentro del
resultado sanitizado existente.

Se preservan sesión MSAL, token delegado Bearer, GET, timeout de 35 000 ms,
AbortController, señal, cleanup y la allowlist del resumen Product. No se
registran token, marca, datos Product, URL completa, claims, headers, payload,
query ni errores originales.

## Alcance preservado

- Product Provider normal y `VITE_PRODUCT_SOURCE=local` no cambian.
- Backend, Dataverse, mappings, filtros, groupby Brands y tracing no cambian.
- Customer y el smoke Phase1-075 permanecen intactos.
- No hubo cambios de variables, refactors, nuevas funciones o ejecución real.

## Pruebas

La prueba existente de Phase1-042 cubre ahora de forma explícita la URL
`/api/products/master?brand=SKULLCANDY`, único parámetro `brand`, trim/encoding,
vacío, más de 100 caracteres, ausencia de trigger, Bearer y timeout de 35 s.
La suite completa conserva la cobertura del smoke Phase1-075.

## Archivos

Modificados:

- `src/auth/productMasterSmokeTest.js`.
- `src/auth/__tests__/productMasterSmokeTest.test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/CHANGELOG.md`.

Creados:

- `docs/prompts/Phase1-079-AddBrandToProductMasterSmoke.md`.
- `logs/Phase1-079-AddBrandToProductMasterSmoke.log` (local y excluido de Git).

## Riesgo y reversión

El riesgo queda limitado al arnés temporal: una URL antigua sin `brand` ya no
puede provocar la carga global. La reversión restaura la validación/construcción
anterior del endpoint y sus pruebas/documentación, sin migraciones ni cambios
externos.

## Validación

- `npm test -- --run`: **PASS**, 383/383 en 33 archivos; Phase1-042 aporta 22
  casos y Phase1-075 conserva sus 21 casos.
- `npm run build`: **PASS**, Vite 5.4.21 y 1.684 módulos transformados.
- `git diff --check`: **PASS**, sin errores de whitespace; avisos informativos
  LF → CRLF del entorno Windows.
- `git status --short`: únicamente los cinco archivos versionables declarados
  por Phase1-079; el log local permanece ignorado.

No se ejecutan pruebas backend porque el backend no fue modificado.

No hubo commit, push, deploy, smoke productivo ni cambios de variables.

URL posterior al deploy:

```text
https://sell-through-ap.vercel.app/?phase1-042-product-smoke=1&brand=SKULLCANDY
```

Prompt ejecutado: Phase1-079 — Add Brand Parameter to Existing Product Master Smoke
