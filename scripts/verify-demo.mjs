// Requires the local demo seed. Never submits inference or deletes seeded/user data.
import './env.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { root } from './env.mjs';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:3001/api/v1';
const target = new URL(base);
assert.ok(target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'Demo verification only targets a local server.');
assert.equal(target.pathname.replace(/\/$/, ''), '/api/v1');
const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const accounts = [
  { email: 'demo@dermatolog.test', password: 'Demo2026!Teri', role: 'USER', minAnalyses: 12, minCases: 4 },
  { email: 'madina@dermatolog.test', password: 'Madina2026!Teri', role: 'USER', minAnalyses: 3, minCases: 2 },
  { email: 'admin@dermatolog.test', password: 'Admin2026!Teri', role: 'ADMIN', minAnalyses: 2, minCases: 2 },
];
const sessions = [];
const passed = [];
function check(condition, name) { assert.ok(condition, name); passed.push(name); console.log(`PASS ${name}`); }
async function request(route, { method = 'GET', session, body } = {}) {
  // Keep this verifier safe to rerun against a developer's populated database.
  assert.ok(method === 'GET' || (method === 'POST' && (/^\/auth\/(login|logout)$/.test(route) || /^\/analyses\/[a-f\d-]+\/report$/.test(route))), 'Only read, login/logout and demo-report routes are allowed.');
  const headers = { Origin: origin };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (session?.cookie) headers.Cookie = session.cookie;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(base.replace(/\/$/, '') + route, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000), redirect: 'error' });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, response };
}
function ok(response, name, statuses = [200]) { check(statuses.includes(response.status), `${name} (HTTP ${response.status})`); return response.data; }
async function list(route, session) {
  const items = []; let cursor; const seen = new Set();
  do {
    const params = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const response = await request(`${route}?${params}`, { session });
    const data = ok(response, `${route} page for ${session.user.email}`);
    assert.ok(Array.isArray(data.items)); items.push(...data.items); cursor = data.nextCursor;
    if (cursor) { assert.ok(!seen.has(cursor), 'Pagination must advance'); seen.add(cursor); }
    assert.ok(seen.size < 20, 'Demo verification pagination is bounded');
  } while (cursor);
  return items;
}
function honestResult(analysis) {
  check(analysis.isDemo === true, `demo flag ${analysis.id}`);
  if (!analysis.result) return;
  const result = analysis.result;
  check(result.isDemo === true && result.provider === 'demo', `explicit demo provenance ${analysis.id}`);
  check(result.riskLevel === 'NOT_ASSESSED' && result.malignantProbability === null, `no fabricated clinical risk ${analysis.id}`);
  check(!result.maskAssetId && !result.heatmapAssetId && !result.segmentationMask && !result.gradcam, `no fabricated mask/heatmap ${analysis.id}`);
  const predictions = [...(result.predictions || []), ...(result.imageResults || []).flatMap(item => item.predictions || [])];
  check(predictions.every(item => item.score === null && item.scoreType === 'NOT_CALIBRATED'), `no fabricated disease confidence ${analysis.id}`);
  check(/demo|namuna/i.test([result.summary, ...(result.limitations || [])].join(' ')), `visible demo wording ${analysis.id}`);
}
function pdfTitle(bytes) {
  const source = bytes.toString('latin1');
  const marker = /\/Title\s+(\d+)\s+0\s+R/.exec(source);
  const field = marker ? new RegExp(`\\b${marker[1]} 0 obj\\s*([\\s\\S]*?)endobj`).exec(source)?.[1] : /\/Title\s+([\s\S]*?)(?:\n|\/)/.exec(source)?.[1];
  assert.ok(field, 'PDF contains a Title field');
  const hex = /^\s*<([a-f\d\s]+)>/i.exec(field);
  let raw;
  if (hex) raw = Buffer.from(hex[1].replace(/\s/g, ''), 'hex');
  else {
    const literal = /^\s*\(((?:\\[0-7]{1,3}|\\[\s\S]|[^\\)])*)\)/.exec(field);
    assert.ok(literal, 'PDF title is a supported string');
    raw = Buffer.from(literal[1].replace(/\\([0-7]{1,3}|[\s\S])/g, (_, value) => /^[0-7]+$/.test(value) ? String.fromCharCode(parseInt(value, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[value] || value)), 'latin1');
  }
  if (raw[0] === 0xfe && raw[1] === 0xff) return raw.subarray(2).swap16().toString('utf16le');
  return raw.toString('utf8');
}

const evidenceDir = path.join(root, '.data', 'evidence');
try {
  for (const account of accounts) {
    const response = await request('/auth/login', { method: 'POST', body: { email: account.email, password: account.password } });
    const auth = ok(response, `login ${account.email}`, [200, 201]);
    check(auth.user.role === account.role && auth.user.isDemo === true && !!auth.accessToken, `role and demo identity ${account.email}`);
    const session = { token: auth.accessToken, cookie: response.response.headers.get('set-cookie')?.split(';')[0], user: auth.user };
    sessions.push(session);
    const profile = ok(await request('/me', { session }), `profile ${account.email}`);
    check(profile.id === auth.user.id && profile.isDemo === true, `profile identity ${account.email}`);
    session.analyses = (await list('/analyses', session)).filter(item => item.isDemo);
    session.cases = await list('/cases', session);
    check(session.analyses.length >= account.minAnalyses, `seeded history count ${account.email}`);
    check(new Set(session.analyses.map(item => item.caseId)).size >= account.minCases, `seeded case count ${account.email}`);
    for (const analysis of session.analyses) honestResult(analysis);
  }
  const [owner, other, admin] = sessions;
  const finished = owner.analyses.filter(item => item.processingStatus === 'FINISHED' && item.result && item.images.length);
  const left = finished.find(item => finished.some(second => second.id !== item.id && second.caseId === item.caseId));
  assert.ok(left, 'Two finished demo analyses in the same case are required.');
  const right = finished.find(item => item.id !== left.id && item.caseId === left.caseId);
  const different = owner.analyses.find(item => item.caseId !== left.caseId);
  assert.ok(different, 'Another demo case is required.');
  const caseData = ok(await request(`/cases/${left.caseId}`, { session: owner }), 'owner case detail');
  check(caseData.analyses.some(item => item.id === left.id), 'case timeline contains seeded analysis');
  ok(await request(`/analyses/${left.id}`, { session: owner }), 'owner finished result');
  for (const outsider of [other, admin]) {
    check(!outsider.analyses.some(item => owner.analyses.some(own => own.id === item.id)), `history owner isolation ${outsider.user.role}`);
    for (const route of [`/cases/${left.caseId}`, `/analyses/${left.id}`, `/assets/${left.images[0].id}/content`]) ok(await request(route, { session: outsider }), `private ${route} denied to ${outsider.user.role}`, [404]);
  }
  ok(await request(`/assets/${left.images[0].id}/content`), 'anonymous image denied', [401]);
  const image = await request(`/assets/${left.images[0].id}/content`, { session: owner }); ok(image, 'owner private image');
  check(image.response.headers.get('cache-control')?.includes('no-store'), 'private image never cached');
  const metadata = await sharp(image.data).metadata();
  check(metadata.width === left.images[0].width && metadata.height === left.images[0].height && image.data.length === left.images[0].byteSize, 'actual stored image bytes decode with declared dimensions');
  const comparison = ok(await request(`/cases/${left.caseId}/compare?left=${left.id}&right=${right.id}`, { session: owner }), 'same-case comparison');
  check(comparison.left.id === left.id && comparison.right.id === right.id && comparison.limitations.length > 0, 'comparison identity and limitations');
  ok(await request(`/cases/${left.caseId}/compare?left=${left.id}&right=${different.id}`, { session: owner }), 'cross-case comparison rejected', [400, 404]);
  for (const outsider of [other, admin]) ok(await request(`/cases/${left.caseId}/compare?left=${left.id}&right=${right.id}`, { session: outsider }), `comparison denied to ${outsider.user.role}`, [404]);
  for (const route of ['/admin/system', '/admin/models']) { ok(await request(route, { session: owner }), `user denied ${route}`, [403]); ok(await request(route, { session: admin }), `admin allowed ${route}`); }
  const report = ok(await request(`/analyses/${left.id}/report`, { method: 'POST', session: owner }), 'generate actual demo PDF', [200, 201]);
  check(report.status === 'READY', 'report ready');
  const pdf = await request(`/reports/${report.id}/download`, { session: owner }); ok(pdf, 'private PDF download');
  check(pdf.response.headers.get('content-type')?.includes('application/pdf') && pdf.data.subarray(0, 5).toString() === '%PDF-' && pdf.data.length > 2000, 'real PDF bytes');
  check(pdf.response.headers.get('cache-control')?.includes('no-store'), 'private PDF never cached');
  const title = pdfTitle(pdf.data); check(/demo|namuna/i.test(title), 'PDF title explicitly marks demo');
  for (const outsider of [other, admin]) ok(await request(`/reports/${report.id}/download`, { session: outsider }), `PDF owner isolation ${outsider.user.role}`, [404]);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, 'demo-report.pdf'), pdf.data);
  await writeFile(path.join(evidenceDir, 'demo-verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), checks: passed.length, providerCalls: 0, normalRecordsMutated: false, accounts: sessions.map(session => ({ email: session.user.email, role: session.user.role, seededAnalyses: session.analyses.length })), comparison: { caseId: left.caseId, left: left.id, right: right.id }, pdf: { bytes: pdf.data.length, title, demoMarkerCheck: 'PDF Title metadata' }, passed }, null, 2));
  console.log(`Demo verification: ${passed.length} checks passed. No inference, account deletion or normal-record changes.`);
} finally {
  for (const session of sessions) await request('/auth/logout', { method: 'POST', session }).catch(() => {});
}
