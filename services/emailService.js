'use strict';
// ==========================================================================
// Creator Cash Flow — Resend email service & branded HTML templates.
// Worker-safe (no fs): used by Express routes/controllers AND worker/cron.js.
//
// Design rules for the templates:
//   - table layout + inline CSS only (Gmail/Outlook strip <style> blocks)
//   - dark brand header (#100e13) with the approved paper (light) logo PNG
//     served from APP_ORIGIN (SVG is unreliable in email clients, so use PNG)
//   - orange pill CTA (#ff5b00), light body (#ffffff) on #f2f2f2 canvas
//   - every HTML email ships with a plain-text fallback
// ==========================================================================

const { RESEND_API_KEY, RESEND_API_URL, FROM_EMAIL } = require('../config/env');

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function appOrigin() {
    return process.env.APP_ORIGIN || 'https://creatorcashflow.co.za';
}

// Branded shell. innerHtml is the body content; cta is optional.
function renderEmail({ eyebrow, heading, intro, bodyHtml = '', ctaText, ctaUrl, note }) {
    const logoUrl = `${appOrigin()}/brand/approved-logo-paper.png`;
    const eyebrowHtml = eyebrow
        ? `<p style="margin:0 0 16px;"><span style="display:inline-block;background-color:#f2f2f2;color:#ff5b00;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:4px 10px;border-radius:999px;">${esc(eyebrow)}</span></p>`
        : '';
    const ctaHtml = ctaText && ctaUrl
        ? `<p style="margin:28px 0;"><a href="${esc(ctaUrl)}" style="background-color:#ff5b00;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-weight:600;font-size:15px;display:inline-block;">${esc(ctaText)} &rarr;</a></p>`
        : '';
    const noteHtml = note
        ? `<p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:24px 0 0;">${note}</p>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background-color:#f2f2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;">
  <tr>
    <td style="background-color:#100e13;padding:22px 32px;">
      <img src="${esc(logoUrl)}" alt="Creator Cash Flow" height="30" style="display:block;height:30px;width:auto;border:0;">
    </td>
  </tr>
  <tr>
    <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#100e13;">
      ${eyebrowHtml}
      <h1 style="font-size:24px;font-weight:600;line-height:1.25;margin:0 0 12px;color:#100e13;">${esc(heading)}</h1>
      ${intro ? `<p style="font-size:15px;line-height:1.6;color:#444444;margin:0 0 20px;">${intro}</p>` : ''}
      ${bodyHtml}
      ${ctaHtml}
      ${noteHtml}
    </td>
  </tr>
  <tr>
    <td style="background-color:#f2f2f2;padding:20px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <p style="font-size:12px;line-height:1.6;color:#888888;margin:0;">
        Creator Cash Flow &middot; <a href="${esc(appOrigin())}" style="color:#888888;">creatorcashflow.co.za</a><br>
        You received this email because you have a Creator Cash Flow account or were invited to one.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Central Resend call. Returns { ok, status, id }.
async function sendEmail({ to, subject, html, text, replyTo }) {
    if (!RESEND_API_KEY) {
        console.log('[EMAIL] skipped (no RESEND_API_KEY):', subject, '->', to);
        return { ok: false, status: 0 };
    }
    const payload = {
        from: FROM_EMAIL,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {})
    };
    const run = (async () => {
        try {
            const res = await fetch(`${RESEND_API_URL || 'https://api.resend.com'}/emails`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) console.warn('[EMAIL] send failed:', res.status, JSON.stringify(body).slice(0, 200));
            return { ok: res.ok, status: res.status, id: body.id };
        } catch (err) {
            console.warn('[EMAIL] error:', err.message);
            return { ok: false, status: 0 };
        }
    })();
    // In the Worker, keep the isolate alive until the send finishes even when
    // the caller does not await (fire-and-forget from controllers).
    if (typeof globalThis.__CCF_WAITUNTIL__ === 'function') {
        globalThis.__CCF_WAITUNTIL__(run.catch(() => {}));
    }
    return run;
}

// --------------------------------------------------------------------------
// Templates — each returns { subject, html, text }
// --------------------------------------------------------------------------

function welcomeEmail({ name }) {
    const subject = 'Welcome to Creator Cash Flow';
    const heading = `Welcome aboard${name ? `, ${name}` : ''}`;
    const html = renderEmail({
        eyebrow: 'Account created',
        heading,
        intro: 'Your Creator Cash Flow account is ready. Set up your first campaign, invite creators, and track every deliverable and payment in one workspace.',
        ctaText: 'Open your workspace',
        ctaUrl: `${appOrigin()}/campaign.html`,
        note: 'For support, reply to this email or write to reamogetswemolefe@creatorcashflow.co.za. This email does not verify ownership of your email address.'
    });
    const text = `Welcome to Creator Cash Flow${name ? `, ${name}` : ''}.\n\nYour account has been created. Open your workspace: ${appOrigin()}/campaign.html\n\nFor support, contact reamogetswemolefe@creatorcashflow.co.za. This email does not verify ownership of your email address.`;
    return { subject, html, text };
}

function inviteEmail({ orgName, inviterName, roleLabel, inviteUrl }) {
    const subject = `You've been invited to join ${orgName} on Creator Cash Flow`;
    const html = renderEmail({
        eyebrow: 'Workspace invitation',
        heading: `Join ${orgName}`,
        intro: `<strong>${esc(inviterName)}</strong> has invited you to collaborate as a <strong>${esc(roleLabel)}</strong> in their Creator Cash Flow workspace.`,
        ctaText: 'Accept invitation',
        ctaUrl: inviteUrl,
        note: `Or copy and paste this link into your browser: ${esc(inviteUrl)}<br><br>This invitation link will expire in 7 days. If you were not expecting this invitation, you can safely ignore this email.`
    });
    const text = `You've been invited to join ${orgName} on Creator Cash Flow as a ${roleLabel} by ${inviterName}.\n\nAccept your invitation here: ${inviteUrl}\n\nThis invitation link will expire in 7 days.`;
    return { subject, html, text };
}

function demoRequestEmail({ name, demoUrl, replyTo }) {
    const subject = 'Your Creator Cash Flow interactive demo';
    const html = renderEmail({
        eyebrow: 'Interactive demo',
        heading: `Here's your demo, ${name}`,
        intro: 'Explore a full Creator Cash Flow campaign with sample data — briefs, deliverables, invoices and payouts. Actions in the demo do not notify anyone or move money.',
        ctaText: 'Start the demo',
        ctaUrl: demoUrl,
        note: 'If you would like to walk through a real campaign with us, reply to this email.'
    });
    const text = `Hi ${name},\n\nHere is your interactive Creator Cash Flow campaign demo: ${demoUrl}\n\nIt uses sample data. Actions in the demo do not notify anyone or move money.\n\nIf you would like to walk through a real campaign with us, reply to this email.\n\nCreator Cash Flow`;
    return { subject, html, text, replyTo };
}

function demoRequestNotification({ name, email }) {
    const subject = 'New CCF demo request';
    const html = renderEmail({
        eyebrow: 'Demo request',
        heading: 'A visitor requested the interactive demo',
        bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:#100e13;">
            <tr><td style="padding:4px 16px 4px 0;color:#6b6b6b;">Name</td><td style="padding:4px 0;"><strong>${esc(name)}</strong></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b6b6b;">Email</td><td style="padding:4px 0;"><strong>${esc(email)}</strong></td></tr>
        </table>`,
        note: 'The demo email was accepted by the email provider.'
    });
    const text = `A visitor requested the interactive demo.\n\nName: ${name}\nEmail: ${email}\n\nThe demo email was accepted by the email provider.`;
    return { subject, html, text };
}

function dueSoonEmail({ creatorName, title, campaignName, due, campaignId }) {
    const subject = `Due soon: ${title} — ${campaignName}`;
    const url = `${appOrigin()}/campaign.html?id=${encodeURIComponent(campaignId)}`;
    const html = renderEmail({
        eyebrow: 'Automated nudge',
        heading: 'A deliverable is due soon',
        intro: `Hi ${esc(creatorName)},`,
        bodyHtml: `<p style="font-size:15px;line-height:1.6;color:#100e13;"><strong>${esc(title)}</strong> in campaign <strong>${esc(campaignName)}</strong> is due <strong>${esc(due)}</strong> and is still marked &ldquo;pending&rdquo;. Open the workspace to submit or update it:</p>`,
        ctaText: 'Open campaign',
        ctaUrl: url,
        note: 'Creator Cash Flow — automated nudge, no reply needed.'
    });
    const text = `Hi ${creatorName},\n\n${title} in campaign ${campaignName} is due ${due}. Open the workspace to submit or update it: ${url}\n\nCreator Cash Flow — automated nudge, no reply needed.`;
    return { subject, html, text };
}

function needsDecisionEmail({ managerName, title, campaignName, status, campaignId }) {
    const subject = `Needs a decision: ${title} — ${campaignName}`;
    const url = `${appOrigin()}/campaign.html?id=${encodeURIComponent(campaignId)}`;
    const html = renderEmail({
        eyebrow: 'Automated nudge',
        heading: 'A draft needs a decision',
        intro: `Hi ${esc(managerName)},`,
        bodyHtml: `<p style="font-size:15px;line-height:1.6;color:#100e13;"><strong>${esc(title)}</strong> in campaign <strong>${esc(campaignName)}</strong> has been waiting in &ldquo;${esc(status)}&rdquo; for over 3 days. Approve it or request changes:</p>`,
        ctaText: 'Review draft',
        ctaUrl: url,
        note: 'Creator Cash Flow — automated nudge, no reply needed.'
    });
    const text = `Hi ${managerName},\n\n${title} in campaign ${campaignName} has been waiting in "${status}" for over 3 days. Approve it or request changes: ${url}\n\nCreator Cash Flow — automated nudge, no reply needed.`;
    return { subject, html, text };
}

function reportDueEmail({ managerName, campaignName, publishedCount, campaignId }) {
    const subject = `Report due: ${campaignName} had ${publishedCount} deliverable(s) published`;
    const url = `${appOrigin()}/campaign.html?id=${encodeURIComponent(campaignId)}`;
    const html = renderEmail({
        eyebrow: 'Automated nudge',
        heading: 'Time to report back',
        intro: `Hi ${esc(managerName)},`,
        bodyHtml: `<p style="font-size:15px;line-height:1.6;color:#100e13;"><strong>${esc(String(publishedCount))}</strong> deliverable(s) in <strong>${esc(campaignName)}</strong> were published in the last 24 hours. Draft the campaign report while the results are fresh:</p>`,
        ctaText: 'Open campaign',
        ctaUrl: url,
        note: 'Creator Cash Flow — automated nudge, no reply needed.'
    });
    const text = `Hi ${managerName},\n\n${publishedCount} deliverable(s) in ${campaignName} were published in the last 24 hours. Draft the campaign report while the results are fresh: ${url}\n\nCreator Cash Flow — automated nudge, no reply needed.`;
    return { subject, html, text };
}

// Big centered code box used by the one-time-code emails.
function codeBox(code) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background-color:#f2f2f2;border:1px solid #e4e4e4;border-radius:12px;padding:18px 32px;">
            <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#100e13;">${esc(code)}</span>
        </td></tr>
    </table>`;
}

function signupCodeEmail({ name, code, expiresInHours = 24 }) {
    const subject = 'Your Creator Cash Flow verification code';
    const html = renderEmail({
        eyebrow: 'Verify your email',
        heading: `Confirm your email${name ? `, ${name}` : ''}`,
        intro: 'Enter this code in the app to verify your email address and finish setting up your account.',
        bodyHtml: codeBox(code),
        note: `This code expires in ${expiresInHours} hours. If you didn't create a Creator Cash Flow account, you can safely ignore this email.`
    });
    const text = `Hi${name ? ` ${name}` : ''},\n\nYour Creator Cash Flow verification code is: ${code}\n\nEnter it in the app to verify your email. It expires in ${expiresInHours} hours.\n\nIf you didn't create an account, ignore this email.\n\nCreator Cash Flow`;
    return { subject, html, text };
}

function passwordResetEmail({ name, code, resetUrl, expiresInMinutes = 15 }) {
    const subject = 'Reset your Creator Cash Flow password';
    const html = renderEmail({
        eyebrow: 'Password reset',
        heading: 'Reset your password',
        intro: `Hi${name ? ` ${name}` : ''}, we received a request to reset the password for your Creator Cash Flow account. Use this code in the app's reset form:`,
        bodyHtml: codeBox(code),
        ctaText: 'Open Creator Cash Flow',
        ctaUrl: resetUrl,
        note: `This code expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password stays unchanged.`
    });
    const text = `Hi${name ? ` ${name}` : ''},\n\nWe received a request to reset your Creator Cash Flow password. Your reset code is: ${code}\n\nEnter it in the app's reset form (${resetUrl}). It expires in ${expiresInMinutes} minutes and works once.\n\nIf you didn't request this, ignore this email — your password stays unchanged.\n\nCreator Cash Flow`;
    return { subject, html, text };
}

module.exports = {
    esc,
    renderEmail,
    sendEmail,
    welcomeEmail,
    inviteEmail,
    demoRequestEmail,
    demoRequestNotification,
    dueSoonEmail,
    needsDecisionEmail,
    reportDueEmail,
    signupCodeEmail,
    passwordResetEmail
};
