const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const express=require('express');
(async()=>{
 const app=express();app.use(express.static(process.cwd()));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.setViewportSize({width:320,height:900});
 await page.goto(base+'/#signup');
 await page.waitForTimeout(150);
 console.log('content BBox:', await page.locator('.pilot-auth-content').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).display]; })));
 console.log('form BBox:', await page.locator('.pilot-auth-form').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).display]; })));
 console.log('art BBox:', await page.locator('.pilot-auth-art').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).display]; })));
 await browser.close();
 server.close();
})();
