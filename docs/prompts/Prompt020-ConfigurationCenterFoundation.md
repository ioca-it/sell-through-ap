# Prompt 020 — Configuration Center Foundation

## Objetivo

Implementar la infraestructura base del Configuration Center usando exclusivamente PAR-001, PAR-002 y PAR-003, sin cambiar comportamiento funcional ni los contratos públicos existentes.

## Patrón aprobado

```text
Repository -> configurationService -> configurationSchema -> configurationDefaults
```

- `configurationDefaults.js` centraliza únicamente los tres valores predeterminados piloto.
- `configurationSchema.js` registra para cada piloto `id`, `key`, `categoria`, `tipo`, `valorPorDefecto`, `editable`, `origen` y `descripcion` según `BUSINESS_PARAMETERS.md`.
- `configurationService.js` ofrece lectura y validación síncrona sin depender de React, UI, Provider o persistencia.
- Repository valida internamente que las tres claves estén registradas y tengan valor, sin agregar métodos ni cambiar las seis delegaciones al Provider.

## Parámetros piloto migrados

| ID | Clave | Default | Editable |
| --- | --- | --- | --- |
| PAR-001 | `app.version` | `V1` | No |
| PAR-002 | `app.name` | `IOCA Sell-Through Intelligence V1` | No |
| PAR-003 | `dataset.version` | `1.0.0` | No |

No se incorporó ningún otro ID de `BUSINESS_PARAMETERS.md`.

## Contratos creados

| Contrato | Resultado |
| --- | --- |
| `getConfiguration()` | Objeto inmutable nuevo con las tres claves y sus defaults. |
| `getValue(key)` | Valor efectivo; en esta foundation equivale al default. |
| `hasKey(key)` | Booleano de existencia de una clave registrada. |
| `getDefaultValue(key)` | Default del schema para la clave. |

`getValue` y `getDefaultValue` rechazan claves desconocidas con un error descriptivo. No existe fallback silencioso fuera del schema.

## Archivos creados

- `src/configuration/configurationDefaults.js`.
- `src/configuration/configurationSchema.js`.
- `src/configuration/configurationService.js`.
- `docs/prompts/Prompt020-ConfigurationCenterFoundation.md`.
- `logs/Prompt020-ConfigurationCenterFoundation.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/repositories/sellThroughRepository.js`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/CONFIGURATION.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Compatibilidad y límites deliberados

- Los seis métodos públicos de Repository y sus formas de retorno permanecen idénticos.
- `getConfiguracion()` conserva `null` para Repositories parciales y no mezcla los pilotos con la configuración de sesión.
- `App.jsx`, JSX, navegación, Application Service, Domain, motores, parsers y Providers no se modifican.
- Los literales visibles en App y el metadato en `datos.json` permanecen como superficies de compatibilidad; retirarlos requiere una migración posterior con consumidores caracterizados.
- No existen UI, edición, overrides, persistencia, Provider nuevo, DataverseProvider, asincronía, autenticación o esquema Dataverse.

## Criterios para migraciones futuras

- Autorizar IDs concretos del catálogo; nunca migrar por categoría implícita.
- Distinguir default configurable de regla fija, fórmula, texto o valor derivado.
- Incorporar default y schema antes de conectar consumidores.
- Mantener claves estables y error explícito para claves desconocidas.
- Acceder a la fuente futura mediante Repository/Provider, no desde UI.
- Caracterizar cada consumidor y preservar resultados antes de retirar el valor anterior.
- Aprobar por separado asincronía, persistencia, permisos y mapeo Dataverse.

## Riesgos y pendientes

- La foundation centraliza defaults, pero no sustituye todavía los consumidores visibles porque `App.jsx` y `datos.json` están fuera de alcance.
- No existen pruebas unitarias nuevas del servicio para mantener exactamente 151 pruebas; build y recorridos Repository existentes validan su integración y el contrato queda pendiente de una suite dedicada cuando se amplíe el alcance.
- La validación interna de Repository confirma presencia, no transforma ni expone los valores.
- La edición y validación de overrides no están diseñadas.
- Entidades, campos, permisos y autenticación Dataverse permanecen pendientes de definición.

## Validaciones

- `npm test -- --run`: 151/151 pruebas aprobadas en 7 archivos.
- `npm run build`: aprobado; 1516 módulos transformados y bundle generado en `dist`.
- `git diff --check`: aprobado, sin errores de whitespace.

## Estrategia de reversión

Eliminar los tres módulos de `src/configuration/`, retirar el import y la validación piloto de Repository y revertir exclusivamente las entradas documentales de Prompt 020 mediante Git. No hay persistencia, datos migrados ni cambios funcionales que recuperar.

## Recomendación siguiente

Crear una suite dedicada para Configuration Service antes de migrar un cuarto parámetro y seleccionar el próximo ID solo mediante un prompt aprobado que identifique todos sus consumidores y la estrategia para retirar su fuente de compatibilidad.
