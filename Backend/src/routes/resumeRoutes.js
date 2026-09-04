const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { analyzeResumeDirectly } = require('../controllers/resumeController');
const {
  register,
  login,
  getMe,
  getAllUsers,
  updateUserRole,
  deleteUser
} = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Resume Upload & Analysis
router.post('/upload-and-analyze', upload.single('resume'), analyzeResumeDirectly);

// Auth Aliases on /api
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, getMe);
router.get('/auth/users', requireAuth, requireAdmin, getAllUsers);
router.put('/auth/users/:id/role', requireAuth, requireAdmin, updateUserRole);
router.delete('/auth/users/:id', requireAuth, requireAdmin, deleteUser);

// Direct Auth Endpoints
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);

module.exports = router;