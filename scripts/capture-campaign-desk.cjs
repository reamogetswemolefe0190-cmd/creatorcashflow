'use strict';

const { app } = require('../server');
// Local QA helper: install playwright or point CCF_PLAYWRIGHT_MODULE at a local copy.
const { chromium } = require(process.env.CCF_PLAYWRIGHT_MODULE || 'playwright');

const campaign = { id: 'camp1', name: 'Spring in motion', brief: 'One Instagram Reel and three story frames for the spring collection. The agency reviews the draft before brand approval.', status: 'active', fixed_fee: 12000 };
const second = { id: 'camp2', name: 'Weekend rituals', brief: 'Creator shortlist and launch brief in progress.', status: 'planning', fixed_fee: 9000 };
const assignment = { campaign_id: 'camp1', creator_user_id: 'creator1', consent_status: 'accepted' };
const detail = { campaign, deliverables: [{ id: 'deliverable1', title: 'Hero video', platform: 'Instagram', status: 'submitted', creator_user_id: 'creator1', content_url: 'https://example.com/draft', due_at: '2026-09-28T12:00:00Z' }], assignments: [assignment], brandRequests: [], events: [{ id: 'event1', event_type: 'submit', created_at: '2026-09-23T12:00:00Z', content_url: 'https://example.com/draft' }], metrics: [] };
const secondDetail = { campaign: second, deliverables: [], assignments: [], brandRequests: [], events: [], metrics: [] };

const json = value => ({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
const token = role => `x.${Buffer.from(JSON.stringify({ id: role === 'agency' ? 'manager1' : 'brand1', name: role === 'agency' ? 'Agency Manager' : 'Brand Reviewer', role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64')}.x`;

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [width, height, suffix] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
      for (const role of ['agency', 'brand']) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        await page.addInitScript(value => sessionStorage.setItem('ccf_session', value), token(role));
        await page.route('**/api/collaboration/workspace', route => route.fulfill(json(role === 'agency'
          ? { organizations: [{ id: 'org_a', type: 'agency', name: 'Studio North' }], campaigns: [campaign, second], assignments: [assignment] }
          : { organizations: [{ id: 'org_b', type: 'brand', name: 'Vela Active' }], campaigns: [campaign], assignments: [] })));
        await page.route('**/api/collaboration/brand-requests', route => route.fulfill(json({ requests: [{ id: 'request1', campaign_name: 'Spring in motion', brand_name: 'Vela Active' }] })));
        await page.route('**/api/collaboration/campaigns/*', route => route.fulfill(json(route.request().url().endsWith('camp2') ? secondDetail : detail)));
        await page.goto(`${base}/${role}.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.cd-page-head');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) throw new Error(`${role} ${width}px overflows by ${overflow}px`);
        await page.screenshot({ path: `assets/demo/${role}-${suffix}.png` });
        console.log(role, suffix, 'captured');
        await page.close();
      }
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await page.addInitScript(value => sessionStorage.setItem('ccf_session', value), token('agency'));
      await page.route('**/api/collaboration/campaigns/*', route => route.fulfill(json(detail)));
      await page.goto(`${base}/campaign.html?id=camp1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cd-campaign-title');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 0) throw new Error(`campaign ${width}px overflows by ${overflow}px`);
      await page.screenshot({ path: `assets/demo/journey-${suffix}.png` });
      console.log('campaign', suffix, 'captured');
      await page.close();
    }
    for (const [width, height, suffix] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
      for (const route of ['landing', 'agency', 'brand', 'creator', 'journey', 'signup', 'login']) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const failures = [];
        page.on('pageerror', error => failures.push(error.message));
        await page.goto(`${base}/#${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(route === 'landing' ? '.ccf-n-hero' : route === 'journey' ? '.pilot-campaign-demo' : ['signup', 'login'].includes(route) ? '.pilot-auth-shell' : '.ccf-preview-shell');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) throw new Error(`${route} ${width}px overflows by ${overflow}px`);
        if (failures.length) throw new Error(`${route} ${width}px page error: ${failures.join('; ')}`);
        await page.screenshot({ path: `.impeccable/review/${route}-${suffix}-viewport.png` });
        console.log(route, suffix, 'captured');
        await page.close();
      }
      const story = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await story.goto(`${base}/#review`, { waitUntil: 'domcontentloaded' });
      await story.waitForSelector('#review');
      await story.locator('#review').evaluate(element => element.scrollIntoView());
      const storyOverflow = await story.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (storyOverflow > 0) throw new Error(`review ${width}px overflows by ${storyOverflow}px`);
      await story.screenshot({ path: `.impeccable/review/review-${suffix}-viewport.png` });
      console.log('review', suffix, 'captured');
      await story.close();
      const published = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await published.goto(`${base}/#journey`, { waitUntil: 'domcontentloaded' });
      await published.waitForSelector('.pilot-campaign-demo');
      for (let step = 0; step < 3; step++) await published.locator('[data-action="campaign-next"]').click();
      await published.waitForSelector('.pilot-result-link');
      await published.locator('.pilot-result-record').scrollIntoViewIfNeeded();
      await published.screenshot({ path: `assets/demo/publish-${suffix}.png` });
      console.log('published result', suffix, 'captured');
      await published.close();
    }
    const interaction = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await interaction.goto(`${base}/#agency`, { waitUntil: 'domcontentloaded' });
    await interaction.locator('.ccf-preview-side nav button', { hasText: 'Campaigns' }).click();
    await interaction.waitForSelector('.ccf-preview-list');
    await interaction.locator('.public-nav .primary-link').click();
    await interaction.waitForSelector('#ccf-demo-request');
    if (!(await interaction.locator('#ccf-demo-request').isVisible())) throw new Error('Demo request was not reachable from role preview');
    console.log('preview tab and demo request interaction passed');
    await interaction.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
