import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Client} from 'pg';
import {run} from './env.mjs';

const db=new Client({connectionString:process.env.DATABASE_URL});
await db.connect();
function fingerprint(rows){return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
async function snapshot(){
  const regular=await db.query(`SELECT row_to_json(u) AS record FROM "User" u WHERE "isDemo"=false ORDER BY id`);
  const regularCases=await db.query(`SELECT row_to_json(c) AS record FROM "Case" c JOIN "User" u ON u.id=c."userId" WHERE u."isDemo"=false ORDER BY c.id`);
  const regularAnalyses=await db.query(`SELECT row_to_json(a) AS record FROM "Analysis" a JOIN "User" u ON u.id=a."userId" WHERE u."isDemo"=false ORDER BY a.id`);
  const demoUsers=await db.query(`SELECT id,email,name,role,"isDemo","createdAt" FROM "User" WHERE "isDemo"=true ORDER BY id`);
  const demoCases=await db.query(`SELECT row_to_json(c) AS record FROM "Case" c JOIN "User" u ON u.id=c."userId" WHERE u."isDemo"=true ORDER BY c.id`);
  const demoAnalyses=await db.query(`SELECT row_to_json(a) AS record FROM "Analysis" a WHERE "isDemo"=true ORDER BY id`);
  const demoImages=await db.query(`SELECT row_to_json(i) AS record FROM "Image" i JOIN "Analysis" a ON a.id=i."analysisId" WHERE a."isDemo"=true ORDER BY i.id`);
  return {regular:fingerprint([regular.rows,regularCases.rows,regularAnalyses.rows]),demo:fingerprint([demoUsers.rows,demoCases.rows,demoAnalyses.rows,demoImages.rows]),counts:{users:demoUsers.rowCount,cases:demoCases.rowCount,analyses:demoAnalyses.rowCount,images:demoImages.rowCount}};
}
try{
  const production=spawnSync(process.execPath,['scripts/seed.mjs'],{env:{...process.env,NODE_ENV:'production'},encoding:'utf8',windowsHide:true});
  assert.notEqual(production.status,0);assert.match(production.stderr,/faqat development/);
  const remote=spawnSync(process.execPath,['scripts/seed.mjs'],{env:{...process.env,NODE_ENV:'development',DATABASE_URL:'postgresql://demo:demo@not-a-local-database.invalid:5432/demo'},encoding:'utf8',windowsHide:true});
  assert.notEqual(remote.status,0);assert.match(remote.stderr,/faqat lokal PostgreSQL/);
  console.log('PASS production and non-local seed guards; no remote connection attempted.');
  const before=await snapshot();
  assert.ok(before.counts.analyses>=17,'Run pnpm db:seed before the idempotency check.');
  await run(process.execPath,['scripts/seed.mjs']);
  const after=await snapshot();
  assert.equal(after.regular,before.regular,'Non-demo users and medical data must stay unchanged.');
  assert.equal(after.demo,before.demo,'Second seed must not duplicate or overwrite existing demo profiles, cases, analyses or images.');
  console.log('PASS demo seed idempotency and preservation of non-demo accounts/data:',after.counts);
}finally{await db.end();}
