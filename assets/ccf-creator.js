/* CCF creator reference screen. Original vanilla implementation informed by
   Kokonut Smooth Tab and Bklit horizontal bars; Motion runs the interactions. */
(() => {
  const invoices = [
    { name: 'Vela Active', campaign: 'Spring in motion', amount: 12000, day: 30 },
    { name: 'Homegrown Coffee', campaign: 'Morning ritual', amount: 6000, day: 24 }
  ];
  const money = n => 'R' + n.toLocaleString('en-ZA').replace(/\s/g, ',');
  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  let previousNav = null;
  let animations = [];
  let cleanups = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function settle() {
    animations.forEach(a => a.complete()); animations = [];
  }
  function animate(el, frames, options) {
    if (!el || reduced.matches || !window.Motion) return;
    animations.push(Motion.animate(el, frames, options));
  }
  function bars(order = 'client') {
    const rows = invoices.toSorted((a,b) => order === 'date' ? a.day-b.day : b.amount-a.amount);
    return rows.map(row => `<div class="cc-money-row" data-client="${row.name}">
      <div class="cc-money-label"><span>${row.name}</span><strong>${money(row.amount)}</strong></div>
      <div class="cc-money-track" aria-hidden="true"><span class="cc-money-fill" style="width:${row.amount/18000*100}%"></span></div>
      <div class="cc-money-caption"><span>${row.campaign}</span><span>Due ${row.day} Sep</span></div>
    </div>`).join('');
  }
  window.CCFCreator = {
    render: () => `<div class="cc-creator-studio">
      <section class="cc-studio-task cc-creator-next" aria-labelledby="creator-next-heading">
        <div class="cc-task-top"><span class="cc-studio-eyebrow">Up next</span><span class="cc-studio-chip">Creator draft</span></div>
        <div class="cc-task-body"><div><h3 id="creator-next-heading">Your next great<br>piece starts here.</h3><p>Spring in motion · Vela Active</p><p class="cc-task-description">The brief is ready. Send your first video draft for review.</p></div>
        <div class="cc-task-monogram" aria-hidden="true"><img src="/brand/connection-mark.svg" alt="" width="96" height="96"></div></div>
        <div class="cc-task-bottom"><button class="cc-btn cc-primary" data-command="openCampaignFlow('creator')">Open deliverables ${arrow}</button><span>Sample campaign · 16 Sep deadline</span></div>
      </section>
      <section class="cc-studio-money" aria-labelledby="cc-money-heading">
        <header class="cc-studio-section-head"><h3 id="cc-money-heading">Your money, in view.</h3><span class="cc-studio-eyebrow">Sample data</span></header>
        <div class="cc-money-totals"><div><span>Received this month</span><strong>R38,500</strong><small>Across 4 payments</small></div><div><span>Awaiting payment</span><strong>R18,000</strong><small>2 invoices outstanding</small></div></div>
        <div class="cc-money-chart-head"><h4>Outstanding invoices</h4><div class="cc-money-switch" role="group" aria-label="Invoice chart order"><span class="cc-switch-indicator" aria-hidden="true"></span><button type="button" data-money-order="client" aria-pressed="true">By client</button><button type="button" data-money-order="date" aria-pressed="false">Due date</button></div></div>
        <div class="cc-money-chart">${bars()}</div>
        <p class="cc-chart-note" role="status" aria-live="polite">Share of R18,000 outstanding · largest first</p>
        <button class="cc-studio-link" data-command="setWorkspaceTab('Income')">Explore income records ${arrow}</button>
      </section>
      <section class="cc-studio-progress" aria-labelledby="cc-progress-heading">
        <header class="cc-studio-section-head"><h3 id="cc-progress-heading">Keep it moving.</h3><span class="cc-studio-chip">3 active campaigns</span></header>
        <p>Spring in motion</p><div class="cc-milestones" aria-label="2 of 5 milestones complete">${Array.from({length:5},(_,i)=>`<span class="${i<2?'is-done':''}" aria-hidden="true"></span>`).join('')}</div>
        <div class="cc-progress-caption"><strong>2 of 5 complete</strong><span>Next: first video draft</span></div>
        <button class="cc-studio-link" data-command="setWorkspaceTab('Campaigns')">Explore campaigns ${arrow}</button>
      </section>
      <section class="cc-studio-message" aria-labelledby="cc-message-heading"><header class="cc-studio-section-head"><h3 id="cc-message-heading">In the loop.</h3><span class="cc-studio-eyebrow">Studio North</span></header><blockquote>“The updated brief is ready. Please keep the opening shot outdoors.”</blockquote><button class="cc-studio-link" data-command="setWorkspaceTab('Inbox')">Open conversation ${arrow}</button></section>
    </div>`,
    capture() {
      previousNav = document.querySelector('.cc-role-creator .cc-demo-side .cc-active')?.getBoundingClientRect() || null;
    },
    unmount() {
      settle(); cleanups.forEach(fn=>fn()); cleanups = [];
    },
    mount() {
      settle(); cleanups.forEach(fn=>fn()); cleanups = [];
      const root = document.querySelector('.cc-role-creator');
      if (!root) { previousNav = null; return; }
      const active = root.querySelector('.cc-demo-side .cc-active');
      if (active) {
        active.querySelector('.cc-nav-indicator')?.remove();
        const indicator = document.createElement('span');
        indicator.className = 'cc-nav-indicator'; indicator.setAttribute('aria-hidden','true'); active.prepend(indicator);
        const box = active.getBoundingClientRect();
        if (previousNav) animate(indicator,{x:[previousNav.x-box.x,0],y:[previousNav.y-box.y,0]},{type:'spring',stiffness:380,damping:34});
      }
      previousNav = null;
      const studio = root.querySelector('.cc-creator-studio');
      if (studio) {
        animate(studio,{opacity:[.65,1],y:[8,0]},{duration:.3,ease:'easeOut'});
        root.querySelectorAll('.cc-money-fill').forEach(el=>animate(el,{scaleX:[0,1]},{type:'spring',stiffness:120,damping:24}));
        const switcher = root.querySelector('.cc-money-switch');
        const indicator = switcher.querySelector('.cc-switch-indicator');
        const place = button => { indicator.style.width=button.offsetWidth+'px'; indicator.style.left=button.offsetLeft+'px'; };
        place(switcher.querySelector('[aria-pressed=true]'));
        const resize = () => place(switcher.querySelector('[aria-pressed=true]'));
        window.addEventListener('resize',resize); cleanups.push(()=>window.removeEventListener('resize',resize));
        switcher.querySelectorAll('button').forEach(button=>{
          const onClick=()=>{
          if(button.getAttribute('aria-pressed')==='true')return;
          settle();
          const oldLeft=indicator.offsetLeft;
          switcher.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
          place(button);animate(indicator,{x:[oldLeft-button.offsetLeft,0]},{type:'spring',stiffness:380,damping:34});
          root.querySelector('.cc-money-chart').innerHTML=bars(button.dataset.moneyOrder);
          root.querySelectorAll('.cc-money-row').forEach(el=>animate(el,{opacity:[.6,1],y:[6,0]},{duration:.2}));
          root.querySelector('.cc-chart-note').textContent=button.dataset.moneyOrder==='date'?'Share of R18,000 outstanding · earliest due first':'Share of R18,000 outstanding · largest first';
          };
          button.addEventListener('click',onClick);
          cleanups.push(()=>button.removeEventListener('click',onClick));
        });
      }
      if(window.Motion && !reduced.matches){
        cleanups.push(Motion.press(root.querySelectorAll('.cc-studio-link,.cc-studio-task .cc-btn'),element=>{
          animate(element,{scale:.98},{duration:.1});
          return ()=>animate(element,{scale:1},{type:'spring',stiffness:420,damping:28});
        }));
      }
    }
  };
  reduced.addEventListener('change',()=>{
    window.CCFCreator.unmount();
    document.querySelectorAll('.cc-studio-link,.cc-studio-task .cc-btn').forEach(el=>el.style.transform='');
    window.CCFCreator.mount();
  });
})();
