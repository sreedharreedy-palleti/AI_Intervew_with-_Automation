const express = require('express');
const cors = require('cors');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./Admin/Routes/adminRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const app = express();

// Required Middlewares[cite: 10]
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes[cite: 10]
app.use('/api', resumeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/assessment', assessmentRoutes);

module.exports = app;