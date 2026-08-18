# Phase1-081 — Activate Real Dataverse Brand-to-Product Configuration Flow

## Estado

**PASS — REAL DATAVERSE BRAND-TO-PRODUCT FLOW READY / EXTERNAL ACTIVATION
PENDING / LOCALLY VALIDATED / NOT DEPLOYED.**

## Causa confirmada

`App.jsx` normaliza `import.meta.env.VITE_PRODUCT_SOURCE` y entrega el resultado
a `ProductProviderFactory`. Con valor `local`, o si la variable no existe, la
Factory construye `LocalProductProvider`; por tanto el ComboBox normal no puede
alcanzar `DataverseProductProvider.loadBrands()` ni
`GET /api/products/brands`. El Provider local del servicio default tampoco
recibe todavía el texto que el usuario pega posteriormente en Carga, por lo que
su catálogo inicial es vacío. No se encontró un bypass de capas ni una falla en
la ruta Dataverse frontend.

## Flujo final

Brands con `VITE_PRODUCT_SOURCE=dataverse`:

```text
App / ComboBox Marca
  -> ProductMasterService.loadBrands()
  -> ProductRepository.getBrands()
  -> DataverseProductProvider.loadBrands()
  -> GET /api/products/brands
```

Product Master después de seleccionar una marca:

```text
App
  -> ProductMasterService.loadProducts({ brand })
  -> ProductRepository.getProducts({ brand })
  -> DataverseProductProvider.loadProducts({ brand })
  -> GET /api/products/master?brand=<marca URL encoded>
```

La selección inicia la carga inmediatamente. El estado Product contiene
`status`, `brand` y `products`; una solicitud pendiente de la misma marca se
reutiliza. Cambiar A→B incrementa la identidad de solicitud, vacía A antes de
iniciar B y descarta cualquier éxito o error tardío de A. El cálculo usa solo
el dataset vigente de la marca seleccionada. Sin marca no se llama Product
Master; no existe endpoint global ni fallback.

## UX y contratos preservados

- ComboBox existente sin rediseño: búsqueda local, selección explícita,
  teclado, listbox accesible, responsive, loading, error sanitizado, cero
  resultados y deduplicación de Brands.
- Estado visible y sanitizado de la precarga Product por marca.
- Factory mantiene `local|dataverse`; React no hardcodea Dataverse y el
  Provider local permanece disponible.
- MSAL, Bearer, cliente HTTP compartido, AbortController y timeout Product de
  35 000 ms permanecen intactos.
- Customer no cambia ni se mezcla con Product.
- Mappings, consolidación SKU, FormattedValue, fechas, URL, conflictos y reglas
  de precio `0|null` no cambian.
- No se añadió persistencia, cache, smoke, OData frontend ni cambios backend.

## Pruebas

La cobertura frontend demuestra fuente local, selección explícita de Provider
Dataverse, endpoint Brands, 33 opciones en ComboBox, loading/error/cero,
selección mouse/teclado, precarga SKULLCANDY, brand URL encoded, deduplicación,
invalidación A→B, descarte de respuesta obsoleta, guard sin marca, ausencia de
carga global, Customer, Provider local, timeout de 35 s y mappings Product.

Resultados finales se registran en
`logs/Phase1-081-ActivateDataverseBrandProductConfigurationFlow.log`.

- `npm test -- --run`: 386/386 PASS en 33 archivos.
- `npm run build`: PASS, Vite 5.4.21, 1.684 módulos transformados.
- Backend: no ejecutado porque no hubo cambios backend.

## Activación pendiente y reversión

No se cambió Vercel. Después del checkpoint se debe establecer externamente
`VITE_PRODUCT_SOURCE=dataverse` y reconstruir/desplegar el frontend, porque
Vite resuelve la variable durante el build. Luego se valida el flujo normal de
Configuración sin otro smoke.

Reversión: retirar la precarga/estado Product por marca y sus pruebas, dejando
la Factory en `local`; no requiere migración de datos ni cambios externos.

No hubo commit, push, deploy, cambio de variables, Render, Vercel, Entra o
Dataverse.

Prompt ejecutado: Phase1-081 — Activate Real Dataverse Brand-to-Product Configuration Flow
