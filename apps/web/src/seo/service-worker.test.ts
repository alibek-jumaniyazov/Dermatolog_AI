import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function workerHarness(response = new Response('static', { headers: { 'Content-Type': 'application/javascript' } })) {
  const listeners: Record<string, (event: { request: Request; respondWith: (promise: Promise<Response>) => void }) => void> = {};
  const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  const fetch = vi.fn().mockResolvedValue(response);
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://dermatologai.uz' }, addEventListener: (name: string, listener: typeof listeners[string]) => { listeners[name] = listener; } },
    caches: { open: vi.fn().mockResolvedValue(cache) }, fetch, URL,
  });
  return { fetch: listeners.fetch, cache, network: fetch };
}

describe('Service worker privacy boundary', () => {
  it('never intercepts API, private pages, exports, medical assets or external requests for static caching', () => {
    const worker = workerHarness();
    for (const path of ['/api/v1/analyses', '/api/v1/assets/id/content', '/api/v1/analyses/id/report', '/app/history', '/admin', '/assets/medical-photo.jpg', 'https://external.invalid/app.js']) {
      const respondWith = vi.fn();
      worker.fetch({ request: new Request(path.startsWith('https:') ? path : `https://dermatologai.uz${path}`), respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
  it('does not cache a no-store static response or an HTML fallback', async () => {
    for (const headers of [{ 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' }, { 'Content-Type': 'text/html', 'Cache-Control': 'public' }]) {
      const worker = workerHarness(new Response('body', { headers }));
      let pending: Promise<Response> | undefined;
      worker.fetch({ request: new Request('https://dermatologai.uz/assets/index-test.js'), respondWith: promise => { pending = promise; } });
      await pending;
      expect(worker.network).toHaveBeenCalledOnce();
      expect(worker.cache.put).not.toHaveBeenCalled();
    }
  });
  it('can cache successful public fingerprinted JavaScript', async () => {
    const worker = workerHarness();
    let pending: Promise<Response> | undefined;
    worker.fetch({ request: new Request('https://dermatologai.uz/assets/index-test.js'), respondWith: promise => { pending = promise; } });
    await pending;
    expect(worker.cache.put).toHaveBeenCalledOnce();
  });
});
