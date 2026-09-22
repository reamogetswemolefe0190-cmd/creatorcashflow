'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const express=require('express');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const app=express();app.use(express.static(path.resolve(__dirname,'..')));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  fs.mkdirSync('.stitch-qa',{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  for(const width of [1440,1024,768,390,320,375]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/#landing');await page.locator('.ccf-hero h1').waitFor();
   await page.locator('.ccf-hero-visual>img').evaluate(img=>img.decode());
   assert(await page.locator('.ccf-hero-visual>img').evaluate(img=>img.naturalWidth>0&&img.currentSrc.includes('/assets/photography/')),'Local stock hero loads');
   await page.screenshot({path:'.stitch-qa/landing-'+width+'.png',fullPage:true});
   if(width===1440)await page.screenshot({path:'.stitch-qa/landing-preview.png'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No landing overflow at '+width);
   assert.equal(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--st-primary').trim()),'#ff5b00');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.ccf-primary')).backgroundColor),'rgb(255, 91, 0)');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.ccf-hero h1')).textTransform),'none');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.ccf-primary')).boxShadow),'none');
   assert.equal(await page.locator('.ccf-poster').count(),0);
   if(width<=760){
    assert(await page.locator('.public-header').evaluate(e=>e.getBoundingClientRect().height<110),'Compact phone header');
    assert(await page.locator('.ccf-actions .ccf-primary').evaluate(e=>e.getBoundingClientRect().bottom<700),'Primary action in first phone screen');
    await page.locator('.mobile-menu').click();
    assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'true');
    assert(await page.locator('.public-nav a[href="#login"]').isVisible());
    await page.locator('.mobile-menu').click();
    assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'false');
   }
  }
  await page.setViewportSize({width:812,height:375});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Landscape layout');
  await page.setViewportSize({width:375,height:812});
  await page.screenshot({path:'.stitch-qa/system/mobile-preview.png'});
  await page.locator('.ccf-actions a[href="#signup"]').click();
  await page.locator('#customer-auth').waitFor();
  await page.goto(base+'/#landing');
  await page.locator('.ccf-actions a[href="#journey"]').click();
  await page.locator('#demo-notice').waitFor();
  await page.goto(base+'/#landing');
  await page.reload();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cc-screen');
  for(const hash of ['login','signup','creator','agency','brand','journey']){
   await page.goto(base+'/#'+hash);await page.waitForTimeout(150);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow: '+hash);
   await page.screenshot({path:'.stitch-qa/'+hash+'-mobile.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('Stitch UI: six widths (320–1440), landscape, mobile menu, first-screen action, six mobile routes, signup/demo links, keyboard skip link, palette and JS checks passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
