import { describe, expect, it } from 'vitest';
import { processSellThrough } from '../sellThroughApplicationService.js';
import { createSellThroughRepository } from '../../repositories/sellThroughRepository.js';
import { primerDiaMes } from '../../utils/dateUtils.js';

const config = {
  periodoAnalizado: 'Mensual',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

const product = (overrides = {}) => ({
  sku: 'SKU-001',
  productName: 'Producto Dataverse',
  brand: 'Marca',
  category: 'Audio',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2025-01-01T00:00:00.000Z',
  level: 'BETTER',
  status: 'ACTIVO',
  imageUrl: 'https://images.invalid/sku-001.png',
  productUrl: 'https://products.invalid/sku-001',
  priceUSA: 25,
  priceChina: 18,
  ...overrides,
});

describe('Product normalizado en el pipeline existente', () => {
  it('alimenta motores y detalle SKU sin pasar por texto u OData', () => {
    const repository = createSellThroughRepository({
      rawInventario: [
        'SKU\tORIGEN\tINV INICIAL\tVENTAS\tINV FINAL',
        'SKU-001\tCHINA\t5\t1\t4',
      ].join('\n'),
      config,
    });
    const execution = processSellThrough(repository, { products: [product()] });

    expect(execution.error).toBeNull();
    expect(execution.resultados.recs[0]).toMatchObject({
      sku: 'SKU-001',
      modelo: 'Producto Dataverse',
      marca: 'MARCA',
      categoria: 'AUDIO',
      costoUSA: 25,
      costoCHINA: 18,
      costo: 18,
      imageUrl: 'https://images.invalid/sku-001.png',
      productUrl: 'https://products.invalid/sku-001',
      level: 'BETTER',
    });
  });

  it('preserva Producto Nuevo estricto <90 días con creationDate Dataverse', () => {
    const processingDate = primerDiaMes();
    const dateDaysBefore = (days) => {
      const date = new Date(processingDate);
      date.setDate(date.getDate() - days);
      return date;
    };
    const repository = createSellThroughRepository({
      rawInventario: 'SKU\tINV FINAL\nSKU-001\t1',
      config,
    });
    const execution = processSellThrough(repository, {
      products: [
        product(),
        product({ sku: 'NEW-89', creationDate: dateDaysBefore(89) }),
        product({ sku: 'OLD-90', creationDate: dateDaysBefore(90) }),
      ],
    });

    expect(execution.resultados.alertas.productosNuevosNoPresentes.map(({ sku }) => sku))
      .toEqual(['NEW-89']);
  });
});
