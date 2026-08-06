# Prompt 021 — Configuration Schema Single Source of Truth

## Objetivo

Eliminar la enumeración duplicada de claves entre Repository y Configuration Schema, manteniendo sin cambios el comportamiento funcional, los tres parámetros piloto y los contratos públicos.

## Contexto y hallazgo atendido

La auditoría `logs/Claude003-ConfigurationCenterAudit.log` identificó que `REQUIRED_PILOT_CONFIGURATION_KEYS` repetía en Repository las tres keys ya registradas en `CONFIGURATION_SCHEMA`. Esta duplicación permitía divergencias futuras y obligaba a actualizar dos listas al migrar un parámetro.

## Patrón aprobado

```text
configurationDefaults
        ↓ referencia única de valores
CONFIGURATION_SCHEMA
        ↓ validateConfigurationSchema
configurationService
        ↓ resultado de integridad
Repository
```

`CONFIGURATION_SCHEMA` es la única fuente autorizada de IDs, keys y metadatos de configuración migrada. `configurationDefaults.js` conserva el almacenamiento único de los valores predeterminados requerido desde Prompt 020; el schema los referencia y no los copia.

## Implementación

- Se elimina `REQUIRED_PILOT_CONFIGURATION_KEYS` y toda enumeración manual de claves en Repository.
- `validateConfigurationSchema(schema)` verifica el catálogo antes de usarlo.
- `configurationService` valida `CONFIGURATION_SCHEMA` una sola vez al cargar el módulo, crea sus índices y deriva las keys desde el resultado validado.
- Repository consume exclusivamente `configurationService.validateConfiguration()` y mantiene intactos sus seis métodos públicos.
- No se agregan ni se migran parámetros: continúan únicamente PAR-001, PAR-002 y PAR-003.

## Contratos de validación

La validación rechaza:

- un schema vacío o con definiciones que no sean objetos;
- ausencia de `id`, `key`, `categoria`, `tipo`, `valorPorDefecto`, `editable`, `origen` o `descripcion`;
- IDs duplicados;
- keys duplicadas;
- metadatos textuales vacíos;
- `editable` distinto de booleano;
- tipos no soportados o defaults incompatibles con el tipo declarado.

Una inconsistencia produce un error descriptivo durante la carga. Este comportamiento fail-fast evita construir Repository con un catálogo ambiguo y prepara una futura fuente Dataverse sin asumir entidades ni campos.

## Pruebas agregadas

`src/configuration/__tests__/configurationSchema.test.js` agrega tres casos unitarios:

1. rechazo de IDs duplicados;
2. rechazo de keys duplicadas;
3. rechazo de un default incompatible con el tipo declarado como schema inconsistente.

La suite total queda en 154 pruebas y conserva las 151 preexistentes.

## Compatibilidad funcional y AI-First

No cambian parámetros, IDs, keys, defaults, reglas, fórmulas, UI, Domain, parsers, motores, Provider, contratos públicos ni retornos. La validación es síncrona, independiente de React y centraliza un contrato explícito que una IA puede inspeccionar y verificar sin buscar listas paralelas.

## Dataverse y límites deliberados

No se crea DataverseProvider, persistencia, autenticación, asincronía, overrides, entidades ni campos Dataverse. Una integración futura deberá suministrar valores contra las definiciones validadas y requerirá una decisión aprobada independiente.

## Riesgos y mitigaciones

- Una definición inválida ahora impide cargar el módulo; es intencional para evitar operar con configuración ambigua y está cubierta por pruebas unitarias.
- Los tipos soportados por el validador son `string`, `number` y `boolean`; ampliar el modelo requerirá un contrato y pruebas explícitas.
- `App.jsx` y `datos.json` conservan sus superficies de compatibilidad de Prompt 020; retirarlas sigue fuera de alcance.

## Estrategia de reversión

Revertir la validación de schema, retirar la prueba dedicada y restablecer la comprobación anterior en Repository. No existen datos persistidos, dependencias o migraciones remotas que recuperar.

## Validaciones

- `npm test -- --run`: 154/154 pruebas aprobadas en ocho archivos.
- `npm run build`: aprobado.
- `git diff --check`: aprobado, sin errores de whitespace.

## Recomendación siguiente

Antes de migrar un cuarto parámetro, definir mediante prompt aprobado cómo el servicio recibirá valores externos u overrides y cómo se conservará la separación entre definición validada, resolución de valores y futura persistencia Repository/Provider.
