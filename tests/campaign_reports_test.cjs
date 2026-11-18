'use strict';

// Shelved prototype test: report routes and dashboard entry points must be
// deliberately restored before running this. Not part of the active suite.

process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('../server');
const { memoryDb } = require('../services/memoryDb');
const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    async function request(route, token, body) {
        const response = await fetch(base + route, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        return { status: response.status, headers: response.headers, body: response.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await response.arrayBuffer()) : await response.json() };
    }
    try {
        const stamp = Date.now();
        const signup = async (role, label) => {
            const result = await request('/api/auth/signup', null, { name: `${label} Owner`, email: `${label}-${stamp}@example.com`, password: 'Valid-test-password-42', role, organization_name: `${label} Studio` });
            assert.equal(result.status, 201, JSON.stringify(result.body));
            return { token: result.body.token, id: result.body.userId, org: JSON.parse(Buffer.from(result.body.token.split('.')[1], 'base64url').toString()).organization_id };
        };
        const agency = await signup('agency', 'Agency');
        const brand = await signup('brand', 'Brand');
        const stranger = await signup('brand', 'Other');
        const campaignResult = await request('/api/collaboration/campaigns', agency.token, { organizationId: agency.org, brandOrganizationId: brand.org, name: 'Sample launch campaign', brief: 'One Reel and one Story for an illustrative client.', fixedFee: 12000 });
        assert.equal(campaignResult.status, 201, JSON.stringify(campaignResult.body));
        const campaign = campaignResult.body.campaign;
        memoryDb.campaigns.find(c => c.id === campaign.id).status = 'active';
        const route = `/api/collaboration/campaigns/${campaign.id}/reports`;
        assert.equal((await request(route, null)).status, 401);
        assert.equal((await request(route, stranger.token)).status, 403);
        assert.equal((await request(route, brand.token, { summary: 'Brand cannot create reports.' })).status, 403);
        assert.equal((await request(route, agency.token, { summary: 'Too short' })).status, 400);
        const payload = {
            objective: 'Publish one illustrative Instagram launch post and document its initial response.',
            successMeasure: '',
            summary: 'The sample post is live; early response is recorded, but success against a target cannot yet be judged.',
            interpretation: 'The post reached 1,234 accounts and recorded 93 likes by 22 September. These are manually entered initial results, not evidence of sales or a lift against a benchmark. No target was agreed in this example.',
            nextStep: 'Review the creative with the brand and agree a measurable target before the next post.',
            decisionNeeded: 'Confirm whether to continue with a second launch post and set the comparison target.',
            internalNotes: 'Internal agency margin and follow-up only.',
            posts: [{ label: 'Illustrative launch post', url: 'https://www.instagram.com/p/sample-post/', publishedOn: '2026-09-20', asOf: '2026-09-22', metrics: { reach: 1234, views: 1800, likes: 93, comments: 12 } }]
        };
        assert.equal((await request(route, agency.token, { ...payload, interpretation: '' })).status, 400);
        assert.equal((await request(route, agency.token, { ...payload, posts: [{ ...payload.posts[0], url: 'javascript:alert(1)' }] })).status, 400);
        const created = await request(route, agency.token, payload);
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const reportId = created.body.report.id;
        const brandWorkspace = await request('/api/collaboration/workspace', brand.token);
        assert.equal(brandWorkspace.status, 200);
        assert(brandWorkspace.body.campaigns.some(c => c.id === campaign.id));
        const brandList = await request(route, brand.token);
        assert.equal(brandList.status, 200);
        assert.equal(brandList.body.audience, 'brand');
        assert.equal(brandList.body.reports.length, 1);
        assert(!JSON.stringify(brandList.body).includes('Internal agency margin'));
        assert.equal(memoryDb.campaign_reports.find(r => r.id === reportId).narrative.objective, payload.objective);
        const pdfRoute = `${route}/${reportId}/pdf`;
        assert.equal((await request(pdfRoute, stranger.token)).status, 403);
        const agencyPdf = await request(pdfRoute, agency.token);
        const brandPdf = await request(pdfRoute, brand.token);
        assert.equal(agencyPdf.status, 200);
        assert.equal(brandPdf.status, 200);
        assert(agencyPdf.body.subarray(0, 5).equals(Buffer.from('%PDF-')));
        assert(brandPdf.body.subarray(0, 5).equals(Buffer.from('%PDF-')));
        assert.notDeepEqual(agencyPdf.body, brandPdf.body);
        assert.match(brandPdf.headers.get('content-disposition'), /brand-report\.pdf/);
        assert.equal(brandPdf.headers.get('cache-control'), 'private, no-store');
        memoryDb.campaigns.find(c => c.id === campaign.id).name = 'Changed later';
        assert.equal(memoryDb.campaign_reports.find(r => r.id === reportId).campaign_snapshot.name, 'Sample launch campaign');

        fs.mkdirSync(path.resolve('output/pdf'), { recursive: true });
        fs.mkdirSync(path.resolve('tmp/pdfs'), { recursive: true });
        fs.writeFileSync(path.resolve('output/pdf/ccf-brand-report-sample.pdf'), brandPdf.body);
        fs.writeFileSync(path.resolve('tmp/pdfs/ccf-agency-report-qa.pdf'), agencyPdf.body);

        browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/User/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe' });
        const errors = [];
        const loginPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
        loginPage.on('pageerror', error => errors.push(error.message));
        await loginPage.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
        await loginPage.goto(base + '/#login');
        assert(await loginPage.locator('input[type="email"]').count(), `Login form missing: ${loginPage.url()} ${JSON.stringify(errors)}`);
        await loginPage.locator('input[type="email"]').fill(`Agency-${stamp}@example.com`);
        await loginPage.locator('input[type="password"]').fill('Valid-test-password-42');
        await loginPage.getByRole('button', { name: 'Enter workspace' }).click();
        await loginPage.waitForURL('**/agency.html');
        assert.equal(await loginPage.evaluate(() => Boolean(sessionStorage.getItem('ccf_session'))), true);
        await loginPage.close();
        async function rolePage(token, pathname) {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
            await page.addInitScript(value => sessionStorage.setItem('ccf_session', value), token);
            await page.goto(base + pathname);
            await page.getByRole('button', { name: 'Reports', exact: true }).click();
            await page.getByRole('heading', { name: 'Campaign reports' }).waitFor();
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            return page;
        }
        const agencyPage = await rolePage(agency.token, '/agency.html');
        assert(await agencyPage.getByRole('heading', { name: 'Create a report' }).count());
        await agencyPage.getByLabel('Campaign objective Required').fill(payload.objective);
        await agencyPage.getByLabel('Headline takeaway Required').fill('A second sample report created from the agency form.');
        await agencyPage.getByLabel('What the evidence means Required').fill(payload.interpretation);
        await agencyPage.getByLabel('Recommended next step Required').fill(payload.nextStep);
        await agencyPage.getByRole('button', { name: 'Create report' }).click();
        await agencyPage.getByText('Report saved. The linked brand can now download its version.').waitFor();
        fs.mkdirSync(path.resolve('.stitch-qa/reports'), { recursive: true });
        await agencyPage.screenshot({ path: path.resolve('.stitch-qa/reports/agency-phone.png'), fullPage: true });
        const agencyDownload = agencyPage.waitForEvent('download');
        await agencyPage.getByRole('button', { name: 'Download agency PDF' }).first().click();
        assert.match((await agencyDownload).suggestedFilename(), /agency-report\.pdf/);
        const brandPage = await rolePage(brand.token, '/brand.html');
        assert.equal(await brandPage.getByRole('heading', { name: 'Create a report' }).count(), 0);
        await brandPage.getByRole('button', { name: 'Download brand PDF' }).first().waitFor();
        await brandPage.screenshot({ path: path.resolve('.stitch-qa/reports/brand-phone.png'), fullPage: true });
        const brandDownload = brandPage.waitForEvent('download');
        await brandPage.getByRole('button', { name: 'Download brand PDF' }).first().click();
        assert.match((await brandDownload).suggestedFilename(), /brand-report\.pdf/);
        assert.deepEqual(errors, []);
        console.log('Campaign reports: role access, snapshots, validation, PDF downloads, agency creation and brand mobile view passed.');
    } finally {
        if (browser) await browser.close();
        server.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
