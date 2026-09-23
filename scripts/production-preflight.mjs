import { readFile, stat } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'dotenv';

export const argument = (name, args = process.argv.slice(2)) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
export async function readEnvironment(file) {
  const values = parse(await readFile(file, 'utf8'));
  if (Object.values(values).some(value => /[\r\n\0]/.test(value))) throw new Error('Multiline environment values are unsupported.');
  return values;
}
// Our generated EnvironmentFile format is deliberately narrower than general
// systemd syntax. dotenv's double-quote rules are different, so do not use it to
// re-read these runtime files during deployment consistency checks.
export function encodeRuntimeEnvironment(values) {
  return Object.entries(values).map(([name, value]) => {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name) || typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new Error('Unsupported runtime environment entry.');
    return `${name}="${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
  }).join('\n') + '\n';
}
export function parseRuntimeEnvironment(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    if (!line) continue;
    const match = /^([A-Z_][A-Z0-9_]*)="((?:[^"\\]|\\["\\])*)"$/.exec(line);
    if (!match || Object.hasOwn(values, match[1]) || /\0/.test(line)) throw new Error('Runtime env must use the exact generated systemd format; regenerate/review without printing secrets.');
    values[match[1]] = match[2].replace(/\\(["\\])/g, '$1');
  }
  return values;
}
export async function readRuntimeEnvironment(file) { return parseRuntimeEnvironment(await readFile(file, 'utf8')); }
export function splitEnvironment(values) {
  const mlKeys = ['AI_PROVIDER', 'OPENAI_MODEL', 'OPENAI_API_KEY', 'ML_SERVICE_TOKEN', 'ML_MODEL_MANIFEST', 'ML_TRUSTED_ARTIFACT_SHA256'];
  return {
    app: Object.fromEntries(Object.entries(values).filter(([key]) => !['OPENAI_API_KEY', 'ML_MODEL_MANIFEST', 'ML_TRUSTED_ARTIFACT_SHA256'].includes(key) && !key.startsWith('VITE_') && !key.startsWith('BACKUP_'))),
    ml: Object.fromEntries(mlKeys.map(key => [key, values[key] || ''])),
  };
}
const placeholder = value => !value || /GENERATE_|SET_|REPLACE|\.invalid|CHANGE_ME/i.test(value);
export function validateProduction(values, { template = false, root = process.cwd() } = {}) {
  const errors = [], add = (condition, text) => { if (!condition) errors.push(text); };
  add(values.NODE_ENV === 'production', 'NODE_ENV must be production.');
  add(values.HOST === '127.0.0.1', 'Native API HOST must be 127.0.0.1.');
  add(values.PORT === '3001', 'Native API PORT must be 3001.');
  add(values.APP_ORIGIN === 'https://dermatologai.uz', 'APP_ORIGIN must equal planned canonical origin https://dermatologai.uz.');
  add(values.VITE_SITE_URL === values.APP_ORIGIN, 'VITE_SITE_URL must match APP_ORIGIN.');
  add(['true', 'false'].includes(values.VITE_ALLOW_INDEXING), 'VITE_ALLOW_INDEXING must be explicit true/false.');
  add(values.TRUST_PROXY === '127.0.0.1/32,::1/128', 'Native TRUST_PROXY must trust only loopback.');
  add(['local', 's3'].includes(values.STORAGE_DRIVER), 'STORAGE_DRIVER must be local or s3.');
  add(['local', 'openai'].includes(values.AI_PROVIDER), 'AI_PROVIDER must be explicit local or openai.');
  add(Boolean(values.OPENAI_MODEL?.trim()), 'OPENAI_MODEL must be explicit (no implicit fallback).');
  const ttl = Number(values.TEMP_RETENTION_MINUTES);
  add(Number.isInteger(ttl) && ttl >= 1 && ttl <= 1440, 'TEMP_RETENTION_MINUTES must be 1..1440.');
  if (values.STORAGE_DRIVER === 'local') {
    add(values.ALLOW_LOCAL_STORAGE_IN_PRODUCTION === 'true', 'Local production storage requires explicit opt-in.');
    add(values.STORAGE_PATH === '/var/lib/dermatologai/storage', 'Native template requires private /var/lib/dermatologai/storage.');
  }
  if (template) return errors;
  for (const key of ['JWT_SECRET', 'ML_SERVICE_TOKEN']) add(!placeholder(values[key]) && values[key].length >= 32 && new Set(values[key]).size >= 8, `${key} must be a real diverse secret of at least 32 characters.`);
  add(values.JWT_SECRET !== values.ML_SERVICE_TOKEN, 'JWT and ML secrets must differ.');
  for (const [name, protocols, port] of [['DATABASE_URL', ['postgres:', 'postgresql:'], '5432'], ['REDIS_URL', ['redis:'], '6379']]) {
    try { const url = new URL(values[name]); add(protocols.includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), `${name} must use native loopback.`); add(!placeholder(url.password) && decodeURIComponent(url.password).length >= 16, `${name} requires a real password of at least 16 characters.`); add((url.port || port) === port, `${name} port does not match native template.`); }
    catch { errors.push(`${name} is not a valid URL.`); }
  }
  add(values.ML_SERVICE_URL === 'http://127.0.0.1:8001', 'ML_SERVICE_URL must match native private service.');
  if (values.AI_PROVIDER === 'openai') add(!placeholder(values.OPENAI_API_KEY), 'OPENAI_API_KEY must be set in the source/ML environment.');
  if (values.AI_PROVIDER === 'local') add(!placeholder(values.ML_MODEL_MANIFEST) && /^[a-f0-9]{64}(,[a-f0-9]{64})*$/.test(values.ML_TRUSTED_ARTIFACT_SHA256 || ''), 'Local inference requires a verified manifest and lowercase artifact allowlist.');
  if (values.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']) add(!placeholder(values[key]), `${key} is required for S3.`);
    add(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(values.S3_BUCKET || ''), 'S3_BUCKET must have a valid bucket name.');
    add((values.S3_SECRET_KEY || '').length >= 16 && new Set(values.S3_SECRET_KEY || '').size >= 8, 'S3 secret must be strong and at least16 characters.');
    if (values.S3_ENDPOINT) {
      try { const endpoint = new URL(values.S3_ENDPOINT); add(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)), 'Native preflight accepts HTTPS or loopback HTTP S3 endpoints.'); }
      catch { errors.push('Invalid S3_ENDPOINT.'); }
    }
  }
  add(!placeholder(values.SMTP_HOST) && !/localhost|mailpit|127\.0\.0\.1/i.test(values.SMTP_HOST), 'Real SMTP_HOST is required.');
  add(values.SMTP_REQUIRE_TLS === 'true', 'SMTP_REQUIRE_TLS must be true.');
  add((values.SMTP_PORT === '465' && values.SMTP_SECURE === 'true') || (values.SMTP_PORT === '587' && values.SMTP_SECURE === 'false'), 'Use SMTP465/TLS or SMTP587/STARTTLS.');
  add(!placeholder(values.SMTP_USER) && !placeholder(values.SMTP_PASSWORD), 'Native template requires real authenticated SMTP credentials.');
  add(/@dermatologai\.uz>?$/.test(values.SMTP_FROM || ''), 'SMTP_FROM must use the configured domain.');
  return errors;
}
export async function preflight(file, options = {}) {
  const values = await readEnvironment(file), errors = validateProduction(values, options);
  if (!options.template && process.platform !== 'win32') {
    const meta = await stat(file); if ((meta.mode & 0o077) !== 0) errors.push('Environment file must not be accessible to group/others (chmod600).');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return values;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const template = process.argv.includes('--template');
  const file = argument('--env') || (template ? '.env.production.example' : '/etc/dermatologai/source.env');
  try { await preflight(file, { template }); console.log(template ? 'Template structure PASS. Placeholders remain; deployment NOT ready.' : 'Production configuration PASS. DNS/TLS/SMTP connectivity and runtime gates still required.'); }
  catch (error) { console.error(`Preflight blocked:\n${error.message}`); process.exitCode = 1; }
}
