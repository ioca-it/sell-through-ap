# Phase 1-002 — Dataverse Maestro Cliente

## Objetivo aprobado

Implementar la integración inicial de Maestro Cliente con búsquedas por código y
nombre, selección única sincronizada y carga de código, nombre y país, sin
modificar Maestro Producto, Inventario Cliente ni reglas de negocio.

## Arquitectura implementada

```text
Configuración UI
  -> Customer Master Application Service
    -> Customer Repository
      -> Dataverse Customer Provider (configurable, conexión pendiente)
      -> Local Customer Provider (temporal e inyectable)
```

El contrato normalizado es:

```js
{
  customerCode,
  customerName,
  country,
}
```

Los nombres físicos de Dataverse solo se reciben y usan en
`dataverseCustomerProvider.js`. Repository, Application Service y UI reciben
únicamente el contrato normalizado.

## Alcance técnico

- `searchCustomersByCode` y `searchCustomersByName` en ambos Providers.
- `searchByCode` y `searchByName` en Customer Repository.
- Provider local sin datos institucionales hardcodeados; acepta fixtures por
  inyección para pruebas o una composición local temporal.
- Dos combobox accesibles en Configuración que comparten una sola selección.
- Seleccionar cualquier resultado reemplaza atómicamente código, nombre y país.
- Editar una búsqueda invalida los otros datos del cliente para evitar una
  combinación inconsistente.
- País queda derivado y no editable en esta fase.

## Configuración real pendiente

La conexión real permanece desactivada hasta confirmar:

1. URL del entorno Dataverse.
2. nombre lógico de la tabla de Maestro Cliente.
3. nombre lógico del campo Código de Cliente.
4. nombre lógico del campo Nombre de Cliente.
5. nombre lógico del campo País y su forma real (texto, lookup u opción).
6. transporte/proxy autorizado y mecanismo de autenticación seguro.
7. permisos mínimos de lectura y política de paginación/límites del servicio.

No se agregan secretos, credenciales ni tokens al frontend. El contrato
`transport.retrieveMultiple` debe implementarse posteriormente mediante una
frontera segura que mantenga la autenticación fuera del bundle del navegador.

## Riesgos y reversión

- Sin los datos anteriores, el Provider Dataverse valida y rechaza una
  configuración incompleta; App usa un Provider local vacío e inyectable.
- Datos fuente incompletos se normalizan como textos vacíos y la configuración
  no se considera completa hasta tener código y nombre.
- La reversión consiste en retirar la composición Customer de `App.jsx` y los
  módulos nuevos; el Repository histórico de sell-through y sus seis métodos no
  fueron modificados.

## Validación requerida

```text
npm test -- --run
npm run build
git diff --check
git status --short
```

No commit, push ni despliegue.
