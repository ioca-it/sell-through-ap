import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/security/rateLimiter.js';

test('limita por identidad autenticada y devuelve Retry-After', async () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({
    windowMs: 10000,
    maxRequests: 2,
    now: () => currentTime,
  });

  assert.equal((await limiter.check({ identity: 'user-1', ip: '10.0.0.1' })).allowed, true);
  assert.equal((await limiter.check({ identity: 'user-1', ip: '10.0.0.2' })).allowed, true);
  const rejected = await limiter.check({ identity: 'user-1', ip: '10.0.0.3' });
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfterSeconds, 10);

  currentTime = 11000;
  assert.equal((await limiter.check({ identity: 'user-1', ip: '10.0.0.1' })).allowed, true);
});

test('usa IP como fallback cuando no existe identidad', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

  assert.equal((await limiter.check({ ip: '10.0.0.1' })).allowed, true);
  assert.equal((await limiter.check({ ip: '10.0.0.1' })).allowed, false);
  assert.equal((await limiter.check({ ip: '10.0.0.2' })).allowed, true);
});

test('acepta un store inyectable para futura infraestructura distribuida', async () => {
  const calls = [];
  const limiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 5,
    now: () => 1000,
    store: {
      increment: async (key, windowMs) => {
        calls.push({ key, windowMs });
        return { count: 1, resetAt: 61000 };
      },
    },
  });

  assert.equal((await limiter.check({ identity: 'distributed-user' })).allowed, true);
  assert.deepEqual(calls, [{ key: 'identity:distributed-user', windowMs: 60000 }]);
});
