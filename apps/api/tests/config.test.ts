import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { config, parseTrustProxy, projectRoot, redisConnectionOptions, validateConfig } from '../src/config';

function production(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production', JWT_SECRET: 'test-only-jwt-6e2093fa048a37cd940fb228',
    ML_SERVICE_TOKEN: 'test-only-ml-8ae074b17309fe25cd93e100',
    DATABASE_URL: 'postgresql://app:test-password-91824@127.0.0.1:5432/dermatolog',
    APP_ORIGIN: 'https://dermatologai.uz', REDIS_URL: 'redis://127.0.0.1:6379/0',
    ML_SERVICE_URL: 'http://127.0.0.1:8001', AI_PROVIDER: 'local',
    STORAGE_DRIVER: 'local', ALLOW_LOCAL_STORAGE_IN_PRODUCTION: 'true', STORAGE_PATH: resolve(tmpdir(), 'rd-production-config-test'),
    SMTP_HOST: 'smtp.mail.example', SMTP_PORT: '587', SMTP_FROM: 'Dermatolog <noreply@dermatologai.uz>', SMTP_REQUIRE_TLS: 'true',
  };
}
afterEach(() => vi.unstubAllEnvs());

describe('Production configuration rejects unsafe defaults without reading live secrets', () => {
  it('accepts an explicitly private native installation and does not require an OpenAI key in API', () => {
    expect(() => validateConfig(production())).not.toThrow();
    expect(() => validateConfig({ ...production(), AI_PROVIDER: 'openai', OPENAI_MODEL: 'provider-model' })).not.toThrow();
  });
  it.each([
    ['JWT_SECRET', 'CHANGE_ME_123456789012345678901234567890'],
    ['APP_ORIGIN', 'http://dermatologai.uz'], ['APP_ORIGIN', 'https://dermatologai.uz/'],
    ['APP_ORIGIN', 'https://localhost'], ['REDIS_URL', undefined],
    ['REDIS_URL', 'redis://public.example:6379/0'], ['ML_SERVICE_URL', 'http://public.example:8001'],
    ['DATABASE_URL', 'postgresql://app:short@127.0.0.1/app'],
    ['DATABASE_URL', 'postgresql://app:test-password-91824@db.example/app'],
    ['STORAGE_PATH', resolve(projectRoot(), 'public')], ['STORAGE_PATH', './uploads'],
    ['ALLOW_LOCAL_STORAGE_IN_PRODUCTION', 'false'], ['SMTP_HOST', 'mailpit'],
    ['SMTP_HOST', 'replace-with-smtp-host.invalid'], ['REDIS_URL', 'redis://:GENERATE_REDIS_PASSWORD@127.0.0.1:6379/0'],
    ['SMTP_REQUIRE_TLS', 'false'], ['SMTP_PORT', '465'], ['SMTP_USER', 'user-without-password'],
  ])('rejects %s = %s', (key, value) => {
    const env = production(); env[key!] = value;
    expect(() => validateConfig(env)).toThrow();
  });
  it('rejects shared signing and internal-service secrets', () => {
    const env = production(); env.ML_SERVICE_TOKEN = env.JWT_SECRET;
    expect(() => validateConfig(env)).toThrow(/different/);
  });
  it('accepts explicitly TLS-protected remote database/Redis and optional S3', () => {
    expect(() => validateConfig({ ...production(), DATABASE_URL: 'postgresql://app:test-password-91824@db.example/app?sslmode=verify-full',
      REDIS_URL: 'rediss://cache.example:6380/1', STORAGE_DRIVER: 's3', S3_BUCKET: 'private-skin-images',
      S3_ACCESS_KEY: 'unit-test-access', S3_SECRET_KEY: 'test-only-storage-69bd83e5210c4af7', S3_ENDPOINT: 'https://objects.example' })).not.toThrow();
  });
  it('keeps development SMTP and repository-local storage available', () => {
    expect(() => validateConfig({ NODE_ENV: 'test', JWT_SECRET: production().JWT_SECRET, DATABASE_URL: 'postgresql://app:local@localhost/test' })).not.toThrow();
  });
  it('cannot enable public Swagger in production', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('ENABLE_SWAGGER', 'true');
    expect(config.swaggerEnabled).toBe(false); expect(config.smtpRequireTls).toBe(true);
  });
});

describe('Proxy and Redis connection parsing', () => {
  it('trusts no forwarded addresses by default and accepts explicit native Nginx peers', () => {
    expect(parseTrustProxy()).toBe(false);
    expect(parseTrustProxy('127.0.0.1/32,::1/128')).toEqual(['127.0.0.1/32', '::1/128']);
  });
  it.each(['true', '1', '0.0.0.0/0', '::/0', '127.0.0.1/33', 'proxy.example', '127.0.0.1,'])('rejects unsafe trust configuration %s', value => {
    expect(() => parseTrustProxy(value)).toThrow();
  });
  it('decodes credentials and preserves TLS/database rather than silently using wrong credentials', () => {
    expect(redisConnectionOptions('rediss://worker%40name:p%40ss%3Aword@cache.example:6380/3')).toEqual({
      host: 'cache.example', port: 6380, username: 'worker@name', password: 'p@ss:word', db: 3, tls: {},
    });
    expect(() => redisConnectionOptions('redis://localhost/not-a-db')).toThrow();
  });
});
