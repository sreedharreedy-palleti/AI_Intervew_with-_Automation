const mongoose = require('mongoose');

const ProctorSessionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      index: true
    },
    candidateName: {
      type: String,
      default: 'Candidate'
    },
    targetRole: {
      type: String,
      default: 'Developer'
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'flagged', 'terminated'],
      default: 'in-progress'
    },
    terminationReason: {
      type: String,
      default: ''
    },
    terminationTimestamp: {
      type: Date
    },
    mediaPermissions: {
      cameraGranted: { type: Boolean, default: false },
      micGranted: { type: Boolean, default: false }
    },
    examResult: {
      score: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      submissionId: { type: String, default: '' },
      submittedAt: { type: Date }
    },
    proctorMetrics: {
      axisStabilityScore: { type: Number, default: 100 },
      facePresenceRate: { type: Number, default: 100 },
      eyeContactRate: { type: Number, default: 100 },
      audioNoiseAlerts: { type: Number, default: 0 },
      totalViolations: { type: Number, default: 0 }
    },
    violations: [
      {
        type: {
          type: String,
          enum: [
            'no_face_detected',
            'multiple_faces_detected',
            'head_off_axis',
            'gaze_deviation',
            'cell_phone_detected',
            'unauthorized_object',
            'suspicious_audio_noise',
            'speaking_detected',
            'tab_switch',
            'fullscreen_exit',
            'window_blur',
            'camera_off',
            'mic_muted'
          ],
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        details: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProctorSession', ProctorSessionSchema);