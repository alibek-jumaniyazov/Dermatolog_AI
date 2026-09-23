import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { isIP } from 'node:net';
import dotenv from 'dotenv';

export function projectRoot(): string {
  let candidate = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(candidate, '.env.example')) || existsSync(resolve(candidate, 'RAQAMLI_DERMATOLOG_MASTER_PROMPT.md'))) return candidate;
    const parent = dirname(candidate);
    if (candidate === parent) break;
    candidate = parent;
  }
  return process.cwd();
}
// Production gets secrets from its service manager, never an incidental development .env.
if (process.env.NODE_ENV !== 'production') dotenv.config({ path: resolve(projectRoot(), process.env.ENV_FILE || '.env'), quiet: true });

export const config = {
  get production() { return process.env.NODE_ENV === 'production'; },
  get origin() { return process.env.APP_ORIGIN || 'http://localhost:5173'; },
  get jwtSecret() { return process.env.JWT_SECRET || ''; },
  get mlUrl() { return process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001'; },
  get mlToken() { return process.env.ML_SERVICE_TOKEN || ''; },
  get tempMinutes() { return Number(process.env.TEMP_RETENTION_MINUTES || 60); },
  get storagePath() { return resolve(projectRoot(), process.env.STORAGE_PATH || '.data/storage'); },
  get trustProxy() { return parseTrustProxy(process.env.TRUST_PROXY); },
  get swaggerEnabled() { return !this.production && process.env.ENABLE_SWAGGER !== 'false'; },
  get smtpRequireTls() { return this.production || process.env.SMTP_REQUIRE_TLS === 'true'; },
};

const placeholder = /CHANGE_ME|GENERATE_|REPLACE[_-]|development-secret|example-secret|minioadmin/i;
function requireSecret(env: NodeJS.ProcessEnv, name: string, minimum: number) {
  const value = env[name] || '';
  if (value.length < minimum || placeholder.test(value) || new Set(value).size < 8) throw new Error(`${name} must be a unique non-placeholder secret of at least ${minimum} characters.`);
}
function url(value: string | undefined, name: string, protocols: string[]): URL {
  let parsed: URL;
  try { parsed = new URL(value || ''); } catch { throw new Error(`${name} must be a valid URL.`); }
  if (!protocols.includes(parsed.protocol) || !parsed.hostname || parsed.hash) throw new Error(`${name} has an unsupported URL format.`);
  return parsed;
}
export function privateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || /^[a-z][a-z\d-]*$/.test(host)) return true;
  if (isIP(host) === 4) {
    const [first, second] = host.split('.').map(Number);
    return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
  }
  return isIP(host) === 6 && (host === '::1' || /^(fc|fd)/.test(host));
}
function privateHttpUrl(value: string | undefined, name: string) {
  const parsed = url(value, name, ['http:', 'https:']);
  if (parsed.username || parsed.password || parsed.search || parsed.pathname !== '/') throw new Error(`${name} must be a service origin without credentials, path or query.`);
  if (parsed.protocol === 'http:' && !privateHost(parsed.hostname)) throw new Error(`${name} requires HTTPS outside a private network.`);
  return parsed;
}
export function parseTrustProxy(value?: string): false | string[] {
  if (!value || value === 'false') return false;
  const entries = value.split(',').map(item => item.trim());
  if (entries.some(entry => {
    if (entry === 'loopback') return false;
    const [host, prefix, ...extra] = entry.split('/'); const family = isIP(host);
    return !family || extra.length > 0 || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128)));
  })) throw new Error('TRUST_PROXY must contain explicit trusted proxy IPs/CIDRs or loopback; true and hop counts are forbidden.');
  return entries;
}
export function redisConnectionOptions(value: string) {
  const parsed = url(value, 'REDIS_URL', ['redis:', 'rediss:']);
  if (parsed.search || !/^\/\d*$/.test(parsed.pathname || '/')) throw new Error('REDIS_URL database path must be numeric without query options.');
  return { host: parsed.hostname.replace(/^\[|\]$/g, ''), port: Number(parsed.port || 6379), password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined, db: Number(parsed.pathname.slice(1) || 0), ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}) };
}
export function validateConfig(env: NodeJS.ProcessEnv = process.env): void {
  const production = env.NODE_ENV === 'production';
  requireSecret(env, 'JWT_SECRET', 32);
  const database = url(env.DATABASE_URL, 'DATABASE_URL', ['postgres:', 'postgresql:']);
  if (!database.pathname || database.pathname === '/') throw new Error('DATABASE_URL must name a database.');
  const minutes = Number(env.TEMP_RETENTION_MINUTES || 60);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('TEMP_RETENTION_MINUTES must be an integer in 1..1440.');
  parseTrustProxy(env.TRUST_PROXY);
  if (env.AI_PROVIDER && !['local', 'openai'].includes(env.AI_PROVIDER)) throw new Error('AI_PROVIDER must be local or openai.');
  if (env.STORAGE_DRIVER && !['local', 's3'].includes(env.STORAGE_DRIVER)) throw new Error('STORAGE_DRIVER must be local or s3.');
  for (const name of ['RATE_LIMIT_AUTH_PER_MINUTE', 'RATE_LIMIT_API_PER_MINUTE']) {
    if (env[name] && (!/^\d+$/.test(env[name]!) || Number(env[name]) < 1 || Number(env[name]) > 100000)) throw new Error(`${name} must be an integer in 1..100000.`);
  }
  if (env.REDIS_URL) redisConnectionOptions(env.REDIS_URL);
  if (!production) return;
  requireSecret(env, 'ML_SERVICE_TOKEN', 32);
  if (env.ML_SERVICE_TOKEN === env.JWT_SECRET) throw new Error('JWT_SECRET and ML_SERVICE_TOKEN must be different.');
  const origin = url(env.APP_ORIGIN, 'APP_ORIGIN', ['https:']);
  if (origin.origin !== env.APP_ORIGIN || origin.username || origin.password || privateHost(origin.hostname) || /\.(test|localhost|invalid|example)$/.test(origin.hostname)) throw new Error('Production APP_ORIGIN must be a canonical public HTTPS origin without path, query or trailing slash.');
  if (decodeURIComponent(database.password).length < 16 || placeholder.test(database.password)) throw new Error('Production DATABASE_URL requires a non-placeholder password of at least 16 characters.');
  if (!privateHost(database.hostname) && !['require', 'verify-ca', 'verify-full'].includes(database.searchParams.get('sslmode') || '')) throw new Error('Remote production PostgreSQL requires an explicit TLS sslmode.');
  privateHttpUrl(env.ML_SERVICE_URL, 'ML_SERVICE_URL');
  if (!env.AI_PROVIDER) throw new Error('Production AI_PROVIDER must be explicitly selected.');
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_MODEL?.trim()) throw new Error('OPENAI_MODEL is required for the external provider.');
  // OPENAI_API_KEY belongs only to the ML service; do not require that secret in NestJS.
  const redis = url(env.REDIS_URL, 'REDIS_URL', ['redis:', 'rediss:']);
  if (redis.protocol === 'redis:' && !privateHost(redis.hostname)) throw new Error('Remote production Redis requires rediss TLS.');
  if (redis.password && placeholder.test(decodeURIComponent(redis.password))) throw new Error('Production REDIS_URL must not use a placeholder password.');
  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_BUCKET || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.S3_BUCKET)) throw new Error('Production S3_BUCKET is required and must be a valid bucket name.');
    if (!env.S3_ACCESS_KEY || placeholder.test(env.S3_ACCESS_KEY)) throw new Error('Production S3_ACCESS_KEY is required.');
    requireSecret(env, 'S3_SECRET_KEY', 16);
    if (env.S3_ENDPOINT) privateHttpUrl(env.S3_ENDPOINT, 'S3_ENDPOINT');
  } else if (env.STORAGE_DRIVER === 'local') {
    const storage = env.STORAGE_PATH || ''; const resolved = resolve(storage); const project = resolve(projectRoot());
    if (env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION !== 'true' || !isAbsolute(storage) || resolved === project || resolved.startsWith(project + sep) || resolved === dirname(resolved)) throw new Error('Production local storage requires explicit opt-in and an absolute private directory outside the application tree.');
  } else throw new Error('Production STORAGE_DRIVER must be explicitly selected.');
  if (!env.SMTP_HOST || placeholder.test(env.SMTP_HOST) || /^(localhost|127\.|::1$|mailpit$|mailhog$)/i.test(env.SMTP_HOST) || /\.(invalid|test|localhost)$/.test(env.SMTP_HOST)) throw new Error('Production SMTP_HOST must be a real mail service.');
  if (!env.SMTP_FROM || !/^[^\r\n]*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(env.SMTP_FROM)) throw new Error('Production SMTP_FROM requires a valid sender address.');
  const smtpPort = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error('SMTP_PORT must be in 1..65535.');
  if ((env.SMTP_SECURE && !['true', 'false'].includes(env.SMTP_SECURE)) || env.SMTP_REQUIRE_TLS === 'false') throw new Error('Production SMTP requires TLS; SMTP_SECURE must be true or false.');
  if (smtpPort === 465 && env.SMTP_SECURE !== 'true') throw new Error('SMTP port 465 requires SMTP_SECURE=true.');
  if (!!env.SMTP_USER !== !!env.SMTP_PASSWORD) throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together.');
  if (env.SMTP_PASSWORD && (placeholder.test(env.SMTP_PASSWORD) || /^SET_SMTP_/i.test(env.SMTP_PASSWORD))) throw new Error('Production SMTP_PASSWORD must not be a placeholder.');
}
