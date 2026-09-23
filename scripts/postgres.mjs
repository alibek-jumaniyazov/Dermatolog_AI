import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { root, run, win } from './env.mjs';

const data = path.join(root, '.data/postgres');
const bin = process.env.PG_BIN || '';
const exe = name => bin ? path.join(bin, name + (win ? '.exe' : '')) : name;
const url = new URL(process.env.DATABASE_URL || 'postgresql://derma@127.0.0.1:55439/dermatolog');
if (url.hostname !== '127.0.0.1' || Number(url.port) < 49152) throw new Error('Local helper only manages an isolated loopback cluster on a high port.');
const action = process.argv[2] || 'start';
if (!['start', 'stop'].includes(action)) throw new Error('Usage: node scripts/postgres.mjs start|stop');
const maintenanceUrl = new URL(url);
maintenanceUrl.pathname = '/postgres';
await fs.mkdir(path.join(root, '.data/logs'), { recursive: true });
if (action === 'stop') {
  await run(exe('pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w']);
} else {
  try { await fs.access(path.join(data, 'PG_VERSION')); }
  catch {
    const passwordFile = path.join(root, '.data/.pg-init-pass');
    await fs.writeFile(passwordFile, decodeURIComponent(url.password), { mode: 0o600 });
    try { await run(exe('initdb'), ['-D', data, '-U', decodeURIComponent(url.username), '--encoding=UTF8', '--locale=C', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', `--pwfile=${passwordFile}`]); }
    finally { await fs.rm(passwordFile, { force: true }); }
  }
  let running = false;
  const probe = new Client({ connectionString: maintenanceUrl.toString(), connectionTimeoutMillis: 1500 });
  try { await probe.connect(); running = true; } catch {} finally { await probe.end().catch(() => {}); }
  if (!running) await run(exe('pg_ctl'), ['-D', data, '-l', path.join(root, '.data/logs/postgres.log'), '-o', `-p ${url.port} -h 127.0.0.1`, '-w', '-t', '20', 'start']);
  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const result = await client.query("SELECT current_setting('data_directory') AS directory");
    const canonical = value => { const resolved = path.resolve(value).replaceAll('\\', '/'); return win ? resolved.toLowerCase() : resolved; };
    if (canonical(result.rows[0].directory) !== canonical(data)) throw new Error('The configured port belongs to a different PostgreSQL cluster. Choose another isolated port; no database was changed.');
    const database = url.pathname.slice(1);
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(database)) throw new Error('Invalid local database name.');
    if (!(await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rowCount) await client.query(`CREATE DATABASE "${database}"`);
  } finally { await client.end(); }
  console.log(`Izolyatsiyalangan PostgreSQL tayyor: 127.0.0.1:${url.port}`);
}
