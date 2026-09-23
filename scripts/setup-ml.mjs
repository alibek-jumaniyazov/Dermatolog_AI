import fs from 'node:fs';
import path from 'node:path';
import { root, run, win } from './env.mjs';
const venv = path.join(root, 'services/ml/.venv');
const base = process.env.PYTHON_BIN || (win ? 'python' : 'python3');
if (!fs.existsSync(path.join(venv, 'pyvenv.cfg'))) await run(base, ['-m', 'venv', venv]);
const python = path.join(venv, win ? 'Scripts/python.exe' : 'bin/python');
await run(python, ['-m', 'pip', 'install', '-r', 'services/ml/requirements.txt']);
console.log('ML muhiti tayyor.');
