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

    await expect(provider.loadProducts()).resolves.toEqual([
      expect.objectContaining({
        sku: 'LOCAL-1',
        productName: 'Crusher',
        brand: 'SKULLCANDY',
        category: 'AUDIO',
        status: 'EOL',
        priceUSA: 25,
        priceChina: 18,
        imageUrl: '',
        productUrl: '',
      }),
    ]);
  });

  it('conserva arreglo vacío para texto vacío', async () => {
    await expect(createLocalProductProvider().loadProducts()).resolves.toEqual([]);
  });

  it('propaga el error contractual del parser para Maestro inválido', async () => {
    const provider = createLocalProductProvider({ rawMaster: 'MARCA\tMODELO\nM\tP' });
    await expect(provider.loadProducts()).rejects.toBeInstanceOf(LocalProductMasterError);
  });
});
