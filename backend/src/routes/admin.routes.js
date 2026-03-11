const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  addUser,
  getAllUsers,
  deleteUser,
  updateUserRole,
  toggleUserStatus
} = require('../controllers/adminController');

// All routes require admin authentication
router.post('/add-user', adminAuth, addUser);
router.get('/users', adminAuth, getAllUsers);
router.delete('/users/:id', adminAuth, deleteUser);
router.put('/users/:id/role', adminAuth, updateUserRole);
router.put('/users/:id/toggle-status', adminAuth, toggleUserStatus);

module.exports = router;
