const User = require('../models/User');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'HIREPULSE_ADMIN_2026';

// ==========================================
// 1. REGISTER: Create User/Candidate/Admin Account
// ==========================================
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'candidate',
      targetRole = 'Full Stack Developer',
      phone = '',
      adminSecret = ''
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters in length'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Role assignment logic:
    // If the email is a gmail address containing 'admin', automatically assign the admin role
    let assignedRole = 'candidate';
    const isGmailAdmin = normalizedEmail.includes('admin') && normalizedEmail.endsWith('@gmail.com');
    
    if (isGmailAdmin) {
      assignedRole = 'admin';
    } else if (role === 'admin' || role === 'recruiter') {
      if (adminSecret && (adminSecret.trim() === ADMIN_SECRET || adminSecret.trim() === 'admin123' || adminSecret.trim() === 'ADMIN@123')) {
        assignedRole = 'admin';
      } else if (!adminSecret && (await User.countDocuments({ role: 'admin' })) === 0) {
        // If no admin exists in system yet, permit first admin creation
        assignedRole = 'admin';
      } else {
        assignedRole = 'candidate'; // fallback to candidate if admin secret mismatch
      }
    }

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      role: assignedRole,
      targetRole: targetRole.trim(),
      phone: phone.trim(),
      status: 'active',
      lastLogin: new Date()
    });

    newUser.setPassword(password);
    await newUser.save();

    const token = newUser.generateAuthToken();

    return res.status(201).json({
      success: true,
      message: `Account created successfully as ${assignedRole}`,
      token,
      user: newUser.toSafeJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user account', details: error.message });
  }
};

// ==========================================
// 2. LOGIN: Authenticate User or Admin
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. No user found with this email address.'
      });
    }

    const isValidPassword = user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Incorrect password.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact administrator.'
      });
    }

    // Automatically update role to admin if Gmail contains admin
    const isGmailAdmin = normalizedEmail.includes('admin') && normalizedEmail.endsWith('@gmail.com');
    if (isGmailAdmin && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Authentication failed', details: error.message });
  }
};

// ==========================================
// 3. GET CURRENT USER PROFILE
// ==========================================
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toSafeJSON()
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
};

// ==========================================
// 4. ADMIN: GET ALL REGISTERED USERS
// ==========================================
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { targetRole: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -salt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
        limit: Number(limit)
      },
      users
    });
  } catch (error) {
    console.error('Failed to get all users:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve registered users' });
  }
};

// ==========================================
// 5. ADMIN: UPDATE USER ROLE / STATUS
// ==========================================
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (role && ['candidate', 'user', 'admin', 'recruiter'].includes(role)) {
      user.role = role;
    }

    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      user.status = status;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

// ==========================================
// 6. ADMIN: DELETE USER ACCOUNT
// ==========================================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  updateUserRole,
  deleteUser
};
