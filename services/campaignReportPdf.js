'use strict';

const { PDFDocument } = require('pdfkit');

const ink = '#222222';
const muted = '#333333';
const orange = '#ff5b00';
const line = '#dddddd';
const paper = '#f2f2f2';
const margin = 52;
const pageWidth = 595.28;
const contentWidth = pageWidth - margin * 2;
const date = value => value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not recorded';
const value = input => String(input == null || input === '' ? 'Not recorded' : input);

function renderCampaignReport(report, audience) {
    if (!['agency', 'brand'].includes(audience)) throw new Error('Invalid report audience.');
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margins: { top: margin, right: margin, left: margin, bottom: 95 }, bufferPages: true, info: { Title: `${value(report.campaign_snapshot.name)} - ${audience} report`, Author: 'Creator Cash Flow' } });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        const ensure = height => { if (doc.y + height > doc.page.height - 95) doc.addPage(); };
        const section = title => {
            ensure(55);
            doc.x = margin;
            doc.moveDown(1.15).font('Helvetica-Bold').fontSize(12).fillColor(ink).text(title);
            doc.moveDown(.35).strokeColor(line).lineWidth(.7).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
            doc.moveDown(.55);
        };
        const label = (name, content) => {
            ensure(42);
            doc.x = margin;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text(name.toUpperCase(), { continued: false });
            doc.x = margin;
            doc.font('Helvetica').fontSize(10).fillColor(ink).text(value(content), { width: contentWidth, lineGap: 2 });
            doc.moveDown(.6);
        };
        const snap = report.campaign_snapshot;
        const narrative = report.narrative || {};
        const measuredPosts = report.posts.filter(post => Object.keys(post.metrics || {}).length).length;
        const latestResult = report.posts.map(post => post.asOf).filter(Boolean).sort().at(-1);

        doc.rect(0, 0, pageWidth, 12).fill(orange);
        doc.y = 48;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(orange).text('CREATOR CASH FLOW');
        doc.moveDown(.5).font('Helvetica').fontSize(10).fillColor(muted).text(audience === 'agency' ? 'Agency campaign report' : 'Brand campaign report');
        doc.moveDown(.35).font('Helvetica-Bold').fontSize(26).fillColor(ink).text(value(snap.name), { width: contentWidth });
        doc.moveDown(.45).font('Helvetica').fontSize(9).fillColor(muted).text(`Report prepared ${date(report.created_at)}  |  Snapshot ${report.id}`);
        doc.moveDown(.8);
        doc.roundedRect(margin, doc.y, contentWidth, 58, 12).fill(paper);
        const cardY = doc.y + 13;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text('AGENCY', margin + 16, cardY, { width: 210 });
        doc.font('Helvetica').fontSize(11).fillColor(ink).text(value(snap.agency_name), margin + 16, cardY + 16, { width: 210 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text('BRAND', margin + 255, cardY, { width: 210 });
        doc.font('Helvetica').fontSize(11).fillColor(ink).text(value(snap.brand_name), margin + 255, cardY + 16, { width: 210 });
        doc.x = margin;
        doc.y = cardY + 58;

        section('Executive readout');
        doc.x = margin;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(ink).text(report.summary, { width: contentWidth, lineGap: 4 });
        doc.moveDown(.65);
        label('Campaign objective', narrative.objective || 'The agency did not record an objective for this snapshot.');
        label('Success measure', narrative.successMeasure || 'No agreed target or benchmark was recorded. This report cannot establish whether a quantitative goal was met.');

        section('What was delivered');
        label('Published links', `${report.posts.length} post${report.posts.length === 1 ? '' : 's'} included; ${measuredPosts} with manually entered results.`);
        if (latestResult) label('Latest results date', date(latestResult));
        label('Campaign record', `${value(snap.status).replace(/_/g, ' ')} at report creation${snap.starts_on || snap.ends_on ? `; ${date(snap.starts_on)} to ${date(snap.ends_on)}` : '; campaign dates not recorded'}.`);

        section('Results and evidence');
        if (!report.posts.length) doc.font('Helvetica').fontSize(10).fillColor(muted).text('No published post links or results were supplied for this snapshot.');
        report.posts.forEach((post, index) => {
            ensure(105);
            doc.x = margin;
            doc.font('Helvetica-Bold').fontSize(11).fillColor(ink).text(`${value(post.label || `Post ${index + 1}`)}  |  Published ${date(post.publishedOn)}`);
            doc.moveDown(.28).font('Helvetica').fontSize(9).fillColor(orange).text(post.url, { width: contentWidth, link: post.url, underline: true });
            doc.moveDown(.25);
            const entries = Object.entries(post.metrics || {});
            if (entries.length) {
                doc.font('Helvetica').fontSize(10).fillColor(ink).text(entries.map(([name, number]) => `${name[0].toUpperCase()}${name.slice(1)}: ${Number(number).toLocaleString('en-ZA')}`).join('   |   '), { width: contentWidth, lineGap: 2 });
                doc.moveDown(.22).font('Helvetica').fontSize(9).fillColor(muted).text(`${post.source}  |  Results as of ${date(post.asOf)}`);
            } else doc.font('Helvetica').fontSize(9).fillColor(muted).text('No performance results supplied.');
            doc.moveDown(.8);
        });

        section('What the evidence means');
        doc.x = margin;
        doc.font('Helvetica').fontSize(10).fillColor(ink).text(narrative.interpretation || 'No interpretation was recorded by the agency for this snapshot.', { width: contentWidth, lineGap: 3 });

        section('What happens next');
        label('Recommended action', narrative.nextStep || 'No next action was recorded.');
        if (narrative.decisionNeeded) label('Decision requested from the brand', narrative.decisionNeeded);

        if (audience === 'agency') {
            section('Agency notes');
            doc.x = margin;
            doc.font('Helvetica').fontSize(10).fillColor(ink).text(report.internal_notes || 'No internal notes recorded.', { width: contentWidth, lineGap: 3 });
            doc.moveDown(.45);
            label('Recorded fixed fee', snap.fixed_fee == null ? 'Not recorded' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: snap.currency || 'ZAR' }).format(Number(snap.fixed_fee)));
        }
        section('How to read the numbers');
        doc.x = margin;
        doc.font('Helvetica').fontSize(9).fillColor(muted).text('This is a dated campaign snapshot. Results were supplied manually by the agency and have not been verified by a connected platform. Missing values are not estimates. Post reach is not a deduplicated campaign audience; views and reach are different measures. No return-on-investment claim is made from these figures.', { width: contentWidth, lineGap: 3 });

        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
            doc.switchToPage(i);
            const contentBottom = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.strokeColor(line).lineWidth(.7).moveTo(margin, doc.page.height - 82).lineTo(pageWidth - margin, doc.page.height - 82).stroke();
            doc.font('Helvetica').fontSize(8).fillColor(muted).text('Creator Cash Flow  |  Campaign report', margin, doc.page.height - 70, { width: 330 });
            doc.text(`${i + 1} / ${pages.count}`, pageWidth - margin - 70, doc.page.height - 70, { width: 70, align: 'right' });
            doc.page.margins.bottom = contentBottom;
        }
        doc.end();
    });
}

module.exports = { renderCampaignReport };
