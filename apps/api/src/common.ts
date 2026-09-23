import { ArgumentsHost, Catch, ExceptionFilter, HttpException, SetMetadata } from '@nestjs/common';
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
    const parserError = exception && typeof exception === 'object' && 'type' in exception ? exception.type : null;
    const status = exception instanceof HttpException ? exception.getStatus() : parserError === 'entity.too.large' ? 413 : parserError === 'entity.parse.failed' ? 400 : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    let error: Record<string, unknown> = { code: 'INTERNAL_ERROR', message: 'Server xatosi yuz berdi. Keyinroq qayta urinib ko‘ring.' };
    if (parserError === 'entity.too.large') error = { code: 'PAYLOAD_TOO_LARGE', message: 'So‘rov hajmi belgilangan limitdan oshdi.' };
    if (parserError === 'entity.parse.failed') error = { code: 'INVALID_JSON', message: 'JSON so‘rovi noto‘g‘ri tuzilgan.' };
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'object') error = body.error as Record<string, unknown>;
    else if (body && typeof body === 'object' && 'message' in body) error = { code: status === 400 ? 'VALIDATION_ERROR' : 'REQUEST_FAILED', message: Array.isArray(body.message) ? 'Kiritilgan ma’lumotni tekshiring.' : body.message, ...(Array.isArray(body.message) ? { details: body.message } : {}) };
    if (status === 500) console.error(JSON.stringify({ event: 'request_error', requestId: request.requestId, type: exception instanceof Error ? exception.name : 'UnknownError' }));
    response.status(status).json({ error: { ...error, requestId: request.requestId || randomUUID() } });
  }
}
