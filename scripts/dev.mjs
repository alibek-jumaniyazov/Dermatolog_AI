import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { root, pythonPath } from './env.mjs';

const children = [];
function start(name, command, args) {
  const child = spawn(command, args, { cwd: root, env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => process.stdout.write(`[${name}] ${data}`));
  child.on('error', error => { console.error(`${name}: ${error.message}`); process.exitCode = 1; stop(); });
  child.on('exit', code => { if (!stopping) { console.error(`${name} kutilmaganda to‘xtadi (${code}).`); process.exitCode = 1; stop(); } });
}
let stopping = false;
function stop() { stopping = true; for (const child of children) child.kill(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const apiEntry = path.join(root, 'apps/api/dist/main.js');
if (!fs.existsSync(apiEntry)) throw new Error('Avval pnpm build bajaring.');
start('ML', pythonPath(), ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'services/ml', '--host', '127.0.0.1', '--port', '8001', '--no-access-log']);
start('API', process.execPath, [apiEntry]);
const mailpit = path.join(root, '.data/tools/mailpit/mailpit' + (process.platform === 'win32' ? '.exe' : ''));
if (fs.existsSync(mailpit)) start('MAIL', mailpit, ['--listen', '127.0.0.1:18025', '--smtp', '127.0.0.1:11025']);
start('WEB', process.execPath, ['apps/web/node_modules/vite/bin/vite.js', 'apps/web', '--config', 'apps/web/vite.config.ts', '--host', 'localhost', '--port', '5173', '--strictPort']);
console.log('Web: http://localhost:5173 | API: http://localhost:3001/api/v1 | Ctrl+C to‘xtatadi.');
