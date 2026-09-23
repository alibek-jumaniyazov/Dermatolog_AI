import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { validateProduction, readEnvironment, splitEnvironment, encodeRuntimeEnvironment, parseRuntimeEnvironment } from './production-preflight.mjs';

const sample = await readEnvironment('.env.production.example');
assert.deepEqual(validateProduction(sample, { template: true }), []);
assert(validateProduction(sample).length > 0, 'Placeholder production environment must fail closed.');
assert(validateProduction({ ...sample, VITE_SITE_URL: 'http://example.com' }, { template: true }).length);
assert(validateProduction({ ...sample, TRUST_PROXY: 'true' }, { template: true }).length);
assert(validateProduction({ ...sample, STORAGE_PATH: '/opt/dermatologai/current/public' }, { template: true }).length);
const split = splitEnvironment({ ...sample, BACKUP_KEY_HEX: 'synthetic-only', OPENAI_API_KEY: 'synthetic-only' });
assert(!('OPENAI_API_KEY' in split.app)); assert(!('BACKUP_KEY_HEX' in split.app)); assert(!('DATABASE_URL' in split.ml)); assert(!('SMTP_PASSWORD' in split.ml));
// Synthetic secrets only: generated systemd files must roundtrip without dotenv
// stripping whitespace/comments or leaving escaped quote/backslash characters.
const runtimeFixture = { SMTP_PASSWORD: ' leading "quoted" \\ path # literal $VALUE trailing ', SMTP_FROM: '"Dermatolog AI" <noreply@dermatologai.uz>', EMPTY: '', WINDOWS_STYLE: 'C:\\folder\\file', LITERAL_SLASH_N: '\\n', UNICODE: 'o‘zbekcha' };
const encoded = encodeRuntimeEnvironment(runtimeFixture);
assert.deepEqual(parseRuntimeEnvironment(encoded), runtimeFixture);
assert.deepEqual(parseRuntimeEnvironment(encoded.replaceAll('\n', '\r\n')), runtimeFixture);
assert.throws(() => parseRuntimeEnvironment('KEY="unsupported\\q"\n'));
assert.throws(() => parseRuntimeEnvironment('KEY="one"\nKEY="two"\n'));
assert.throws(() => encodeRuntimeEnvironment({ KEY: 'line\nsecond' }));
const proxy = await readFile('infra/native/nginx.https.conf', 'utf8');
assert(proxy.includes('proxy_set_header X-Forwarded-For $remote_addr;'), 'Proxy must replace spoofed client forwarding headers.');
assert(proxy.includes('try_files /app-shell.html =404;'));
assert(proxy.includes('error_page 404 /404.html;'));
assert(!proxy.includes('try_files $uri $uri/ /index.html'), 'Unknown URLs must not become soft404 landing pages.');
assert(proxy.includes('access_log off;'));
assert(proxy.includes('icon\\.svg'));
for (const line of proxy.split('\n').filter(line => line.includes('location ') && line.includes('add_header'))) assert(line.includes('include /etc/nginx/snippets/dermatologai-security.conf;'), 'Location headers must preserve shared security headers.');
for (const name of ['api', 'worker', 'ml']) {
  const unit = await readFile(`infra/native/dermatologai-${name}.service`, 'utf8');
  assert(unit.includes('User=dermatologai')); assert(unit.includes('NoNewPrivileges=true')); assert(unit.includes('ProtectSystem=strict'));
}
assert.equal(await access('compose.production.yaml').then(() => true, () => false), false, 'No new Docker production stack.');
console.log('Native production template/static regression PASS. Linux/systemd/Nginx/PostgreSQL runtime NOT tested by this command.');
