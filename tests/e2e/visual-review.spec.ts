// Playback only: TEST_REVIEW_ID must identify an existing completed local review.
// This test never creates an analysis, sends a photo to AI, or deletes data.
import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analysis } from '../../apps/web/src/lib/types';

const reviewId = process.env.TEST_REVIEW_ID;
const origin = process.env.TEST_WEB_URL || 'http://localhost:5173';
const local = new URL(origin);
const evidenceDirectory = path.resolve('.data/evidence');

// The review may contain a private photo. Only explicitly saved local evidence is kept.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('existing visual review shows API-grounded reasoning, next steps and PDF', async ({ page }, info) => {
  test.skip(!reviewId, 'Set TEST_REVIEW_ID to play back an existing review; CI must not trigger inference.');
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(local.hostname);
  expect(local.protocol).toBe('http:');
  expect(reviewId).toMatch(/^[a-f\d-]{36}$/i);
  const pageErrors: string[] = [];
  const forbiddenRequests: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const forbidden = request.method() === 'DELETE'
      || /\/(?:submit|infer)\/?$/.test(url.pathname)
      || url.hostname === 'api.openai.com';
    if (forbidden) {
      forbiddenRequests.push(`${request.method()} ${url.pathname}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  await page.goto('/login');
  await page.getByLabel('Email manzili', { exact: true }).fill('demo@dermatolog.test');
  await page.getByLabel('Parol', { exact: true }).fill('Demo2026!Teri');
  const loginResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Kirish/ }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const auth: { accessToken: string } = await loginResponse.json();

  try {
    await expect(page).toHaveURL(/\/app$/);
    const response = await page.request.get(`/api/v1/analyses/${reviewId}`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
    expect(response.ok()).toBeTruthy();
    const analysis: Analysis = await response.json();
    expect(analysis.processingStatus).toBe('FINISHED');
    expect(analysis.isDemo).not.toBe(true);
    expect(analysis.outcome).toBe('OBSERVATIONS_READY');
    expect(analysis.result?.analysisMode).toBe('VISUAL_DIFFERENTIAL');
    const result = analysis.result!;
    expect(result.differential?.length).toBeGreaterThan(0);
    expect(result.malignantProbability).toBeNull();
    expect(result.predictions.every(prediction => prediction.score === null)).toBeTruthy();
    const leading = result.differential![0];

    await page.goto(`/app/analyses/${reviewId}`);
    await expect(page.getByRole('heading', { name: 'Surat bo‘yicha AI tahlili', exact: true })).toBeVisible();
    await expect(page.getByText('AI tahlili tayyor', { exact: true })).toBeVisible();
    const primary = page.locator('.differential-primary');
    await expect(primary.getByRole('heading', { name: leading.condition, exact: true })).toBeVisible();
    for (const feature of leading.supportingFeatures) await expect(primary.getByText(feature, { exact: true })).toBeVisible();
    expect(leading.supportingFeatures.length).toBeGreaterThan(0);
    await expect(page.locator('.differential-alternative')).toHaveCount(result.differential!.length - 1);
    for (const [index, alternative] of result.differential!.slice(1).entries()) {
      const card = page.locator('.differential-alternative').nth(index);
      await expect(card.locator('summary')).toContainText(alternative.condition);
      await card.locator('summary').click();
      for (const feature of alternative.supportingFeatures) await expect(card.getByText(feature, { exact: true })).toBeVisible();
    }
    for (const step of result.nextSteps ?? []) await expect(page.locator('.next-steps-card').getByText(step, { exact: true })).toBeVisible();
    for (const question of result.followUpQuestions ?? []) await expect(page.locator('.follow-up-questions').getByText(question, { exact: true })).toBeVisible();
    await expect(page.locator('.next-steps-card li')).toHaveCount(result.nextSteps?.length ?? 0);
    await expect(page.locator('.follow-up-questions li')).toHaveCount(result.followUpQuestions?.length ?? 0);
    await expect(page.locator('.legacy-predictions')).toHaveCount(0);
    await expect(page.locator('.result-content .ant-progress')).toHaveCount(0);
    for (const code of result.uncertaintyReasons.filter(reason => /^[A-Z][A-Z0-9_]+$/.test(reason))) {
      await expect(page.locator('.result-content')).not.toContainText(code);
    }
    await expect(page.locator('.result-content')).not.toContainText(/(?:GENERAL_PURPOSE_VISION|NO_CALIBRATED_DISEASE|QUALITY_ASSESSMENT|USER_ROI_ANNOTATION)_/);
    await expect(page.locator('.result-image img')).toBeVisible();
    await expect.poll(() => page.locator('.result-image img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: path.join(evidenceDirectory, `visual-review-ui-${info.project.name}.png`), fullPage: true });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /PDF hisobotni yuklash/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const pdfPath = path.join(evidenceDirectory, `visual-review-ui-${info.project.name}.pdf`);
    await download.saveAs(pdfPath);
    const pdf = await readFile(pdfPath);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2_000);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
  } finally {
    // Cleanup must not hide the original UI assertion if the local host suspends.
    await page.request.post('/api/v1/auth/logout', { headers: { Origin: origin }, timeout: 5_000 }).catch(() => undefined);
  }
});
