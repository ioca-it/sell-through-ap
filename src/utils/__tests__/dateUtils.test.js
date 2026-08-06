// Caracteriza los contratos temporales actuales, incluida su semántica de fecha local.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFecha, diasEntre, primerDiaMes } from '../dateUtils.js';

const expectLocalDate = (actual, year, monthIndex, day) => {
  expect(actual).toBeInstanceOf(Date);
  expect([actual.getFullYear(), actual.getMonth(), actual.getDate()])
    .toEqual([year, monthIndex, day]);
};

describe('parseFecha', () => {
  it.each([
    ['día/mes/año', '5/8/2026'],
    ['día-mes-año', '05-08-2026'],
    ['año-mes-día', '2026-8-5'],
    ['espacios exteriores', ' 05/08/2026 '],
  ])('acepta el formato %s', (_case, value) => {
    expectLocalDate(parseFecha(value), 2026, 7, 5);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['cadena vacía', ''],
  ])('devuelve null para %s', (_case, value) => {
    expect(parseFecha(value)).toBeNull();
  });

  it.each([
    ['año/mes/día', '2026/08/05'],
    ['fecha con puntos', '05.08.2026'],
    ['texto libre', 'fecha inválida'],
  ])('rechaza el formato no admitido %s', (_case, value) => {
    expect(parseFecha(value)).toBeNull();
  });

  it('conserva la normalización de días fuera de rango realizada por Date', () => {
    expectLocalDate(parseFecha('31/02/2026'), 2026, 2, 3);
  });
});

describe('diasEntre', () => {
  it.each([
    ['una diferencia positiva', new Date(2026, 0, 10), new Date(2026, 0, 1), 9],
    ['las mismas fechas', new Date(2026, 0, 1), new Date(2026, 0, 1), 0],
    ['una diferencia negativa', new Date(2026, 0, 1), new Date(2026, 0, 10), -9],
  ])('calcula %s', (_case, a, b, expected) => {
    expect(diasEntre(a, b)).toBe(expected);
  });

  it.each([
    ['primera fecha null', null, new Date(2026, 0, 1)],
    ['segunda fecha undefined', new Date(2026, 0, 1), undefined],
  ])('devuelve null cuando falta la %s', (_case, a, b) => {
    expect(diasEntre(a, b)).toBeNull();
  });

  it('redondea una diferencia de medio día al entero superior', () => {
    const mediodia = new Date(2026, 0, 1, 12);
    const medianoche = new Date(2026, 0, 1, 0);

    expect(diasEntre(mediodia, medianoche)).toBe(1);
  });
});

describe('primerDiaMes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['un mes intermedio', new Date(2026, 7, 19, 15, 30), 2026, 7, 1],
    ['el inicio de año', new Date(2026, 0, 31, 23, 59), 2026, 0, 1],
  ])('usa la fecha local para %s', (_case, systemDate, year, monthIndex, day) => {
    vi.useFakeTimers();
    vi.setSystemTime(systemDate);

    expectLocalDate(primerDiaMes(), year, monthIndex, day);
  });
});
