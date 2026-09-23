import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, access, chown, chmod } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { argument, readEnvironment } from './production-preflight.mjs';
import { requireLinuxRoot, run, secretKey, decryptFile, databaseConfig, cleanupSql, keysSql } from './production-ops.mjs';

let client, work;
const hashFile = async path => { const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk); return hash.digest('hex'); };
try {
  requireLinuxRoot();
  if (!process.argv.includes('--confirm-isolated')) throw new Error('Restore only to a NEW isolated database/storage; pass --confirm-isolated after reviewing targets.');
  const values = await readEnvironment(argument('--env') || '/etc/dermatologai/restore.env');
  const target = databaseConfig(values);
  if (!/^dermatologai_restore_[a-z0-9_]+$/.test(target.name)) throw new Error('Restore database must start dermatologai_restore_; live database overwrite is prohibited.');
  const storage = resolve(values.STORAGE_PATH || '');
  if (!/^\/var\/lib\/dermatologai\/restore\/[a-z0-9_-]+\/storage$/.test(storage)) throw new Error('Restore storage must be a new /var/lib/dermatologai/restore/<id>/storage.');
  if (await access(dirname(storage)).then(() => true, () => false)) throw new Error('Restore target directory already exists; no overwrite allowed.');
  const snapshot = resolve(argument('--snapshot') || ''), ledgerFile = argument('--ledger');
  if (!ledgerFile) throw new Error('Pass a recent encrypted deletion ledger with --ledger; old snapshots must not resurrect deleted data.');
  await access(resolve(snapshot, 'COMPLETE'));
  const key = await secretKey(argument('--key-file') || '/etc/dermatologai/backup.env');
  work = await mkdtemp('/var/tmp/dermatologai-restore-'); await chmod(work, 0o700);
  await decryptFile(resolve(snapshot, 'manifest.enc'), resolve(work, 'manifest.json'), key);
  const manifest = JSON.parse(await readFile(resolve(work, 'manifest.json'), 'utf8'));
  if (manifest.format !== 1 || !manifest.temporaryDataExcluded || !Array.isArray(manifest.files) || !Number.isFinite(Date.parse(manifest.createdAt)) || Date.parse(manifest.createdAt) > Date.now() || Date.now() - Date.parse(manifest.createdAt) > 30 * 86400000) throw new Error('Unsupported or expired snapshot. Retention limit is 30 days.');
  await decryptFile(resolve(ledgerFile), resolve(work, 'ledger.json'), key);
  const ledger = JSON.parse(await readFile(resolve(work, 'ledger.json'), 'utf8'));
  if (ledger.format !== 1 || !Array.isArray(ledger.records) || !Number.isFinite(Date.parse(ledger.capturedAt)) || Date.parse(ledger.capturedAt) < Date.parse(manifest.createdAt) || Date.now() - Date.parse(ledger.capturedAt) > 86400000) throw new Error('Deletion ledger must be at least as recent as snapshot and captured within24h. Do not reopen stale restored data.');
  await decryptFile(resolve(snapshot, 'database.enc'), resolve(work, 'database.dump'), key);
  if (await hashFile(resolve(work, 'database.dump')) !== manifest.databaseHash) throw new Error('Database integrity mismatch.');
  await run('runuser', ['-u', 'postgres', '--', 'createdb', ...target.adminArgs, '--owner', target.user, target.name]);
  // Work contains authenticated plaintext only during restore, restricted to root/postgres.
  const postgresUid = Number(await run('id', ['-u', 'postgres'])), postgresGid = Number(await run('id', ['-g', 'postgres']));
  await chown(work, postgresUid, postgresGid); await chown(resolve(work, 'database.dump'), postgresUid, postgresGid);
  await run('runuser', ['-u', 'postgres', '--', 'pg_restore', ...target.adminArgs, '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--role', target.user, '-d', target.name, resolve(work, 'database.dump')]);
  client = new Client({ connectionString: values.DATABASE_URL }); await client.connect();
  await client.query('BEGIN');
  for (const row of ledger.records) {
    if (!/^[a-f0-9-]{36}$/i.test(row.id) || !/^[a-f0-9-]{36}$/i.test(row.userId) || !['ACCOUNT', 'MEDICAL_DATA', 'CASE', 'ANALYSIS'].includes(row.scope) || (['CASE', 'ANALYSIS'].includes(row.scope) && !/^[a-f0-9-]{36}$/i.test(row.targetId || '')) || !Number.isFinite(Date.parse(row.createdAt)) || Date.parse(row.createdAt) > Date.parse(ledger.capturedAt)) throw new Error('Invalid deletion ledger record.');
    if (row.scope === 'ACCOUNT') { await client.query('DELETE FROM "AuditEvent" WHERE "actorId"=$1', [row.userId]); await client.query('DELETE FROM "User" WHERE id=$1::uuid', [row.userId]); }
    else if (row.scope === 'MEDICAL_DATA') await client.query('DELETE FROM "Case" WHERE "userId"=$1::uuid AND "createdAt" <= $2::timestamptz', [row.userId, row.createdAt]);
    else if (row.scope === 'CASE') await client.query('DELETE FROM "Case" WHERE "userId"=$1::uuid AND id=$2::uuid', [row.userId, row.targetId]);
    else await client.query('DELETE FROM "Analysis" WHERE "userId"=$1::uuid AND id=$2::uuid', [row.userId, row.targetId]);
    // Persist replayed tombstones so future ledgers retain post-snapshot deletions.
    await client.query(`INSERT INTO "DeletionRequest" (id,"userId",scope,"targetId",status,"storageKeys",attempts,"createdAt","completedAt") VALUES ($1::uuid,$2::uuid,$3,$4,'COMPLETED','[]'::jsonb,0,$5::timestamptz,NOW()) ON CONFLICT (id) DO NOTHING`, [row.id, row.userId, row.scope, row.targetId || null, row.createdAt]);
  }
  await client.query(cleanupSql); await client.query('COMMIT');
  const keys = new Set((await client.query(keysSql)).rows.map(row => row.storageKey));
  await mkdir('/var/lib/dermatologai/restore', { recursive: true, mode: 0o755 });
  await mkdir(dirname(storage), { mode: 0o700 });
  await mkdir(storage, { mode: 0o700 });
  const uid = Number(await run('id', ['-u', 'dermatologai'])), gid = Number(await run('id', ['-g', 'dermatologai']));
  for (const name of keys) {
    if (!/^[a-f0-9-]+\.(jpg|png|pdf)$/.test(name)) throw new Error('Unsafe restored storage key.');
    const record = manifest.files.find(file => file.name === name); if (!record) throw new Error('Retained object missing from manifest.');
    const output = resolve(storage, name); await decryptFile(resolve(snapshot, `${name}.enc`), output, key);
    if (await hashFile(output) !== record.sha256) throw new Error('Private object integrity mismatch.');
    await chown(output, uid, gid);
  }
  await chown(dirname(storage), uid, gid); await chown(storage, uid, gid); await chmod(storage, 0o700);
  console.log(`Isolated restore complete: ${target.name}; ${keys.size} private objects. No services started, no traffic enabled. Validate ownership/deletion/consent before any manual promotion.`);
} catch (error) { console.error(error.code ? 'Restore stopped. Isolated partial DB/storage remains for diagnosis; live data was not overwritten.' : error.message); process.exitCode = 1; }
finally {
  await client?.end().catch(() => {});
  if (work && /^\/var\/tmp\/dermatologai-restore-[a-zA-Z0-9]+$/.test(work)) await rm(work, { recursive: true, force: true }).catch(() => { console.error('Restricted restore scratch cleanup failed.'); process.exitCode = 1; });
}
