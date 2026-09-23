import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Controller, Get, Module, Post, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request } from 'express';
import { configureHttpSecurity } from '../src/http-security';
import { ApiExceptionFilter } from '../src/common';

@Controller()
class ProbeController {
  @Get('private') read(@Req() request: Request) { return { ip: request.ip }; }
  @Post('echo') write(@Req() request: Request) { return request.body; }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('Real HTTP security middleware (no database, mail or external AI)', () => {
  let app: NestExpressApplication; let base: string;
  beforeAll(async () => {
    vi.stubEnv('TRUST_PROXY', 'false'); vi.stubEnv('APP_ORIGIN', 'https://dermatologai.uz');
    app = await NestFactory.create<NestExpressApplication>(ProbeModule, { logger: false, bodyParser: false });
    configureHttpSecurity(app); app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); vi.unstubAllEnvs(); });
  it('sets noindex/no-store and ignores untrusted X-Forwarded-For', async () => {
    const response = await fetch(base + '/private', { headers: { 'X-Forwarded-For': '198.51.100.44' } });
    expect(response.status).toBe(200); expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(response.headers.get('Cache-Control')).toBe('no-store'); expect(response.headers.get('X-Request-Id')).toBeTruthy();
    expect((await response.json() as { ip: string }).ip).not.toBe('198.51.100.44');
  });
  it('uses a forwarded client only behind an explicitly trusted proxy', async () => {
    app.set('trust proxy', ['127.0.0.1/32', '::1/128']);
    try {
      const response = await fetch(base + '/private', { headers: { 'X-Forwarded-For': '198.51.100.44' } });
      expect((await response.json() as { ip: string }).ip).toBe('198.51.100.44');
    } finally { app.set('trust proxy', false); }
  });
  it('rejects cross-site mutation and refresh-cookie mutation without Origin', async () => {
    for (const headers of [{ Origin: 'https://untrusted.example' }, { Cookie: 'rd_refresh=unit-test-only' }]) {
      const response = await fetch(base + '/echo', { method: 'POST', headers });
      expect(response.status).toBe(403); expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
      expect((await response.json() as { error: { code: string } }).error.code).toBe('ORIGIN_REJECTED');
    }
  });
  it('allows a same-origin JSON request and returns bounded safe parser errors', async () => {
    const headers = { Origin: 'https://dermatologai.uz', 'Content-Type': 'application/json' };
    const success = await fetch(base + '/echo', { method: 'POST', headers, body: JSON.stringify({ duration: 'TWO_WEEKS' }) });
    expect(success.status).toBe(201); expect(await success.json()).toEqual({ duration: 'TWO_WEEKS' });
    const tooLarge = await fetch(base + '/echo', { method: 'POST', headers, body: JSON.stringify({ secret: 'x'.repeat(65536) }) });
    expect(tooLarge.status).toBe(413); expect((await tooLarge.json() as { error: { code: string } }).error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(tooLarge.headers.get('Cache-Control')).toBe('no-store');
    const malformed = await fetch(base + '/echo', { method: 'POST', headers, body: '{"private-note": invalid' });
    expect(malformed.status).toBe(400); const body = await malformed.text();
    expect(body).toContain('INVALID_JSON'); expect(body).not.toContain('private-note');
  });
});
