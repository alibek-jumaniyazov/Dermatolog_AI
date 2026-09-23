import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { encryptStream, decryptFile, databaseConfig } from './production-ops.mjs';

const folder = await mkdtemp(join(tmpdir(), 'dermatolog-backup-test-'));
assert(resolve(folder).startsWith(resolve(tmpdir()) + sep + 'dermatolog-backup-test-'));
try {
  const data = Buffer.from('SYNTHETIC_TEST_ONLY\nUnicode: o‘zbekcha.\n'), key = randomBytes(32);
  await encryptStream(Readable.from([data]), join(folder, 'cipher.enc'), key);
  assert(!(await readFile(join(folder, 'cipher.enc'))).includes(data));
  await decryptFile(join(folder, 'cipher.enc'), join(folder, 'restored'), key);
  assert.deepEqual(await readFile(join(folder, 'restored')), data);
  const changed = await readFile(join(folder, 'cipher.enc')); changed[20] ^= 1;
  await writeFile(join(folder, 'tampered.enc'), changed);
  await assert.rejects(decryptFile(join(folder, 'tampered.enc'), join(folder, 'rejected'), key));
  await assert.rejects(decryptFile(join(folder, 'cipher.enc'), join(folder, 'wrong-key'), randomBytes(32)));
  assert.throws(() => databaseConfig({ DATABASE_URL: 'postgresql://name:pass@remote.example.com/db' }));
  assert.throws(() => databaseConfig({ DATABASE_URL: 'postgresql://name:pass@127.0.0.1/unsafe-db;drop' }));
  console.log('Backup encryption roundtrip/tamper/wrong-key and target guards PASS; no real database or user data accessed.');
} finally { await rm(folder, { recursive: true, force: true }); }
