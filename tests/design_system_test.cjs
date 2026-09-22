'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const express=require('express');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Focused computed-colour checks. Not a substitute for a complete WCAG audit.
function contrastAudit(){
 const rgb=s=>{const n=s.match(/[\d.]+/g);return n?n.map(Number):[0,0,0,0];};
 const over=(a,b)=>{const alpha=a[3]??1;return a.slice(0,3).map((v,i)=>v*alpha+b[i]*(1-alpha));};
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const problems=[];
 for(const el of document.querySelectorAll('body *')){
  if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(!rect.width||!rect.height||style.visibility==='hidden'||el.closest('button:disabled,select,option,script,style'))continue;
  const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);
  if(chain.some(p=>+getComputedStyle(p).opacity<1||getComputedStyle(p).backgroundImage!=='none'))continue;
  let bg=[255,255,255];for(const p of chain)bg=over(rgb(getComputedStyle(p).backgroundColor),bg);
  const fg=over(rgb(style.color),bg),a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&+style.fontWeight>=700);
  if(ratio<(large?3:4.5)-.03)problems.push({text:el.textContent.trim().slice(0,55),class:el.className,ratio:+ratio.toFixed(2),color:style.color,bg});
 }
 return problems;
}
(async()=>{
 const app=express();app.use(express.static(path.resolve(__dirname,'..')));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  fs.mkdirSync('.stitch-qa/system',{recursive:true});
  const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());const json=x=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
   if(url.origin!==base)return route.abort();
   if(url.pathname==='/api/auth/login')return json({token:'isolated-test',user:{name:'Test Creator'}});
   if(url.pathname==='/api/transactions')return json({transactions:[]});
   if(url.pathname==='/api/collaboration/workspace')return json({campaigns:[{id:'fixture',name:'Sample campaign',brief:'Fixture for presentation checks',fixed_fee:60000,status:'active'}],organizations:[{name:'Test studio'}],creators:[],deliverables:[]});
   if(url.pathname.includes('/status'))return json({configured:false,connections:[]});
   if(url.pathname.startsWith('/api/'))return json({});return route.continue();
  });
  const report={};
  for(const width of [1440,375]){
   await page.setViewportSize({width,height:1000});
   for(const route of ['landing','login','signup','creator','agency','brand','journey','availability','privacy','security']){
    await page.goto(base+'/#'+route);await page.locator('#cc-screen').waitFor();await page.waitForTimeout(150);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+route+' '+width);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.public-header')).backgroundColor),'rgb(255, 255, 255)');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.public-nav .primary-link')).backgroundColor),'rgb(255, 91, 0)');
    const problems=await page.evaluate(contrastAudit);if(problems.length)report[route+'-'+width]=problems;
    await page.screenshot({path:'.stitch-qa/system/'+route+'-'+width+'.png',fullPage:true});
    if(route==='creator'){
     assert.equal(await page.locator('.cc-demo-side svg').count(),5,'Navigation icons are local');
     assert.equal(await page.locator('.cc-demo-side [aria-current="page"]').count(),1);
     assert(await page.locator('.cc-creator-next').isVisible());
     if(width===375)await page.screenshot({path:'.stitch-qa/system/creator-phone-preview.png'});
    }
    if(route==='landing'&&width===1440)await page.screenshot({path:'.stitch-qa/system/landing-preview.png'});
   }
  }
  for(const viewport of [{width:320,height:740},{width:390,height:844},{width:812,height:375}]){
   await page.setViewportSize(viewport);await page.goto(base+'/#creator');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Creator adaptive width');
   const nav=page.locator('.cc-role-creator .cc-demo-side');
   for(const button of await nav.locator('button').all()){
    const box=await button.boundingBox();assert(box.width>=44&&box.height>=44,'Navigation touch target');
   }
   await nav.locator('[data-command="setWorkspaceTab(\'Income\')"]').click();
   assert.equal(await nav.locator('[aria-current="page"]').innerText(),'Income');
  }
  await page.setViewportSize({width:375,height:812});await page.goto(base+'/#creator');
  await page.locator('.cc-demo-side [data-command="setWorkspaceTab(\'Overview\')"]').click();
  await page.screenshot({path:'.stitch-qa/system/creator-phone-preview.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.notEqual(await page.locator('.cc-creator-next button').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.cc-creator-next button').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.setViewportSize({width:1440,height:1000});
  for(const role of ['creator','agency','brand']){
   await page.goto(base+'/#'+role);
   const tabs=await page.locator('.cc-demo-side button[data-command]').evaluateAll(els=>els.map(e=>e.getAttribute('data-command')).filter(c=>c.startsWith('setWorkspaceTab')));
   for(const width of [1440,375]){await page.setViewportSize({width,height:1000});for(const command of tabs){
    await page.locator('.cc-demo-side button').evaluateAll((els,cmd)=>els.find(e=>e.getAttribute('data-command')===cmd).click(),command);
    await page.waitForTimeout(100);const problems=await page.evaluate(contrastAudit);
    if(problems.length)report[role+'-'+command+'-'+width]=problems;
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Tab overflow '+role+' '+command+' '+width);
   }}
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/#login');
  await page.locator('#customer-auth input[name=email]').fill('test@example.com');
  await page.locator('#customer-auth input[name=password]').fill('test-password');
  await page.locator('#customer-auth button').click();await page.locator('.hq-sidebar').waitFor();
  for(const tab of ['overview','campaigns','income','connections','assistant']){
   await page.locator('.hq-sidebar [data-tab="'+tab+'"]').click();await page.waitForTimeout(150);
   const problems=await page.evaluate(contrastAudit);if(problems.length)report['account-'+tab]=problems;
   await page.screenshot({path:'.stitch-qa/system/account-'+tab+'.png',fullPage:true});
  }
  for(const role of ['agency','brand']){
   await page.evaluate(role=>localStorage.setItem('ccf_session','fixture.'+btoa(JSON.stringify({role,name:'Test studio'}))+'.fixture'),role);
   await page.goto(base+'/'+role+'.html');await page.locator('.role-rail').waitFor();
   const tabs=await page.locator('.role-rail [data-tab]').evaluateAll(els=>els.map(e=>e.dataset.tab));
   for(const tab of tabs){
    await page.locator('.role-rail [data-tab="'+tab+'"]').click();
    const problems=await page.evaluate(contrastAudit);if(problems.length)report['live-'+role+'-'+tab]=problems;
   }
   await page.locator('.role-rail [data-tab="overview"]').click();
   for(const width of [1440,375]){
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Live role overflow '+role+' '+width);
    await page.screenshot({path:'.stitch-qa/system/live-'+role+'-'+width+'.png',fullPage:true});
   }
  }
  fs.writeFileSync('.stitch-qa/system/contrast-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
  assert.equal(Object.keys(report).length,0,'Computed text contrast failures; inspect report');
  console.log('Design system passed: 10 routes at desktop/mobile, consistent header, text contrast and isolated account views.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
