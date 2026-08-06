# Estándares de desarrollo

## Principios obligatorios

- Mantener una arquitectura AI-First y modular.
- Asignar una responsabilidad principal por archivo o módulo.
- Separar UI, lógica de negocio, configuración y acceso a datos.
- No acceder directamente a JSON, Excel, Dataverse o Business Central desde componentes React.
- Encaminar progresivamente todo acceso por Repository y Provider.
- Llevar constantes de negocio modificables al Configuration Center mediante cambios aprobados.
- Preservar el comportamiento actual durante refactorizaciones.
- Mantener cambios incrementales, revisables y reversibles con Git.
- No mezclar sell-through-ap con NEXUS.

## Arquitectura de referencia

```text
UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente
```

El monolito actual en `App.jsx` es una brecha conocida, no un patrón a replicar en código nuevo.

## Límites entre capas

- UI: interacción y presentación; no parsing de fuentes ni reglas de dominio nuevas.
- Application Service: orquestación de casos de uso.
- Domain Service: cálculos y decisiones de negocio sin dependencias de UI.
- Repository: contrato de lectura/escritura para la aplicación.
- Provider: adaptación de JSON, archivos, Dataverse, Business Central u otra fuente.
- Configuración: valores modificables fuera de componentes.

Estas capas son objetivo aprobado; no deben declararse implementadas hasta existir en el código.

## Código y comentarios

- Preferir nombres que expresen el dominio y la unidad de medida.
- Comentar el motivo de una regla, un fallback o un contrato.
- Evitar comentarios que solo repitan el código.
- Documentar defaults que puedan alterar resultados, como origen USA o semanas 4.33.
- Mantener fórmulas y umbrales trazables al catálogo de reglas y configuración.
- Evitar nuevas responsabilidades en `App.jsx`; una extracción debe preservar resultados y exportaciones.

## Datos e integraciones

- No inventar funcionalidades, reglas, parámetros, entidades o columnas.
- No interpretar nombres comentados como contratos aprobados.
- Validar encabezados, tipos, unidades, campos obligatorios y fallbacks en los bordes del sistema.
- Mantener la UI independiente de formatos físicos de fuente.
- Diseñar asincronía explícita antes de sustituir una fuente local por una remota.

## Contratos Repository y Provider

- Validar al construir un Repository que su Provider implemente todos los métodos requeridos como funciones.
- Hacer que cada Provider valide las formas mínimas que recibe y devuelve; no trasladar datos inválidos hacia parsers o dominio.
- Permitir `getConfiguracion() === null` únicamente en Repositories parciales destinados a catálogos o datos de ejemplo.
- Validar en cada caso de uso las claves de configuración que realmente consume y devolver errores contractuales, no excepciones de acceso a propiedades.
- No convertir estas validaciones técnicas en un esquema Dataverse ni en reglas funcionales nuevas.

## Documentación de cambios

Cada cambio mediante IA debe identificar:

- objetivo;
- archivos afectados;
- reglas afectadas;
- fuentes afectadas;
- parámetros afectados;
- riesgos;
- validaciones;
- estrategia de reversión.

Todo prompt relevante se registra en `docs/prompts/`; toda información nueva confirmada actualiza `docs/knowledge/`.

## Validación mínima

```text
npm test -- --run
npm run build
git diff --check
git status --short
```

La suite de caracterización de `src/utils/` es obligatoria para todo cambio que pueda afectar esos contratos. Si se incorporan pruebas adicionales o lint, deberán ejecutarse además de esta base.

## Git y evidencia

- No crear commits, ramas o push sin autorización explícita.
- No modificar configuración de Git salvo solicitud explícita.
- Preservar cambios preexistentes del usuario.
- Los logs de ejecución se guardan localmente bajo `logs/` cuando el prompt los requiera, pero `.gitignore` impide incluirlos en Git.
