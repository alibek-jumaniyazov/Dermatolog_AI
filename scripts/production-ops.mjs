import { spawn } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { readEnvironment } from './production-preflight.mjs';

export function requireLinuxRoot() { if (process.platform !== 'linux' || process.getuid?.() !== 0) throw new Error('This operation is restricted to the future Linux host, run as root.'); }
export function run(command, args, options = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(command, args, { cwd: '/tmp', stdio: ['ignore', 'pipe', 'pipe'], ...options });
    const output = []; child.stdout?.on('data', part => output.push(part)); child.stderr?.resume();
    child.once('error', () => fail(new Error(`Required command unavailable: ${command}`)));
    child.once('close', code => code === 0 ? ok(Buffer.concat(output).toString().trim()) : fail(new Error(`${command} failed; operation stopped. Review restricted host logs.`)));
  });
}
export async function secretKey(file) {
  const data = await readEnvironment(file), meta = await stat(file);
  if ((meta.mode & 0o077) !== 0 || !/^[a-f0-9]{64}$/i.test(data.BACKUP_KEY_HEX || '')) throw new Error('Backup key must be 64 hex characters in a mode0600 file.');
  return Buffer.from(data.BACKUP_KEY_HEX, 'hex');
}
export async function encryptStream(stream, file, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv), hash = createHash('sha256');
  const tap = new Transform({ transform(chunk, encoding, callback) { hash.update(chunk); callback(null, chunk); } });
  const handle = await open(file, 'wx', 0o600);
  try { await handle.write(Buffer.concat([Buffer.from('RDBK1'), iv])); } finally { await handle.close(); }
  await pipeline(stream, tap, cipher, createWriteStream(file, { flags: 'a' }));
  const append = await open(file, 'a'); try { await append.write(cipher.getAuthTag()); } finally { await append.close(); }
  return hash.digest('hex');
}
export async function decryptFile(file, output, key) {
  const meta = await stat(file); if (meta.size < 33) throw new Error('Encrypted backup is truncated.');
  const handle = await open(file, 'r'), header = Buffer.alloc(17), tag = Buffer.alloc(16);
  try { await handle.read(header, 0, 17, 0); await handle.read(tag, 0, 16, meta.size - 16); } finally { await handle.close(); }
  if (header.subarray(0, 5).toString() !== 'RDBK1') throw new Error('Unsupported backup format.');
  const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(5)); decipher.setAuthTag(tag);
  // The caller must not consume output until pipeline authenticates the final GCM tag.
  await pipeline(createReadStream(file, { start: 17, end: meta.size - 17 }), decipher, createWriteStream(output, { flags: 'wx', mode: 0o600 }));
}
export async function inside(directory, file) {
  const base = await realpath(directory), target = await realpath(file);
  if (!target.startsWith(base + sep)) throw new Error('File escapes its approved directory.');
  return target;
}
export function databaseConfig(values) {
  const url = new URL(values.DATABASE_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Native backup supports only a loopback PostgreSQL database.');
  const name = url.pathname.slice(1), user = decodeURIComponent(url.username);
  if (!/^[a-z][a-z0-9_]{0,55}$/.test(name) || !/^[a-z][a-z0-9_]{0,55}$/.test(user)) throw new Error('Database/user name is outside supported safe format.');
  return { url, name, user, adminArgs: ['--host=/var/run/postgresql', `--port=${url.port || '5432'}`] };
}
export const cleanupSql = `
DELETE FROM "Analysis" WHERE "historyConsent" = false OR "processingConsent" = false OR "deletedAt" IS NOT NULL OR ("expiresAt" IS NOT NULL AND "expiresAt" <= NOW());
DELETE FROM "Case" WHERE "deletedAt" IS NOT NULL OR ("retained" = false AND NOT EXISTS (SELECT 1 FROM "Analysis" WHERE "Analysis"."caseId" = "Case".id));
DELETE FROM "User" WHERE "deletedAt" IS NOT NULL OR "isDemo" = true;
DELETE FROM "Session"; DELETE FROM "ResetToken"; DELETE FROM "AnalysisJob"; DELETE FROM "SubmissionRequest";
UPDATE "Analysis" SET status='FAILED', "errorCode"='RESTORED_REQUIRES_REVIEW', "errorMessage"='Tiklangan tahlilni qayta yuborishdan oldin tekshiring.' WHERE status IN ('QUEUED','RUNNING');
DELETE FROM "AuditEvent" WHERE "createdAt" < NOW() - INTERVAL '30 days';
UPDATE "DeletionRequest" SET "storageKeys"='[]'::jsonb, status='COMPLETED', "completedAt"=COALESCE("completedAt",NOW()) WHERE status <> 'COMPLETED';
`;
export const keysSql = `SELECT "storageKey" FROM "Image" UNION SELECT "storageKey" FROM "Artifact" ORDER BY 1`;
export const ledgerSql = `SELECT id, "userId", scope, "targetId", "createdAt" FROM "DeletionRequest" ORDER BY "createdAt"`;
