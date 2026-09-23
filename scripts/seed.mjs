import path from 'node:path';
import {root,run} from './env.mjs';

if(process.env.NODE_ENV==='production')throw new Error('Demo seed faqat development muhiti uchun.');
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid');
if(!['localhost','127.0.0.1','[::1]'].includes(database.hostname))throw new Error('Demo seed faqat lokal PostgreSQL bazasida bajariladi.');
await run(process.execPath,[path.join(root,'apps/api/node_modules/tsx/dist/cli.mjs'),path.join(root,'apps/api/prisma/seed.ts')]);
