import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { argument, preflight, splitEnvironment, encodeRuntimeEnvironment } from './production-preflight.mjs';

try {
  if (process.platform !== 'linux' || process.getuid?.() !== 0 || !process.argv.includes('--apply')) throw new Error('Run on the future Linux server as root with --apply.');
  const input = argument('--env') || '/etc/dermatologai/source.env';
  const destination = resolve(argument('--output') || '/etc/dermatologai');
  if (destination !== '/etc/dermatologai') throw new Error('Output must be /etc/dermatologai.');
  const values = await preflight(input);
  const { app, ml } = splitEnvironment(values);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  // Exclusive creation prevents accidental overwriting of live configuration.
  await writeFile(resolve(destination, 'app.env'), encodeRuntimeEnvironment(app), { flag: 'wx', mode: 0o600 });
  await writeFile(resolve(destination, 'ml.env'), encodeRuntimeEnvironment(ml), { flag: 'wx', mode: 0o600 });
  console.log('Created restricted app.env and ml.env; no secret values printed. Review existing files separately before rotation.');
} catch (error) { console.error(error.code ? 'Environment split failed; check paths/permissions or existing files.' : error.message); process.exitCode = 1; }
