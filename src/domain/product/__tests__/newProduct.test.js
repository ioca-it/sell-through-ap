import { describe, expect, it } from 'vitest';
import { findNewProductsMissingInventory, isNewProduct } from '../newProduct.js';

const processingDate = new Date(2026, 7, 1);
const dateDaysBefore = (days) => {
  const date = new Date(processingDate);
  date.setDate(date.getDate() - days);
  return date;
};

describe('Producto Nuevo', () => {
  it.each([
    [89, true],
    [90, false],
    [120, false],
  ])('clasifica una antigüedad de %i días', (days, expected) => {
    expect(isNewProduct({
      creationDate: dateDaysBefore(days),
      processingDate,
    })).toBe(expected);
  });

  it.each([null, '', new Date('invalid')])(
    'no clasifica creationDate vacía o inválida: %s',
    (creationDate) => {
      expect(isNewProduct({ creationDate, processingDate })).toBe(false);
    },
  );

  it('cuenta por SKU los nuevos ausentes y excluye un SKU nuevo ya presente', () => {
    const missing = findNewProductsMissingInventory({
      masterBySku: {
        'NEW-MISSING': { sku: 'NEW-MISSING', creationDate: dateDaysBefore(30) },
        'NEW-PRESENT': { sku: 'NEW-PRESENT', creationDate: dateDaysBefore(30) },
        'OLD-MISSING': { sku: 'OLD-MISSING', creationDate: dateDaysBefore(90) },
      },
      inventoryRecords: [{ sku: 'NEW-PRESENT', invFinal: 10 }],
      processingDate,
    });

    expect(missing.map(({ sku }) => sku)).toEqual(['NEW-MISSING']);
  });
});
