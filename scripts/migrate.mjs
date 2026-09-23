import path from 'node:path';
import { root, run } from './env.mjs';
const prisma = path.join(root, 'apps/api/node_modules/prisma/build/index.js');
await run(process.execPath, [prisma, 'generate', '--schema=apps/api/prisma/schema.prisma']);
await run(process.execPath, [prisma, 'migrate', 'deploy', '--schema=apps/api/prisma/schema.prisma']);
