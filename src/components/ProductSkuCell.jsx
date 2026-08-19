import React, { useState } from 'react';

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

// Valida el protocolo sin reconstruir ni transformar la URL normalizada de Product.
export const getSafeProductUrl = (value) => {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol) ? candidate : null;
  } catch {
    return null;
  }
};

export const ProductSkuCell = ({
  sku,
  children,
  imageUrl,
  productUrl,
  compact = false,
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const safeImageUrl = getSafeProductUrl(imageUrl);
  const safeProductUrl = getSafeProductUrl(productUrl);
  const showImage = safeImageUrl !== null && failedImageUrl !== safeImageUrl;
  const skuValue = sku ?? children;
  const skuLabel = typeof skuValue === 'string' && skuValue.trim() ? skuValue.trim() : '—';
  const thumbnailSize = compact ? 28 : 32;

  return (
    <span
      className="inline-flex items-center gap-2 min-w-0 max-w-full align-middle"
      data-product-sku-cell="true"
    >
      {showImage ? (
        <img
          src={safeImageUrl}
          alt={`Producto ${skuLabel}`}
          loading="lazy"
          onError={() => setFailedImageUrl(safeImageUrl)}
          className="flex-none object-contain border bg-white"
          style={{
            width: `${thumbnailSize}px`,
            height: `${thumbnailSize}px`,
            maxWidth: `${thumbnailSize}px`,
            maxHeight: `${thumbnailSize}px`,
            borderColor: '#e5e0d5',
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex-none inline-flex items-center justify-center border text-stone-400 bg-stone-50"
          data-product-image-fallback="true"
          style={{
            width: `${thumbnailSize}px`,
            height: `${thumbnailSize}px`,
            borderColor: '#e5e0d5',
          }}
        >
          —
        </span>
      )}
      {safeProductUrl ? (
        <a
          href={safeProductUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-words font-bold underline decoration-dotted underline-offset-2 hover:opacity-75 cursor-pointer"
          style={{ color: '#1e40af' }}
        >
          {skuLabel}
        </a>
      ) : (
        <span className="min-w-0 break-words font-bold">{skuLabel}</span>
      )}
    </span>
  );
};
