'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const express=require('express');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const app=express();app.use(express.static(path.resolve(__dirname,'..')));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.goto(base+'/#creator');await page.locator('.cc-money-chart').waitFor();
  assert.equal(await page.evaluate(()=>typeof Motion.animate),'function');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.cc-money-row').first().getAttribute('data-client'),'Vela Active');
  await page.getByRole('button',{name:'Due date',exact:true}).click();
  assert.equal(await page.locator('.cc-money-row').first().getAttribute('data-client'),'Homegrown Coffee');
  assert.equal(await page.getByRole('button',{name:'Due date',exact:true}).getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>document.getAnimations().length>0),'Actual Motion animation runs');
  // Keyboard activation and repeated interactions must leave an unambiguous final state.
  await page.getByRole('button',{name:'By client',exact:true}).focus();await page.keyboard.press('Enter');
  for(let i=0;i<4;i++)await page.getByRole('button',{name:i%2?'By client':'Due date',exact:true}).click();
  assert.equal(await page.locator('.cc-money-row').first().getAttribute('data-client'),'Vela Active');
  await page.locator('.cc-demo-side [data-command="setWorkspaceTab(\'Income\')"]').click();
  assert(await page.locator('.cc-demo-side [aria-current=page]').evaluate(e=>document.activeElement===e),'Focus preserved through render');
  await page.locator('.cc-demo-side [data-command="setWorkspaceTab(\'Overview\')"]').click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  await page.getByRole('button',{name:'Due date',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0,'Reduced motion has no active animation');
  for(const width of [320,375,390,768,1440]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width);
   const button=await page.getByRole('button',{name:'Due date',exact:true}).boundingBox();assert(button.height>=44);
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'By client',exact:true}).click();
  await page.locator('.cc-studio-money').scrollIntoViewIfNeeded();
  await page.screenshot({path:'.stitch-qa/system/creator-money-phone.png'});
  // The screen still works if the animation library is unavailable.
  await page.route('**/assets/vendor/motion.js',r=>r.abort());await page.reload();
  await page.getByRole('button',{name:'Due date',exact:true}).click();
  assert.equal(await page.locator('.cc-money-row').first().getAttribute('data-client'),'Homegrown Coffee');
  assert.deepEqual(errors,[]);
  console.log('Creator Motion: real animation, invoice ordering, keyboard/focus, rapid switching, reduced motion, five widths and missing-library fallback passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
