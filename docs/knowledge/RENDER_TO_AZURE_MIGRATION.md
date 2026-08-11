# Migración de Render a Azure — Customer API

## Estado actual

Render es únicamente el alojamiento temporal previsto para `server/`. No existe
en el código una URL, SDK, API, manifest ni variable específica de Render. Esta
fase no despliega el backend ni crea recursos Azure.

## Qué depende del hosting

- ejecución del proceso `npm start` y disponibilidad de Node.js 20 o superior;
- inyección segura de variables de entorno;
- asignación de `PORT` y exposición HTTPS pública;
- health checks, escalado, observabilidad y retención de logs de plataforma;
- DNS de la API, usado externamente como valor de `VITE_API_BASE_URL`;
- actualización de `ALLOWED_ORIGINS` para los frontends autorizados.
- almacenamiento distribuido del rate limit cuando exista más de una instancia.

## Qué no depende de Render

- handler HTTP y política CORS;
- rutas específicas de Customer;
- Customer Service y contrato normalizado;
- gateway `accounts` y mapping Dataverse;
- obtención/cache de token Entra;
- cliente HTTP Dataverse, timeout y normalización de errores;
- escape OData, orden y límite de resultados;
- pruebas backend y syntax check.
- validación Bearer JWT/JWKS, issuer, audience, tenant y scope;
- endpoint anónimo `/health`;
- interfaz inyectable del store de rate limiting.

## Variables neutrales

| Capa | Variables |
| --- | --- |
| Backend Auth | `AUTH_TENANT_ID`, `AUTH_API_CLIENT_ID`, `AUTH_REQUIRED_SCOPE` |
| Backend Dataverse | `DV_TENANT_ID`, `DV_CLIENT_ID`, `DV_CLIENT_SECRET`, `DV_BASE_URL` |
| Backend HTTP | `ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `PORT` |
| Frontend | `VITE_API_BASE_URL` |

Ninguna variable contiene nombres de Render o Azure. Los secretos deben vivir
en el almacén seguro del hosting; nunca en Git, Vercel frontend o respuestas API.

## Puntos de despliegue actuales

### Render temporal

- Root Directory: `server`.
- Build Command: `npm run build`.
- Start Command: `npm start`.
- Variables: todas las variables backend del cuadro anterior.
- Health Check Path: `/health`; no requiere token ni conexión Dataverse.
- CORS mínimo esperado: `http://localhost:5173` y
  `https://sell-through-ap.vercel.app` mientras ambos sean consumidores válidos.

### Vercel frontend

- Definir `VITE_API_BASE_URL` con el origen HTTPS público de la Customer API.
- Reconstruir el frontend después de cambiar la variable.
- No definir variables `DV_*` en Vercel frontend.
- Integrar MSAL posteriormente detrás de `getAccessToken()`; no usar API keys ni `DV_CLIENT_SECRET` en Vite.

## Migración futura Render → Azure

1. Elegir el servicio de proceso Node (por ejemplo, App Service o Container
   Apps) sin modificar módulos de negocio/integración.
2. Crear identidad/aplicación y almacenamiento seguro de secretos conforme a la
   política Azure aprobada; Key Vault queda como decisión futura, no implementada.
3. Configurar las mismas variables neutrales en Azure Configuration y mantener
   secretos en el mecanismo aprobado/Key Vault futuro.
4. Ejecutar `npm run build`, `npm test` y prueba smoke contra Dataverse.
5. Publicar el origen HTTPS Azure y agregarlo temporalmente donde corresponda.
6. Cambiar `VITE_API_BASE_URL`, reconstruir Vercel y validar búsquedas/lectura.
7. Retirar el origen Render de configuración y CORS solo después del corte y la
   verificación de rollback.
8. Sustituir el store in-memory del rate limiter por un mecanismo distribuido
   antes de habilitar más de una instancia.

Los JWT emitidos por Microsoft Entra ID siguen siendo válidos después de migrar
el hosting porque issuer, audience, tenant y scope no dependen de Render. El
endpoint `/health` y el middleware JWT/JWKS son reutilizables sin cambios en
Azure.

El rate limiter in-memory solo es suficiente para la etapa temporal de una
instancia. No coordina contadores entre procesos y debe sustituirse antes de
escala horizontal por un store distribuido compatible con Azure.

## Reutilización compatible con infraestructura NEXUS

Pueden reutilizarse patrones o componentes estrictamente infraestructurales:
configuración por entorno, validación JWT/JWKS, obtención/cache de token Entra,
cliente HTTP con timeout, health checks, stores distribuidos, manejo seguro de
secretos, CORS, observabilidad y plantillas de
despliegue. La reutilización debe realizarse como librería o patrón neutral y con
versionado explícito.

Está prohibido mezclar reglas, módulos Customer, contratos de negocio, datos,
repositories o ciclos de despliegue entre NEXUS y `sell-through-ap`. Ambos
productos permanecen separados aunque compartan infraestructura genérica.

## Rollback

Mientras Render siga operativo, rollback consiste en restaurar
`VITE_API_BASE_URL` al origen Render aprobado y reconstruir el frontend. No se
elimina Render hasta validar Azure y conservar evidencia del corte.
