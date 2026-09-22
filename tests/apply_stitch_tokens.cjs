// One-time, idempotent palette migration. Leaves application logic and existing edits intact.
const fs = require('node:fs');
function color(hex) {
  let s=hex.slice(1); if(s.length===3)s=s.split('').map(x=>x+x).join('');
  if(s.length!==6)return hex;
  const [r,g,b]=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2;
  let name;
  if(max-min>.16 && light>.36) name=b>r && b>g?'secondary':'primary';
  else name=light<.09?'accent':light<.20?'panel':light<.39?'muted':light<.86?'line':light<.97?'paper':'white';
  return `var(--st-${name})`;
}
function css(s) {
  return s.replace(/#[\da-f]{3,8}\b/gi,color)
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi,(_,r,g,b,a)=>{
      const token=color('#'+[r,g,b].map(x=>Number(x).toString(16).padStart(2,'0')).join(''));
      return a===undefined?token:`color-mix(in srgb, ${token} ${Number(a)*100}%, transparent)`;
    })
    .replace(/font-family\s*:[^;}]+/g,'font-family:var(--st-font)')
    .replace(/font-weight\s*:\s*600\b/g,'font-weight:500').replace(/font-weight\s*:\s*800\b/g,'font-weight:700');
}
for(const file of ['style.css','customer.css'])fs.writeFileSync(file,css(fs.readFileSync(file,'utf8')));
for(const file of ['index.html','agency.html','brand.html']) {
  let s=fs.readFileSync(file,'utf8').replace(/<style>([\s\S]*?)<\/style>/g,(_,body)=>`<style>${css(body)}</style>`);
  if(!s.includes('/assets/ccf-stitch.css'))s=s.replace('</head>','<link rel="stylesheet" href="/assets/ccf-stitch.css?v=1">\n</head>');
  s=s.replace(/(<meta name="theme-color" content=")[^"]+/, '$1#100e13');
  if(file==='index.html'&&!s.includes('class="skip-link"'))s=s.replace(/(<body[^>]*>)/,'$1\n<a class="skip-link" href="#cc-screen">Skip to content</a>').replace('<main id="cc-screen">','<main id="cc-screen" tabindex="-1">');
  fs.writeFileSync(file,s);
}
// Inline styles in templates use the same palette. Data values, routes and handlers are untouched.
for(const file of ['product-demo.js','customer.js','dashboards.js']) {
  let s=fs.readFileSync(file,'utf8').replace(/style="([^"\n]*)"/g,(_,body)=>`style="${css(body)}"`);
  fs.writeFileSync(file,s);
}
