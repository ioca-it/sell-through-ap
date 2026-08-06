// =============================================================================
// Propósito: centralizar las operaciones puras de fecha usadas por la aplicación.
// Responsabilidad: interpretar fechas, calcular diferencias y obtener la fecha base mensual.
// Dependencias: únicamente el objeto Date estándar; no depende de React ni de datos.
// Preparación para IA: aísla contratos temporales para facilitar revisión y pruebas futuras.
// Preparación para Dataverse: no conoce fuentes ni esquemas; opera sobre valores recibidos.
// =============================================================================

// Interpreta los formatos de fecha aceptados actualmente por el Maestro de Productos.
export const parseFecha = (s) => {
  if (!s) return null;
  const clean = s.trim();
  let m;
  if ((m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[2]-1, +m[1]);
  if ((m = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) return new Date(+m[3], +m[2]-1, +m[1]);
  if ((m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return new Date(+m[1], +m[2]-1, +m[3]);
  return null;
};

// Calcula la diferencia entera en días requerida por la clasificación EOL.
export const diasEntre = (a, b) => {
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
};

// Obtiene el primer día del mes usado como fecha base funcional vigente.
export const primerDiaMes = () => {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
};
