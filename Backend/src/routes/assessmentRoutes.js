const express = require('express');
const router = express.Router();
const {
  getAssessmentQuestions,
  executeCode,
  submitAssessment
} = require('../controllers/assessmentController');

router.get('/questions', getAssessmentQuestions);
router.post('/execute-code', executeCode);
router.post('/submit', submitAssessment);

module.exports = router;
