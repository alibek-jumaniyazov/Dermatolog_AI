import { access, readlink, realpath, symlink, rename, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { Client } from 'pg';
import { argument, preflight, splitEnvironment, readRuntimeEnvironment } from './production-preflight.mjs';
import { requireLinuxRoot, run } from './production-ops.mjs';

try {
  requireLinuxRoot();
  if (!process.argv.includes('--activate') || !process.argv.includes('--migration-reviewed')) throw new Error('Activation requires --activate --migration-reviewed on the selected server.');
  const values = await preflight(argument('--env') || '/etc/dermatologai/source.env');
  const release = await realpath(resolve(argument('--release') || '.'));
  if (!release.startsWith('/opt/dermatologai/releases' + sep) || !/^[a-zA-Z0-9._-]+$/.test(release.split(sep).at(-1))) throw new Error('Release must be an existing dedicated /opt/dermatologai/releases/<id> directory.');
  for (const path of ['apps/api/dist/main.js', 'apps/api/dist/worker.js', 'apps/web/dist/index.html', 'apps/web/dist/app-shell.html', 'apps/web/dist/404.html', 'services/ml/.venv/bin/python', 'apps/api/node_modules/prisma/build/index.js']) await access(resolve(release, path));
  await access('/etc/dermatologai/app.env'); await access('/etc/dermatologai/ml.env');
  const expected = splitEnvironment(values);
  for (const kind of ['app', 'ml']) {
    const actual = await readRuntimeEnvironment(`/etc/dermatologai/${kind}.env`);
    if ([...new Set([...Object.keys(actual), ...Object.keys(expected[kind])])].some(name => actual[name] !== expected[kind][name])) throw new Error(`${kind}.env differs from reviewed source configuration; regenerate/review without printing secrets.`);
  }
  const backup = argument('--backup');
  if (backup) await access(resolve(backup, 'COMPLETE'));
  else if (process.argv.includes('--first-deploy')) {
    const db = new Client({ connectionString: values.DATABASE_URL });
    try { await db.connect(); if ((await db.query(`SELECT to_regclass('public."User"') AS present`)).rows[0].present) throw new Error('Existing application data requires a completed backup before deployment.'); }
    finally { await db.end(); }
  } else throw new Error('Supply --backup <completed-snapshot> or --first-deploy for a verified empty database.');
  await writeFile('/var/lib/dermatologai/maintenance', 'Maintenance\n', { mode: 0o644 });
  await run('systemctl', ['stop', 'dermatologai-api', 'dermatologai-worker']);
  const previous = await readlink('/opt/dermatologai/current').catch(() => null);
  // Migration uses only its database secret, never provider or SMTP credentials.
  await run('runuser', ['-u', 'dermatologai', '--', '/usr/bin/node', resolve(release, 'apps/api/node_modules/prisma/build/index.js'), 'migrate', 'deploy', `--schema=${resolve(release, 'apps/api/prisma/schema.prisma')}`], { cwd: release, env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: values.DATABASE_URL } });
  const stagingLink = `/opt/dermatologai/current-next-${Date.now()}`;
  await symlink(release, stagingLink); await rename(stagingLink, '/opt/dermatologai/current');
  await run('systemctl', ['daemon-reload']);
  await run('systemctl', ['restart', 'dermatologai-ml', 'dermatologai-api', 'dermatologai-worker']);
  let ready = false;
  for (let n = 0; n < 30; n++) {
    ready = await Promise.all([3001, 8001].map(port => fetch(`http://127.0.0.1:${port}${port === 3001 ? '/api/v1' : ''}/health/ready`, { signal: AbortSignal.timeout(4000) }).then(async r => r.ok && (port === 3001 || (await r.json()).inferenceAvailable === true), () => false))).then(results => results.every(Boolean));
    if (ready) break; await setTimeout(2000);
  }
  if (!ready) throw new Error('Post-deploy readiness failed. Maintenance remains active; investigate or follow rollback runbook.');
  const capabilityResponse = await fetch('http://127.0.0.1:8001/capabilities', { headers: { 'X-Service-Token': values.ML_SERVICE_TOKEN }, signal: AbortSignal.timeout(5000) });
  const capabilities = capabilityResponse.ok ? await capabilityResponse.json() : {};
  if (capabilities.provider !== values.AI_PROVIDER || capabilities.modelStatus !== 'READY' || !(values.AI_PROVIDER === 'openai' ? capabilities.aiReview : capabilities.classification)) throw new Error('Runtime provider capability does not match reviewed deployment. Maintenance remains active.');
  await run('systemctl', ['is-active', 'dermatologai-worker']);
  await run('nginx', ['-t']); await run('systemctl', ['reload', 'nginx']);
  await rm('/var/lib/dermatologai/maintenance');
  console.log(`Native release activated: ${release}. Previous application path: ${previous || 'none'}. Run TLS/SEO/auth/SMTP smoke checks; clinical readiness is separate.`);
} catch (error) { console.error(error.code ? 'Deployment stopped; inspect restricted host logs. No automatic DB rollback; maintenance may remain active.' : error.message); process.exitCode = 1; }
