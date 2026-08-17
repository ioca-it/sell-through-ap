import { describe, expect, it } from 'vitest';
import {
  indexProductsBySku,
  isProduct,
  normalizeProduct,
  productToMasterRecord,
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

  it('usa null para fechas inválidas y cero para precios ausentes', () => {
    expect(normalizeProduct({ sku: 'SKU-1', creationDate: 'bad' })).toMatchObject({
      discontinuationDate: null,
      creationDate: null,
      priceUSA: 0,
      priceChina: 0,
      imageUrl: '',
      productUrl: '',
    });
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

  it('rechaza SKU vacío al indexar el Maestro', () => {
    expect(() => indexProductsBySku([normalizeProduct({ sku: ' ' })])).toThrow(
      'Product: el Maestro contiene un Product inválido.',
    );
  });
});
