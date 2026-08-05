# AGENTS.md — sell-through-ap

## Propósito

Este archivo es el punto de entrada obligatorio para cualquier desarrollador o asistente de IA que modifique el proyecto.

## Revisión obligatoria antes de cambiar código

1. Revisar el historial y los acuerdos aprobados del proyecto.
2. Revisar docs/PROJECT_CONTEXT.md.
3. Revisar docs/DATA_SOURCES.md.
4. Revisar docs/ROADMAP.md.
5. Revisar docs/PROMPT_HISTORY.md.
6. Revisar la rama actual y git status.
7. Identificar fuentes, parámetros y reglas afectadas.

## Principios obligatorios

- Arquitectura AI-First y modular.
- Una responsabilidad principal por archivo o módulo.
- Separar UI, lógica de negocio, configuración y acceso a datos.
- No acceder directamente a JSON, Excel, Dataverse o Business Central desde componentes React.
- Todo acceso a datos deberá pasar progresivamente por Repository y Provider.
- Toda constante de negocio modificable deberá migrar al Configuration Center.
- Documentar decisiones funcionales y arquitectónicas.
- Incluir comentarios que expliquen el motivo de reglas y contratos.
- Evitar comentarios redundantes.
- Preservar el comportamiento actual durante la refactorización.
- Ejecutar build y validaciones antes de recomendar commits.
- Mantener capacidad de reversión mediante Git.
- No incluir logs en Git.

## Flujo objetivo

UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente

## Validación mínima

- npm run build
- git diff --check
- git status --short

## Cambios mediante IA

Cada cambio deberá identificar:

- objetivo;
- archivos afectados;
- reglas afectadas;
- fuentes afectadas;
- parámetros afectados;
- riesgos;
- validaciones;
- estrategia de reversión.

Todo prompt relevante deberá documentarse dentro de docs/prompts.
