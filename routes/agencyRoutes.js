const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Middleware to protect agency routes
function requireAgency(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'agency') {
            return res.status(403).json({ error: 'Access denied: Agency role required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

router.post('/invite', requireAgency, (req, res) => {
    return res.status(410).json({ error: 'Roster email invitations are not available yet. Assign a registered creator from a campaign instead.' });
});

module.exports = router;
