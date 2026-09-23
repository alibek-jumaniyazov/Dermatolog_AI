// Requires the local demo seed. Kept separate from CI's unseeded app.spec.ts.
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type DemoAnalysis = { id: string; caseId: string; isDemo: boolean; createdAt: string; processingStatus: string; images: { id: string }[]; result: { isDemo: boolean; malignantProbability: number | null; predictions: { score: number | null }[] } | null };
const origin = process.env.TEST_WEB_URL || 'http://localhost:5173';
const local = new URL(origin);
test.beforeEach(async () => {
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(local.hostname);
  expect(local.protocol).toBe('http:');
});
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email manzili', { exact: true }).fill(email);
  await page.getByLabel('Parol', { exact: true }).fill(password);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Kirish/ }).click();
  const response = await responsePromise; expect(response.ok()).toBeTruthy();
  const auth = await response.json(); expect(auth.user.isDemo).toBe(true);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /Salom,/ })).toBeVisible();
  return auth;
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy(); }
async function logout(page: Page) { await page.request.post('/api/v1/auth/logout', { headers: { Origin: origin } }); }

test('seeded demo dashboard, history, result, PDF and same-case comparison', async ({ page }, info) => {
  const errors: string[] = []; const submissions: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/analyses\/[^/]+\/submit(?:\?|$)/.test(request.url())) submissions.push(request.url()); });
  const auth = await login(page, 'demo@dermatolog.test', 'Demo2026!Teri');
  try {
    expect(auth.user.role).toBe('USER');
    const response = await page.request.get('/api/v1/analyses?limit=100', { headers: { Authorization: `Bearer ${auth.accessToken}` } });
    expect(response.ok()).toBeTruthy();
    const analyses: DemoAnalysis[] = (await response.json()).items.filter((item: DemoAnalysis) => item.isDemo);
    expect(analyses.length).toBeGreaterThanOrEqual(12);
    const finished = analyses.filter(item => item.processingStatus === 'FINISHED' && item.result && item.images.length);
    const left = finished.find(item => finished.some(second => second.id !== item.id && second.caseId === item.caseId));
    expect(left).toBeTruthy();
    const right = finished.find(item => item.id !== left!.id && item.caseId === left!.caseId)!;
    expect(left!.result!.malignantProbability).toBeNull();
    expect(left!.result!.predictions.every(item => item.score === null)).toBeTruthy();
    await expect(page.locator('.analysis-row')).toHaveCount(5);
    await expect(page.getByText(/DEMO|NAMUNA/i).first()).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/demo-dashboard-${info.project.name}.png`, fullPage: true });
    await page.getByRole('link', { name: /Barchasi/ }).click();
    await expect(page.getByRole('heading', { name: 'Kuzatuvlar tarixi', exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.analysis-row').count()).toBeGreaterThanOrEqual(12);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/demo-history-${info.project.name}.png`, fullPage: true });
    await page.locator(`.analysis-row[href="/app/analyses/${left!.id}"]`).click();
    await expect(page.getByRole('button', { name: /PDF hisobotni yuklash/ })).toBeVisible();
    await expect(page.getByText(/DEMO|NAMUNA/i).first()).toBeVisible();
    await expect(page.locator('.result-content .ant-progress')).toHaveCount(0);
    await expect(page.locator('.result-content')).not.toContainText(/\d+(?:[.,]\d+)?\s*%/);
    await expect(page.locator('.result-image img')).toBeVisible();
    expect(await page.locator('.result-image img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/demo-result-${info.project.name}.png`, fullPage: true });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /PDF hisobotni yuklash/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const reportPath = info.outputPath(`demo-report-${info.project.name}.pdf`);
    await download.saveAs(reportPath);
    const bytes = await readFile(reportPath);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2000);
    await page.getByRole('link', { name: /Kuzatuv joyi va avvalgi suratlar/ }).click();
    await expect(page.getByRole('heading', { name: 'Kuzatuvlar vaqt chizig‘i' })).toBeVisible();
    await page.getByRole('link', { name: /Suratlarni taqqoslash/ }).click();
    await expect(page.getByText('Taqqoslash uchun ikkita kuzatuvni tanlang')).toBeVisible();
    for (const [index, analysis] of [left!, right].entries()) {
      const label = await page.evaluate(item => `${new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent' }).format(new Date(item.createdAt))} · ${item.id.slice(0, 6)}`, analysis);
      const select = page.locator('.compare-select .ant-select').nth(index);
      await select.click();
      const listId = await select.getByRole('combobox').getAttribute('aria-controls');
      expect(listId).toBeTruthy();
      // The previous popup can remain visible while its closing animation runs.
      const popup = page.locator('.ant-select-dropdown').filter({ has: page.locator(`[id="${listId}"]`) });
      await popup.getByTitle(label, { exact: true }).click();
    }
    await expect(page.locator('.compare-grid article')).toHaveCount(2);
    await expect(page.locator('.compare-grid img')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Ustma-ust solishtirish' })).toBeVisible();
    const url = new URL(page.url()); expect(url.searchParams.get('left')).toBe(left!.id); expect(url.searchParams.get('right')).toBe(right.id);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/demo-compare-${info.project.name}.png`, fullPage: true });
    // USER accounts must not enter the technical administrator screen.
    await page.goto('/admin'); await expect(page).toHaveURL(/\/app$/);
    expect(errors).toEqual([]); expect(submissions).toEqual([]);
  } finally { await logout(page); }
});

test('demo administrator can inspect service status without automatic patient access', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const auth = await login(page, 'admin@dermatolog.test', 'Admin2026!Teri');
  try {
    expect(auth.user.role).toBe('ADMIN');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Servis holati', exact: true })).toBeVisible();
    await expect(page.getByText('Texnik administrator', { exact: true })).toBeVisible();
    await expect(page.locator('.technical-data')).toHaveCount(2);
    await expect(page.locator('.technical-data').first()).toContainText('activeAnalyses');
    await expect(page.locator('.technical-data').last()).toContainText('modelStatus');
    await expect(page.locator('.admin-grid img')).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/demo-admin-${info.project.name}.png`, fullPage: true });
    expect(errors).toEqual([]);
  } finally { await logout(page); }
});
