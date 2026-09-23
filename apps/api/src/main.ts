import 'reflect-metadata';
import { config, projectRoot, validateConfig } from './config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common';
import { configureHttpSecurity } from './http-security';

async function bootstrap() {
  validateConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn', 'log'], bodyParser: false });
  app.setGlobalPrefix('api/v1');
  configureHttpSecurity(app);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  if (config.swaggerEnabled || process.env.EXPORT_OPENAPI === 'true') {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Raqamli Dermatolog API').setDescription('Owner-only screening prototype API; no clinical diagnosis.').setVersion('1.0').addBearerAuth().build());
    if (config.swaggerEnabled) SwaggerModule.setup('api/docs', app, document);
    if (process.env.EXPORT_OPENAPI === 'true') {
      const output = resolve(projectRoot(), 'apps/api/openapi.json'); await mkdir(resolve(projectRoot(), 'apps/api'), { recursive: true }); await writeFile(output, JSON.stringify(document, null, 2));
    }
  }
  const server = app.getHttpServer();
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;
  await app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1');
  console.log(JSON.stringify({ event: 'api_ready', port: Number(process.env.PORT || 3001), queueMode: process.env.REDIS_URL ? 'BULLMQ' : 'POSTGRES_LOCAL' }));
}
bootstrap().catch(error => { console.error(JSON.stringify({ event: 'startup_failed', reason: error instanceof Error ? error.message : 'unknown' })); process.exitCode = 1; });
