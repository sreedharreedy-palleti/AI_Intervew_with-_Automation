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
      submittedAt: { type: Date },
      totalTestCasesPassed: { type: Number, default: 0 },
      totalTestCases: { type: Number, default: 0 },
      visiblePassed: { type: Number, default: 0 },
      hiddenPassed: { type: Number, default: 0 },
      codingSubmissions: [
        {
          questionId: { type: Number },
          title: { type: String },
          language: { type: String },
          code: { type: String },
          visiblePassed: { type: Number },
          visibleTotal: { type: Number },
          hiddenPassed: { type: Number },
          hiddenTotal: { type: Number },
          allPassed: { type: Boolean },
          runtimeMs: { type: Number }
        }
      ]
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
            'loud_human_voice',
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