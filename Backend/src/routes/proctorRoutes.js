const express = require('express');
const router = express.Router();
const {
  startSession,
  logViolation,
  analyzeCameraFrame,
  terminateSession,
  completeSession,
  getSessionStatus,
  getAllSessions
} = require('../controllers/proctorController');

router.post('/start', startSession);
router.post('/violation', logViolation);
router.post('/analyze-frame', analyzeCameraFrame);
router.post('/terminate', terminateSession);
router.post('/complete', completeSession);
router.get('/status/:id', getSessionStatus);
router.get('/sessions', getAllSessions);

module.exports = router;
