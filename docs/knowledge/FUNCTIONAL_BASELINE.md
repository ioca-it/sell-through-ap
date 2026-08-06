# Baseline funcional

## 1. Identificación

| Dato | Valor de la baseline |
| --- | --- |
| Proyecto | `sell-through-ap` |
| Producto visible | IOCA Sell-Through Intelligence V1 |
| Versión de `package.json` | `1.0.0` |
| Versión visible / dataset | `V1` |
| Fecha de documentación | 2026-08-05 |
| Rama Git | `feature/foundation-refactor` |
| Commit del código observado | `9abb010` (`chore: establish validated project baseline`) |
| Archivo funcional principal | `src/App.jsx` |

Al crear esta baseline, el árbol de trabajo contiene documentación no confirmada de Prompt 009.5 y Prompt 010. No existen cambios en `src/`; por tanto, el comportamiento descrito corresponde al código del commit indicado.

## 2. Propósito y alcance

Esta baseline registra el comportamiento observable que una refactorización deberá conservar salvo cambio funcional expresamente aprobado. Se basa en inspección estática de `src/App.jsx`, `src/services/dataService.js`, `src/data/datos.json`, configuración del proyecto y documentación vigente.

No se modificó ni ejecutó lógica de negocio para producir este documento. La baseline no añade funcionalidades, no convierte recomendaciones del informe en nuevas reglas y no define un esquema Dataverse.

## 3. Contenedor global visible

### 3.1 Encabezado

Se muestra en todas las pantallas:

- `IOCA GROUP`.
- Título `Sell-Through Intelligence` y badge `V1`.
- Subtítulo: Motor Inv. Seguridad IOCA, Fases EOL, distribución por Tier/Categoría e Informe Ejecutivo Consultivo.
- Fecha de cálculo formateada en `es-GT`, calculada como el primer día del mes actual del navegador.
- Leyenda `(primer día del mes en curso)`.

### 3.2 Navegación principal

Existen cuatro botones de tab:

1. Configuración.
2. Carga de Información.
3. Dashboard.
4. Informe Ejecutivo.

Cada tab muestra su número o una marca de completado. El estado `done` se determina así:

- Configuración: código y nombre del cliente no vacíos.
- Carga: ambos textos de entrada no vacíos.
- Dashboard e Informe: existen resultados calculados.

Los cuatro tabs son siempre clicables; la marca de completado no bloquea la navegación directa.

### 3.3 Pie global

Se muestra `IOCA Sell-Through Intelligence V1 · Motor Inv. Seguridad Institucional · Gestión consultiva de portafolio B2B`.

## 4. Pantallas y secciones

### 4.1 Pantalla Configuración

Es el tab inicial. Contiene la sección `Configuración del análisis` y estos bloques:

#### Identificación del cliente

| Campo | Tipo | Valor inicial | Comportamiento visible |
| --- | --- | --- | --- |
| Código del cliente | Texto | Vacío | Obligatorio para habilitar el botón Siguiente. |
| Nombre del cliente | Texto | Vacío | Obligatorio para habilitar el botón Siguiente. |
| País | Selector | Guatemala | Opciones provistas por Repository desde la configuración local. |

#### Período de análisis

| Campo | Tipo | Valor inicial | Comportamiento visible |
| --- | --- | --- | --- |
| Fecha de corte | Fecha | Fecha actual del navegador | Se muestra en dashboard, informe y Excel; no controla actualmente el cálculo EOL. |
| Período analizado | Selector | Mensual | Opciones estándar y `Personalizado`. |
| Semanas del período | Número condicional | 4 | Solo visible para `Personalizado`; mínimo HTML 0.1, paso 0.1 y fallback 4.33 al editar un valor inválido. |
| Detalle del período | Texto | Vacío | Opcional; aparece como contexto en dashboard, informe y Excel. |

La pantalla muestra la conversión: Semanal 1, Quincenal 2, Mensual 4.33, Bimestral 8.67, Trimestral 13, Semestral 26 y Anual 52 semanas.

#### Parámetros operativos

| Campo | Tipo | Valor inicial | Uso |
| --- | --- | --- | --- |
| Safety stock | Número entero | 4 semanas | Cobertura usada por Inventory Engine. |
| Lead time USA | Número entero | 4 semanas | Ruta USA. |
| Lead time China | Número entero | 12 semanas | Ruta China. |

Los tres inputs tienen mínimo HTML cero y convierten valores inválidos a cero.

#### Nota institucional

Muestra título, fórmula, condiciones y propósito consultivo del Motor Inv. Seguridad IOCA V1 recibidos mediante Repository.

#### Estado y avance

- Sin código o nombre: mensaje `Completa código y nombre del cliente para continuar`; botón Siguiente deshabilitado.
- Con ambos: mensaje `Configuración completa — listo para cargar información`; botón Siguiente habilitado.

### 4.2 Pantalla Carga de Información

Contiene `Insumos requeridos` y dos áreas de texto:

1. `Maestro de Productos IOCA`, con guía visual de columnas MARCA, SKU, Modelos, CATEGORIAS, Fecha Descontinuacion, ESTADO, USA y CHINA.
2. `Inventario del Cliente`, con SKU e INV FINAL indicados como mínimo, y Tienda, MARCA y Nombre indicados como opcionales.

También muestra la regla de que Origen se toma del Inventario, selecciona el costo USA/China del Maestro y cae en USA si falta.

La pantalla dispone de botones Cargar ejemplo, Limpiar y Calcular y ver dashboard. Los errores de carga/procesamiento se muestran en un panel rojo debajo del bloque de insumos.

### 4.3 Pantalla Dashboard

#### Estado sin datos

Muestra `Dashboard sin datos`, la instrucción de cargar Maestro e Inventario y un botón para ir a Carga de Información.

#### Estado con resultados

Se presenta en este orden:

1. Contexto del cliente y parámetros aplicados.
2. Resumen ejecutivo y exportaciones.
3. Alertas operativas.
4. Distribución por Tier.
5. Distribución por Categoría.
6. Análisis Pareto 80/20.
7. SKUs EOL ya descontinuados con fase activa.
8. SKUs EOL aún por descontinuarse, si existen.
9. SKUs sin Maestro, si existen.
10. SKUs Activos en bloque colapsable, si existen.
11. Base de conocimiento institucional aplicada en bloque colapsable.

#### Contexto del cliente

Muestra nombre, código, país, fecha de corte, período/detalle, Safety Stock, Lead Time USA, Lead Time China y `SKUs en cruce`. Este último valor es el número de registros resultantes (`recs.length`), no un conteo distinto de SKU únicos.

### 4.4 Pantalla Informe Ejecutivo

#### Estado sin datos

Muestra `Informe Ejecutivo sin datos`, la instrucción de calcular y un botón para ir a Carga de Información.

#### Estado con resultados

Muestra un control no imprimible con instrucción para guardar como PDF y el botón Descargar PDF. El cuerpo imprimible contiene:

1. Portada con cliente, país, código, fecha de corte, período/semanas y SKU analizados.
2. `Resumen Ejecutivo` con cuatro bloques: qué está pasando, qué es urgente, qué oportunidad existe y qué decisión debe tomar.
3. `Diagnóstico de Rotación`.
4. Nota del Motor Inv. Seguridad IOCA V1 y parámetros aplicados.
5. `Hallazgos Clave`, hasta diez, o mensaje de ausencia de hallazgos críticos.
6. `Causas Raíz Identificadas`.
7. `Matriz de Priorización` por impacto/esfuerzo: Quick Wins, Estratégicas, Relleno y Evitar.
8. `Recomendaciones Concretas para el Comprador`.
9. `Oportunidades de Category Design`.
10. `Narrativa para Presentar al Comprador`.
11. `Plan de Acción 30 / 60 / 90 Días`.
12. Mensaje final al comprador y pie del informe.

La numeración visible principal va de 1 a 9; la nota del motor, mensaje final y pie son bloques adicionales.

## 5. KPIs e indicadores visibles

### 5.1 Resumen ejecutivo del Dashboard

| KPI | Cálculo/origen visible |
| --- | --- |
| Total SKUs | Cantidad de registros cruzados. |
| Activos | Registros con estado ACTIVO. |
| EOL Vencidos | EOL con fecha vencida respecto de la fecha base. |
| EOL Futuros | EOL aún por descontinuarse. |
| Sin Maestro | Registros de Inventario sin coincidencia en Maestro. |
| Unid. EOL en piso | Suma de Inventario Final de EOL vencidos. |
| Valor Inv. EOL | Costo aplicado por unidades EOL vencidas. |
| Descuento Consumi total | Descuento al consumidor por unidades EOL vencidas. |
| Absorbe IOCA (20%) | Aporte IOCA total según tabla de fases. |
| Absorbe Retail (80%) | Aporte Retail total según tabla de fases. |

Los labels 20%/80% son fijos en la UI, aunque los valores se agregan desde los porcentajes de cada registro.

### 5.2 Alertas operativas

| Tarjeta | Valor principal | Subindicador |
| --- | --- | --- |
| Sin Origen en Inv. | Cantidad de SKU afectados | `Asumidos como USA por default`. |
| Merma > umbral | Cantidad de SKU afectados | Unidades y valor total de merma. |
| Bajo Inv. Seguridad | Cantidad total en quiebre | Desglose Activos/EOL. |
| Reposición Sugerida | Unidades totales | Valor USD total. |

### 5.3 Pareto

| Tarjeta | Contenido |
| --- | --- |
| Pareto A — Los pocos vitales | SKU A, porcentaje del portafolio y porcentaje de ventas. |
| Pareto B — La cola larga | SKU B, porcentaje del portafolio y porcentaje de ventas. |
| Tipo de distribución | Interpretación, SKU con ventas y unidades vendidas. |

### 5.4 Distribuciones

Cada una de las tres vistas de Tier y las tres vistas de Categoría muestra como subtítulo:

- unidades totales;
- valor total USD;
- cantidad de SKU o SKU con venta.

Además muestra barras porcentuales por unidades y por valor. Un porcentaje se imprime dentro del segmento solo cuando representa al menos 7%.

### 5.5 Informe Ejecutivo

El informe expone indicadores adicionales dentro de tablas y narrativas:

- valor total de inventario y porcentaje de valor EOL;
- SKU sin movimiento, valor y porcentaje del valor total;
- SKU activos en quiebre y valor de reposición;
- SKU Pareto A y SKU héroe;
- conteos por alta, baja y crítica rotación;
- sub-stock, obsolescencia y activación comercial;
- porcentajes de venta GOOD/BETTER/BEST.

## 6. Tablas visibles

### 6.1 Dashboard

| Tabla | Condición | Columnas visibles |
| --- | --- | --- |
| SKUs sin Origen | Hay alertas de origen | SKU, Modelo, Estado, Costo USA aplicado, Costo CHINA alterno, Delta. |
| Merma operativa | Hay alertas de merma | SKU, Modelo, Inv Inicial, Compra, Ventas, Proyectado, Inv Final, Merma (u), Merma %, Costo Merma. |
| Bajo Inv. Seguridad IOCA | Hay quiebres | SKU, Modelo, Estado, Origen, Inv. Seg. Cliente, Inv. Seg. IOCA, Delta IOCA-Cliente, Fuente, Inv. Final, Reposición Sug., Acción Sugerida. |
| Distribución por Tier — Inventario | Hay unidades | Tier, SKUs, Unidades, % Unid., Valor USD, % Valor. |
| Distribución por Tier — Ventas | Hay unidades | Mismo contrato de Tier. |
| Distribución por Tier — Reposición | Hay unidades | Mismo contrato de Tier. |
| Distribución por Categoría — Inventario | Hay unidades | Categoría, SKUs, Unidades, % Unid., Valor USD, % Valor. |
| Distribución por Categoría — Ventas | Hay unidades | Mismo contrato de Categoría. |
| Distribución por Categoría — Reposición | Hay unidades | Mismo contrato de Categoría. |
| Pareto ordenado | Hay SKU con ventas | Clase, SKU, Modelo, Marca, Estado, Tier, Ventas (u), % Ventas, % Acum., Inv. Final, Acción Reposición. |
| EOL descontinuados | Siempre dentro del dashboard calculado | SKU, Modelo, Marca, Fecha EOL, Días Desc., Fase, Origen, Costo, Desc. %, Desc. Consumi $, Aporte IOCA $, Aporte Retail $, Inv. Final, Índice Rot., Desc. Total $. Incluye totales o fila vacía. |
| EOL por descontinuarse | Hay EOL futuros | SKU, Modelo, Marca, Fecha EOL, Días hasta EOL, Bucket Pre-EOL, Origen, Costo, Inv. Final, Índice Rot., Valor Inv. |
| SKU sin Maestro | Hay registros sin maestro | SKU, Modelo del inventario, Tienda, Inv. Final. |
| SKU Activos | Hay activos y se despliega | SKU, Modelo, Marca, Origen, Costo, Inv. Final, Índice Rot., Valor Inv. |
| Bucket EOL | Se despliega la base institucional | Bucket, Días desde-hasta, Umbral. |
| Descuento por Fase | Se despliega la base institucional | Marca, Fase, Días, Origen, Desc., IOCA, Retail. |

Los paneles de distribución muestran `Sin datos disponibles` cuando no hay unidades positivas.

### 6.2 Informe Ejecutivo

| Tabla | Columnas/filas visibles |
| --- | --- |
| Diagnóstico de Rotación | Categoría operativa, SKUs, Interpretación; filas de alta, baja, crítica, sin movimiento, sub-stock, obsolescencia y activación. |
| Causas Raíz | Causa raíz, Evidencia en los datos; incluye estado vacío. |
| Prioritarios a Reponer | SKU, Modelo, Tier, Ventas, Reposición, Valor USD; máximo cinco. |
| Prioritarios a Liquidar | SKU, Modelo, Fase, Días EOL, Inv. Final, Valor inmovilizado; máximo cinco. |
| Candidatos a Eliminar | SKU, Modelo, Tier, Inv. Final, Valor; máximo cinco. |

## 7. Botones y acciones

| Botón/acción | Disponibilidad | Resultado observable |
| --- | --- | --- |
| Configuración | Siempre | Cambia al tab Configuración. |
| Carga de Información | Siempre | Cambia al tab Carga aunque la configuración esté incompleta. |
| Dashboard | Siempre | Cambia al dashboard; muestra estado vacío si no hay resultados. |
| Informe Ejecutivo | Siempre | Cambia al informe; muestra estado vacío si no hay resultados. |
| Siguiente: Carga de Información | Solo habilitado con código y nombre | Cambia al tab Carga. |
| Cargar ejemplo | Siempre en Carga | Sustituye ambos textos por las muestras obtenidas mediante Repository y limpia el error; no calcula. |
| Limpiar | Siempre en Carga | Vacía Maestro, Inventario, resultados y error. No reinicia configuración, tab ni estados de colapsables. |
| Calcular y ver dashboard | Siempre en Carga | Valida, procesa, guarda resultados y, si termina con éxito, cambia automáticamente al Dashboard. |
| Ir a Carga de Información | Dashboard/Informe sin datos | Cambia al tab Carga. |
| Exportar Excel (todas las hojas) | Dashboard con resultados | Genera y descarga un `.xlsx`. |
| Exportar CSV | Dashboard con resultados | Genera y descarga un `.csv`. |
| SKUs Activos / Mostrar-Ocultar | Hay activos | Alterna la tabla de activos. Inicia cerrada. |
| Base de conocimiento / Ver-Ocultar | Dashboard con resultados | Alterna Bucket EOL y Tabla de Fases. Inicia cerrada. |
| Descargar PDF | Informe con resultados | Ejecuta `window.print()`; el usuario debe seleccionar Guardar como PDF. |

### 7.1 Validaciones y errores de Calcular

El procesamiento se detiene y muestra un error cuando:

- falta el texto del Maestro;
- falta el texto del Inventario;
- el Maestro no contiene una columna SKU reconocible;
- el Inventario no contiene una columna SKU reconocible;
- el Inventario no contiene Inv Final o equivalente;
- la configuración requerida por el procesamiento es ausente, de tipo inválido o incompleta;
- ocurre una excepción, en cuyo caso se muestra `Error procesando datos:` seguido del mensaje.

Código y nombre del cliente solo controlan el botón Siguiente y el indicador del tab; no son requisitos internos de `processSellThrough`. El caso de uso sí requiere las cinco claves operativas `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA`. App siempre entrega esas claves en el flujo vigente.

## 8. Entradas, archivos soportados y salidas

### 8.1 Entradas

La UI no tiene selector ni carga binaria de archivos. No importa directamente `.xlsx`, `.xls` ni un archivo `.csv`. Recibe texto pegado en dos `textarea` o las muestras TSV embebidas.

| Entrada | Formato efectivo | Mínimo |
| --- | --- | --- |
| Maestro | Texto con filas separadas por salto de línea y columnas separadas por tab, coma o punto y coma | SKU. |
| Inventario | Mismo formato de texto delimitado | SKU e Inv Final. |

Comportamientos del parser que deben preservarse mientras esta baseline siga vigente:

- no implementa reglas de quoted CSV; divide cada fila directamente por tab, coma o punto y coma;
- ignora filas vacías;
- normaliza encabezados eliminando mayúsculas, tildes, espacios y signos;
- intenta alias exactos y luego coincidencias parciales;
- el último registro repetido de un SKU en el Maestro reemplaza a los anteriores;
- cada fila del Inventario produce un registro, incluso si repite SKU;
- el estado y marca efectivos provienen del Maestro; la columna EOL del Inventario se localiza, pero no decide el estado;
- el Origen proviene del Inventario.

Los alias y contratos completos están en `DATA_SOURCES.md` y las reglas de conversión en `BUSINESS_RULES.md`.

### 8.2 CSV de salida

- Nombre: `IOCA_Fases_EOL_<fechaCalculo>.csv`.
- Codificación: UTF-8 con BOM.
- Separador: coma.
- Todos los valores se envuelven entre comillas y las comillas internas se duplican.
- Incluye todos los registros calculados, no múltiples hojas.
- Columnas: SKU, Tienda, Modelo, Marca, Estado, Fecha EOL, Dias Desc, Bucket, Fase, Origen, Costo USD, Inv Inicial, Ventas, Inv Final, Indice Rotacion, Desc %, Desc Consumi $, Aporte IOCA %, Aporte IOCA $, Aporte Retail %, Aporte Retail $, Desc Total $.

### 8.3 Excel de salida

- Nombre: `IOCA_STI_V1_<codigoClienteSanitizado>_<fechaCalculo>.xlsx`.
- El código solo conserva letras, números, guion y guion bajo; si está vacío usa `SC`.
- Fecha de cálculo: primer día del mes actual usado por el motor EOL.

El libro puede contener hasta catorce hojas:

| Hoja | Condición |
| --- | --- |
| Resumen | Siempre. |
| EOL Fase Activa | Existen EOL vencidos. |
| EOL Por Descontinuarse | Existen EOL futuros. |
| Bajo Inv Seguridad V1 | Existen alertas de quiebre. |
| Merma Operativa | Existen alertas de merma. |
| Activos | Existen activos. |
| Sin Maestro | Existen registros sin maestro. |
| Sin Origen en Inv | Existen alertas de origen. |
| Datos Completos | Siempre. |
| Distribución Tier | Siempre. |
| Distribución Categoría | Siempre. |
| Análisis Pareto 80-20 | Existen SKU con ventas. |
| Ref Bucket EOL | Siempre. |
| Ref Tabla Fases | Siempre. |

### 8.4 PDF/impresión

No se construye un archivo PDF mediante una librería. El botón ejecuta la impresión del navegador con tamaño carta y estilos que ocultan los controles; guardar como PDF depende del diálogo del navegador/sistema.

### 8.5 Persistencia

Entradas, configuración y resultados permanecen únicamente en memoria React. Recargar la página los elimina. No hay backend, Dataverse, Business Central ni almacenamiento local implementado.

## 9. Motores funcionales identificados

### 9.1 Inventory Engine

Ubicación actual: funciones puras en `src/domain/inventory/inventoryEngine.js`, consumidas por `recordAssembler.js` y el Application Service.

Responsabilidades:

- resolución de origen y costo;
- Inventario Proyectado y merma;
- índice de rotación;
- Inventario de Seguridad IOCA con redondeo hacia arriba;
- delta contra inventario de seguridad del cliente;
- alerta de quiebre, reposición para activos y acción sugerida;
- valores de inventario, ventas y reposición dentro del ensamblaje.

Fórmulas y fallbacks están fijados en `BUSINESS_RULES.md`.

### 9.2 EOL Engine

Ubicación actual: funciones puras en `src/domain/eol/eolEngine.js`, consumidas por `recordAssembler.js`; el Application Service provee fecha base y tablas explícitas.

Responsabilidades:

- días respecto del primer día del mes;
- separación EOL vencido/futuro;
- bucket pre-EOL;
- fase post-EOL por marca/origen/días;
- descuento al consumidor y aportes IOCA/Retail;
- acciones de quiebre específicas para EOL;
- totales financieros EOL.

### 9.3 Pareto

- Usa solo registros con Ventas mayores que cero.
- Ordena por ventas descendentes.
- Clasifica A mientras el acumulado anterior sea menor que 80%; el resto es B.
- Produce porcentajes, interpretación y acción visible por SKU.

### 9.4 Distribution

- Calcula Inventario, Ventas y Reposición por Tier GOOD/BETTER/BEST.
- Calcula las mismas tres vistas por categorías dinámicas.
- Acumula solo registros cuyo campo de unidades sea mayor que cero.
- Produce unidades, valor, SKU y porcentajes, además de barras y tablas.

### 9.5 Executive Report

Ubicación actual: `generarInformeEjecutivo` y JSX del tab Informe.

Responsabilidades:

- diagnósticos de rotación, movimiento, sobre/subinventario y obsolescencia;
- valor y porcentajes agregados;
- SKU héroe y categoría dominante;
- categorías en obsolescencia y alineación de reposición;
- hallazgos y causas raíz condicionales;
- top cinco para reponer, liquidar y eliminar;
- matriz, category design, narrativa y plan 30/60/90;
- presentación imprimible.

El contenido se genera con reglas locales deterministas; no llama a una IA externa.

### 9.6 Exportación Excel

Ubicación actual: `exportarExcel` en `App.jsx`.

Responsabilidades:

- crear el libro mediante `xlsx`;
- seleccionar hojas condicionales;
- formatear porcentajes, monedas y anchos;
- incluir resumen, auditoría, distribuciones y tablas de referencia;
- descargar el archivo en el navegador.

### 9.7 Exportación CSV

Ubicación actual: `exportarCSV` en `App.jsx`.

Responsabilidades:

- proyectar un subconjunto fijo de campos;
- escapar comillas;
- construir CSV UTF-8 con BOM;
- crear un Blob, disparar descarga y revocar la URL temporal.

### 9.8 Parsers y Application Service

Ubicación actual:

- `masterParser.js`: aliases, validación, defaults y estructura indexada del Maestro;
- `inventoryParser.js`: aliases, validaciones, defaults y filas normalizadas del Inventario;
- `recordAssembler.js`: cruce por SKU y construcción del contrato final con Inventory/EOL Engine;
- `sellThroughApplicationService.js`: validación de textos, coordinación, fecha base, agregaciones, alertas, distribuciones, Pareto y objeto `resultados`.

Los cuatro módulos son síncronos y no dependen de React/JSX. Application Service recibe Repository y obtiene por su contrato Maestro, Inventario, parámetros y configuración; no accede directamente a Provider, `dataService`, JSON, Dataverse o Business Central.

### 9.9 Repository y Local Provider

- `sellThroughRepository.js` expone Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo mediante contratos estables.
- `localDataProvider.js` adapta el estado entregado por App y la configuración institucional de `dataService` sin aplicar reglas.
- Repository es el único consumidor del Provider y Local Provider es el único consumidor de `dataService`.
- Repository valida los seis métodos `read*`; Local Provider valida formas mínimas y el Application Service exige configuración operativa completa antes de usarla.
- La implementación actual es síncrona y local; no agrega persistencia ni conexión Dataverse.

## 10. Responsabilidades actuales dentro de App.jsx

`App.jsx` concentra actualmente:

- composición del Repository y lectura de configuración institucional mediante sus contratos;
- nombre y versión visibles de la aplicación;
- formateo de moneda, porcentaje, índices y colores;
- llamada al Application Service y traducción de resultado/error a estado y navegación;
- generación completa del Executive Report;
- estado React de configuración, inputs, resultados, errores, tabs y colapsables;
- validación y acciones de usuario;
- exportación CSV y Excel;
- impresión/PDF mediante navegador;
- render de las cuatro pantallas, estados vacíos, tablas y componentes visuales locales;
- paletas de Tier/categoría y estilos de impresión.

Fuera de `App.jsx`, el Application Service coordina parsers, ensamblaje, Inventory/EOL Engine y agregaciones a partir del Repository; Local Provider adapta las fuentes vigentes; `dataService.js` encapsula el JSON institucional; `main.jsx` monta la aplicación.

## 11. Invariantes para la refactorización

Una refactorización sin cambio funcional deberá conservar, como mínimo:

- las cuatro pantallas, estados vacíos, orden y visibilidad condicional de secciones;
- labels, defaults, gating y navegación descritos;
- contratos de entrada, alias, precedencias, fallbacks y manejo de duplicados;
- fecha base EOL actual hasta que exista una decisión funcional diferente;
- fórmulas, umbrales, redondeos, ordenamientos y acciones sugeridas;
- conteos, agregados, tarjetas, barras, tablas y estados vacíos;
- nombres, columnas, hojas condicionales y formatos generales de exportación;
- salto automático al Dashboard después de calcular;
- comportamiento de Cargar ejemplo, Limpiar, colapsables e impresión;
- ausencia de persistencia y de integraciones remotas.

## 12. Riesgos de regresión identificados

- Cambiar `fechaCorte` por la fecha base EOL sin aprobación funcional.
- Contar SKU únicos donde actualmente se cuentan filas del Inventario.
- Alterar la precedencia del Maestro o el manejo de duplicados.
- Reemplazar el parser simple por uno estricto y cambiar entradas aceptadas.
- Usar Inventario de Seguridad del cliente en vez del valor IOCA para quiebre/reposición.
- Sugerir reposición para EOL.
- Convertir getters síncronos a asíncronos sin estados equivalentes.
- Cambiar condiciones de hojas/tablas o el contrato CSV.
- Reiniciar más estado del que actualmente limpia el botón Limpiar.
- Bloquear tabs que hoy son navegables.
- Confundir `Descargar PDF` con generación directa de PDF.

## 13. Validación disponible al crear la baseline

Al crear esta baseline, el proyecto no declaraba pruebas automatizadas, lint ni pruebas visuales. La validación disponible era:

- inspección del comportamiento implementado;
- `npm run build`;
- `git diff --check`;
- confirmación de que `src/` permanece sin cambios.

Los futuros prompts de refactorización deberían agregar pruebas de caracterización antes de extraer reglas o UI.

### Evolución posterior sin cambio funcional

- Prompt 011 extrajo ocho utilidades a `src/utils/` conservando sus contratos.
- Prompt 012 agregó 49 pruebas de caracterización con Vitest para esas utilidades.
- Prompt 013 agregó 40 pruebas deterministas sobre el handler real de Inventory Engine y EOL Engine, con fecha y datasets controlados.
- Prompt 014 extrajo 14 funciones puras de Inventory Engine y EOL Engine, manteniendo una prueba puente desde `App`.
- Prompt 015 agregó 28 pruebas deterministas del parser y ensamblaje real, para un total de 117 pruebas.
- Prompt 016 extrajo Master Parser, Inventory Parser, Record Assembler y Application Service manteniendo las 117 pruebas sin modificar casos.
- Prompt 017 incorporó Repository y Local Provider, y orientó App, Application Service y pruebas a esa frontera manteniendo las 117 pruebas.
- Prompt 018 agregó 34 pruebas dedicadas y errores contractuales de configuración, para un total de 151 pruebas sin cambiar casos válidos.
- La baseline funcional de pantallas y exportaciones no cambió; todavía no existen pruebas con DOM/navegador ni caracterización automatizada de Pareto, Distribution, Executive Report, CSV o Excel.
