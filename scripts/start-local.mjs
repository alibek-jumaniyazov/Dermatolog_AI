import fs from 'node:fs';
import path from 'node:path';
import { root, run, pnpm } from './env.mjs';
if (!fs.existsSync(path.join(root,'.env'))) throw new Error('Avval pnpm setup:local bajaring.');
await run(process.execPath,['scripts/postgres.mjs','start']);
await run(process.execPath,['scripts/migrate.mjs']);
await pnpm(['build']);
await run(process.execPath,['scripts/dev.mjs']);
