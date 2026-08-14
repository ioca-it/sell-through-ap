# Phase1-024 — Resolve Dataverse Customer Filter Logical Names

## Objetivo aprobado

Resolver con evidencia los nombres lógicos y tipos Dataverse de los atributos
que implementan las reglas empresariales `Tipo/clasificación de cliente = 3` y
`Estado de cliente = 4`, sin retirar reglas, inventar columnas ni cambiar el
contrato Customer, autenticación, variables o despliegue.

## Estado

**REQUIERE METADATA DATAVERSE.** Ninguno de los dos reemplazos se considera
resuelto todavía. El repositorio no contiene exportación de solución, snapshot
de metadata ni otra fuente que relacione inequívocamente ambos conceptos de
negocio con atributos del entorno productivo y sus tipos.

| Regla empresarial | Nombre inválido actual | Nombre correcto | Tipo |
| --- | --- | --- | --- |
| Tipo/clasificación de cliente = 3 | `customertype` | NO RESUELTO | NO RESUELTO |
| Estado de cliente = 4 | `crbbe_estadocliente` | NO RESUELTO | NO RESUELTO |

## Evidencia de producción recibida

Phase1-022 confirmó como PASS `accounts`, los cuatro campos del `$select`,
`statecode`, su comparación numérica, el predicado string, `$orderby` y
`$top=20`. Confirmó como FAIL tanto la selección individual como la
comparación numérica de `customertype` y `crbbe_estadocliente`.

Por tanto:

- ambos nombres actuales son inválidos para `accounts` en producción;
- el fallo de la comparación no permite inferir el tipo porque el propio campo
  no existe con ese nombre;
- `statecode eq 0` está validado y permanece intacto;
- `new_tipocliente` es seleccionable y su mapping a `customerType` permanece
  intacto, pero esa evidencia no lo identifica como el atributo de la regla 3.

## Evidencia local y referencia técnica

La búsqueda en código, configuración, knowledge docs, prompts, logs y pruebas
solo encontró los dos nombres inválidos heredados desde Phase1-015. No existe
un nombre alternativo documentado ni un tipo confirmado para el entorno.

La referencia oficial de Microsoft para el EntityType estándar `account`
documenta `customertypecode` como `Edm.Int32` y la opción predeterminada 3 como
`Customer`. Esto lo convierte en un candidato técnico respaldado para la
primera regla, no en una confirmación del esquema efectivo de esta organización:

- <https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/account?view=dataverse-latest>

Microsoft documenta además que los atributos deben consultarse dentro de
`EntityDefinitions` y que Choice/State/Status requieren el cast de metadata
correspondiente para obtener su OptionSet:

- <https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api>

## Diagnóstico temporal implementado

Cuando la consulta Customer normal vuelve a producir exclusivamente
`DATAVERSE_INVALID_FIELD_OR_FILTER`, el backend conserva primero la secuencia
Phase1-022 y luego ejecuta una sola vez por proceso el diagnóstico Phase1-024.
No existe ruta HTTP nueva ni mecanismo frontend.

El cliente consulta:

```text
EntityDefinitions(LogicalName='account')/Attributes
$select=LogicalName,SchemaName,AttributeType
```

El payload se reduce en memoria a candidatos técnicos de las dos reglas. Se
excluyen expresamente `new_tipocliente` de la regla 3 y `statecode` de la regla
4 porque ya tienen responsabilidades distintas confirmadas. Para atributos de
tipo Choice, State, Status o Boolean se consulta mediante el cast oficial solo
la metadata necesaria para determinar si existe el valor objetivo 3 o 4 y su
etiqueta localizada. El resto del OptionSet se descarta y nunca llega al logger.

Cada evento `PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA` contiene exclusivamente:

- identificador de regla técnica;
- `logicalName`, `schemaName` y `attributeType` del candidato;
- valor objetivo 3 o 4;
- presencia de esa opción y su etiqueta localizada, si aplica;
- resultado técnico `CANDIDATE`, `NO_CANDIDATES`,
  `METADATA_QUERY_FAILED` u `OPTION_METADATA_FAILED`.

No registra tokens, Authorization, JWT, secretos, URL, query string, payloads
completos, errores upstream, clientes, `customerCode`, nombres, país ni PII.
Los errores de metadata fallan cerrados y nunca sustituyen el 502 sanitizado.

## Consulta productiva preservada

No se aplicó una corrección definitiva al gateway. Mientras no exista metadata
de producción, el código conserva exactamente el filtro provisional:

```text
customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
```

No se eliminó ninguna regla para hacer funcionar la consulta. También se
conservan el `$select` y mapping Phase1-016:

```text
new_codigocliente,name,crbbe_nombrepais,new_tipocliente
new_tipocliente -> customerType
```

## Archivos del hito

- Creado:
  `server/src/integrations/dataverse/accountCustomerMetadataDiagnostic.js`.
- Modificados: `server/src/integrations/dataverse/dataverseClient.js` y
  `server/src/integrations/dataverse/accountCustomerGateway.js`.
- Creado:
  `server/tests/accountCustomerMetadataDiagnostic.node-test.js`.
- Modificados: `server/tests/dataverseClient.node-test.js` y
  `server/tests/accountCustomerGateway.node-test.js`.
- Modificados: `docs/knowledge/ARCHITECTURE_STATE.md` y
  `docs/knowledge/DATA_SOURCES.md`.
- Creado este prompt.
- Evidencia local excluida:
  `logs/Phase1-024-ResolveDataverseCustomerFilterLogicalNames.log`.

`ROADMAP.md` no cambia porque no se aprobó una fuente, contrato, regla o hito
funcional nuevo.

## Pruebas y validación

- Backend dirigido: 24/24 pruebas aprobadas.
- Backend completo: 59/59 pruebas aprobadas.
- Frontend completo: 282/282 pruebas aprobadas en 24/24 archivos.
- Backend build/syntax: aprobado.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.

La cobertura demuestra ejecución única, selección local de candidatos,
exclusión de los dos campos con responsabilidades confirmadas, reducción de
OptionSet al valor objetivo, ausencia de payloads/secretos/PII, fallo cerrado,
validación de identificadores y preservación del error y filtros originales.

## Riesgos y reversión

La consulta de atributos lee metadata técnica de `account` una sola vez por
proceso después del 400 específico. No lee filas Customer ni modifica
Dataverse. La reversión elimina el módulo Phase1-024, sus dos métodos temporales
del cliente, el disparador del gateway y sus pruebas. Phase1-022 debe conservarse
hasta que ambos atributos sean confirmados y aplicada la corrección definitiva.

## Siguiente acción exacta

Tras autorización independiente para versionar y desplegar solo este backend en
Render, ejecutar exactamente una vez `?phase1-010b-smoke=1` con sesión MSAL y
copiar exclusivamente los eventos
`PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA`. Usar esos eventos para confirmar un
único `LogicalName`, `SchemaName`, `AttributeType` y opción 3/4 por regla en un
prompt posterior; solo entonces sustituir los dos nombres del filtro y retirar
los diagnósticos temporales Phase1-022/024.

## Alcance no ejecutado

No se realizaron consultas de producción, cambios Dataverse, commit, push,
deploy, cambios de variables, MSAL, JWT, Entra ID, Vercel, Render, contratos
HTTP públicos, contrato Customer ni mapping Phase1-016.

Prompt ejecutado: Phase1-024 — Resolve Dataverse Customer Filter Logical Names
