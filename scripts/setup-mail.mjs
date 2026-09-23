import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'dotenv';
import { root, run, win } from './env.mjs';
if (!win) throw new Error('Linux/macOS uchun Compose mailpit xizmati yoki SMTP_HOST ishlating.');
const dir = path.join(root, '.data/tools/mailpit');
await fs.mkdir(dir, { recursive: true });
const zip = path.join(root, '.data/tools/mailpit.zip');
const response = await fetch('https://github.com/axllent/mailpit/releases/download/v1.31.2/mailpit-windows-amd64.zip');
if (!response.ok) throw new Error(`Mailpit download HTTP ${response.status}`);
await fs.writeFile(zip, Buffer.from(await response.arrayBuffer()));
// Fixed task-owned paths; PowerShell literal paths avoid interpreting workspace punctuation.
const literal = s => "'" + s.replaceAll("'", "''") + "'";
await run('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${literal(zip)} -DestinationPath ${literal(dir)} -Force`]);
const envFile = path.join(root, '.env');
let env = await fs.readFile(envFile, 'utf8');
const settings = parse(env);
if (!settings.SMTP_HOST || ['127.0.0.1', 'localhost'].includes(settings.SMTP_HOST)) {
  env = env.replace(/^SMTP_HOST=.*$/m, 'SMTP_HOST=127.0.0.1').replace(/^SMTP_PORT=.*$/m, 'SMTP_PORT=11025');
  await fs.writeFile(envFile, env);
} else {
  console.log('Mavjud tashqi SMTP konfiguratsiyasi saqlandi; Mailpit avtomatik tanlanmadi.');
}
console.log('Mailpit lokal: SMTP11025, inbox http://127.0.0.1:18025.');
