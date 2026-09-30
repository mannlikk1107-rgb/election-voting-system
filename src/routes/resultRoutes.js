const express = require('express');
const controller = require('../controllers/resultController');

const router = express.Router();
router.get('/:electionId', controller.show);

module.exports = router;