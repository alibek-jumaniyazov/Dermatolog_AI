import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

export function projectRoot(): string {
  let candidate = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(candidate, '.env.example')) || existsSync(resolve(candidate, 'RAQAMLI_DERMATOLOG_MASTER_PROMPT.md'))) return candidate;
    const parent = dirname(candidate);
    if (candidate === parent) break;
    candidate = parent;
  }
  return process.cwd();
}
dotenv.config({ path: resolve(projectRoot(), '.env'), quiet: true });

export const config = {
  get production() { return process.env.NODE_ENV === 'production'; },
  get origin() { return process.env.APP_ORIGIN || 'http://localhost:5173'; },
  get jwtSecret() { return process.env.JWT_SECRET || ''; },
  get mlUrl() { return process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001'; },
  get mlToken() { return process.env.ML_SERVICE_TOKEN || ''; },
  get tempMinutes() { return Number(process.env.TEMP_RETENTION_MINUTES || 60); },
  get storagePath() { return resolve(projectRoot(), process.env.STORAGE_PATH || '.data/storage'); },
};

export function validateConfig(): void {
  if (config.jwtSecret.length < 32 || /CHANGE_ME|GENERATE_|development-secret/i.test(config.jwtSecret)) throw new Error('JWT_SECRET must be a unique secret of at least 32 characters.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!Number.isFinite(config.tempMinutes) || config.tempMinutes < 1 || config.tempMinutes > 1440) throw new Error('TEMP_RETENTION_MINUTES must be 1..1440.');
  if (config.production && !config.origin.startsWith('https://')) throw new Error('Production APP_ORIGIN requires HTTPS.');
  if (config.production && (process.env.STORAGE_DRIVER || 'local') !== 's3') throw new Error('Production requires private S3 storage.');
}
