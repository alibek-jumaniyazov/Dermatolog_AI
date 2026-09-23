import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionContext, HttpException } from '@nestjs/common';

const redis = vi.hoisted(() => ({ counts: new Map<string, number>(), fail: false, calls: [] as unknown[][], close: vi.fn() }));
vi.mock('bullmq', () => ({ RedisConnection: class {
  client = Promise.resolve({ ping: async () => { if (redis.fail) throw Error('Unavailable'); return 'PONG'; },
    eval: async (...args: unknown[]) => {
      redis.calls.push(args); if (redis.fail) throw Error('Unavailable');
      const key = String(args[2]); const count = (redis.counts.get(key) || 0) + 1; redis.counts.set(key, count);
      return [count, 59000];
    } });
  on() { return this; }
  close = redis.close;
} }));
import { RateLimitService } from '../src/rate-limit.service';
import { RateGuard } from '../src/rate.guard';

beforeEach(() => {
  vi.stubEnv('REDIS_URL', ''); vi.stubEnv('RATE_LIMIT_AUTH_PER_MINUTE', '2'); vi.stubEnv('RATE_LIMIT_API_PER_MINUTE', '4');
  redis.counts.clear(); redis.calls.length = 0; redis.fail = false; redis.close.mockClear();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('Bounded rate limits', () => {
  it('enforces an auth window separately from normal API traffic and resets only after expiry', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const limiter = new RateLimitService();
    expect((await limiter.consume('127.0.0.1', 'auth')).remaining).toBe(1);
    expect((await limiter.consume('127.0.0.1', 'auth')).allowed).toBe(true);
    expect((await limiter.consume('127.0.0.1', 'auth')).allowed).toBe(false);
    expect((await limiter.consume('127.0.0.1', 'api')).allowed).toBe(true);
    vi.advanceTimersByTime(60000);
    expect((await limiter.consume('127.0.0.1', 'auth')).remaining).toBe(1);
  });
  it('two API instances use the same Redis counter and one atomic expiry script', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379/0');
    const first = new RateLimitService(); const second = new RateLimitService();
    await first.onModuleInit(); await second.onModuleInit();
    expect((await first.consume('203.0.113.9', 'auth')).allowed).toBe(true);
    expect((await second.consume('203.0.113.9', 'auth')).allowed).toBe(true);
    expect((await first.consume('203.0.113.9', 'auth')).allowed).toBe(false);
    expect(redis.calls[0][0]).toContain("redis.call('PEXPIRE'");
    expect(redis.calls[0][2]).toBe(redis.calls[1][2]);
    expect(String(redis.calls[0][2])).not.toContain('203.0.113.9');
    await first.onModuleDestroy(); await second.onModuleDestroy();
  });
  it('does not reset into a local counter when configured Redis becomes unavailable', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379/0');
    const limiter = new RateLimitService(); await limiter.onModuleInit(); redis.fail = true;
    await expect(limiter.consume('203.0.113.9', 'auth')).rejects.toThrow();
    await expect(limiter.ready()).rejects.toThrow(); await limiter.onModuleDestroy();
  });
  it('closes the Redis connection after bounded startup failure', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379/0'); redis.fail = true;
    await expect(new RateLimitService().onModuleInit()).rejects.toThrow('Rate limit store unavailable');
    expect(redis.close).toHaveBeenCalledWith(true);
  });
});

function context(path = '/api/v1/auth/login') {
  const headers = new Map<string, string>();
  const request = { method: 'POST', path, ip: '192.0.2.8', socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': 'attacker-controlled' } };
  const ctx = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ setHeader: (key: string, value: string) => headers.set(key, value) }) }) } as unknown as ExecutionContext;
  return { ctx, headers, request };
}
describe('Rate guard failure behavior', () => {
  it('uses the trusted framework IP, emits retry seconds and a 429', async () => {
    const consume = vi.fn().mockResolvedValue({ allowed: false, limit: 2, remaining: 0, retryAfterSeconds: 58 });
    const guard = new RateGuard({ consume } as unknown as RateLimitService); const { ctx, headers } = context();
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({ status: 429 });
    expect(consume).toHaveBeenCalledWith('192.0.2.8', 'auth'); expect(headers.get('Retry-After')).toBe('58');
  });
  it('fails closed with a sanitized 503 and leaves readiness reachable', async () => {
    const consume = vi.fn().mockRejectedValue(new Error('credential-that-must-not-leak'));
    const guard = new RateGuard({ consume } as unknown as RateLimitService); const { ctx } = context();
    try { await guard.canActivate(ctx); throw new Error('Expected rejection'); }
    catch (error) { expect(error).toBeInstanceOf(HttpException); expect((error as HttpException).getStatus()).toBe(503); expect(JSON.stringify((error as HttpException).getResponse())).not.toContain('credential-that-must-not-leak'); }
    const probe = context('/api/v1/health/ready'); probe.request.method = 'GET';
    expect(await guard.canActivate(probe.ctx)).toBe(true); expect(consume).toHaveBeenCalledTimes(1);
  });
});
