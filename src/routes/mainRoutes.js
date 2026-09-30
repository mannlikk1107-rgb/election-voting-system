const express = require('express');
const controller = require('../controllers/mainController');
const { requireAuthentication } = require('../middleware/auth');
const { requireCandidate } = require('../middleware/roles');

const router = express.Router();
router.get('/', controller.home);
router.get('/dashboard', requireAuthentication, controller.dashboard);
router.get('/candidate', requireAuthentication, requireCandidate, controller.candidateDashboard);

module.exports = router;