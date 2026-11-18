'use strict';

const express = require('express');
const { createSlidingWindowLimiter } = require('../middleware/rateLimiter');
const { RESEND_API_KEY, FROM_EMAIL } = require('../config/env');
const emailService = require('../services/emailService');

const router = express.Router();
const limitRequests = createSlidingWindowLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    errorMessage: 'Too many demo requests',
    userFacingMessage: 'Too many requests from this connection. Please try again later.',
    maxTrackedKeys: 1000
});

const demoUrl = process.env.DEMO_PUBLIC_URL || 'https://creatorcashflow.co.za/#journey';
const requestInbox = process.env.DEMO_REQUEST_INBOX || 'reamogetswemolefe@creatorcashflow.co.za';

router.post('/', limitRequests, async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (req.body?.website) return res.status(202).json({ message: 'If this address can receive mail, the demo is on its way.' });
    if (name.length < 2 || name.length > 80 || /[\r\n<>]/.test(name)) {
        return res.status(400).json({ error: 'Enter your name (2–80 characters).' });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!RESEND_API_KEY || FROM_EMAIL.includes('onboarding@resend.dev')) {
        return res.status(503).json({ error: 'Demo email delivery is not ready yet. Please email us directly.' });
    }
    try {
        const tpl = emailService.demoRequestEmail({ name, demoUrl });
        const result = await emailService.sendEmail({
            to: email, subject: tpl.subject, html: tpl.html, text: tpl.text, replyTo: requestInbox
        });
        if (!result.ok) throw new Error(`Demo email provider returned ${result.status}`);
        const note = emailService.demoRequestNotification({ name, email });
        emailService.sendEmail({ to: requestInbox, subject: note.subject, html: note.html, text: note.text })
            .catch(error => console.error('[DEMO REQUEST NOTIFICATION]', error.message));
        return res.status(202).json({ message: 'Your interactive demo is on its way. Check your inbox.' });
    } catch (error) {
        console.error('[DEMO REQUEST DELIVERY]', error.message);
        return res.status(502).json({ error: 'We could not send the demo right now. Please try again or email us directly.' });
    }
});

module.exports = router;
