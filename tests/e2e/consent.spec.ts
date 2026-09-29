import { test, expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import sharp from 'sharp';

const origin = process.env.TEST_WEB_URL || 'http://localhost:5173';
const consentName = {
  processing: /Suratimni qayta ishlashga roziman/,
  history: /Kuzatuvni tariximga saqlash/,
  external: /OpenAI orqali AI kuzatuviga roziman/,
  research: /Kelajakdagi tadqiqotda foydalanish/,
};
type SavedConsent = { processing: boolean; history: boolean; research: boolean; externalAi: boolean };
type Draft = { id: string; processingStatus: string; expiresAt: string | null; consents: SavedConsent; images: { quality: { decision: string } | null }[] };

async function saveConsent(page: Page, expected: SavedConsent) {
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/me/consents' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Davom etish' }).click();
  const response = await saved;
  expect(response.ok(), 'Real API must persist the explicit consent selection').toBeTruthy();
  expect(await response.json()).toMatchObject(expected);
  await expect(page.getByRole('heading', { name: 'Bir joy. Bir necha rakurs.' })).toBeVisible();
}

async function startDraft(page: Page, label: string, extraConsent: boolean) {
  await page.goto('/app/analyses/new');
  await page.getByLabel('Kuzatuv nomi').fill(label);
  await page.getByLabel('Tanadagi joylashuvi').click();
  await page.getByTitle('Qo‘l', { exact: true }).click();
  await page.getByRole('checkbox', { name: consentName.processing }).check();
  await expect(page.getByRole('checkbox', { name: consentName.external })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: consentName.history })).not.toBeChecked();
  if (extraConsent) {
    await page.getByRole('checkbox', { name: consentName.external }).check();
    await page.getByRole('checkbox', { name: consentName.history }).check();
  }
  await saveConsent(page, { processing: true, externalAi: extraConsent, history: extraConsent, research: false });
  const id = new URL(page.url()).searchParams.get('draft');
  expect(id).toMatch(/^[a-f\d-]{36}$/);
  return id!;
}

async function reachReview(page: Page, id: string, buffer?: Buffer) {
  if (buffer) {
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-consent.png', mimeType: 'image/png', buffer });
    await page.getByRole('button', { name: '1 ta suratni yuborish' }).click();
    await expect(page.getByRole('button', { name: 'Surat sifatini tekshirish' })).toBeVisible();
    const checked = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/analyses/${id}` && response.request().method() === 'GET');
    await page.getByRole('button', { name: 'Surat sifatini tekshirish' }).click();
    const response = await checked;
    expect(response.ok()).toBeTruthy();
    const draft: Draft = await response.json();
    expect(draft.processingStatus).toBe('DRAFT');
    expect(draft.images).toHaveLength(1);
    expect(draft.images[0].quality?.decision).not.toBe('REJECT');
    await expect(page.locator('.image-quality')).toBeVisible();
  }
  await page.getByRole('checkbox', { name: 'Barcha suratlar tanamdagi bitta joyga tegishli.' }).check();
  await page.getByRole('button', { name: 'Savollarga o‘tish' }).click();
  await page.getByRole('button', { name: 'Davom etish' }).click();
  await expect(page.getByRole('heading', { name: 'Kuzatuvni boshlashga tayyormisiz?' })).toBeVisible();
  const qualityAcknowledgement = page.getByRole('checkbox', { name: /Surat sifati haqidagi cheklovlarni o‘qidim/ });
  if (await qualityAcknowledgement.count()) await qualityAcknowledgement.check();
}

test('first-create consent survives the draft race; missing consent can be granted from review without reload', async ({ page }, info) => {
  test.setTimeout(150_000);
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(origin).hostname);
  const email = `consent-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = `Consent-${crypto.randomBytes(16).toString('hex')}`;
  const registered = await page.request.post('/api/v1/auth/register', { data: { name: 'Consent Regression', email, password }, headers: { Origin: origin } });
  expect(registered.ok()).toBeTruthy();
  const forbiddenRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Only capability metadata is stubbed: upload, consent, quality and symptoms use the real API.
  await page.route('**/api/v1/capabilities', route => route.fulfill({ json: {
    classification: false, segmentation: false, quality: true, offlineInference: false,
    modelStatus: 'READY', message: 'Consent UI test metadata; inference is blocked.', classes: [], smtp: false,
    aiReview: true, externalAiRequired: true, provider: 'openai',
  } }));
  // Hold the real request briefly so the initial consent=false draft cache can settle.
  // This makes the first-create race reproducible without replacing persisted consent data.
  await page.route('**/api/v1/me/consents', async route => {
    if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.route(/\/analyses\/[^/]+\/submit(?:\?|$)|\/infer(?:\?|$)|api\.openai\.com/, async route => {
    forbiddenRequests.push(new URL(route.request().url()).pathname);
    await route.abort('blockedbyclient');
  });
  try {
    const buffer = await sharp(crypto.randomBytes(512 * 512 * 3), { raw: { width: 512, height: 512, channels: 3 } }).png().toBuffer();
    const grantedId = await startDraft(page, 'SYNTHETIC CONSENT GRANTED', true);
    await reachReview(page, grantedId, buffer);
    // The regression: the real server saved true, but the old local UI remained false.
    await expect(page.getByRole('button', { name: 'Tahlilni boshlash' })).toBeEnabled();
    await expect(page.getByText('Tashqi AI roziligi berilmagan', { exact: true })).toHaveCount(0);
    await expect(page.locator('.review-summary')).toContainText('Tarixga saqlash yoqilgan');
    await expect(page.locator('.expiry-note')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('consent-first-create.png'), fullPage: true });

    await page.reload();
    await expect(page.getByRole('checkbox', { name: consentName.processing })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.history })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.external })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.research })).not.toBeChecked();

    const pendingId = await startDraft(page, 'SYNTHETIC CONSENT NOT GRANTED', false);
    await reachReview(page, pendingId, buffer);
    await expect(page.getByRole('button', { name: 'Tahlilni boshlash' })).toBeDisabled();
    await expect(page.getByText('Tashqi AI roziligi berilmagan', { exact: true })).toBeVisible();
    await expect(page.locator('.review-summary')).toContainText('Vaqtinchalik tahlil — tarixda saqlanmaydi');
    await expect(page.locator('.expiry-note')).toBeVisible();
    await page.getByRole('button', { name: 'Rozilik bosqichiga qaytish' }).click();
    await expect(page.getByRole('checkbox', { name: consentName.processing })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.external })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.history })).not.toBeChecked();
    await page.getByRole('checkbox', { name: consentName.external }).check();
    await page.getByRole('checkbox', { name: consentName.history }).check();
    await saveConsent(page, { processing: true, externalAi: true, history: true, research: false });
    expect(new URL(page.url()).searchParams.get('draft')).toBe(pendingId);
    await reachReview(page, pendingId);
    await expect(page.getByRole('button', { name: 'Tahlilni boshlash' })).toBeEnabled();
    await expect(page.getByText('Tashqi AI roziligi berilmagan', { exact: true })).toHaveCount(0);
    await expect(page.locator('.review-summary')).toContainText('Tarixga saqlash yoqilgan');
    await expect(page.locator('.expiry-note')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: info.outputPath('consent-granted-from-review.png'), fullPage: true });
    await page.reload();
    await expect(page.getByRole('checkbox', { name: consentName.external })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: consentName.history })).toBeChecked();
    expect(forbiddenRequests, 'This test must never submit an analysis or call inference').toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    // Only the random account created by this test is removed, even after an assertion fails.
    const login = await page.request.post('/api/v1/auth/login', { data: { email, password }, headers: { Origin: origin } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).accessToken;
    const deleted = await page.request.delete('/api/v1/me', { data: { password }, headers: { Origin: origin, Authorization: `Bearer ${token}` } });
    expect([200, 201, 202]).toContain(deleted.status());
  }
});
