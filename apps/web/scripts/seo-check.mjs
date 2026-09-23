import assert from 'node:assert/strict';
import { readFile, access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const build = JSON.parse(await readFile(path.join(dist, 'seo-build.json'), 'utf8'));
const read = file => readFile(path.join(dist, file), 'utf8');
const titles = new Set();
for (const route of build.publicRoutes) {
  const html = await read(route === '/' ? 'index.html' : `${route.slice(1)}/index.html`);
  const head = html.split('</head>')[0];
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${route}: static h1`);
  assert(html.includes('id="main-content"'), `${route}: real static content`);
  assert(html.includes('<html lang="uz">'), `${route}: Uzbek language`);
  assert(!head.includes('localhost') && !head.includes('example.com'), `${route}: no placeholder URLs`);
  titles.add(head.match(/<title[^>]*>(.*?)<\/title>/)?.[1]);
  assert(head.includes(`name="robots" content="${build.indexable ? 'index, follow' : 'noindex, nofollow'}`), `${route}: indexing opt-in`);
  if (build.origin) {
    assert(head.includes(`rel="canonical" href="${build.origin}${route}"`), `${route}: canonical`);
    assert(head.includes(`property="og:image" content="${build.origin}/og-image.png"`), `${route}: social card`);
  } else assert(!head.includes('rel="canonical"'), `${route}: no invented origin`);
  assert(html.includes('href="/privacy"') && html.includes('href="/consent"') && html.includes('href="/limitations"'), `${route}: crawlable public links`);
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) await access(path.join(dist, asset.slice(1)));
}
assert.equal(titles.size, 4, 'public titles must be unique');
for (const file of ['app-shell.html', '404.html']) {
  const html = await read(file);
  assert(html.includes('name="robots" content="noindex, nofollow'), `${file}: initial noindex`);
  assert(!html.includes('rel="canonical"') && !html.includes('application/ld+json') && !html.includes('og:url'), `${file}: no public metadata leakage`);
  assert(!html.includes('Teringizni yaxshiroq'), `${file}: must not fall back to the public landing HTML`);
}
assert((await read('offline.html')).includes('name="robots" content="noindex'), 'offline page noindex');
const sitemap = await read('sitemap.xml');
assert.equal((sitemap.match(/<loc>/g) || []).length, build.indexable ? 4 : 0, 'sitemap only contains opted-in public URLs');
const robots = await read('robots.txt');
assert(build.indexable ? robots.includes(`Sitemap: ${build.origin}/sitemap.xml`) : robots.trim() === 'User-agent: *\nDisallow: /', 'robots safe defaults');
const card = await sharp(path.join(dist, 'og-image.png')).metadata();
assert.equal(card.width, 1200); assert.equal(card.height, 630); assert.equal(card.format, 'png');
console.log('SEO artifact checks passed: 4 static public pages, private/404 noindex, sitemap, robots, assets and social card.');

if (process.argv.includes('--browser')) {
  const { preview } = await import('vite');
  const { chromium } = await import('@playwright/test');
  const server = await preview({ root, configFile: path.join(root, 'vite.config.ts'), preview: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
  const port = server.httpServer.address().port;
  const base = `http://127.0.0.1:${port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const blockExternal = context => context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === base && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
    });
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    await blockExternal(noJs);
    const plain = await noJs.newPage();
    for (const route of build.publicRoutes) {
      const response = await plain.goto(`${base}${route}`);
      assert.equal(response.status(), 200);
      assert.equal(await plain.locator('main h1').count(), 1);
      assert((await plain.locator('main').innerText()).length > 400, `${route}: visible without JS`);
      assert.equal(await plain.locator('head link[rel=canonical]').count(), build.origin ? 1 : 0);
    }
    for (const route of ['/login', '/reset-password?token=private-test', '/app/analyses/private-test', '/admin', '/not-found-seo']) {
      const response = await plain.goto(`${base}${route}`);
      assert.equal(response.status(), route === '/not-found-seo' ? 404 : 200);
      assert((await plain.locator('head meta[name=robots]').getAttribute('content')).includes('noindex'));
      assert.equal(await plain.locator('head link[rel=canonical]').count(), 0);
    }
    await noJs.close();
    const context = await browser.newContext();
    await blockExternal(context);
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('main h1').waitFor();
    await page.locator('.landing-footer a[href="/privacy"]').click();
    await page.waitForURL('**/privacy');
    await page.waitForFunction(() => document.title.startsWith('Maxfiylik siyosati'));
    assert.equal(await page.locator('head meta[name=description]').count(), 1);
    assert.equal(await page.locator('head link[rel=canonical]').count(), build.origin ? 1 : 0);
    await page.locator('.policy-links a[href="/consent"]').click();
    await page.waitForFunction(() => document.title.startsWith('Rozilik shartlari'));
    await page.locator('header .brand').click();
    await page.waitForURL(base + '/');
    await page.locator('.landing-nav a[href="/login"]').click();
    await page.waitForFunction(() => document.title.startsWith('Hisobga kirish'));
    assert.equal(await page.locator('head link[rel=canonical]').count(), 0);
    assert.equal(await page.locator('head script[type="application/ld+json"]').count(), 0);
    assert((await page.locator('head meta[name=robots]').getAttribute('content')).includes('noindex'));
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base);
      await page.locator('main h1').waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `no horizontal overflow at ${width}px`);
      if (process.argv.includes('--screenshots')) {
        const evidence = fileURLToPath(new URL('../../../.data/evidence/seo/', import.meta.url));
        await mkdir(evidence, { recursive: true });
        await page.screenshot({ path: path.join(evidence, `landing-${width}.png`), fullPage: true });
      }
    }
    await context.close();
    console.log('SEO browser checks passed: JavaScript-free public content, private/404 initial HTML, SPA metadata replacement, desktop/mobile overflow.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
}
