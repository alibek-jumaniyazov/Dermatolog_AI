import { root } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const secrets=['OPENAI_API_KEY','JWT_SECRET','REFRESH_SECRET','ML_SERVICE_TOKEN'].map(k=>process.env[k]).filter(s=>s&&s.length>24);
const skip=new Set(['node_modules','.git','.data','.venv','__pycache__','.pytest_cache','test-results','playwright-report']);
let scanned=0;
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  if(skip.has(entry.name)||entry.name==='.env')continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!/\.(m?js|cjs|ts|tsx|json|md|yaml|yml|html|css|py|txt|map)$/.test(entry.name))continue;
  const text=await fs.readFile(file,'utf8');scanned++;
  if(secrets.some(secret=>text.includes(secret)))throw new Error(`Secret detected in ${path.relative(root,file)} (value withheld)`);
}}
await walk(root);console.log(`${scanned} source/build files checked: server secret values absent.`);
