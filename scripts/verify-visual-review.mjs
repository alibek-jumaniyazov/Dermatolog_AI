// Opt-in live test. The supplied photograph is uploaded to the local app and its configured AI provider.
import './env.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

if (process.env.ALLOW_LIVE_AI_TEST !== '1') throw new Error('Explicit opt-in required: ALLOW_LIVE_AI_TEST=1.');
const input = process.argv[2];
if (!input) throw new Error('Pass the authorized local image path. Do not include patient images in the repository.');
const base = 'http://127.0.0.1:3001/api/v1';
let token; let cookie;
async function call(route, method = 'GET', body, extra = {}) {
  const headers = { Origin: process.env.APP_ORIGIN || 'http://localhost:5173', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie && route.startsWith('/auth/')) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}, ${data.error?.code || 'request failed'}`);
  if (route === '/auth/login') cookie = response.headers.get('set-cookie')?.split(';')[0];
  return data;
}
try {
  const auth = await call('/auth/login', 'POST', { email: process.env.TEST_LOGIN_EMAIL || 'demo@dermatolog.test', password: process.env.TEST_LOGIN_PASSWORD || 'Demo2026!Teri' });
  token = auth.accessToken;
  const capabilities = await call('/capabilities');
  assert.equal(capabilities.provider, 'openai');
  assert.equal(capabilities.aiReview, true);
  const bytes = await readFile(path.resolve(input));
  const metadata = await sharp(bytes).metadata();
  const mime = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[metadata.format];
  assert.ok(mime, 'Supported image required');
  const place = await call('/cases', 'POST', { label: 'Surat bo‘yicha AI tekshiruvi', bodyLocation: 'Teri' });
  const analysis = await call('/analyses', 'POST', { caseId: place.id });
  console.log(JSON.stringify({ stage: 'created', analysisId: analysis.id }));
  await call('/me/consents', 'POST', { analysisId: analysis.id, processing: true, history: true, research: false, externalAi: true, policyVersion: '1.0' });
  const form = new FormData();
  // The user's diagnostic filename and claim are deliberately not sent to the model.
  form.append('images', new Blob([bytes], { type: mime }), `skin-photo.${metadata.format}`);
  await call(`/analyses/${analysis.id}/images`, 'POST', form);
  await call(`/analyses/${analysis.id}/quality-check`, 'POST');
  await call(`/analyses/${analysis.id}/symptoms`, 'PUT', { duration: 'UNKNOWN', itching: 'UNKNOWN', pain: 'UNKNOWN', bleeding: 'UNKNOWN', changing: 'UNKNOWN', asymmetry: 'UNKNOWN', border: 'UNKNOWN', color: 'UNKNOWN' });
  await call(`/analyses/${analysis.id}/submit`, 'POST', { acknowledgeWarnings: true }, { 'Idempotency-Key': randomUUID() });
  console.log(JSON.stringify({ stage: 'submitted', analysisId: analysis.id }));
  let current;
  const deadline = Date.now() + 130000;
  do {
    current = await call(`/analyses/${analysis.id}`);
    if (['FINISHED', 'FAILED', 'CANCELLED'].includes(current.processingStatus)) break;
    await new Promise(resolve => setTimeout(resolve, 1500));
  } while (Date.now() < deadline);
  await mkdir('.data/evidence', { recursive: true });
  await writeFile('.data/evidence/visual-review.json', JSON.stringify(current, null, 2));
  assert.equal(current.processingStatus, 'FINISHED', current.failureCode || 'Analysis did not finish');
  const result = current.result;
  assert.equal(result.pipelineVersion, 'openai-visual-review-v2');
  assert.equal(result.analysisMode, 'VISUAL_DIFFERENTIAL');
  assert.equal(result.riskLevel, 'NOT_ASSESSED');
  assert.equal(result.malignantProbability, null);
  assert.ok(result.predictions.every(item => item.score === null));
  assert.ok(result.summary.length > 30 && result.nextSteps.length > 0);
  const report = await call(`/analyses/${analysis.id}/report`, 'POST');
  const download = await fetch(`${base}/reports/${report.id}/download`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  assert.equal(download.status, 200);
  const pdf = Buffer.from(await download.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  await writeFile('.data/evidence/visual-review.pdf', pdf);
  console.log(JSON.stringify({ status: current.processingStatus, outcome: current.outcome, url: `http://localhost:5173/app/analyses/${analysis.id}`, quality: current.images[0].quality?.decision, summary: result.summary, differential: result.differential, nextSteps: result.nextSteps, pdfBytes: pdf.length, filenameSentToModel: false, providedDiagnosisSentToModel: false }, null, 2));
} finally {
  if (token) await call('/auth/logout', 'POST').catch(() => {});
}
