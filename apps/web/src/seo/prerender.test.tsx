import { describe, expect, it } from 'vitest';
import { renderPublicPage } from './prerender';
import { publicPages } from './config';

describe('Public prerendered content', () => {
  it('renders real accessible public content with JavaScript disabled', () => {
    for (const route of Object.keys(publicPages)) {
      const html = renderPublicPage(route);
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(html).toContain('id="main-content"');
      expect(html).toContain('href="/privacy"');
      expect(html).toContain('href="/consent"');
      expect(html).toContain('href="/limitations"');
      expect(html).not.toMatch(/<a[^>]*>\s*<button/);
      expect(html.length).toBeGreaterThan(1500);
    }
    expect(renderPublicPage('/')).toContain('Teringizni yaxshiroq');
    expect(renderPublicPage('/limitations')).toContain('Yakuniy tashxis emas');
  });
  it('cannot generate static copies of authenticated or unknown content', () => {
    for (const route of ['/app', '/app/history', '/admin', '/reset-password', '/unknown']) expect(() => renderPublicPage(route)).toThrow('Only public pages');
  });
});
