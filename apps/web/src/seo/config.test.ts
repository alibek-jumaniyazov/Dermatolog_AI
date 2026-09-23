import { describe, expect, it } from 'vitest';
import { pageMetadata, publicOrigin, publicPages, renderSeoHead, resolveSeoConfig, robotsText, safeJson, sitemapXml, structuredData } from './config';

const origin = 'https://dermatologai.uz';
const live = resolveSeoConfig(origin, 'true', true);

describe('SEO publication boundaries', () => {
  it('requires a real HTTPS origin, a production build and explicit opt-in', () => {
    expect(live.indexable).toBe(true);
    expect(resolveSeoConfig(origin, 'false', true).indexable).toBe(false);
    expect(resolveSeoConfig(origin, undefined, true).indexable).toBe(false);
    expect(resolveSeoConfig(origin, 'true', false).indexable).toBe(false);
    for (const url of [undefined, '', 'http://dermatologai.uz', 'https://localhost', 'https://127.0.0.1', 'https://example.com', 'https://www.example.org', 'https://preview.test', 'https://user:pass@dermatologai.uz', 'https://dermatologai.uz/path', 'https://dermatologai.uz/?token=secret', 'https://dermatologai.uz:5173']) {
      expect(publicOrigin(url)).toBeNull();
      expect(resolveSeoConfig(url, 'true', true).indexable).toBe(false);
    }
    expect(publicOrigin(`${origin}/`)).toBe(origin);
  });
  it('publishes exactly four canonical public routes without query strings or fragments', () => {
    const titles = new Set();
    for (const [path, page] of Object.entries(publicPages)) {
      const meta = pageMetadata(`${path}?utm_source=test#details`, live);
      expect(meta.robots).toMatch(/^index,/);
      expect(meta.canonical).toBe(`${origin}${path}`);
      expect(page.description.length).toBeGreaterThan(80);
      titles.add(page.title);
    }
    expect(titles.size).toBe(4);
    expect(sitemapXml(live).match(/<loc>/g)).toHaveLength(4);
    expect(sitemapXml(live)).not.toMatch(/app|login|token|lastmod/);
    expect(robotsText(live)).toContain(`Sitemap: ${origin}/sitemap.xml`);
  });
  it('never publishes private, auth, API, reset-token or unknown routes', () => {
    for (const path of ['/login', '/register', '/forgot-password', '/reset-password?token=private', '/app', '/app/analyses/secret-id', '/admin', '/api/v1/assets/private/content', '/unknown', '/privacy/unknown']) {
      const meta = pageMetadata(path, live);
      expect(meta.robots).toMatch(/^noindex,/);
      expect(meta.canonical).toBeNull();
      expect(meta.image).toBeNull();
      const head = renderSeoHead(path, live);
      expect(head).not.toMatch(/canonical|og:|twitter:|application\/ld\+json|private|secret-id/);
    }
    expect(pageMetadata('/reset-password?token=private', live).title).toMatch(/^Yangi parol/);
    expect(pageMetadata('/unknown', live).description).toContain('topilmadi');
  });
  it('keeps staging out of robots and sitemap even when its canonical origin is known', () => {
    const staging = resolveSeoConfig(origin, 'false', true);
    expect(robotsText(staging)).toBe('User-agent: *\nDisallow: /\n');
    expect(sitemapXml(staging)).not.toContain('<loc>');
    expect(pageMetadata('/', staging).robots).toMatch(/^noindex,/);
    expect(pageMetadata('/', staging).canonical).toBe(`${origin}/`);
  });
  it('describes the real software without ratings, medical credentials or diagnosis claims', () => {
    const data = structuredData('/', live);
    expect(data).toMatchObject({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite' }, { '@type': 'SoftwareApplication' }] });
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|reviewCount|Physician|MedicalOrganization|offers/);
    expect(structuredData('/privacy', live)).toBeNull();
    expect(structuredData('/', { origin: null, indexable: false })).toBeNull();
  });
  it('escapes JSON-LD script boundaries and emits one complete canonical/social head', () => {
    expect(safeJson({ text: '</script><script>alert(1)</script>' })).not.toContain('<');
    const head = renderSeoHead('/privacy', live);
    expect(head.match(/rel="canonical"/g)).toHaveLength(1);
    expect(head).toContain(`${origin}/privacy`);
    expect(head).toContain('summary_large_image');
    expect(head).toContain(`${origin}/og-image.png`);
  });
});
