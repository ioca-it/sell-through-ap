import React, { useEffect, useState } from 'react';
import { getSafeHttpUrl } from '../utils/safeUrl.js';

export const getSafeProductUrl = getSafeHttpUrl;

export const openProductLightbox = (setIsOpen) => setIsOpen(true);
export const closeProductLightbox = (setIsOpen) => setIsOpen(false);
export const closeProductLightboxOnEscape = (event, setIsOpen) => {
  if (event.key === 'Escape') closeProductLightbox(setIsOpen);
};

export const ProductImageLightbox = ({ imageUrl, skuLabel, onClose, onError }) => (
  <span
    role="dialog"
    aria-modal="true"
    aria-label={`Imagen ampliada de ${skuLabel}`}
    data-product-image-lightbox="true"
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    onClick={onClose}
  >
    <span
      className="relative flex items-center justify-center w-full max-w-5xl bg-white p-4 shadow-2xl"
      style={{ maxHeight: '92vh' }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Cerrar imagen ampliada"
        autoFocus
        onClick={onClose}
        className="absolute top-2 right-2 z-10 w-9 h-9 text-2xl leading-none bg-white border text-stone-700 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
      >
        ×
      </button>
      <img
        src={imageUrl}
        alt={`Producto ${skuLabel}`}
        onError={onError}
        className="block max-w-full object-contain"
        style={{ maxHeight: '84vh' }}
      />
    </span>
  </span>
);

export const ProductSkuCell = ({
  sku,
  children,
  imageUrl,
  productUrl,
  compact = false,
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const safeImageUrl = getSafeProductUrl(imageUrl);
  const safeProductUrl = getSafeProductUrl(productUrl);
  const showImage = safeImageUrl !== null && failedImageUrl !== safeImageUrl;
  const skuValue = sku ?? children;
  const skuLabel = typeof skuValue === 'string' && skuValue.trim() ? skuValue.trim() : '—';
  const thumbnailSize = compact ? 28 : 32;

  useEffect(() => {
    if (!isLightboxOpen) return undefined;
    const closeOnEscape = (event) => closeProductLightboxOnEscape(event, setIsLightboxOpen);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isLightboxOpen]);

  return (
    <span
      className="inline-flex items-center gap-2 min-w-max max-w-full align-middle whitespace-nowrap"
      data-product-sku-cell="true"
    >
      {showImage ? (
        <button
          type="button"
          aria-label={`Ampliar imagen de ${skuLabel}`}
          onClick={() => openProductLightbox(setIsLightboxOpen)}
          className="flex-none border bg-white cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-700"
          style={{ width: `${thumbnailSize}px`, height: `${thumbnailSize}px`, borderColor: '#e5e0d5' }}
        >
          <img
            src={safeImageUrl}
            alt={`Producto ${skuLabel}`}
            loading="lazy"
            onError={() => setFailedImageUrl(safeImageUrl)}
            className="w-full h-full object-contain"
          />
        </button>
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
          className="whitespace-nowrap font-bold underline decoration-dotted underline-offset-2 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-700 cursor-pointer"
          style={{ color: '#1e40af' }}
        >
          {skuLabel}
        </a>
      ) : (
        <span className="whitespace-nowrap font-bold">{skuLabel}</span>
      )}
      {showImage && isLightboxOpen && (
        <ProductImageLightbox
          imageUrl={safeImageUrl}
          skuLabel={skuLabel}
          onClose={() => closeProductLightbox(setIsLightboxOpen)}
          onError={() => {
            setFailedImageUrl(safeImageUrl);
            closeProductLightbox(setIsLightboxOpen);
          }}
        />
      )}
    </span>
  );
};
