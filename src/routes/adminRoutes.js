const express = require('express');
const { body } = require('express-validator');
const admin = require('../controllers/adminController');
const elections = require('../controllers/electionController');
const { requireAuthentication } = require('../middleware/auth');
const { requireAdministrator } = require('../middleware/roles');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
router.use(requireAuthentication, requireAdministrator);
router.get('/', admin.dashboard);
router.get('/eligibilities', admin.eligibilities);
router.post('/eligibilities/:id/review', [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Choose approve or reject.'),
  body('rejectionReason').if(body('status').equals('REJECTED')).trim().isLength({ min: 3, max: 500 }).withMessage('Enter a rejection reason.')
], validateRequest('/admin/eligibilities'), admin.reviewEligibility);
router.get('/nominations', admin.nominations);
router.post('/nominations/:id/review', [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Choose approve or reject.'),
  body('rejectionReason').if(body('status').equals('REJECTED')).trim().isLength({ min: 3, max: 500 }).withMessage('Enter a rejection reason.')
], validateRequest('/admin/nominations'), admin.reviewNomination);
router.get('/audit-logs', admin.auditLogs);
router.get('/elections/new', elections.renderCreate);
router.post('/elections', [
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Election title must be 3-160 characters.'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Add an election description.'),
  body(['nominationStart', 'nominationEnd', 'votingStart', 'votingEnd']).notEmpty().withMessage('Complete each election date.')
], elections.create);
router.get('/elections/:electionId/edit', elections.renderEdit);
router.put('/elections/:electionId', [
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Election title must be 3-160 characters.'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Add an election description.'),
  body(['nominationStart', 'nominationEnd', 'votingStart', 'votingEnd']).notEmpty().withMessage('Complete each election date.')
], elections.update);
router.post('/elections/:electionId/status', body('status').isIn(['NOMINATION', 'VOTING', 'CLOSED', 'PUBLISHED', 'ARCHIVED']), elections.changeStatus);

module.exports = router;