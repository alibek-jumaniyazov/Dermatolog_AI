import './env.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { Client } from 'pg';

// Local-only privacy checks. No /submit or external AI request is made.
const base = process.env.TEST_API_URL || 'http://127.0.0.1:3001/api/v1';
const mailpit = process.env.TEST_MAILPIT_URL || 'http://127.0.0.1:18025';
for (const url of [base, mailpit]) assert.match(url, /^http:\/\/(127\.0\.0\.1|localhost):/, 'Privacy runner only targets loopback services.');
assert.ok(['127.0.0.1', 'localhost'].includes(process.env.SMTP_HOST), 'SMTP must be local Mailpit; external mail is prohibited.');
assert.equal(process.env.STORAGE_DRIVER || 'local', 'local', 'Filesystem deletion verification requires local private storage.');
const suffix = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
const email = `privacy-${suffix}@example.invalid`;
const originalPassword = `Privacy-${crypto.randomBytes(18).toString('hex')}`;
let currentPassword = originalPassword;
let user;
let accessToken;
const mailIds = [];
let checks = 0;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

async function request(route, { method = 'GET', token = accessToken, body, cookie, origin = process.env.APP_ORIGIN || 'http://localhost:5173' } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, response };
}
function status(result, expected, label) {
  assert.ok([expected].flat().includes(result.status), `${label}: expected ${expected}, received ${result.status}`);
  checks++; console.log(`PASS ${label}`);
}
function check(condition, label) { assert.ok(condition, label); checks++; console.log(`PASS ${label}`); }
async function waitFor(fn, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await fn(); if (value) return value; await delay(300); }
  throw new Error('Local background operation did not finish within test timeout.');
}
async function awaitDeletion(receipt) {
  await waitFor(async () => {
    const response = await request(`/deletions/${receipt.id}`);
    statusOnce(response, 200);
    return response.data.status === 'COMPLETED';
  });
}
function statusOnce(response, expected) { assert.equal(response.status, expected, 'Deletion status must remain owner-accessible.'); }

try {
  const register = await request('/auth/register', { method: 'POST', token: null, body: { name: 'Privacy Integration Test', email, password: originalPassword } });
  status(register, [200, 201], 'privacy account registered');
  user = register.data.user; accessToken = register.data.accessToken;
  const originalToken = accessToken;
  const originalCookie = register.response.headers.get('set-cookie')?.split(';')[0];
  check(!!originalCookie, 'refresh cookie issued');
  check(/httponly/i.test(register.response.headers.get('set-cookie') || ''), 'refresh cookie HttpOnly');
  status(await request('/auth/refresh', { method: 'POST', token: null, cookie: originalCookie, origin: null }), 403, 'cookie mutation without Origin denied');

  status(await request('/auth/forgot-password', { method: 'POST', token: null, body: { email } }), [200, 201], 'password reset sent to local Mailpit');
  const mailId = await waitFor(async () => {
    const response = await fetch(`${mailpit}/api/v1/messages?limit=100`);
    assert.equal(response.status, 200, 'Mailpit list available');
    const messages = await response.json();
    return messages.messages?.find(message => message.To?.some(recipient => recipient.Address?.toLowerCase() === email))?.ID;
  });
  mailIds.push(mailId);
  const mail = await (await fetch(`${mailpit}/api/v1/message/${encodeURIComponent(mailId)}`)).json();
  const resetToken = /[?&]token=([A-Za-z0-9_-]+)/.exec(mail.Text || '')?.[1];
  check(!!resetToken, 'local reset email contains a usable link');
  const newPassword = `Updated-${crypto.randomBytes(18).toString('hex')}`;
  status(await request('/auth/reset-password', { method: 'POST', token: null, body: { token: resetToken, password: newPassword } }), [200, 201], 'reset token changes password');
  currentPassword = newPassword;
  status(await request('/auth/reset-password', { method: 'POST', token: null, body: { token: resetToken, password: originalPassword } }), 400, 'reset token is single use');
  status(await request('/me', { token: originalToken }), 401, 'reset revokes existing access session');
  status(await request('/auth/refresh', { method: 'POST', token: null, cookie: originalCookie }), 401, 'reset revokes existing refresh token');
  status(await request('/auth/login', { method: 'POST', token: null, body: { email, password: originalPassword } }), 401, 'old password is rejected');
  const login = await request('/auth/login', { method: 'POST', token: null, body: { email, password: currentPassword } });
  status(login, [200, 201], 'new password opens account'); accessToken = login.data.accessToken;

  const caseResponse = await request('/cases', { method: 'POST', body: { label: 'Privacy-only synthetic case', bodyLocation: 'TEST_ONLY' } });
  status(caseResponse, [200, 201], 'privacy case created');
  const analysisResponse = await request('/analyses', { method: 'POST', body: { caseId: caseResponse.data.id } });
  status(analysisResponse, [200, 201], 'privacy analysis created');
  const analysisId = analysisResponse.data.id;
  status(await request('/me/consents', { method: 'POST', body: { analysisId, processing: true, history: true, research: false, externalAi: false, policyVersion: '1.0' } }), [200, 201], 'storage consent remains independent of external AI');
  const png = await sharp(crypto.randomBytes(256 * 256 * 3), { raw: { width: 256, height: 256, channels: 3 } }).png().toBuffer();
  const form = new FormData(); form.append('images', new Blob([png], { type: 'image/png' }), 'privacy-synthetic.png');
  const upload = await request(`/analyses/${analysisId}/images`, { method: 'POST', body: form });
  status(upload, [200, 201], 'private synthetic upload stored');
  const imageId = upload.data.images[0].id;
  const stored = await db.query('SELECT i."storageKey" FROM "Image" i JOIN "Analysis" a ON a.id=i."analysisId" WHERE i.id=$1 AND a."userId"=$2', [imageId, user.id]);
  check(stored.rowCount === 1, 'test image belongs to test account');
  const storageRoot = path.resolve(process.env.STORAGE_PATH || '.data/storage');
  const objectPath = path.resolve(storageRoot, stored.rows[0].storageKey);
  check(objectPath.startsWith(storageRoot + path.sep), 'private object path remains in configured storage');
  await fs.access(objectPath); checks++; console.log('PASS private bytes exist before deletion');
  const deletion = await request(`/analyses/${analysisId}`, { method: 'DELETE' });
  status(deletion, [200, 201, 202], 'durable analysis deletion accepted');
  status(await request(`/assets/${imageId}/content`), 404, 'asset blocked immediately after deletion request');
  await awaitDeletion(deletion.data); checks++; console.log('PASS deletion receipt reaches completed');
  check((await db.query('SELECT id FROM "Image" WHERE id=$1', [imageId])).rowCount === 0, 'deleted image metadata physically removed');
  check((await db.query('SELECT id FROM "Analysis" WHERE id=$1 AND "userId"=$2', [analysisId, user.id])).rowCount === 0, 'deleted analysis physically removed');
  let removed = false; try { await fs.access(objectPath); } catch (error) { removed = error.code === 'ENOENT'; }
  check(removed, 'private image bytes physically removed');

  // Explicit TEST_ONLY fixture verifies PDF rendering independently of any paid model.
  const reportAnalysis = await request('/analyses', { method: 'POST', body: { caseId: caseResponse.data.id } });
  const reportId = reportAnalysis.data.id;
  await request('/me/consents', { method: 'POST', body: { analysisId: reportId, processing: true, history: true, research: false, externalAi: false, policyVersion: '1.0' } });
  const fixtureResult = { outcome: 'UNCERTAIN', predictions: [], riskLevel: 'NOT_ASSESSED', malignantProbability: null, uncertaintyReasons: ['TEST_ONLY'], recommendation: 'Dermatolog bilan maslahatlashish tavsiya etiladi.', modelVersion: 'TEST_ONLY', summary: 'Bu sintetik hisobot tekshiruvi. Haqiqiy tibbiy natija emas.', observations: [], limitations: ['Test natijasi; klinik xulosa mavjud emas.'] };
  await db.query('UPDATE "Analysis" SET status=$1,result=$2,symptoms=$3,"completedAt"=NOW() WHERE id=$4 AND "userId"=$5', ['FINISHED', fixtureResult, { duration: 'UNKNOWN', pain: 'NO', bleeding: 'UNKNOWN', notes: 'O‘zbekcha Unicode — o‘, g‘' }, reportId, user.id]);
  const report = await request(`/analyses/${reportId}/report`, { method: 'POST' });
  status(report, [200, 201], 'real PDF generated from isolated test fixture');
  const download = await request(`/reports/${report.data.id}/download`);
  status(download, 200, 'owner downloads PDF');
  check(download.data.subarray(0, 5).toString() === '%PDF-', 'download is a real PDF');
  check((download.data.toString('latin1').match(/\/Type \/Page\b/g) || []).length === 1, 'short report footer does not create a blank page');
  const evidenceDir = path.resolve('.data/evidence'); await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, 'privacy-report-test-only.pdf'), download.data);
  const reportDeletion = await request(`/analyses/${reportId}`, { method: 'DELETE' }); await awaitDeletion(reportDeletion.data);
  status(await request(`/reports/${report.data.id}/download`), 404, 'deleted report is inaccessible');
  console.log(`Privacy integration: ${checks} checks passed. No external email or image call was made. Idempotency live submission intentionally excluded to avoid paid provider calls.`);
} finally {
  if (user) {
    const login = await request('/auth/login', { method: 'POST', token: null, body: { email, password: currentPassword } }).catch(() => null);
    if (login?.data.accessToken) {
      const deleted = await request('/me', { method: 'DELETE', token: login.data.accessToken, body: { password: currentPassword } });
      assert.ok([200, 201, 202].includes(deleted.status), 'Test account cleanup accepted');
      await waitFor(async () => (await db.query('SELECT id FROM "User" WHERE id=$1 AND email=$2', [user.id, email])).rowCount === 0);
    }
  }
  if (mailIds.length) await fetch(`${mailpit}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: mailIds }) });
  await db.end();
}
