const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/electionController');
const { requireAuthentication } = require('../middleware/auth');

const router = express.Router();
router.get('/', controller.list);
router.get('/:electionId', controller.show);
router.post('/:electionId/eligibility', requireAuthentication, controller.applyEligibility);

module.exports = router;