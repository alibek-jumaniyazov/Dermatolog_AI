import 'reflect-metadata';
import { validateConfig } from './config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

process.env.WORKER_ONLY = 'true';
async function bootstrap() {
  validateConfig();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  app.enableShutdownHooks();
  console.log(JSON.stringify({ event: 'worker_ready', queueMode: process.env.REDIS_URL ? 'BULLMQ' : 'POSTGRES_LOCAL' }));
  // Keep the dedicated worker alive without relying on an HTTP listener.
  setInterval(() => undefined, 60000);
}
bootstrap().catch(error => { console.error(JSON.stringify({ event: 'worker_start_failed', type: error instanceof Error ? error.name : 'unknown' })); process.exitCode = 1; });
