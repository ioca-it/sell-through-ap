import { describe, expect, it } from 'vitest';
import {
  indexProductsBySku,
  isProduct,
  multiplyPrice,
  normalizeProduct,
  productToMasterRecord,
  subtractPrices,
  sumPriceValues,
} from '../product.js';

const sourceProduct = {
  sku: ' SKU-1 ',
  productName: ' Crusher Evo ',
  brand: ' Skullcandy ',
  category: ' Audífonos ',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2026-08-01T00:00:00.000Z',
  level: ' Better ',
  status: ' Activo ',
  imageUrl: ' https://images.invalid/sku-1.png ',
  productUrl: ' https://products.invalid/sku-1 ',
  priceUSA: '25',
  priceChina: 18,
};

describe('contrato Product normalizado', () => {
  it('normaliza todos los campos sin nombres físicos de fuente', () => {
    const product = normalizeProduct(sourceProduct);
    expect(product).toEqual({
      sku: 'SKU-1',
      productName: 'Crusher Evo',
      brand: 'Skullcandy',
      category: 'Audífonos',
      discontinuationDate: new Date('2027-06-30T00:00:00.000Z'),
      fechaStr: '2027-06-30',
      creationDate: new Date('2026-08-01T00:00:00.000Z'),
      level: 'Better',
      status: 'Activo',
      imageUrl: 'https://images.invalid/sku-1.png',
      productUrl: 'https://products.invalid/sku-1',
      priceUSA: 25,
      priceChina: 18,
    });
    expect(isProduct(product)).toBe(true);
    expect(JSON.stringify(product)).not.toMatch(/crbbe_|createdon|amount/);
  });

  it('usa null para fechas inválidas y precios ausentes', () => {
    expect(normalizeProduct({ sku: 'SKU-1', creationDate: 'bad' })).toMatchObject({
      discontinuationDate: null,
      fechaStr: '',
      creationDate: null,
      priceUSA: null,
      priceChina: null,
      imageUrl: '',
      productUrl: '',
    });
  });

  it('preserva cero como precio real y normaliza valores inválidos a null', () => {
    expect(normalizeProduct({
      sku: 'SKU-1',
      priceUSA: 0,
      priceChina: 'no-disponible',
    })).toMatchObject({ priceUSA: 0, priceChina: null });
  });

  it('propaga precio no disponible en operaciones financieras', () => {
    expect(multiplyPrice(null, 5)).toBeNull();
    expect(multiplyPrice(0, 5)).toBe(0);
    expect(subtractPrices(25, null)).toBeNull();
    expect(subtractPrices(25, 0)).toBe(25);
    expect(sumPriceValues([10, null, 5])).toBeNull();
    expect(sumPriceValues([10, 0, 5])).toBe(15);
  });

  it('adapta Product al contrato legado sin cambiar reglas de status/costo', () => {
    expect(productToMasterRecord(sourceProduct)).toEqual({
      sku: 'SKU-1',
      marca: 'SKULLCANDY',
      modelo: 'Crusher Evo',
      categoria: 'AUDÍFONOS',
      estado: 'ACTIVO',
      fecha: new Date('2027-06-30T00:00:00.000Z'),
      fechaStr: '2027-06-30',
      creationDate: new Date('2026-08-01T00:00:00.000Z'),
      level: 'Better',
      imageUrl: 'https://images.invalid/sku-1.png',
      productUrl: 'https://products.invalid/sku-1',
      costoUSA: 25,
      costoCHINA: 18,
    });
  });

  it('adapta precios null al Maestro sin convertirlos en cero', () => {
    expect(productToMasterRecord({
      ...sourceProduct,
      priceUSA: null,
      priceChina: undefined,
    })).toMatchObject({ costoUSA: null, costoCHINA: null });
  });

  it('preserva el día fuente de fechaStr cuando la fecha incluye hora y offset', () => {
    const normalized = normalizeProduct({
      sku: 'SKU-1',
      discontinuationDate: '2027-06-30T23:30:00-05:00',
    });

    expect(normalized.fechaStr).toBe('2027-06-30');
    expect(productToMasterRecord(normalized).fechaStr).toBe('2027-06-30');
  });

  it('rechaza SKU vacío al indexar el Maestro', () => {
    expect(() => indexProductsBySku([normalizeProduct({ sku: ' ' })])).toThrow(
      'Product: el Maestro contiene un Product inválido.',
    );
  });
});
