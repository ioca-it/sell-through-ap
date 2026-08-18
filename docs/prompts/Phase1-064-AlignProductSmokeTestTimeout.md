# Phase1-064 — Align Product Smoke Test Timeout

## Estado

**PASS — TEMPORARY PRODUCT SMOKE TIMEOUT ALIGNED / FRONTEND-ONLY / NOT
DEPLOYED / NOT EXECUTED / NOT ACTIVATED.**

## Objetivo ejecutado

Alinear exclusivamente el timeout frontend temporal del smoke Product
Phase1-042 con el timeout backend Dataverse vigente, para que el navegador
pueda observar la respuesta final de Render sin abortar a los 10 segundos.

## Antecedente confirmado

La inspección Phase1-063 confirmó que el arnés frontend iniciaba un timer de
10 000 ms inmediatamente antes de `fetch`, pasaba el `AbortSignal` al request
y devolvía `REQUEST_TIMEOUT` al vencer. El backend conserva una ventana
temporal independiente de 30 000 ms, creada exclusivamente alrededor de su
fetch hacia Dataverse.

## Implementación

El único cambio productivo es el default del arnés temporal:

```text
10 000 ms -> 35 000 ms
```

Los 5 000 ms adicionales sobre el límite backend permiten completar trabajo
de Render, serialización, respuesta HTTP y lectura de `response.json()`.
Dependency injection del timeout, AbortController, paso de la señal a fetch,
cleanup en `finally` y diagnóstico `REQUEST_TIMEOUT` permanecen intactos.

## Aislamiento explícito

Los 35 000 ms aplican **solo** a `runProductMasterSmokeTest()` cuando el arnés
temporal Phase1-042 se activa mediante:

```text
?phase1-042-product-smoke=1
```

No configuran la carga Product normal, Product Provider, Product Gateway ni
Dataverse Client. `src/main.jsx` no requiere cambios porque ya evita iniciar
el arnés cuando el trigger no está presente.

## Seguridad preservada

El resultado continúa limitado a status, conteo, etapas sanitizadas,
diagnóstico y booleanos estructurales. No se exponen tokens, JWT, claims,
headers, URLs internas, payloads Product/Dataverse, SKU, nombres, precios,
PII, errores originales o secretos.

## Cobertura

- Default real de 35 000 ms.
- Respuesta antes del timeout sin aborto posterior.
- Timeout inyectado independiente del default.
- Aborto efectivo exactamente al vencer.
- Cleanup del timer en éxito y timeout.
- `REQUEST_TIMEOUT` sanitizado.
- Trigger ausente sin inicializar el Product smoke.
- Regresión Customer smoke mediante la suite frontend completa.

## Archivos

Modificados:

- `src/auth/productMasterSmokeTest.js`.
- `src/auth/__tests__/productMasterSmokeTest.test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

Creados:

- `docs/prompts/Phase1-064-AlignProductSmokeTestTimeout.md`.
- `logs/Phase1-064-AlignProductSmokeTestTimeout.log` (local y excluido de Git).

## Alcance preservado

No cambian backend, Dataverse Client ni su timeout de 30 000 ms, Product
Gateway, `productpricelevels`, `crbbe_urlproducto`, mappings, filtros, precios,
conflictos, `fechaStr`, Customer Master, MSAL, JWT, Product Provider,
`VITE_PRODUCT_SOURCE`, variables o infraestructura.

## Reversión

Restaurar el default del arnés temporal de 35 000 ms a 10 000 ms y retirar las
dos pruebas específicas y las entradas documentales Phase1-064. No existe
migración, dato, configuración externa o cambio backend que revertir.

## Validaciones

- Prueba Product smoke focalizada: 19/19 aprobadas.
- Suite frontend completa: 32 archivos y 344/344 pruebas aprobadas.
- Build frontend: aprobado con Vite 5.4.21 y 1 683 módulos transformados.
- Tests backend: no aplican; ninguna dependencia backend fue modificada.
- `git diff --check`: aprobado con exit code 0.
- `git status --short`: cinco archivos modificados y el prompt Phase1-064
  nuevo; el log local permanece excluido mediante `.gitignore`.

## Siguiente acción exacta

Después de revisión y autorización separada, crear el checkpoint y desplegar
los cambios temporales Phase1-061 backend y Phase1-064 frontend. Solo cuando
ambos estén Live ejecutar una única revalidación Product autenticada,
manteniendo `VITE_PRODUCT_SOURCE=local`. Después del resultado, reevaluar ambos
timeouts temporales mediante otro hito.

No hubo commit, push, deploy, smoke productivo ni cambios en Vercel, Render,
Entra o Dataverse.

Prompt ejecutado: Phase1-064 — Align Product Smoke Test Timeout
