# LOCAL TEST MODE — Customer Master

## Objetivo

Permitir pruebas locales de Maestro Cliente mientras Dataverse real permanece
pausado, conservando la ruta Dataverse existente como alternativa configurable.

## Alcance implementable

- Crear cinco clientes ficticios bajo `src/providers/local/` con el contrato
  `{ customerCode, customerName, country, customerType }`.
- Completar el Local Customer Provider para buscar parcialmente por código o
  nombre sin distinguir mayúsculas.
- Seleccionar el Provider mediante `VITE_CUSTOMER_SOURCE=local|dataverse`.
- Mantener Customer Repository, Customer Master Application Service, selección
  sincronizada y Dataverse Customer Provider sin cambios de contrato.
- Agregar cobertura para fixtures, código, nombre, `customerType`, selección
  sincronizada y composición local/Dataverse.

## Archivos previstos

- `.env.example`.
- `src/App.jsx`.
- `src/providers/customerProviderFactory.js`.
- `src/providers/local/customerFixtures.js`.
- `src/providers/local/localCustomerProvider.js`.
- Pruebas bajo `src/providers/`, `src/application/` y `src/__tests__/`.
- `docs/knowledge/ARCHITECTURE_STATE.md` y `docs/knowledge/DATA_SOURCES.md`.
- `docs/prompts/LocalCustomerTestMode.md`.
- `logs/LocalCustomerTestMode.log`, excluido de Git.

## Reglas y contratos preservados

- No cambia el contrato Customer ni sus cuatro propiedades.
- Código, nombre, país y tipo continúan reemplazándose juntos desde una única
  selección del Customer Master Application Service.
- No se agregan reglas de negocio ni mappings físicos Dataverse.
- No se modifica Inventario Cliente, Maestro Producto, cálculos o defaults del
  flujo sell-through.

## Fuentes y parámetros

- Nueva fuente: fixtures locales exclusivamente ficticios y versionados.
- Fuente remota existente: Customer API mediante Dataverse Customer Provider.
- Parámetro técnico nuevo: `VITE_CUSTOMER_SOURCE`, con valores cerrados `local`
  y `dataverse`; `local` es el fallback de desarrollo compatible.
- `VITE_API_BASE_URL` y `getAccessToken` siguen siendo obligatorios al elegir
  `dataverse`.

## Fuera de alcance

No modificar `server/`, Entra, Render, Azure, Dataverse real, Inventario Cliente
ni reglas de negocio. No ejecutar commit, push o deploy.

## Riesgos y mitigaciones

- Confundir fixtures con clientes reales: códigos y nombres usan prefijo
  `LOCAL`/`Demo` y se documentan como ficticios.
- Activar una fuente inválida: el factory rechaza cualquier valor distinto de
  `local` o `dataverse`.
- Ocultar requisitos de la fuente remota: el Provider Dataverse conserva sus
  validaciones de URL, token y transporte.

## Validación

```text
npm test -- --run
npm run build
git diff --check
git status --short
```

## Reversión

Retirar el factory y los fixtures, restaurar la composición anterior de
`src/App.jsx` y eliminar `VITE_CUSTOMER_SOURCE`; no se requiere migración de
datos porque los fixtures son estáticos y no persisten selecciones.
