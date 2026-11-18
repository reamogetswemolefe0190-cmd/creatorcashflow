'use strict';

const express = require('express');
const controller = require('../controllers/collaborationController');
const workflow = require('../controllers/campaignWorkflowController');
const brandAccess = require('../controllers/brandAccessController');
const { authenticateToken } = require('../middleware/auth');
const { uploadMiddleware } = require('../services/storageService');
const router = express.Router();

// Public invitation inspection (no authentication required)
router.get('/invitations/:token', controller.getInvitation);

// Authenticated collaboration routes
router.use(authenticateToken);
router.get('/workspace', controller.getWorkspace);
router.post('/organizations', controller.createOrganization);
router.get('/organizations/:organizationId/invitations', controller.listInvitations);
router.post('/organizations/:organizationId/invitations', controller.inviteMember);
router.post('/invitations/:token/accept', controller.acceptInvitation);
router.post('/campaigns', controller.createCampaign);
router.post('/campaigns/:campaignId/creators', controller.assignCreator);
router.post('/campaigns/:campaignId/accept', controller.acceptAssignment);
router.post('/campaigns/:campaignId/milestones', controller.createMilestone);
router.get('/brand-requests', brandAccess.pending);
router.post('/brand-requests/:requestId/respond', brandAccess.respond);
router.post('/campaigns/:campaignId/brand-request', brandAccess.requestAccess);
router.get('/campaigns/:campaignId', workflow.details);
router.post('/campaigns/:campaignId/deliverables', workflow.create);
router.post('/campaigns/:campaignId/deliverables/:deliverableId/transition', workflow.transition);
router.post('/campaigns/:campaignId/deliverables/:deliverableId/upload', uploadMiddleware.single('file'), workflow.uploadDeliverableAsset);
router.post('/campaigns/:campaignId/deliverables/:deliverableId/metrics', workflow.addManualMetric);
router.get('/campaigns/:campaignId/messages', controller.getMessages);
router.post('/campaigns/:campaignId/messages', controller.addMessage);

module.exports = router;
