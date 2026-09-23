import './env.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import sharp from 'sharp';

// Explicit live-provider integration, opt-in only. One synthetic image is sent to OpenAI.
if (process.env.ALLOW_LIVE_AI_TEST !== '1') throw new Error('Set ALLOW_LIVE_AI_TEST=1 to authorize this synthetic image integration call.');
const base='http://127.0.0.1:3001/api/v1';
const password='Test-'+crypto.randomBytes(18).toString('hex');
const email=`live-flow-${Date.now()}@example.com`;
let token;
async function call(path,method='GET',body,extra={}) {
  const headers={Origin:process.env.APP_ORIGIN,...extra};if(token)headers.Authorization=`Bearer ${token}`;
  if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
  const r=await fetch(base+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
  const b=await r.json();if(!r.ok)throw new Error(`${path}: ${r.status} ${b.error?.code}`);return b;
}
try {
  const auth=await call('/auth/register','POST',{name:'Synthetic live check',email,password});token=auth.accessToken;
  const c=await call('/cases','POST',{label:'Synthetic checkerboard',bodyLocation:'TEST_ONLY'});
  const a=await call('/analyses','POST',{caseId:c.id});
  await call('/me/consents','POST',{analysisId:a.id,processing:true,history:true,research:false,externalAi:true,policyVersion:'1.0'});
  const rectangles=[];for(let y=0;y<512;y+=32)for(let x=0;x<512;x+=32)rectangles.push(`<rect x="${x}" y="${y}" width="32" height="32" fill="${(x/32+y/32)%2?'#66aacd':'#bec6bf'}"/>`);
  const bytes=await sharp(Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">${rectangles.join('')}<text x="40" y="255" font-size="38" fill="#182a35">SYNTHETIC TEST</text></svg>`)).png().toBuffer();
  await fs.mkdir('.data/evidence',{recursive:true});await fs.writeFile('.data/evidence/synthetic.png',bytes);
  const form=new FormData();form.append('images',new Blob([bytes],{type:'image/png'}),'synthetic.png');
  const uploaded=await call(`/analyses/${a.id}/images`,'POST',form);
  await call(`/analyses/${a.id}/images/${uploaded.images[0].id}/roi`,'PATCH',{x:0.2,y:0.2,width:0.4,height:0.4});
  await call(`/analyses/${a.id}/quality-check`,'POST');
  await call(`/analyses/${a.id}/symptoms`,'PUT',{duration:'UNKNOWN',itching:'UNKNOWN',pain:'UNKNOWN',bleeding:'NO',changing:'UNKNOWN',asymmetry:'UNKNOWN',border:'UNKNOWN',color:'UNKNOWN'});
  await call(`/analyses/${a.id}/submit`,'POST',{acknowledgeWarnings:true},{'Idempotency-Key':crypto.randomUUID()});
  let result;
  for(let i=0;i<100;i++) {
    result=await call(`/analyses/${a.id}`);
    if(['FINISHED','FAILED','CANCELLED'].includes(result.processingStatus))break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.equal(result.processingStatus,'FINISHED',JSON.stringify({status:result.processingStatus,error:result.failureCode}));
  assert.equal(result.result.riskLevel,'NOT_ASSESSED');assert.equal(result.result.malignantProbability,null);
  assert.ok(result.result.predictions.every(p=>p.score===null));
  const report=await call(`/analyses/${a.id}/report`,'POST');
  const pdf=await fetch(`${base}/reports/${report.id}/download`,{headers:{Authorization:`Bearer ${token}`}});
  assert.equal(pdf.status,200);const file=Buffer.from(await pdf.arrayBuffer());assert.equal(file.subarray(0,4).toString(),'%PDF');
  await fs.writeFile('.data/evidence/live-report.pdf',file);
  const evidence={status:result.processingStatus,outcome:result.outcome,riskLevel:result.result.riskLevel,probability:result.result.malignantProbability,pdfBytes:file.length,input:'synthetic non-medical checkerboard',route:'real frontend contract -> NestJS -> PostgreSQL job -> FastAPI -> OpenAI -> result -> PDF'};
  await fs.writeFile('.data/evidence/live-flow.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally {
  if(token)await call('/me','DELETE',{password}).catch(()=>{});
}
