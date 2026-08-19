import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getSafeProductUrl, ProductSkuCell } from '../ProductSkuCell.jsx';

const renderCell = (props) => renderToStaticMarkup(
  <ProductSkuCell {...props}>{props.sku}</ProductSkuCell>,
);

describe('ProductSkuCell', () => {
  it('muestra una miniatura http/https válida con alt basado en SKU', () => {
    const markup = renderCell({
      sku: 'SKU-001',
      imageUrl: 'https://images.example.test/sku-001.png',
    });

    expect(markup).toContain('<img');
    expect(markup).toContain('src="https://images.example.test/sku-001.png"');
    expect(markup).toContain('alt="Producto SKU-001"');
    expect(markup).not.toContain('alt="https://');
  });

  it('usa fallback neutro cuando imageUrl está vacía', () => {
    const markup = renderCell({ sku: 'SKU-EMPTY', imageUrl: '   ' });

    expect(markup).not.toContain('<img');
    expect(markup).toContain('data-product-image-fallback="true"');
  });

  it('convierte una productUrl válida en link seguro que abre otra pestaña', () => {
    const markup = renderCell({
      sku: 'SKU-LINK',
      productUrl: 'http://products.example.test/sku-link',
    });

    expect(markup).toContain('href="http://products.example.test/sku-link"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('cursor-pointer');
  });

  it('muestra SKU como texto cuando productUrl está vacía', () => {
    const markup = renderCell({ sku: 'SKU-TEXT', productUrl: '' });

    expect(markup).toContain('SKU-TEXT');
    expect(markup).not.toContain('<a');
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'file:///tmp/product.png',
    'ftp://products.example.test/sku',
    '//products.example.test/sku',
    'no-es-url',
  ])('rechaza URL insegura o inválida sin crear link ni imagen: %s', (unsafeUrl) => {
    const markup = renderCell({
      sku: 'SKU-UNSAFE',
      imageUrl: unsafeUrl,
      productUrl: unsafeUrl,
    });

    expect(getSafeProductUrl(unsafeUrl)).toBeNull();
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<a');
    expect(markup).toContain('data-product-image-fallback="true"');
    expect(markup).toContain('SKU-UNSAFE');
  });
});

