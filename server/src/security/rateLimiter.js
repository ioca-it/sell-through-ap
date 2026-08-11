const createInMemoryRateLimitStore = ({ now }) => {
  const buckets = new Map();

  return Object.freeze({
    async increment(key, windowMs) {
      const currentTime = now();
      const current = buckets.get(key);
      const bucket = !current || current.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + windowMs }
        : current;
      bucket.count += 1;
      buckets.set(key, bucket);

      if (buckets.size > 1000) {
        buckets.forEach((value, bucketKey) => {
          if (value.resetAt <= currentTime) buckets.delete(bucketKey);
        });
      }

      return { count: bucket.count, resetAt: bucket.resetAt };
    },
  });
};

export const createRateLimiter = ({
  windowMs,
  maxRequests,
  now = () => Date.now(),
  store,
} = {}) => {
  if (!Number.isInteger(windowMs) || windowMs < 1
    || !Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error('RateLimiter: configuración inválida.');
  }

  // El store es inyectable para sustituir memoria local por un contador
  // distribuido al habilitar múltiples instancias en Azure.
  const rateLimitStore = store ?? createInMemoryRateLimitStore({ now });
  if (typeof rateLimitStore.increment !== 'function') {
    throw new Error('RateLimiter: store inválido.');
  }

  return Object.freeze({
    async check({ identity, ip }) {
      const key = identity ? `identity:${identity}` : `ip:${ip || 'unknown'}`;
      const result = await rateLimitStore.increment(key, windowMs);
      const allowed = result.count <= maxRequests;
      return Object.freeze({
        allowed,
        retryAfterSeconds: allowed
          ? 0
          : Math.max(1, Math.ceil((result.resetAt - now()) / 1000)),
      });
    },
  });
};
