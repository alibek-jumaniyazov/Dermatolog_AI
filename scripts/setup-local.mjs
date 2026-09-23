import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './env.mjs';

await fs.mkdir(path.join(root, '.data/logs'), { recursive: true });
await fs.mkdir(path.join(root, '.data/storage'), { recursive: true });
await fs.mkdir(path.join(root, 'ml/artifacts'), { recursive: true });
const target = path.join(root, '.env');
try {
  await fs.access(target);
  console.log('.env mavjud, o‘zgartirilmadi.');
} catch {
  const secret = () => crypto.randomBytes(32).toString('hex');
  const password = secret();
  const bundledPython = path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe').replaceAll('\\', '/');
  let env = await fs.readFile(path.join(root, '.env.example'), 'utf8');
  env = env.replace('CHANGE_ME', password).replace('GENERATE_A_UNIQUE_SECRET', secret()).replace('GENERATE_ANOTHER_UNIQUE_SECRET', secret()).replace('GENERATE_SERVICE_SECRET', secret()).replace('GENERATE_POSTGRES_PASSWORD', secret()).replace('GENERATE_S3_SECRET', secret());
  try { await fs.access(bundledPython); env = env.replace(/^PYTHON_BIN=$/m, `PYTHON_BIN=${bundledPython}`); } catch {}
  await fs.writeFile(target, env, { mode: 0o600, flag: 'wx' });
  console.log('Lokal .env noyob secretlar bilan yaratildi. Qiymatlar ekranga chiqarilmadi.');
}
console.log('Keyingi qadam: pnpm setup:ml, pnpm setup:mail, pnpm start:local');
