# Configuración y parámetros

## Clasificación de configuración actual

La aplicación posee desde Prompt 020 una foundation interna del Configuration Center, limitada a tres parámetros piloto y sin UI, persistencia o Provider nuevo. El resto de parámetros continúa repartido entre JSON local, estado React, configuración de Vite y literales dentro de `App.jsx`.

## Catálogo oficial

`docs/knowledge/BUSINESS_PARAMETERS.md` es, desde Prompt 019, la fuente oficial para identificar y clasificar los parámetros que alimentarán el futuro Configuration Center. Contiene 160 elementos trazables: 82 parámetros configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos de UI y 2 valores derivados.

El catálogo no habilita edición ni modifica defaults. Antes de migrar un valor se debe respetar su clasificación, confirmar si corresponde a configuración institucional o a sesión y resolver las dependencias duplicadas que allí se documentan. Entidades, campos, permisos y mapeos Dataverse permanecen pendientes de definición.

## Foundation aprobada por Prompt 020

Solo se incorporaron estos pilotos:

| ID | Clave | Default centralizado | Editable |
| --- | --- | --- | --- |
| PAR-001 | `app.version` | `V1` | No |
| PAR-002 | `app.name` | `IOCA Sell-Through Intelligence V1` | No |
| PAR-003 | `dataset.version` | `1.0.0` | No |

Patrón implementado:

```text
Repository -> configurationService -> configurationSchema -> configurationDefaults
```

`configurationService` expone `getConfiguration()`, `getValue(key)`, `hasKey(key)`, `getDefaultValue(key)` y la validación interna `validateConfiguration()`. Una clave desconocida no obtiene fallback silencioso: las lecturas por clave generan un error descriptivo. Repository consume la validación central sin agregar métodos públicos, cambiar retornos ni mezclar estos pilotos con la configuración de sesión del procesamiento.

Para preservar comportamiento, Prompt 020 no modifica `App.jsx` ni `datos.json`. Por ello los literales visibles y el metadato local continúan como superficies de compatibilidad mientras la nueva capa concentra sus defaults y metadatos para la siguiente migración aprobada. No existe edición, override, persistencia, autenticación o lectura Dataverse.

## Configuration Schema como Single Source of Truth

Desde Prompt 021, `CONFIGURATION_SCHEMA` es la única fuente autorizada para enumerar IDs, keys y metadatos de configuración migrada. Repository no mantiene una lista paralela: consume el resultado ya validado por `configurationService`, cuyas claves se derivan automáticamente del schema.

## Configuration Center MVP — Prompt 026

El MVP añade una pestaña responsive de consulta y administración sobre los tres parámetros ya registrados. La pantalla soporta búsqueda por nombre, clave o descripción, filtro por categoría, edición condicionada por `editable`, validación por `tipo`, restauración individual y restauración global.

`configurationService` expone `getSchema()`, `getConfiguration()`, `getValue(key)`, `setValue(key, value)`, `resetValue(key)`, `resetAll()` y `loadPersistedValues()`. La precedencia es valor persistido válido y, en su ausencia, default del schema. Solo el servicio accede a `localStorage`; los parámetros no editables se descartan del almacenamiento y no pueden modificarse desde UI ni API.

Al cargar el módulo se valida que el schema sea no vacío, que cada definición incluya `id`, `key`, `categoria`, `tipo`, `valorPorDefecto`, `editable`, `origen` y `descripcion`, que IDs y keys sean únicos y que tipos, defaults y editabilidad sean consistentes. Una inconsistencia detiene la carga con un error descriptivo para evitar operar con un catálogo ambiguo.

`configurationDefaults.js` sigue siendo el único almacenamiento de los tres valores predeterminados aprobados y el schema los referencia; no hay copia de valores. Este patrón no agrega parámetros, overrides, persistencia, UI ni integración Dataverse.

### Criterios para futuras migraciones

- Seleccionar parámetros por ID desde `BUSINESS_PARAMETERS.md` mediante alcance explícito; no migrar grupos implícitos.
- Confirmar que el elemento sea un valor configurable/default y no una fórmula, regla fija, texto o valor derivado sin decisión funcional.
- Añadir default y schema con tipo, origen, editabilidad y descripción antes de conectar consumidores.
- Mantener una sola clave estable y validar claves desconocidas en el borde del servicio.
- Integrar mediante Repository sin acceso desde React a la fuente física.
- Preservar sincronía hasta que un prompt apruebe estados remotos y asincronía.
- Caracterizar consumidores y ejecutar regresión antes de retirar cualquier literal de compatibilidad.
- No definir entidades, campos ni permisos Dataverse sin aprobación documental previa.

## Configuración institucional local

Ubicación: `src/data/datos.json`, encapsulada por `src/services/dataService.js`, adaptada por Local Provider y expuesta mediante Repository.

| Parámetro | Valor actual | Uso |
| --- | --- | --- |
| `_version` | `1.0.0` | Versión declarada del dataset local. |
| `_versionApp` | `V1` | Versión de aplicación indicada por el dataset. |
| `umbralMermaPct` | `0.10` | Alerta cuando la merma porcentual es estrictamente mayor. |
| `semanasPorPeriodo.Semanal` | `1` | Conversión del período. |
| `semanasPorPeriodo.Quincenal` | `2` | Conversión del período. |
| `semanasPorPeriodo.Mensual` | `4.33` | Conversión y fallback general. |
| `semanasPorPeriodo.Bimestral` | `8.67` | Conversión del período. |
| `semanasPorPeriodo.Trimestral` | `13` | Conversión del período. |
| `semanasPorPeriodo.Semestral` | `26` | Conversión del período. |
| `semanasPorPeriodo.Anual` | `52` | Conversión del período. |

También contiene:

- `paisesIOCA`: opciones del selector de país;
- `periodosAnalisis`: períodos estándar y `Personalizado`;
- `bucketEOL`: nombres, rangos informativos, estrategias, descuento base y prioridad;
- `tablaFases`: marca, fase, días mínimos, origen, descuento y aportes;
- `notaInvSeguridadIOCA`: fórmula, condiciones y texto consultivo;
- `maestroSample` e `inventarioSample`: datos de demostración.

Los valores completos deben consultarse directamente en el JSON antes de modificarlos.

## Configuración de sesión

Ubicación: estado `config` en `src/App.jsx`.

| Parámetro | Inicial | Restricción/uso actual |
| --- | --- | --- |
| `codigoCliente` | vacío | Obligatorio para avanzar desde Configuración. |
| `nombreCliente` | vacío | Obligatorio para avanzar desde Configuración. |
| `pais` | `Guatemala` | Opción de `paisesIOCA`. |
| `fechaCorte` | fecha del navegador | Contexto visible y de exportación; no controla actualmente el cálculo EOL. |
| `periodoAnalizado` | `Mensual` | Selecciona semanas estándar o modo personalizado. |
| `periodoDetalle` | vacío | Texto opcional para contexto. |
| `semanasPersonalizadas` | `4` | UI con mínimo 0.1; un valor inválido se reemplaza por 4.33. |
| `safetyStockSemanas` | `4` | Entero no negativo usado por el motor IOCA. |
| `leadTimeUSA` | `4` | Entero no negativo, semanas. |
| `leadTimeCHINA` | `12` | Entero no negativo, semanas. |

### Contrato de configuración del procesamiento

- Repository puede devolver `null` cuando la instancia se usa únicamente para catálogos o datos de ejemplo.
- `processSellThrough` requiere un objeto con `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA`.
- Una configuración ausente, de tipo inválido o con alguna de esas claves ausente/null/undefined devuelve `{ resultados: null, error }` con mensaje controlado.
- Las demás claves de sesión continúan siendo contexto de UI/exportación y no se convierten en requisitos del motor mediante Prompt 018.

## Constantes y umbrales dentro de App.jsx

Estos valores forman parte del comportamiento actual y son candidatos al Configuration Center si se vuelven modificables:

| Regla | Valor actual |
| --- | --- |
| Versión/nombre visibles | `V1` / `IOCA Sell-Through Intelligence V1` |
| Fallback de semanas | `4.33` |
| Límites pre-EOL | 27, 83 y 360 días; más de 360 sigue Planificado |
| Inicio mínimo de fase | 90 días post-EOL |
| Pareto | 80% acumulado |
| Interpretación de rotación | 1, 3 y 10 |
| Sobreinventario ejecutivo | índice mayor que 5 |
| Alto valor EOL | más de 20% del valor total |
| Alto valor sin movimiento | más de 10% del valor total |
| Categoría en obsolescencia | al menos 75% de SKU en piso EOL |
| Desalineación categoría | diferencia absoluta de al menos 10 pp |
| Activación BEST | Ventas menores o iguales a 1 con inventario |
| Recomendación visual BEST | bajo 25% de ventas en la narrativa del informe |
| Número de elementos en listas de acción | 5 |

También están hard-coded textos de acciones, hallazgos, causas, plan 30/60/90, paletas visuales y formatos de exportación.

## Tabla de fases actual

La única marca configurada es `SKULLCANDY`. Ambas rutas tienen F0/F1/F2/F3 desde 90/120/150/240 días. F1-F3 distribuyen el descuento con aporte IOCA `0.20` y Retail `0.80`; F0 usa aportes cero. Los descuentos al consumidor varían por origen y deben consultarse en `tablaFases`.

## Configuración técnica

Ubicación: `vite.config.js`.

- Directorio de salida: `dist`.
- Sourcemaps: desactivados.
- Límite de advertencia de chunk: `1500`.
- Puerto de desarrollo: `5173`.
- Apertura automática del navegador: habilitada.

## Reglas para cambios de parámetros

- Identificar primero la regla y todos sus consumidores.
- Mantener una sola fuente autorizada por parámetro durante la migración.
- No mover valores al Configuration Center sin un contrato aprobado.
- Documentar valor anterior, valor nuevo, razón, riesgos y reversión.
- Validar dashboard, informe, CSV y Excel cuando un parámetro afecte resultados.
