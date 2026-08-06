# Migración futura a Dataverse

## Estado actual

- Dataverse no está conectado.
- No hay autenticación, cliente Web API ni DataverseProvider.
- No hay entidades, columnas, relaciones ni mapeos aprobados.
- La configuración institucional reside temporalmente en `src/data/datos.json`.
- Maestro e Inventario se reciben como texto en estado React.
- Existe una primera versión de Repository con Provider inyectable y un Local Provider síncrono que encapsula las fuentes actuales.

## Objetivo aprobado

Dataverse está documentado como fuente futura principal y como destino previsto para configuración, Maestro de Productos y configuración de usuario. Inventario del Cliente podrá usar Dataverse o una integración autorizada.

El acceso deberá respetar:

```text
UI -> Application Service -> Domain Service -> Repository -> Provider -> Dataverse
```

## Restricciones obligatorias

- No inventar entidades ni columnas.
- No usar nombres comentados en `dataService.js` como esquema aprobado.
- No consultar Dataverse directamente desde componentes React.
- Confirmar autenticación, ambiente, tablas, columnas, tipos, claves, unidades y ownership antes de implementar.
- Documentar cada mapeo y su fuente de aprobación.
- Preservar reglas y resultados salvo cambio funcional explícito.
- No mezclar la migración con NEXUS.

## Contratos que deben estabilizarse antes de conectar

1. Contrato de configuración institucional: buckets, fases, períodos, países, umbrales y nota del motor.
2. Contrato del Maestro: identificador SKU, atributos, estado, fecha EOL y costos por origen.
3. Contrato del Inventario: SKU, origen, Tier, inventarios, compras y ventas.
4. Contrato de configuración de análisis: cliente, país, período, safety stock y lead times.
5. Contrato temporal: zona horaria y fecha base para EOL.
6. Contrato de errores, datos faltantes, defaults y trazabilidad.

Definir estos contratos no autoriza por sí mismo un esquema Dataverse; el mapeo físico seguirá necesitando aprobación.

Prompt 017 estabilizó una primera versión de estos contratos mediante `getMaestro`, `getInventario`, `getParametros`, `getConfiguracion`, `getCatalogos` y `getDatosEjemplo`. Prompt 018 agregó validación de los seis métodos equivalentes del Provider, formas mínimas del adaptador local y errores controlados para configuración ausente/incompleta. Ninguno definió contrato temporal remoto, autenticación ni mapeos físicos.

`getConfiguracion()` puede devolver `null` para lecturas parciales de catálogos o ejemplos. El caso de uso `processSellThrough` no admite esa nulabilidad: requiere las cinco claves operativas vigentes y devuelve `{ resultados: null, error }` antes de ejecutar dominio cuando el contrato no se cumple.

## Secuencia técnica aprobada por los principios del proyecto

La siguiente secuencia expresa dependencias arquitectónicas ya aprobadas, no entidades ni funcionalidades nuevas:

1. Separar reglas de dominio de `App.jsx` preservando comportamiento.
2. Introducir Application Service y Domain Service con contratos verificables.
3. Definir interfaces Repository independientes de la fuente.
4. Encapsular primero las fuentes actuales mediante Provider local.
5. Mover parámetros modificables al Configuration Center con catálogo y trazabilidad.
6. Aprobar el mapeo Dataverse.
7. Implementar Provider Dataverse y autenticación autorizada.
8. Validar paridad contra la fuente local antes del cambio de fuente.
9. Habilitar reversión al Provider anterior durante la transición.

Los pasos 1 a 4 tienen una implementación incremental vigente para el caso de uso principal: Domain/Application Service, Repository y Local Provider. Configuration Center, aprobación de mapeos, DataverseProvider y paridad remota siguen pendientes.

## Compatibilidad y asincronía

Repository y Local Provider son síncronos, y `dataService` llena su caché al importar el módulo. Una conexión remota será asíncrona; por tanto, se deberá definir carga, errores, reintentos y estado de espera en los contratos de aplicación. La inyección de Provider evita acoplar reglas al origen, pero no elimina este cambio técnico.

## Mapeo pendiente

| Dominio | Fuente actual | Destino Dataverse | Estado |
| --- | --- | --- | --- |
| Configuración institucional | JSON local vía Local Provider/Repository | No definido | Pendiente de aprobación |
| Maestro de Productos | Texto en React / muestra local vía Repository | No definido | Pendiente de aprobación |
| Inventario del Cliente | Texto en React / muestra local vía Repository | No definido o integración autorizada | Pendiente de aprobación |
| Configuración de usuario | Estado React vía Repository | No definido | Pendiente de aprobación |

## Criterios mínimos de paridad futura

- Mismos resultados para Inventario de Seguridad IOCA, EOL, fases, merma, quiebre, reposición y Pareto con un dataset controlado.
- Misma procedencia de origen y costo.
- Defaults y alertas equivalentes.
- Providers con los seis métodos requeridos y validación de sus formas de retorno antes de entregar datos al Repository.
- Exportaciones y dashboard sin regresiones.
- Trazabilidad del registro de fuente y versión de configuración.
- Build y validaciones del proyecto exitosos.

## Riesgos

- Asumir un esquema a partir de comentarios.
- Introducir acceso remoto dentro de la UI.
- Cambiar simultáneamente fuente y reglas, impidiendo verificar paridad.
- Ignorar zona horaria o fecha base.
- Duplicar parámetros entre JSON, estado React y Dataverse.
- Perder capacidad de reversión.
- Suponer que la validación del Local Provider cubre automáticamente un futuro Provider; cada adaptador deberá proteger sus propias formas de retorno.
