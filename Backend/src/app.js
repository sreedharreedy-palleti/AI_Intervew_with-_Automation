const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./Admin/Routes/adminRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const User = require('./models/User');

const app = express();

// Required Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed Default Admin Account if system has 0 admins
const seedDefaultAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultAdmin = new User({
        name: 'System Administrator',
        email: 'admin@hirepulse.ai',
        role: 'admin',
        targetRole: 'Platform Administrator',
        phone: '+1 (555) 019-2834',
        status: 'active'
      });
      defaultAdmin.setPassword('Admin@123');
      await defaultAdmin.save();
      console.log('✨ [Auth System] Default Admin account seeded: admin@hirepulse.ai / Admin@123');
    }
  } catch (err) {
    // Ignore seed error if DB not yet connected
  }
};

// Seed on startup (non-blocking)
setTimeout(seedDefaultAdmin, 2500);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', resumeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/assessment', assessmentRoutes);

module.exports = app;