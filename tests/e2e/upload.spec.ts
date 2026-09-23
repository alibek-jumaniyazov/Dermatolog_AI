import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import sharp from 'sharp';

test('real photo upload, manual ROI, quality and symptoms without external AI consent', async ({page}, info) => {
  test.setTimeout(120_000);
  const email=`photo-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;
  const password=`Photo-${crypto.randomBytes(16).toString('hex')}`;
  const origin='http://localhost:5173';
  const registered=await page.request.post('/api/v1/auth/register',{data:{name:'Photo Test',email,password},headers:{Origin:origin}});
  expect(registered.ok()).toBeTruthy();
  const auth=await registered.json();
  const headers={Origin:origin,Authorization:`Bearer ${auth.accessToken}`};
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('/app/analyses/new');
    await page.getByLabel('Kuzatuv nomi').fill('SYNTHETIC UI TEST');
    await page.getByLabel('Tanadagi joylashuvi').click();
    await page.getByTitle('Qo‘l',{exact:true}).click();
    await page.getByRole('checkbox',{name:/Suratimni qayta ishlashga roziman/}).check();
    await page.getByRole('checkbox',{name:/Kuzatuvni tariximga saqlash/}).check();
    await expect(page.getByRole('checkbox',{name:/OpenAI orqali/})).not.toBeChecked();
    await page.getByRole('button',{name:'Davom etish'}).click();
    await expect(page.getByRole('heading',{name:'Bir joy. Bir necha rakurs.'})).toBeVisible();
    const buffer=await sharp(crypto.randomBytes(512*512*3),{raw:{width:512,height:512,channels:3}}).png().toBuffer();
    await page.locator('input[type=file]').setInputFiles({name:'synthetic-ui.png',mimeType:'image/png',buffer});
    await page.getByRole('button',{name:'1 ta suratni yuborish'}).click();
    await page.getByRole('button',{name:'Hudud belgilash'}).click();
    const frame=page.locator('.roi-frame');
    await expect(frame.locator('img')).toBeVisible();
    const box=await frame.boundingBox();expect(box).toBeTruthy();
    await page.mouse.move(box!.x+box!.width*0.2,box!.y+box!.height*0.2);
    await page.mouse.down();await page.mouse.move(box!.x+box!.width*0.7,box!.y+box!.height*0.7,{steps:8});await page.mouse.up();
    await page.getByRole('dialog').getByRole('button',{name:/Saqlash$/}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button',{name:'Surat sifatini tekshirish'}).click();
    await expect(page.locator('.image-quality')).toBeVisible();
    await page.getByRole('checkbox',{name:'Barcha suratlar tanamdagi bitta joyga tegishli.'}).check();
    await page.screenshot({path:`test-results/photo-quality-${info.project.name}.png`,fullPage:true});
    await page.getByRole('button',{name:'Savollarga o‘tish'}).click();
    await page.getByRole('button',{name:'Davom etish'}).click();
    await expect(page.getByRole('heading',{name:'Kuzatuvni boshlashga tayyormisiz?'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Tahlilni boshlash'})).toBeDisabled();
    await expect(page.getByText('Tashqi AI roziligi berilmagan',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await page.getByRole('link',{name:'Sifat natijasini ochish'}).click();
    await expect(page).toHaveURL(/\/app\/analyses\/[a-f\d-]+$/);
    await page.screenshot({path:`test-results/photo-draft-${info.project.name}.png`,fullPage:true});
    expect(errors).toEqual([]);
    // The browser rotates the registration session at bootstrap; obtain a fresh test API session.
    const login=await page.request.post('/api/v1/auth/login',{data:{email,password},headers:{Origin:origin}});
    expect(login.ok()).toBeTruthy();
    headers.Authorization=`Bearer ${(await login.json()).accessToken}`;
    const history=await page.request.get('/api/v1/analyses',{headers});
    expect(history.ok()).toBeTruthy();
    const data=await history.json();
    expect(data.items.some((a:{id:string})=>page.url().endsWith(a.id))).toBeTruthy();
  } finally {
    const cleanupLogin=await page.request.post('/api/v1/auth/login',{data:{email,password},headers:{Origin:origin}});
    headers.Authorization=`Bearer ${(await cleanupLogin.json()).accessToken}`;
    const deleted=await page.request.delete('/api/v1/me',{data:{password},headers});
    expect([200,201,202]).toContain(deleted.status());
  }
});
