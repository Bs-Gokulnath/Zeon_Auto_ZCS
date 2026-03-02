const express = require('express');
const router = express.Router();
const { getSessionDataByDateRange } = require('../controllers/sessionDataController');
const authenticate = require('../middleware/auth');

// Get session data by date range (protected route)
router.get('/range', authenticate, getSessionDataByDateRange);

module.exports = router;
