const express = require('express');
const router = express.Router();
const {
  getAssessmentQuestions,
  submitAssessment
} = require('../controllers/assessmentController');

router.get('/questions', getAssessmentQuestions);
router.post('/submit', submitAssessment);

module.exports = router;
