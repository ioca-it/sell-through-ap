import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { processSellThrough } from '../application/sellThroughApplicationService.js';
import { PortfolioAnalysisService } from '../domain/portfolio/PortfolioAnalysisService.js';
import { createSellThroughRepository } from '../repositories/sellThroughRepository.js';

const CONFIG = {
  codigoCliente: 'PHASE105',
  nombreCliente: 'Fixture Phase1-105',
  pais: 'USA',
  fechaCorte: '2026-08-01',
  periodoAnalizado: 'Mensual',
  periodoDetalle: '',
  semanasPersonalizadas: 4.33,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

const product = (sku, overrides = {}) => ({
  sku,
  productName: `Producto ${sku}`,
  brand: 'SKULLCANDY',
  category: 'AUDIO',
  discontinuationDate: null,
  creationDate: '2025-01-01',
  level: 'BEST',
  status: 'ACTIVO',
  imageUrl: '',
  productUrl: '',
  aplicaMasterPack: null,
  cantidadMasterPack: null,
  aplicaInnerPack: null,
  cantidadInnerPack: null,
  priceUSA: 10,
  priceChina: 8,
  ...overrides,
});

describe('Phase1-105 — datasets canónicos Tier, EOL y reposición', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('usa Pedido Final en reposición Tier y conserva el conteo técnico separado', () => {
    const repository = createSellThroughRepository({
      rawInventario: [
        'SKU\tTIER\tORIGEN\tINV SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV FINAL',
        'PACK-24\tBEST\tUSA\t0\t1\t0\t66\t1',
        'ZERO-STOCK\tGOOD\tUSA\t0\t0\t0\t0\t0',
      ].join('\n'),
      config: CONFIG,
    });
    const { resultados, error } = processSellThrough(repository, {
      products: [
        product('PACK-24', { aplicaMasterPack: true, cantidadMasterPack: 24 }),
        product('ZERO-STOCK'),
      ],
    });

    expect(error).toBeNull();
    const packed = resultados.recs.find(({ sku }) => sku === 'PACK-24');
    expect(packed).toMatchObject({
      reposicionSugeridaBase: 121,
      tipoAjustePack: 'MASTER PACK',
      cantidadPackAplicada: 24,
      reposicionSugerida: 144,
      valorReposicion: 1440,
    });
    expect(resultados.totales.totalSKUs).toBe(2);
    expect(resultados.distribucionTier.inventario).toMatchObject({
      totalSKUs: 1,
      totalU: 1,
    });
    expect(resultados.distribucionTier.ventas).toMatchObject({
      totalSKUs: 1,
      totalU: 66,
    });
    expect(resultados.distribucionTier.reposicion).toMatchObject({
      totalSKUs: 1,
      totalU: 144,
    });
    expect(resultados.productosReposicionSugerida.map(({ sku }) => sku))
      .toEqual(['PACK-24']);
    expect(resultados.alertas.totalReposicionUnid).toBe(144);
  });

  it('deriva la tabla EOL de descuento sin reducir el universo EOL general', () => {
    const records = [
      { sku: 'APLICA', estado: 'EOL', invFinal: 5, descPct: 0.15 },
      { sku: 'CERO', estado: 'EOL', invFinal: 0, descPct: 0.15 },
      { sku: 'NULL', estado: 'EOL', invFinal: null, descPct: 0.15 },
      { sku: 'SIN-REGLA', estado: 'EOL', invFinal: 5, descPct: 0 },
      { sku: 'ACTIVO', estado: 'ACTIVO', invFinal: 5, descPct: 0.15 },
    ];

    const consolidation = PortfolioAnalysisService.consolidateRecords(records);

    expect(consolidation.eolTodos.map(({ sku }) => sku)).toEqual([
      'APLICA', 'CERO', 'NULL', 'SIN-REGLA',
    ]);
    expect(consolidation.eolConDescuentoAplicable.map(({ sku }) => sku))
      .toEqual(['APLICA']);
  });
});
