import { access } from 'node:fs/promises';

if (await access('/var/lib/dermatologai/maintenance').then(() => true, () => false)) {
  console.log('Maintenance active; readiness probe skipped.');
} else {
  const checks = await Promise.allSettled([
    fetch('http://127.0.0.1:3001/api/v1/health/ready', { signal: AbortSignal.timeout(8000) }).then(async response => { if (!response.ok) throw new Error('API_NOT_READY'); const body = await response.json(); if (body.status !== 'ready' && body.status !== 'ok') throw new Error('API_NOT_READY'); }),
    fetch('http://127.0.0.1:8001/health/ready', { signal: AbortSignal.timeout(8000) }).then(async response => { if (!response.ok || (await response.json()).inferenceAvailable !== true) throw new Error('ML_NOT_READY'); }),
  ]);
  const failed = checks.flatMap((check, index) => check.status === 'rejected' ? [index === 0 ? 'API_DB_STORAGE' : 'ML_SERVICE'] : []);
  console.log(JSON.stringify({ ready: !failed.length, failed }));
  if (failed.length) process.exitCode = 1;
}
