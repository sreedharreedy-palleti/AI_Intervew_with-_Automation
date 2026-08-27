const ProctorSession = require('../models/ProctorSession');
const ResumeAnalysis = require('../models/ResumeAnalysis');

// 1. Start or register proctor session
const startSession = async (req, res) => {
  try {
    const { candidateId, candidateName, targetRole, cameraGranted, micGranted } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }

    // Try finding candidate details if available
    let resolvedName = candidateName || 'Candidate';
    let resolvedRole = targetRole || 'Developer';

    if (!candidateName && candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const cand = await ResumeAnalysis.findById(candidateId);
        if (cand?.candidateDetails) {
          resolvedName = cand.candidateDetails.fullName || resolvedName;
          resolvedRole = cand.candidateDetails.targetRole || resolvedRole;
        }
      } catch (e) {
        // Fallback
      }
    }

    const session = await ProctorSession.create({
      candidateId,
      candidateName: resolvedName,
      targetRole: resolvedRole,
      status: 'in-progress',
      mediaPermissions: {
        cameraGranted: Boolean(cameraGranted),
        micGranted: Boolean(micGranted)
      },
      violations: []
    });

    return res.status(201).json({
      success: true,
      sessionId: session._id,
      candidateName: resolvedName,
      targetRole: resolvedRole
    });
  } catch (error) {
    console.error('Failed to start proctor session:', error);
    return res.status(500).json({ success: false, error: 'Failed to start session', details: error.message });
  }
};

// 2. Log violations (Face, Camera Axis, Audio, Tab Switch, Fullscreen, etc.)
const logViolation = async (req, res) => {
  try {
    const { sessionId, violationType, details } = req.body;

    if (!sessionId || !violationType) {
      return res.status(400).json({ success: false, error: 'sessionId and violationType are required' });
    }

    const session = await ProctorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.violations.push({
      type: violationType,
      details: details || '',
      timestamp: new Date()
    });

    // Critical violations list that warrant immediate exam termination
    const criticalViolations = [
      'multiple_faces_detected',
      'cell_phone_detected',
      'unauthorized_object'
    ];

    let shouldTerminate = false;
    let terminationReason = '';

    if (criticalViolations.includes(violationType)) {
      session.status = 'terminated';
      shouldTerminate = true;
      if (violationType === 'multiple_faces_detected') {
        terminationReason = 'Multiple persons detected in examination viewport';
      } else if (violationType === 'cell_phone_detected') {
        terminationReason = 'Prohibited mobile device detected in camera frame';
      } else {
        terminationReason = `Security breach: ${violationType.replace(/_/g, ' ')}`;
      }
      session.terminationReason = terminationReason;
      session.terminationTimestamp = new Date();
    } else if (session.violations.length >= 3) {
      session.status = 'terminated';
      shouldTerminate = true;
      terminationReason = 'Exceeded maximum allowable violation strikes (3/3)';
      session.terminationReason = terminationReason;
      session.terminationTimestamp = new Date();
    }

    session.proctorMetrics.totalViolations = session.violations.length;
    await session.save();

    return res.status(200).json({
      success: true,
      violationCount: session.violations.length,
      status: session.status,
      action: shouldTerminate ? 'terminate_exam' : 'continue',
      terminationReason: session.terminationReason || ''
    });
  } catch (error) {
    console.error('Failed to log violation:', error);
    return res.status(500).json({ success: false, error: 'Failed to log violation', details: error.message });
  }
};

// 3. Backend Camera Analysis & Frame Proctor Verification
const analyzeCameraFrame = async (req, res) => {
  try {
    const {
      sessionId,
      candidateId,
      facesCount = 0,
      headAxis = {},
      phoneDetected = false,
      audioDb = 0,
      timestamp
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const session = await ProctorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check if session is already terminated
    if (session.status === 'terminated') {
      return res.status(200).json({
        success: true,
        action: 'terminate_exam',
        status: 'terminated',
        reason: session.terminationReason || 'Session terminated'
      });
    }

    let shouldTerminate = false;
    let terminationReason = '';
    let detectedViolation = null;

    // Rule 1: STRICT SINGLE CANDIDATE ONLY — If multiple people appear, terminate immediately
    if (facesCount > 1) {
      shouldTerminate = true;
      terminationReason = `Unauthorized intrusion: Multiple faces detected (${facesCount} persons present)`;
      detectedViolation = {
        type: 'multiple_faces_detected',
        details: terminationReason
      };
    }
    // Rule 2: STRICT NO PROHIBITED DEVICES — If phone or unauthorized device appears, terminate immediately
    else if (phoneDetected) {
      shouldTerminate = true;
      terminationReason = 'Unauthorized mobile phone or electronic device detected';
      detectedViolation = {
        type: 'cell_phone_detected',
        details: terminationReason
      };
    }
    // Rule 3: Head turned severely off-axis
    else if (headAxis && headAxis.isOffAxis) {
      detectedViolation = {
        type: 'head_off_axis',
        details: `Candidate head turned off-center: Yaw ${headAxis.yaw}°, Pitch ${headAxis.pitch}°`
      };
    }

    if (detectedViolation) {
      session.violations.push({
        type: detectedViolation.type,
        details: detectedViolation.details,
        timestamp: new Date()
      });

      if (session.violations.length >= 3) {
        shouldTerminate = true;
        terminationReason = 'Exceeded maximum violation strikes limit (3/3)';
      }
    }

    if (shouldTerminate) {
      session.status = 'terminated';
      session.terminationReason = terminationReason;
      session.terminationTimestamp = new Date();
    }

    session.proctorMetrics.totalViolations = session.violations.length;
    await session.save();

    return res.status(200).json({
      success: true,
      action: shouldTerminate ? 'terminate_exam' : (detectedViolation ? 'warning' : 'continue'),
      status: session.status,
      violationCount: session.violations.length,
      terminationReason: session.terminationReason || '',
      verified: !shouldTerminate && !detectedViolation
    });
  } catch (error) {
    console.error('Camera frame analysis error:', error);
    return res.status(500).json({ success: false, error: 'Failed to analyze frame', details: error.message });
  }
};

// 4. Force Terminate Proctor Session
const terminateSession = async (req, res) => {
  try {
    const { sessionId, reason } = req.body;
    const session = await ProctorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.status = 'terminated';
    session.terminationReason = reason || 'Manual security termination';
    session.terminationTimestamp = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Exam session terminated successfully',
      session
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to terminate session' });
  }
};

// 5. Complete and submit proctored exam session
const completeSession = async (req, res) => {
  try {
    const {
      sessionId,
      candidateId,
      score,
      correctCount,
      totalQuestions,
      submissionId,
      proctorMetrics
    } = req.body;

    let session = null;
    if (sessionId && sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      session = await ProctorSession.findById(sessionId);
    }

    if (!session && candidateId) {
      session = await ProctorSession.findOne({ candidateId }).sort({ createdAt: -1 });
    }

    if (session) {
      if (session.status !== 'terminated') {
        session.status = session.violations.length >= 3 ? 'flagged' : 'completed';
      }
      session.examResult = {
        score: Number(score) || 0,
        correctCount: Number(correctCount) || 0,
        totalQuestions: Number(totalQuestions) || 5,
        submissionId: submissionId || `SUB-${Date.now()}`,
        submittedAt: new Date()
      };

      if (proctorMetrics) {
        session.proctorMetrics = {
          axisStabilityScore: Number(proctorMetrics.axisStabilityScore) || 100,
          facePresenceRate: Number(proctorMetrics.facePresenceRate) || 100,
          eyeContactRate: Number(proctorMetrics.eyeContactRate) || 100,
          audioNoiseAlerts: Number(proctorMetrics.audioNoiseAlerts) || 0,
          totalViolations: session.violations.length
        };
      }

      await session.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Proctored assessment session completed and saved.',
      session
    });
  } catch (error) {
    console.error('Failed to complete session:', error);
    return res.status(500).json({ success: false, error: 'Failed to complete session', details: error.message });
  }
};

// 6. Get specific session status and violations
const getSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ProctorSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve session status' });
  }
};

// 7. Get all proctor sessions for Admin audit
const getAllSessions = async (req, res) => {
  try {
    const sessions = await ProctorSession.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch proctor sessions' });
  }
};

module.exports = {
  startSession,
  logViolation,
  analyzeCameraFrame,
  terminateSession,
  completeSession,
  getSessionStatus,
  getAllSessions
};