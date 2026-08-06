// Caracteriza la clave normalizada usada para reconocer columnas de entrada.
import { describe, expect, it } from 'vitest';
import { normalizeHeader } from '../headerUtils.js';

describe('normalizeHeader', () => {
  it.each([
    ['mayúsculas', 'SKU', 'sku'],
    ['espacios', ' Fecha Descontinuacion ', 'fechadescontinuacion'],
    ['acentos', 'CATEGORÍAS', 'categorias'],
    ['símbolos', 'Inv. Final ($)', 'invfinal'],
    ['acentos, espacios y símbolos combinados', '  Fecha   Descontinuación / EOL  ', 'fechadescontinuacioneol'],
    ['números', 'EAN-13', 'ean13'],
  ])('normaliza encabezados con %s', (_case, value, expected) => {
    expect(normalizeHeader(value)).toBe(expected);
  });
});
