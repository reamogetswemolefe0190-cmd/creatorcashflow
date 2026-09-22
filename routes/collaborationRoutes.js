'use strict';

const express = require('express');
const controller = require('../controllers/collaborationController');
const reports = require('../controllers/campaignReportController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.get('/workspace', controller.getWorkspace);
router.post('/organizations', controller.createOrganization);
router.post('/organizations/:organizationId/invitations', controller.inviteMember);
router.post('/campaigns', controller.createCampaign);
router.post('/campaigns/:campaignId/creators', controller.assignCreator);
router.post('/campaigns/:campaignId/accept', controller.acceptAssignment);
router.post('/campaigns/:campaignId/milestones', controller.createMilestone);
router.get('/campaigns/:campaignId/messages', controller.getMessages);
router.post('/campaigns/:campaignId/messages', controller.addMessage);
router.get('/campaigns/:campaignId/reports', reports.list);
router.post('/campaigns/:campaignId/reports', reports.create);
router.get('/campaigns/:campaignId/reports/:reportId/pdf', reports.download);

module.exports = router;
