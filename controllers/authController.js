// ==========================================================================
// Creator Cash Flow - User Authentication Controller (Signup & Login)
// ==========================================================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
    JWT_SECRET,
    BCRYPT_ROUNDS,
    RESEND_API_KEY
} = require('../config/env');
const emailService = require('../services/emailService');
const bcrypt = require('../services/bcrypt');
const { supabase } = require('../services/supabase');
const { memoryDb, findUserByEmail } = require('../services/memoryDb');

async function signup(req, res) {
    if (process.env.NODE_ENV === 'production' && !supabase) {
        return res.status(503).json({ error: 'Account registration is temporarily unavailable. Please try again later.' });
    }
    let createdUserId = null;
    let createdOrgId = null;
    try {
        const { email, password, name, role = 'creator', organization_name = '', organizationName = '' } = req.body;
        
        // Validate role
        if (!['creator', 'agency', 'brand'].includes(role)) {
            return res.status(400).json({ error: 'Invalid account role.' });
        }
        const effectiveOrgName = organization_name || organizationName || '';
        const orgName = typeof effectiveOrgName === 'string' ? effectiveOrgName.trim().slice(0, 120) : '';
        if (role !== 'creator' && orgName.length < 2) return res.status(400).json({ error: 'Organization name is required for an agency or brand account.' });

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        
        let orgId = null;
        if (role !== 'creator') {
            orgId = 'org_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        }

        const newUserObj = {
            id: userId,
            email: email.toLowerCase(),
            passwordHash,
            password_hash: passwordHash,
            name,
            role,
            organization_id: orgId,
            plan_tier: 'Free',
            status: 'active',
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
            if (existing) {
                return res.status(400).json({ success: false, error: 'An account with this email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
            }
            
            const userRow = {
                id: userId,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                name,
                role,
                organization_id: orgId
            };

            let { error } = await supabase.from('users').insert([userRow]);
            if (error && error.message && error.message.includes('column')) {
                // Graceful fallback if optional columns role/organization_id are not yet in public.users
                delete userRow.role;
                delete userRow.organization_id;
                const retry = await supabase.from('users').insert([userRow]);
                error = retry.error;
            }

            if (error) throw error;
            createdUserId = userId;
            if (orgId) {
                const { error: orgError } = await supabase.from('organizations').insert([{ id: orgId, name: orgName, type: role, created_by: userId }]);
                if (orgError) throw orgError;
                createdOrgId = orgId;
                const { error: memberError } = await supabase.from('organization_members').insert([{ organization_id: orgId, user_id: userId, role: 'owner', status: 'active' }]);
                if (memberError) throw memberError;
            }
        } else {
            const existing = findUserByEmail(email);
            if (existing) {
                return res.status(400).json({ success: false, error: 'An account with this email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
            }
        }

        // Dual-write to memoryDb so fallback reads are synchronized
        if (!memoryDb.usersByEmail.has(newUserObj.email)) {
            memoryDb.users.push(newUserObj);
            memoryDb.usersByEmail.set(newUserObj.email, newUserObj);
            memoryDb.usersById.set(newUserObj.id, newUserObj);
            
            if (orgId) {
                if (!memoryDb.organizations) memoryDb.organizations = [];
                memoryDb.organizations.push({ id: orgId, name: orgName, type: role, created_by: userId });
                memoryDb.organization_members.push({ organization_id: orgId, user_id: userId, role: 'owner', status: 'active' });
            }
        }

        // Generate session token WITH role
        const token = jwt.sign(
            { id: userId, email: email.toLowerCase(), name, role, organization_id: orgId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        if (RESEND_API_KEY) {
            console.log('[RESEND] Sending signup verification code email');
            const code = await createAuthCode(email, 'signup_code', SIGNUP_CODE_TTL_MIN).catch(err => { console.error('[AUTH CODE]', err.message); return null; });
            if (code) {
                const tpl = emailService.signupCodeEmail({ name, code, expiresInHours: SIGNUP_CODE_TTL_MIN / 60 });
                emailService.sendEmail({ to: email.toLowerCase(), subject: tpl.subject, html: tpl.html, text: tpl.text })
                    .catch(err => console.error('[RESEND DISPATCH ERROR]', err));
            }
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            userId,
            email,
            token,
            role
        });
    } catch (err) {
        console.error(err);
        if (supabase && createdUserId) {
            if (createdOrgId) await supabase.from('organizations').delete().eq('id', createdOrgId);
            await supabase.from('users').delete().eq('id', createdUserId);
        }
        res.status(500).json({ success: false, error: 'Server error during signup.', code: 'SIGNUP_ERROR' });
    }
}

async function login(req, res) {
    if (process.env.NODE_ENV === 'production' && !supabase) {
        return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again later.' });
    }
    try {
        const { email, password } = req.body;
        let user = null;

        if (supabase) {
            const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
            if (!data || error) {
                return res.status(401).json({ success: false, error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
            }
            let resolvedRole = data.role || 'creator';
            let resolvedOrgId = data.organization_id || null;

            if (!resolvedOrgId || resolvedRole === 'creator') {
                try {
                    const { data: member } = await supabase.from('organization_members')
                        .select('organization_id, role')
                        .eq('user_id', data.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    if (member) {
                        resolvedOrgId = member.organization_id;
                        if (['owner', 'manager', 'analyst'].includes(member.role)) {
                            resolvedRole = 'agency';
                        } else if (member.role === 'brand_viewer') {
                            resolvedRole = 'brand';
                        }
                    }
                } catch (_) {}
            }

            user = {
                id: data.id,
                name: data.name,
                email: data.email,
                passwordHash: data.password_hash,
                role: resolvedRole,
                organization_id: resolvedOrgId
            };
        } else {
            const memUser = findUserByEmail(email);
            if (!memUser) {
                return res.status(401).json({ success: false, error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
            }
            user = memUser;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
        }

        const sessionToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role || 'creator', organization_id: user.organization_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: sessionToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'creator'
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error during login.', code: 'LOGIN_ERROR' });
    }
}

// ---------------------------------------------------------------------------
// One-time auth codes (signup verification + password reset).
// Codes are 6 digits; only the SHA-256 hash is stored (auth_codes table in D1,
// memoryDb.auth_codes in the node fallback).
// ---------------------------------------------------------------------------

const SIGNUP_CODE_TTL_MIN = 24 * 60;
const RESET_CODE_TTL_MIN = 15;
const MAX_CODE_ATTEMPTS = 5;

function hashCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function createAuthCode(email, purpose, ttlMinutes) {
    const code = generateCode();
    const row = {
        id: 'cod_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
        email: email.toLowerCase(),
        code_hash: hashCode(code),
        purpose,
        expires_at: new Date(Date.now() + ttlMinutes * 60000).toISOString(),
        used_at: null,
        attempts: 0,
        created_at: new Date().toISOString()
    };
    if (supabase) {
        const { error } = await supabase.from('auth_codes').insert([row]);
        if (error) throw error;
    } else {
        memoryDb.auth_codes.push(row);
    }
    return code;
}

// Returns the matching unused, unexpired row if the code is correct; otherwise null.
// Every attempt (right or wrong) bumps `attempts`; after MAX_CODE_ATTEMPTS the code is dead.
async function consumeAuthCode(email, purpose, code) {
    if (!/^[0-9]{6}$/.test(String(code || ''))) return null;
    const normalized = email.toLowerCase();
    let rows = [];
    if (supabase) {
        const { data, error } = await supabase.from('auth_codes').select('*').eq('email', normalized).eq('purpose', purpose);
        if (error) throw error;
        rows = data || [];
    } else {
        rows = memoryDb.auth_codes.filter(r => r.email === normalized && r.purpose === purpose);
    }
    const candidates = rows
        .filter(r => !r.used_at && r.expires_at > new Date().toISOString() && r.attempts < MAX_CODE_ATTEMPTS)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    for (const row of candidates) {
        row.attempts = (row.attempts || 0) + 1;
        if (supabase) await supabase.from('auth_codes').update({ attempts: row.attempts }).eq('id', row.id);
        if (row.code_hash === hashCode(code)) {
            row.used_at = new Date().toISOString();
            if (supabase) await supabase.from('auth_codes').update({ used_at: row.used_at }).eq('id', row.id);
            else { const i = memoryDb.auth_codes.findIndex(r => r.id === row.id); if (i >= 0) memoryDb.auth_codes[i] = row; }
            return row;
        }
    }
    return null;
}

async function findUserRowByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (supabase) {
        const { data } = await supabase.from('users').select('*').eq('email', normalized).maybeSingle();
        return data || null;
    }
    return findUserByEmail(normalized) || null;
}

// POST /api/auth/verify-signup { email, code } — verifies the signup code, sends welcome email.
async function verifySignup(req, res) {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const code = String(req.body?.code || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.', code: 'INVALID_EMAIL' });
        }
        const user = await findUserRowByEmail(email);
        if (!user) return res.status(400).json({ success: false, error: 'No account found for this email.', code: 'NO_ACCOUNT' });
        const row = await consumeAuthCode(email, 'signup_code', code);
        if (!row) return res.status(400).json({ success: false, error: 'Invalid or expired code.', code: 'INVALID_CODE' });
        if (RESEND_API_KEY) {
            const tpl = emailService.welcomeEmail({ name: user.name });
            emailService.sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text })
                .catch(err => console.error('[RESEND DISPATCH ERROR]', err));
        }
        return res.json({ success: true, message: 'Email verified. Welcome to Creator Cash Flow!' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Server error during verification.', code: 'VERIFY_ERROR' });
    }
}

// POST /api/auth/forgot-password { email } — always 202; sends a reset code if the account exists.
async function forgotPassword(req, res) {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.', code: 'INVALID_EMAIL' });
        }
        const user = await findUserRowByEmail(email);
        if (user && RESEND_API_KEY) {
            const code = await createAuthCode(email, 'password_reset', RESET_CODE_TTL_MIN);
            const tpl = emailService.passwordResetEmail({
                name: user.name,
                code,
                resetUrl: `${process.env.APP_ORIGIN || 'https://creatorcashflow.co.za'}/index.html`
            });
            emailService.sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text })
                .catch(err => console.error('[RESEND DISPATCH ERROR]', err));
        }
        return res.status(202).json({ success: true, message: 'If an account exists for this email, a reset code is on its way.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Server error during password reset request.', code: 'RESET_REQUEST_ERROR' });
    }
}

// POST /api/auth/reset-password { email, code, password } — consumes the code and sets a new password.
async function resetPassword(req, res) {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const code = String(req.body?.code || '').trim();
        const password = req.body?.password;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.', code: 'INVALID_EMAIL' });
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return res.status(400).json({ success: false, error: 'Password must be between 8 and 128 characters.', code: 'INVALID_PASSWORD_LENGTH' });
        }
        const user = await findUserRowByEmail(email);
        if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired code.', code: 'INVALID_CODE' });
        const row = await consumeAuthCode(email, 'password_reset', code);
        if (!row) return res.status(400).json({ success: false, error: 'Invalid or expired code.', code: 'INVALID_CODE' });
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        if (supabase) {
            const { error } = await supabase.from('users').update({ password_hash: passwordHash }).eq('id', user.id);
            if (error) throw error;
        }
        const memUser = findUserByEmail(email);
        if (memUser) { memUser.passwordHash = passwordHash; memUser.password_hash = passwordHash; }
        return res.json({ success: true, message: 'Password updated. You can sign in with your new password.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Server error during password reset.', code: 'RESET_ERROR' });
    }
}

module.exports = {
    signup,
    login,
    verifySignup,
    forgotPassword,
    resetPassword
};
