import { describe, expect, it } from 'vitest';
import {
  createLocalProductProvider,
  LocalProductMasterError,
} from '../localProductProvider.js';

describe('LocalProductProvider', () => {
  it('mantiene el Maestro local usando Master Parser como única lógica', async () => {
    const provider = createLocalProductProvider({
      rawMaster: [
        'MARCA\tSKU\tMODELO\tCATEGORIA\tFecha EOL\tcreationDate\tESTADO\tUSA\tCHINA',
        'Skullcandy\tLOCAL-1\tCrusher\tAudio\t30/06/2027\t01/08/2026\tEOL\t25\t18',
      ].join('\n'),
    });

    await expect(provider.loadBrands()).resolves.toEqual(['SKULLCANDY']);
    await expect(provider.loadProducts({ brand: 'SKULLCANDY' })).resolves.toEqual([
      expect.objectContaining({
        sku: 'LOCAL-1',
        productName: 'Crusher',
        brand: 'SKULLCANDY',
        category: 'AUDIO',
        status: 'EOL',
        fechaStr: '2027-06-30',
        priceUSA: 25,
        priceChina: 18,
        imageUrl: '',
        productUrl: '',
      }),
    ]);
  });

  it('conserva arreglo vacío para texto vacío', async () => {
    const provider = createLocalProductProvider();
    await expect(provider.loadBrands()).resolves.toEqual([]);
    await expect(provider.loadProducts({ brand: 'MARCA' })).resolves.toEqual([]);
  });

  it('preserva null para un precio local ausente y cero para un precio real', async () => {
    const provider = createLocalProductProvider({
      rawMaster: 'MARCA\tSKU\tUSA\tCHINA\nMARCA\tLOCAL-NULL\t0\t',
    });
    await expect(provider.loadProducts({ brand: '' })).rejects.toEqual(
      expect.objectContaining({ code: 'PRODUCT_BRAND_REQUIRED' }),
    );
    await expect(provider.loadProducts({ brand: 'MARCA' })).resolves.toEqual([
      expect.objectContaining({ sku: 'LOCAL-NULL', priceUSA: 0, priceChina: null }),
    ]);
  });

  it('propaga el error contractual del parser para Maestro inválido', async () => {
    const provider = createLocalProductProvider({ rawMaster: 'MARCA\tMODELO\nM\tP' });
    await expect(provider.loadProducts({ brand: 'M' })).rejects.toBeInstanceOf(LocalProductMasterError);
  });

  it('deduplica/ordena marcas y filtra exclusivamente la selección', async () => {
    const provider = createLocalProductProvider({
      rawMaster: [
        'MARCA\tSKU\tMODELO',
        'SKULLCANDY\tS-1\tUno',
        'ANKER\tA-1\tDos',
        'SKULLCANDY\tS-2\tTres',
      ].join('\n'),
    });

    await expect(provider.loadBrands()).resolves.toEqual(['ANKER', 'SKULLCANDY']);
    await expect(provider.loadProducts({ brand: 'SKULLCANDY' })).resolves.toEqual([
      expect.objectContaining({ sku: 'S-1', brand: 'SKULLCANDY' }),
      expect.objectContaining({ sku: 'S-2', brand: 'SKULLCANDY' }),
    ]);
  });
});
