import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });
export const win = process.platform === 'win32';
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true, ...options });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited ${code}`)));
  });
}
export function pnpm(args, options = {}) {
  // Invoke pnpm's JS entry rather than a command shell, including Windows paths with spaces.
  const entry = process.env.npm_execpath;
  if (entry && /pnpm/.test(entry)) return run(process.execPath, [entry, ...args], options);
  const candidates = [path.join(root, 'node_modules/pnpm/bin/pnpm.cjs'), ...(win ? [path.join(process.env.LOCALAPPDATA || '', 'pnpm/pnpm.cjs')] : [])];
  const file = candidates.find(p => fs.existsSync(p));
  if (file) return run(process.execPath, [file, ...args], options);
  const corepack = path.join(path.dirname(process.execPath), 'node_modules/corepack/dist/pnpm.js');
  if (fs.existsSync(corepack)) return run(process.execPath, [corepack, ...args], options);
  return run(win ? 'pnpm.cmd' : 'pnpm', args, { ...options, shell: win });
}

export function pythonPath() {
  const venv = path.join(root, 'services/ml/.venv', win ? 'Scripts/python.exe' : 'bin/python');
  if (fs.existsSync(venv)) return venv;
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) return process.env.PYTHON_BIN;
  return win ? 'python' : 'python3';
}
