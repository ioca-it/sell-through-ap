const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

// Acepta solo URLs absolutas HTTP(S) sin reconstruir ni transformar el valor.
export const getSafeHttpUrl = (value) => {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol) && parsed.hostname
      ? candidate
      : null;
  } catch {
    return null;
  }
};
