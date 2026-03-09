const express = require('express');
const router = express.Router();
const { getDashboard, getCpidRankings, getFilterOptions } = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');

router.get('/filter-options', authenticate, getFilterOptions);
router.get('/dashboard', authenticate, getDashboard);
router.get('/dashboard/cpid-rankings', authenticate, getCpidRankings);

module.exports = router;
