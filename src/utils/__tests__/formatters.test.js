// Caracteriza los contratos visibles de formato sin depender de componentes React.
import { describe, expect, it } from 'vitest';
import { fmtUSD, fmtPct, fmtIdx, fmtUSDInline } from '../formatters.js';

const usdCases = [
  ['formatea un importe normal', 1234.5, '$1,234.50'],
  ['formatea cero', 0, '$0.00'],
  ['conserva el signo negativo después del símbolo USD', -1234.5, '$-1,234.50'],
];

const absentNumberCases = [
  ['null', null],
  ['undefined', undefined],
  ['NaN', Number.NaN],
];

describe.each([
  ['fmtUSD', fmtUSD],
  ['fmtUSDInline', fmtUSDInline],
])('%s', (_name, formatter) => {
  it.each(usdCases)('%s', (_case, value, expected) => {
    expect(formatter(value)).toBe(expected);
  });

  it.each(absentNumberCases)('devuelve guion para %s', (_case, value) => {
    expect(formatter(value)).toBe('—');
  });
});

describe('fmtPct', () => {
  it.each([
    ['formatea una razón normal sin decimales', 0.1234, '12%'],
    ['formatea cero sin decimales', 0, '0%'],
    ['redondea una razón negativa sin decimales', -0.125, '-13%'],
  ])('%s', (_case, value, expected) => {
    expect(fmtPct(value)).toBe(expected);
  });

  it.each(absentNumberCases)('devuelve guion para %s', (_case, value) => {
    expect(fmtPct(value)).toBe('—');
  });
});

describe('fmtIdx', () => {
  it.each([
    ['formatea un índice normal', 1.234, '1.23'],
    ['formatea cero', 0, '0.00'],
    ['formatea un índice negativo', -1.2, '-1.20'],
  ])('%s', (_case, value, expected) => {
    expect(fmtIdx(value)).toBe(expected);
  });

  it.each(absentNumberCases)('devuelve guion para %s', (_case, value) => {
    expect(fmtIdx(value)).toBe('—');
  });
});
