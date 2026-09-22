'use strict';
const assert=require('node:assert/strict');
const express=require('express');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const app=express();app.use(express.static(process.cwd()));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  for(const width of [320,375,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of ['landing','signup','login','creator','agency','brand','journey','privacy','terms','security']){
    await page.goto(base+'/#'+route);await page.waitForTimeout(150);
    assert.equal(await page.locator('main main').count(),0,'Nested main: '+route);
    assert.equal(await page.locator('h1:visible').count(),1,'Primary heading: '+route);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow: '+route+width);
   }
  }
  await page.setViewportSize({width:375,height:812});await page.goto(base+'/#landing');
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
  assert(await page.getByRole('button',{name:'Menu',exact:true}).evaluate(el=>el===document.activeElement));
  await page.goto(base+'/#journey');
  for(let i=0;i<7;i++){
   assert.equal(await page.locator('[onclick]').count(),0,'No pretend upload handlers');
   const next=page.locator('[data-action="campaign-next"]:not([disabled])');
   if(!await next.count())break;
   await next.click();
  }
  assert.equal(await page.locator('.pilot-review-state').innerText(),'Payment pending');
  assert(await page.getByText('This demo has not sent an invoice or initiated a payment.',{exact:false}).count());
  assert.deepEqual(errors,[]);
  console.log('Audit regressions passed: 30 responsive route checks, headings, landmarks, Escape/focus, and honest sample-payment states.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
