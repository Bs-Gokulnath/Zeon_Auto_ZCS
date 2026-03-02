const express = require('express');
const router = express.Router();
const { getAnalyticsByDateRange } = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');

// Get analytics by date range (protected route)
router.get('/dashboard', authenticate, getAnalyticsByDateRange);

module.exports = router;
