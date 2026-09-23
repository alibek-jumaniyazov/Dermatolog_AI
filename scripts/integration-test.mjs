import './env.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { Client } from 'pg';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:3001/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(base)) throw new Error('Integration runner only targets a local server.');
const password = 'Test-' + crypto.randomBytes(20).toString('hex');
const suffix = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
const users = [];
let checks = 0;
async function request(path, { method = 'GET', token, body, cookie, origin = process.env.APP_ORIGIN || 'http://localhost:5173', extra = {} } = {}) {
  const headers = { Origin: origin, ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json') ? await response.json() : await response.arrayBuffer();
  return { status: response.status, data, response };
}
function expectStatus(result, expected, name) {
  assert.ok([expected].flat().includes(result.status), `${name}: expected ${expected}, got ${result.status} ${JSON.stringify(result.data).slice(0,200)}`);
  checks++; console.log(`PASS ${name}`);
}
async function register(label) {
  const result = await request('/auth/register', { method: 'POST', body: { name: `Integration ${label}`, email: `test-${suffix}-${label}@example.com`, password } });
  expectStatus(result, [200,201], 'register ' + label);
  const item = { ...result.data, cookie: result.response.headers.get('set-cookie')?.split(';')[0] };
  users.push(item); return item;
}
const png = await sharp(crypto.randomBytes(512 * 512 * 3), { raw: { width:512, height:512, channels:3 } }).png().toBuffer();
const form = () => { const f = new FormData(); f.append('images', new Blob([png], {type:'image/png'}), 'synthetic-noise.png'); return f; };
try {
  const a = await register('owner'), b = await register('outsider');
  const token = a.accessToken;
  const c = await request('/cases', {method:'POST',token,body:{label:'Synthetic integration case',bodyLocation:'TEST_ONLY'}});
  expectStatus(c,[200,201],'create case');
  const caseId = c.data.id;
  expectStatus(await request(`/cases/${caseId}`,{token:b.accessToken}),404,'case isolation');
  const created = await request('/analyses',{method:'POST',token,body:{caseId}});
  expectStatus(created,[200,201],'create analysis');
  const id=created.data.id;
  expectStatus(await request(`/analyses/${id}/images`,{method:'POST',token,body:form()}),[400,403,422],'upload requires consent');
  expectStatus(await request('/me/consents',{method:'POST',token,body:{analysisId:id,processing:true,history:true,research:false,externalAi:false,policyVersion:'1.0'}}),[200,201],'per-analysis consent');
  const bad = new FormData();bad.append('images',new Blob(['this is not an image'],{type:'image/png'}),'bad.png');
  expectStatus(await request(`/analyses/${id}/images`,{method:'POST',token,body:bad}),[400,415,422],'spoofed image rejected');
  const uploaded=await request(`/analyses/${id}/images`,{method:'POST',token,body:form()});
  expectStatus(uploaded,[200,201],'real image upload');
  const imageId=uploaded.data.images[0].id;
  expectStatus(await request(`/assets/${imageId}/content`,{token}),200,'private image read');
  expectStatus(await request(`/assets/${imageId}/content`,{token:b.accessToken}),404,'image isolation');
  expectStatus(await request(`/analyses/${id}/images/${imageId}/roi`,{method:'PATCH',token,body:{x:-1,y:0,width:0.3,height:0.3}}),[400,422],'invalid ROI rejected');
  expectStatus(await request(`/analyses/${id}/images/${imageId}/roi`,{method:'PATCH',token,body:{x:0.2,y:0.2,width:0.5,height:0.5}}),200,'normalized ROI saved');
  const quality=await request(`/analyses/${id}/quality-check`,{method:'POST',token});
  expectStatus(quality,[200,201],'real quality service');
  assert.equal(quality.data.images[0].quality.assessmentComplete,false); checks++;
  const answers={duration:'UNKNOWN',itching:'UNKNOWN',pain:'NO',bleeding:'NO',changing:'UNKNOWN',asymmetry:'UNKNOWN',border:'UNKNOWN',color:'UNKNOWN'};
  expectStatus(await request(`/analyses/${id}/symptoms`,{method:'PUT',token,body:answers}),200,'symptoms saved');
  const cap=await request('/capabilities');
  if(cap.data.externalAiRequired){
    expectStatus(await request(`/analyses/${id}/submit`,{method:'POST',token,body:{acknowledgeWarnings:true},extra:{'Idempotency-Key':crypto.randomUUID()}}),[400,403,422],'external AI consent enforced');
  }
  const history=await request('/analyses',{token});expectStatus(history,200,'history');assert.ok(history.data.items.some(x=>x.id===id));checks++;
  expectStatus(await request('/me',{method:'PATCH',token,origin:'https://untrusted.example',body:{name:'should fail'}}),403,'cross-origin mutation blocked');
  expectStatus(await request('/me/export',{method:'POST',token}),[200,201],'data export');
  const temp=await request('/analyses',{method:'POST',token,body:{caseId}});
  const tempId=temp.data.id;
  await request('/me/consents',{method:'POST',token,body:{analysisId:tempId,processing:true,history:false,research:false,externalAi:false,policyVersion:'1.0'}});
  const history2=await request('/analyses',{token});assert.ok(!history2.data.items.some(x=>x.id===tempId));checks++;console.log('PASS temporary analysis absent from history');
  const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  await db.query('UPDATE "Analysis" SET "expiresAt"=($1::timestamptz AT TIME ZONE \'UTC\') WHERE id=$2 AND "userId"=$3',[new Date(Date.now()-1000).toISOString(),tempId,a.user.id]);await db.end();
  expectStatus(await request(`/analyses/${tempId}`,{token}),[404,410],'expired analysis access denied');
  expectStatus(await request(`/cases/${caseId}`,{token}),200,'temporary expiry preserves saved case');
  const del=await request(`/analyses/${id}`,{method:'DELETE',token});expectStatus(del,[200,201,202],'analysis deletion accepted');
  expectStatus(await request(`/assets/${imageId}/content`,{token}),404,'deleted asset inaccessible');
  expectStatus(await request('/auth/refresh',{method:'POST',cookie:a.cookie}),[200,201],'refresh rotation');
  expectStatus(await request('/auth/refresh',{method:'POST',cookie:a.cookie}),401,'old refresh token rejected');
  console.log(`Integration: ${checks} checks passed; no external image calls made.`);
} finally {
  for(const user of users) {
    // Token may have been revoked by refresh reuse; log in only to delete this test-owned account.
    const login=await request('/auth/login',{method:'POST',body:{email:user.user.email,password}}).catch(()=>null);
    if(login?.data.accessToken)await request('/me',{method:'DELETE',token:login.data.accessToken,body:{password}}).catch(()=>{});
  }
}
