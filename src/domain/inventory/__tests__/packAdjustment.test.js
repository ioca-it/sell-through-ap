import { describe, expect, it } from 'vitest';
import {
  ajustarReposicionPorPack,
  PACK_ADJUSTMENT_TYPES,
} from '../inventoryEngine.js';

const adjust = (overrides = {}) => ajustarReposicionPorPack({
  pedidoBase: 121,
  aplicaMasterPack: false,
  cantidadMasterPack: null,
  aplicaInnerPack: false,
  cantidadInnerPack: null,
  ...overrides,
});

describe('ajuste logístico de Pedido Sugerido posterior al cálculo base', () => {
  it('redondea 121 a Master Pack 24 = 144', () => {
    expect(adjust({ aplicaMasterPack: true, cantidadMasterPack: 24 })).toEqual({
      pedidoSugeridoBase: 121,
      tipoAjustePack: PACK_ADJUSTMENT_TYPES.MASTER,
      cantidadPackAplicada: 24,
      pedidoSugeridoFinal: 144,
    });
  });

  it('conserva 120 cuando ya es múltiplo de Master Pack 24', () => {
    expect(adjust({
      pedidoBase: 120,
      aplicaMasterPack: true,
      cantidadMasterPack: 24,
    }).pedidoSugeridoFinal).toBe(120);
  });

  it.each([
    ['Master true sin cantidad', true, null],
    ['Master false', false, 24],
    ['Master null', null, 24],
    ['Master true con cantidad cero', true, 0],
  ])('usa Inner Pack 12 cuando %s', (_label, masterFlag, masterQuantity) => {
    expect(adjust({
      aplicaMasterPack: masterFlag,
      cantidadMasterPack: masterQuantity,
      aplicaInnerPack: true,
      cantidadInnerPack: 12,
    })).toMatchObject({
      tipoAjustePack: PACK_ADJUSTMENT_TYPES.INNER,
      cantidadPackAplicada: 12,
      pedidoSugeridoFinal: 132,
    });
  });

  it('Master válido gana cuando también existe Inner válido', () => {
    expect(adjust({
      aplicaMasterPack: true,
      cantidadMasterPack: 24,
      aplicaInnerPack: true,
      cantidadInnerPack: 12,
    })).toMatchObject({
      tipoAjustePack: PACK_ADJUSTMENT_TYPES.MASTER,
      cantidadPackAplicada: 24,
      pedidoSugeridoFinal: 144,
    });
  });

  it.each([
    ['ambas banderas false', { aplicaMasterPack: false, aplicaInnerPack: false }],
    ['cantidades ausentes', {
      aplicaMasterPack: true,
      cantidadMasterPack: null,
      aplicaInnerPack: true,
      cantidadInnerPack: null,
    }],
  ])('conserva Pedido Base sin pack: %s', (_label, values) => {
    expect(adjust(values)).toMatchObject({
      tipoAjustePack: PACK_ADJUSTMENT_TYPES.NONE,
      cantidadPackAplicada: null,
      pedidoSugeridoFinal: 121,
    });
  });

  it('conserva cero con Master Pack válido', () => {
    expect(adjust({
      pedidoBase: 0,
      aplicaMasterPack: true,
      cantidadMasterPack: 24,
    }).pedidoSugeridoFinal).toBe(0);
  });

  it('pack 1 conserva el Pedido Base', () => {
    expect(adjust({
      aplicaMasterPack: true,
      cantidadMasterPack: 1,
    }).pedidoSugeridoFinal).toBe(121);
  });

  it.each([NaN, Infinity, -Infinity, -5])(
    'no produce NaN, Infinity o negativos con Pedido Base %s',
    (pedidoBase) => {
      const result = adjust({
        pedidoBase,
        aplicaMasterPack: true,
        cantidadMasterPack: 24,
      });
      expect(Number.isFinite(result.pedidoSugeridoFinal)).toBe(true);
      expect(result.pedidoSugeridoFinal).toBeGreaterThanOrEqual(0);
      expect(result.pedidoSugeridoFinal).toBeGreaterThanOrEqual(result.pedidoSugeridoBase);
    },
  );
});
