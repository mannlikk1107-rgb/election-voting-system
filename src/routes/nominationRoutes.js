const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/nominationController');
const { requireAuthentication } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
router.post('/:electionId/nominations', requireAuthentication, [
  body('candidateDisplayName').trim().isLength({ min: 2, max: 100 }).withMessage('Candidate name must be 2-100 characters.'),
  body('biography').trim().isLength({ min: 20, max: 3000 }).withMessage('Biography must be 20-3000 characters.'),
  body('manifesto').trim().isLength({ min: 20, max: 5000 }).withMessage('Manifesto must be 20-5000 characters.')
], validateRequest('/elections'), controller.submit);

module.exports = router;