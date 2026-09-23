import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpException } from '@nestjs/common';

export function configureHttpSecurity(app: NestExpressApplication) {
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.use(privateApiHeaders);
  // JSON questionnaire/auth payloads are small. Multipart uploads have separate limits.
  app.useBodyParser('json', { limit: '64kb', strict: true });
  // Sanitize before Nest turns a parser SyntaxError into BadRequestException;
  // otherwise its message can echo part of a private questionnaire into the response.
  app.use((error: { type?: string }, _req: Request, _res: Response, next: NextFunction) => {
    if (error.type === 'entity.parse.failed') return next(new HttpException({ error: { code: 'INVALID_JSON', message: 'JSON so‘rovi noto‘g‘ri tuzilgan.' } }, 400));
    if (error.type === 'entity.too.large') return next(new HttpException({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'So‘rov hajmi belgilangan limitdan oshdi.' } }, 413));
    next(error);
  });
  app.enableCors({ origin: config.origin, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'], exposedHeaders: ['X-Request-Id'] });
}

export function privateApiHeaders(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if ((origin && origin !== config.origin) || req.get('sec-fetch-site') === 'cross-site' || (!origin && req.cookies?.rd_refresh)) {
      res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'So‘rov manbasiga ruxsat berilmagan.', requestId: req.requestId } });
      return;
    }
  }
  next();
}
