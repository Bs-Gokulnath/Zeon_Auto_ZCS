const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

// All OCPP routes are protected - require authentication
router.use(authenticate);

// OCPP routes will be implemented here
// Example: POST /api/ocpp/charge
// Example: GET /api/ocpp/status

router.get('/', (req, res) => {
  res.json({ 
    message: 'OCPP routes',
    user: req.user // User info from JWT token
  });
});

module.exports = router;
