const User = require('../models/User');

/**
 * Authentication Middleware: Validates Bearer token
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token in Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = User.verifyAuthToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token. Please log in again.'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'User account has been suspended. Please contact administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, error: 'Authentication verification failed' });
  }
};

/**
 * Role Middleware: Requires Admin or Recruiter role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'recruiter') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.'
    });
  }

  next();
};

/**
 * Optional Authentication: Attaches user if token is present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = User.verifyAuthToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.status !== 'suspended') {
          req.user = user;
        }
      }
    }
  } catch {
    // Ignore optional auth error
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
