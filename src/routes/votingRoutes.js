const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/votingController');
const { requireAuthentication, requireApprovedVoter } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
router.get('/:electionId/vote', requireAuthentication, requireApprovedVoter, controller.ballot);
router.post('/:electionId/vote/confirm', requireAuthentication, requireApprovedVoter, [
  body('nominationId').trim().notEmpty().withMessage('Choose a candidate.')
], validateRequest('/elections'), controller.confirm);
router.post('/:electionId/vote/submit', requireAuthentication, requireApprovedVoter, controller.cast);

module.exports = router;