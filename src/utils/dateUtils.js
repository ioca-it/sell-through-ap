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

const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year, month) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const toCanonicalDate = (year, month, day) => {
  if (!Number.isInteger(year) || year < 1 || year > 9999
    || !Number.isInteger(month) || month < 1 || month > 12
    || !Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
    return '';
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Normaliza únicamente la representación de fechaStr. Los strings con hora se
// validan sin convertirlos a Date para conservar su día calendario original.
export const normalizeFechaStr = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return toCanonicalDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value !== 'string') return '';

  const clean = value.trim();
  if (!clean || clean === '-') return '';

  const isoMatch = clean.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):?(\d{2}))?)?$/,
  );
  if (isoMatch) {
    const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = isoMatch;
    if (hour !== undefined && (
      Number(hour) > 23
      || Number(minute) > 59
      || (second !== undefined && Number(second) > 59)
      || (offsetHour !== undefined && Number(offsetHour) > 23)
      || (offsetMinute !== undefined && Number(offsetMinute) > 59)
    )) return '';
    return toCanonicalDate(Number(year), Number(month), Number(day));
  }

  const localMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!localMatch) return '';
  return toCanonicalDate(Number(localMatch[3]), Number(localMatch[2]), Number(localMatch[1]));
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
