import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', timeout:90000, expect:{timeout:15000}, retries:0, workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:process.env.TEST_WEB_URL||'http://localhost:5173',trace:'retain-on-failure',screenshot:'only-on-failure',channel:process.platform==='win32'?'msedge':undefined},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
