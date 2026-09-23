import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {root} from './env.mjs';

const base='http://127.0.0.1:5179';
const preview=spawn(process.execPath,['apps/web/node_modules/vite/bin/vite.js','preview','apps/web','--host','127.0.0.1','--port','5179','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});
let browser;
try {
  for(let i=0;i<40;i++){if(await fetch(base).then(r=>r.ok).catch(()=>false))break;await new Promise(r=>setTimeout(r,250));}
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
  const context=await browser.newContext();const page=await context.newPage();
  await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached=await page.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.map(async n=>(await (await caches.open(n)).keys()).map(r=>r.url)))).flat();});
  assert.ok(cached.some(u=>u.endsWith('/offline.html')));
  assert.ok(!cached.some(u=>u.includes('/api/')));
  // Stop the local origin too: browser offline emulation can leave service-worker networking active.
  preview.kill();await new Promise(resolve=>preview.once('exit',resolve));
  await context.setOffline(true);await page.goto(base+'/app/analyses/offline-check-'+Date.now());
  assert.match(await page.title(),/Internet aloqasi yo‘q/);
  assert.match(await page.locator('body').innerText(),/Offline AI hozir mavjud emas/);
  await fs.mkdir('.data/evidence',{recursive:true});await page.screenshot({path:'.data/evidence/offline.png',fullPage:true});
  console.log('PASS production service worker: offline navigation, honest model limitation, no API cache');
} finally {await browser?.close();preview.kill();}
