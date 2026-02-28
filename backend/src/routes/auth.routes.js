const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  sendSignupOTP,
  verifySignupOTP,
  sendLoginOTP,
  verifyLoginOTP
} = require('../controllers/authController');

// Signup routes (public)
router.post('/signup/send-otp', sendSignupOTP);
router.post('/signup/verify-otp', verifySignupOTP);

// Login routes (public)
router.post('/login/send-otp', sendLoginOTP);
router.post('/login/verify-otp', verifyLoginOTP);

// Protected routes (require authentication)
router.get('/profile', authenticate, (req, res) => {
  res.json({
    message: 'User profile',
    user: req.user
  });
});

module.exports = router;
