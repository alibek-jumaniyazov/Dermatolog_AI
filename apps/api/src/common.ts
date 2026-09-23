import { ArgumentsHost, Catch, ExceptionFilter, HttpException, SetMetadata, Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export type Principal = { id: string; sessionId: string; role: string };
export type AuthRequest = Request & { user: Principal; requestId: string };
export const Public = () => SetMetadata('public', true);
export const Admin = () => SetMetadata('admin', true);

export function fail(status: number, code: string, message: string, details?: unknown): never {
  throw new HttpException({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<AuthRequest>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    let error: Record<string, unknown> = { code: 'INTERNAL_ERROR', message: 'Server xatosi yuz berdi. Keyinroq qayta urinib ko‘ring.' };
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'object') error = body.error as Record<string, unknown>;
    else if (body && typeof body === 'object' && 'message' in body) error = { code: status === 400 ? 'VALIDATION_ERROR' : 'REQUEST_FAILED', message: Array.isArray(body.message) ? 'Kiritilgan ma’lumotni tekshiring.' : body.message, ...(Array.isArray(body.message) ? { details: body.message } : {}) };
    if (status === 500) console.error(JSON.stringify({ event: 'request_error', requestId: request.requestId, type: exception instanceof Error ? exception.name : 'UnknownError' }));
    response.status(status).json({ error: { ...error, requestId: request.requestId || randomUUID() } });
  }
}

@Injectable()
export class RateGuard implements CanActivate {
  private readonly buckets = new Map<string, { start: number; count: number }>();
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authentication = request.path.includes('/auth/');
    const key = `${request.ip}:${authentication ? 'auth' : 'api'}`;
    const now = Date.now();
    const period = authentication ? 60000 : 60000;
    const limit = authentication ? 30 : 240;
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.start > period) { bucket = { start: now, count: 0 }; this.buckets.set(key, bucket); }
    bucket.count++;
    if (this.buckets.size > 10000) for (const [entry, value] of this.buckets) if (now - value.start > period) this.buckets.delete(entry);
    if (bucket.count > limit) fail(429, 'RATE_LIMITED', 'So‘rovlar ko‘payib ketdi. Bir daqiqadan so‘ng qayta urinib ko‘ring.');
    return true;
  }
}
