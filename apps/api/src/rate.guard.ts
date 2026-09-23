import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { fail } from './common';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateGuard implements CanActivate {
  constructor(private readonly limiter: RateLimitService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (request.method === 'GET' && /^\/api\/v1\/health\/(live|ready)$/.test(request.path)) return true;
    let result;
    try { result = await this.limiter.consume(request.ip || request.socket.remoteAddress || 'unknown', request.path.startsWith('/api/v1/auth/') ? 'auth' : 'api'); }
    catch { response.setHeader('Retry-After', '5'); fail(503, 'RATE_LIMIT_UNAVAILABLE', 'So‘rov nazorati vaqtincha ishlamayapti. Qayta urinib ko‘ring.'); }
    response.setHeader('RateLimit-Limit', String(result.limit));
    response.setHeader('RateLimit-Remaining', String(result.remaining));
    response.setHeader('RateLimit-Reset', String(result.retryAfterSeconds));
    if (!result.allowed) { response.setHeader('Retry-After', String(result.retryAfterSeconds)); fail(429, 'RATE_LIMITED', 'So‘rovlar ko‘payib ketdi. Birozdan so‘ng qayta urinib ko‘ring.'); }
    return true;
  }
}
