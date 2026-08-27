const mongoose = require('mongoose');

const ResumeAnalysisSchema = new mongoose.Schema(
  {
    // 1. Candidate Form Details (Persisted in DB)
    candidateDetails: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      targetRole: { type: String, required: true },
      experienceYears: { type: Number, default: 0 },
      expectedSalary: { type: String, default: '' },
      portfolioOrLinkedIn: { type: String, default: '' }
    },

    // 2. Target Job Context
    jobDescription: {
      type: String,
      default: ''
    },

    // 3. Resume File Metadata & Extracted Text
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: String,
      default: ''
    },
    rawText: {
      type: String,
      required: true
    },
    detectedSkills: [{ type: String }],
    presentSections: [{ type: String }],

    // 4. ATS Scoring & Ollama AI Feedback
    finalAtsScore: {
      type: Number,
      default: 0
    },
    ruleBasedAnalysis: {
      score: Number,
      status: String,
      matchedKeywords: [String],
      missingKeywords: [String],
      breakdown: {
        keywordScore: Number,
        structureScore: Number,
        contactScore: Number
      }
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);