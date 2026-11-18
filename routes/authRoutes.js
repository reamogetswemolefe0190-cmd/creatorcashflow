// ==========================================================================
// Creator Cash Flow - User Authentication Routes (/api/auth)
// ==========================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateSignup, validateLogin } = require('../middleware/validation');

// User Registration
router.post('/signup', authRateLimiter, validateSignup, authController.signup);
router.post('/register', authRateLimiter, validateSignup, authController.signup);

// User Login
router.post('/login', authRateLimiter, validateLogin, authController.login);

// Email verification code (sent by /signup) & password reset code flow
router.post('/verify-signup', authRateLimiter, authController.verifySignup);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);

module.exports = router;
