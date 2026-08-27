const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { analyzeResumeDirectly } = require('../controllers/resumeController');

router.post('/upload-and-analyze', upload.single('resume'), analyzeResumeDirectly);

module.exports = router;