const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  updateUserRole,
  deleteUser
} = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);

// Authenticated User Profile
router.get('/me', requireAuth, getMe);

// Admin-Only User Management Endpoints
router.get('/users', requireAuth, requireAdmin, getAllUsers);
router.put('/users/:id/role', requireAuth, requireAdmin, updateUserRole);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser);

module.exports = router;
