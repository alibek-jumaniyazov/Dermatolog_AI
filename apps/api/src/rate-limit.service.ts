import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisConnection } from 'bullmq';
import { redisConnectionOptions } from './config';

// Increment and set expiry in one operation: multiple API processes share the window.
const COUNTER_SCRIPT = `local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if count == 1 or ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}`;
const WINDOW_MS = 60000;
type Bucket = { expiresAt: number; count: number };

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private redis?: RedisConnection;
  private readonly redisUrl = process.env.REDIS_URL;
  private readonly buckets = new Map<string, Bucket>();
  async onModuleInit() {
    if (!this.redisUrl) return;
    this.redis = new RedisConnection({ ...redisConnectionOptions(this.redisUrl), maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 1500, commandTimeout: 1500 }, { blocking: false });
    // Never log a Redis error object: it may contain connection credentials.
    this.redis.on('error', () => undefined);
    try { await this.ready(); }
    catch { await this.redis.close(true); throw new Error('Rate limit store unavailable'); }
  }
  async onModuleDestroy() { await this.redis?.close(true); }
  private async client() {
    if (!this.redis) throw new Error('Rate limit store unavailable');
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([this.redis.client, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Rate limit store unavailable')), 2000); })]);
    } finally { if (timer) clearTimeout(timer); }
  }
  async ready() { if (this.redisUrl) await (await this.client()).ping(); return true; }
  async consume(ip: string, scope: 'auth' | 'api') {
    const key = `rd:rate:v1:${scope}:${createHash('sha256').update(ip).digest('hex')}`;
    let count: number; let ttl: number;
    if (this.redisUrl) {
      const response = await (await this.client()).eval(COUNTER_SCRIPT, 1, key, WINDOW_MS);
      if (!Array.isArray(response) || response.length !== 2 || !response.every(value => Number.isFinite(Number(value)))) throw new Error('Invalid rate limit response');
      [count, ttl] = response.map(Number);
      if (count < 1 || ttl < 0 || ttl > WINDOW_MS) throw new Error('Invalid rate limit counter');
    } else {
      const now = Date.now();
      let bucket = this.buckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        if (this.buckets.size >= 10000) {
          for (const [entry, value] of this.buckets) if (value.expiresAt <= now) this.buckets.delete(entry);
          if (this.buckets.size >= 10000) throw new Error('Local rate limit capacity exhausted');
        }
        bucket = { expiresAt: now + WINDOW_MS, count: 0 }; this.buckets.set(key, bucket);
      }
      count = ++bucket.count; ttl = bucket.expiresAt - now;
    }
    const limit = Number(process.env[scope === 'auth' ? 'RATE_LIMIT_AUTH_PER_MINUTE' : 'RATE_LIMIT_API_PER_MINUTE'] || (scope === 'auth' ? 30 : 240));
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
  }
}
