const express = require('express');
const router = express.Router();

// OCPP routes will be implemented here
// Example: POST /api/ocpp/charge
// Example: GET /api/ocpp/status

router.get('/', (req, res) => {
  res.json({ message: 'OCPP routes' });
});

module.exports = router;
