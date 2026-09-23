import { Client } from 'pg';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, access, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { argument, readEnvironment } from './production-preflight.mjs';
import { requireLinuxRoot, run, secretKey, encryptStream, inside, databaseConfig, cleanupSql, keysSql, ledgerSql } from './production-ops.mjs';

let clone, cloneCreated = false, admin, client;
try {
  requireLinuxRoot();
  if (!process.argv.includes('--execute')) throw new Error('Use --execute only on the prepared target host.');
  const env = await readEnvironment(argument('--env') || '/etc/dermatologai/app.env');
  const key = await secretKey(argument('--key-file') || '/etc/dermatologai/backup.env');
  admin = databaseConfig(env);
  const base = resolve(argument('--directory') || '/var/backups/dermatologai');
  if (base !== '/var/backups/dermatologai' && !base.startsWith('/var/backups/dermatologai/')) throw new Error('Backup directory must be under /var/backups/dermatologai.');
  await mkdir(base, { recursive: true, mode: 0o700 });
  if ((await stat(base)).mode & 0o077) throw new Error('Backup directory must have mode0700.');
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  client = new Client({ connectionString: env.DATABASE_URL }); await client.connect();
  const ledger = { format: 1, capturedAt: new Date().toISOString(), records: (await client.query(ledgerSql)).rows };
  if (process.argv.includes('--ledger-only')) {
    await encryptStream(Readable.from([JSON.stringify(ledger)]), resolve(base, `ledger-${stamp}.enc`), key);
    console.log('Encrypted deletion ledger exported. No medical content or credentials printed.');
  } else {
    if (env.STORAGE_DRIVER !== 'local' || env.STORAGE_PATH !== '/var/lib/dermatologai/storage') throw new Error('This backup tool supports native private local storage only; use a separately tested S3 backup plan.');
    await access('/var/lib/dermatologai/maintenance');
    for (const service of ['dermatologai-api', 'dermatologai-worker']) {
      const state = await run('systemctl', ['show', '--property=ActiveState', '--value', service]);
      if (!['inactive', 'failed'].includes(state)) throw new Error('API and worker must be stopped in maintenance before a consistent snapshot.');
    }
    await client.end(); client = undefined;
    clone = `dermatologai_backup_${Date.now()}`;
    await run('runuser', ['-u', 'postgres', '--', 'createdb', ...admin.adminArgs, '--template', admin.name, clone]);
    cloneCreated = true;
    await run('runuser', ['-u', 'postgres', '--', 'psql', ...admin.adminArgs, '-d', clone, '-v', 'ON_ERROR_STOP=1', '-c', cleanupSql]);
    const keys = (await run('runuser', ['-u', 'postgres', '--', 'psql', ...admin.adminArgs, '-d', clone, '-At', '-c', keysSql])).split('\n').filter(Boolean);
    if (keys.some(name => !/^[a-f0-9-]+\.(jpg|png|pdf)$/.test(name))) throw new Error('Unexpected storage key; snapshot stopped.');
    const folder = resolve(base, `snapshot-${stamp}`); await mkdir(folder, { mode: 0o700 });
    const dump = spawn('runuser', ['-u', 'postgres', '--', 'pg_dump', ...admin.adminArgs, '-Fc', '--no-owner', '--no-acl', clone], { cwd: '/tmp', stdio: ['ignore', 'pipe', 'pipe'] });
    dump.stderr.resume();
    const done = new Promise((ok, fail) => { dump.on('error', () => fail(new Error('pg_dump unavailable.'))); dump.on('close', code => code === 0 ? ok() : fail(new Error('pg_dump failed.'))); });
    const [databaseHash] = await Promise.all([encryptStream(dump.stdout, resolve(folder, 'database.enc'), key), done]);
    const files = [];
    for (const name of keys) {
      const source = await inside(env.STORAGE_PATH, resolve(env.STORAGE_PATH, name));
      const sha256 = await encryptStream(createReadStream(source), resolve(folder, `${name}.enc`), key);
      files.push({ name, sha256 });
    }
    await encryptStream(Readable.from([JSON.stringify(ledger)]), resolve(folder, 'ledger.enc'), key);
    const manifest = { format: 1, createdAt: ledger.capturedAt, sourceDatabase: admin.name, databaseHash, files, temporaryDataExcluded: true, sessionsRevoked: true };
    await encryptStream(Readable.from([JSON.stringify(manifest)]), resolve(folder, 'manifest.enc'), key);
    await writeFile(resolve(folder, 'COMPLETE'), 'Encrypted retained-history snapshot. Restore drill still required.\n', { flag: 'wx', mode: 0o600 });
    console.log(`Backup complete: ${folder}; ${files.length} retained private objects. Services remain stopped; resume explicitly after checks.`);
  }
} catch (error) { console.error(error.code ? 'Backup failed; check protected host logs and permissions. Incomplete snapshots have no COMPLETE marker.' : error.message); process.exitCode = 1; }
finally {
  await client?.end().catch(() => {});
  if (cloneCreated && clone && admin) await run('runuser', ['-u', 'postgres', '--', 'dropdb', ...admin.adminArgs, '--if-exists', clone]).catch(() => { console.error('Temporary backup database cleanup failed; operator action required.'); process.exitCode = 1; });
}
