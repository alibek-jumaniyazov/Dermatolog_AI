import 'reflect-metadata';
import { config, projectRoot, validateConfig } from './config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common';

async function bootstrap() {
  validateConfig();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'], bodyParser: true });
  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    req.requestId = randomUUID(); res.setHeader('X-Request-Id', req.requestId); res.setHeader('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if ((origin && origin !== config.origin) || req.get('sec-fetch-site') === 'cross-site' || (!origin && req.cookies?.rd_refresh)) {
        res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'So‘rov manbasiga ruxsat berilmagan.', requestId: req.requestId } }); return;
      }
    }
    next();
  });
  app.enableCors({ origin: config.origin, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'], exposedHeaders: ['X-Request-Id'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Raqamli Dermatolog API').setDescription('Owner-only screening prototype API; no clinical diagnosis.').setVersion('1.0').addBearerAuth().build());
  SwaggerModule.setup('api/docs', app, document);
  if (process.env.EXPORT_OPENAPI === 'true') {
    const output = resolve(projectRoot(), 'apps/api/openapi.json'); await mkdir(resolve(projectRoot(), 'apps/api'), { recursive: true }); await writeFile(output, JSON.stringify(document, null, 2));
  }
  await app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1');
  console.log(JSON.stringify({ event: 'api_ready', port: Number(process.env.PORT || 3001), queueMode: process.env.REDIS_URL ? 'BULLMQ' : 'POSTGRES_LOCAL' }));
}
bootstrap().catch(error => { console.error(JSON.stringify({ event: 'startup_failed', reason: error instanceof Error ? error.message : 'unknown' })); process.exitCode = 1; });
