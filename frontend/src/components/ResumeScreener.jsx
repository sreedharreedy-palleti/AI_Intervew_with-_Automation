import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  ArrowRight, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Link as LinkIcon, 
  Trash2,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { uploadAndAnalyzeResume } from '../services/api';

const PRESET_TEMPLATES = [
  {
    role: 'Full Stack React & Node Developer',
    experience: 3,
    description: 'Looking for a Full Stack Developer experienced with React, Node.js, Express, MongoDB, RESTful APIs, Git, JavaScript/TypeScript, responsive CSS, and cloud deployment.'
  },
  {
    role: 'AI / Machine Learning Engineer',
    experience: 4,
    description: 'Seeking an AI/ML Engineer proficient in Python, PyTorch/TensorFlow, LLMs (Ollama, Gemini, OpenAI), NLP, vector databases, RAG architecture, and model fine-tuning.'
  },
  {
    role: 'Frontend UI/UX Engineer',
    experience: 2,
    description: 'Seeking a modern Frontend Engineer specialized in React 19, Vite, TailwindCSS, CSS glassmorphism, accessibility (a11y), responsive design, and state management.'
  },
  {
    role: 'Backend Systems & Cloud Engineer',
    experience: 5,
    description: 'Require a Senior Backend Engineer with in-depth knowledge of Node.js, microservices, Docker, Kubernetes, MongoDB/PostgreSQL, Redis, caching, and CI/CD pipelines.'
  }
];

export default function ResumeScreener({ onStartExam, showToast }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    targetRole: 'Full Stack React & Node Developer',
    experienceYears: 3,
    expectedSalary: '$85,000 / yr',
    portfolioOrLinkedIn: 'https://github.com/developer',
    jobDescription: PRESET_TEMPLATES[0].description
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      targetRole: preset.role,
      experienceYears: preset.experience,
      jobDescription: preset.description
    }));
    showToast?.(`Loaded ${preset.role} template`, 'info');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please upload a valid PDF document.');
      showToast?.('Only PDF files are supported', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      showToast?.('File size exceeds 10MB', 'error');
      return;
    }
    setError(null);
    setResumeFile(file);
    showToast?.(`Uploaded ${file.name}`, 'success');
  };

  const handleRemoveFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.targetRole) {
      setError('Please complete all mandatory fields (Name, Email, Phone, Role).');
      showToast?.('Missing mandatory form fields', 'error');
      return;
    }

    if (!resumeFile) {
      setError('Please attach a PDF resume file to evaluate.');
      showToast?.('Please upload a PDF resume', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('targetRole', formData.targetRole);
      data.append('experienceYears', formData.experienceYears);
      data.append('expectedSalary', formData.expectedSalary);
      data.append('portfolioOrLinkedIn', formData.portfolioOrLinkedIn);
      data.append('jobDescription', formData.jobDescription);
      data.append('resume', resumeFile);

      const response = await uploadAndAnalyzeResume(data);

      setResult(response);
      showToast?.('Resume analyzed successfully!', 'success');

      if (response.finalAtsScore >= 70 || response.shortlisted) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze resume with localhost backend.');
      showToast?.(err.message || 'Analysis error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper for radial score meter
  const score = result?.finalAtsScore || 0;
  const isShortlisted = result?.shortlisted || score >= 70;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="screener-wrapper">
      {/* Page Header */}
      <div className="section-header">
        <div className="badge badge-indigo">
          <Sparkles size={13} />
          <span>Next-Gen Candidate Screening</span>
        </div>
        <h1 className="section-title">AI Resume Screener & ATS Evaluator</h1>
        <p className="section-description">
          Submit your candidate profile and PDF resume. Our backend extracts technical keywords, computes algorithmic ATS scores, and generates AI-powered hiring insights.
        </p>
      </div>

      <div className="screener-grid">
        {/* Left Column: Candidate Form & File Upload */}
        <div className="glass-panel screener-form-card">
          <div className="card-header">
            <h2 className="card-title">
              <User size={19} className="text-indigo" />
              <span>Candidate Application Form</span>
            </h2>
            <span className="card-subtitle">Connects to <code>POST /api/upload-and-analyze</code></span>
          </div>

          {/* Quick Role Preset Pills */}
          <div className="preset-selector">
            <span className="preset-label">Quick Role Presets:</span>
            <div className="preset-chips">
              {PRESET_TEMPLATES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`preset-chip ${formData.targetRole === p.role ? 'active' : ''}`}
                  onClick={() => handleApplyPreset(p)}
                >
                  {p.role.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="screener-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  <User size={14} /> Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="e.g. Alex Morgan"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  <Mail size={14} /> Email Address <span className="req">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="alex.morgan@example.com"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  <Phone size={14} /> Phone Number <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 234-5678"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="targetRole">
                  <Briefcase size={14} /> Target Job Role <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="targetRole"
                  name="targetRole"
                  value={formData.targetRole}
                  onChange={handleInputChange}
                  placeholder="e.g. Full Stack Developer"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="experienceYears">
                  <TrendingUp size={14} /> Years of Experience: <strong>{formData.experienceYears} yrs</strong>
                </label>
                <input
                  type="range"
                  id="experienceYears"
                  name="experienceYears"
                  min="0"
                  max="15"
                  step="1"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="form-slider"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expectedSalary">
                  <DollarSign size={14} /> Expected Compensation
                </label>
                <input
                  type="text"
                  id="expectedSalary"
                  name="expectedSalary"
                  value={formData.expectedSalary}
                  onChange={handleInputChange}
                  placeholder="e.g. $90,000 / yr"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="portfolioOrLinkedIn">
                <LinkIcon size={14} /> Portfolio / LinkedIn / GitHub URL
              </label>
              <input
                type="url"
                id="portfolioOrLinkedIn"
                name="portfolioOrLinkedIn"
                value={formData.portfolioOrLinkedIn}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/username"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="jobDescription">
                <FileText size={14} /> Target Job Description / Key Criteria
              </label>
              <textarea
                id="jobDescription"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                rows={3}
                placeholder="Enter job requirements, expected technologies, and candidate qualifications..."
                className="form-textarea"
              />
            </div>

            {/* Resume Upload Dropzone */}
            <div className="form-group">
              <label className="form-label">
                <UploadCloud size={14} /> Upload Resume (PDF Document) <span className="req">*</span>
              </label>
              
              {!resumeFile ? (
                <div
                  className={`dropzone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  id="resume-dropzone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                  />
                  <div className="dropzone-icon-box">
                    <UploadCloud size={32} className="dropzone-icon" />
                  </div>
                  <div className="dropzone-text">
                    <p className="dropzone-title">Click to upload or drag & drop</p>
                    <p className="dropzone-desc">PDF format only (Max size 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="file-preview-card">
                  <div className="file-info">
                    <div className="file-icon-box">
                      <FileText size={24} className="text-indigo" />
                    </div>
                    <div className="file-details">
                      <span className="file-name">{resumeFile.name}</span>
                      <span className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="btn btn-secondary btn-sm remove-file-btn"
                    title="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg submit-screener-btn"
              id="analyze-resume-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner-small" />
                  <span>Extracting & Evaluating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Analyze Resume & Calculate ATS Score</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: ATS Score & AI Analysis Results */}
        <div className="glass-panel screener-results-card">
          <div className="card-header">
            <h2 className="card-title">
              <Award size={19} className="text-emerald" />
              <span>ATS Evaluation Report</span>
            </h2>
            {result && (
              <span className={`badge ${isShortlisted ? 'badge-emerald' : 'badge-amber'}`}>
                {isShortlisted ? 'Shortlisted' : 'Low Match'}
              </span>
            )}
          </div>

          {!result && !loading && (
            <div className="results-placeholder">
              <div className="placeholder-icon-wrap">
                <FileText size={48} className="placeholder-icon" />
              </div>
              <h3 className="placeholder-title">No Evaluation Yet</h3>
              <p className="placeholder-text">
                Fill out the application form on the left, upload a resume PDF, and click analyze to see your automated ATS score, keyword match breakdown, and Ollama AI feedback.
              </p>
            </div>
          )}

          {loading && (
            <div className="results-loading">
              <div className="loading-radar-ring">
                <div className="radar-sweep"></div>
                <Sparkles size={32} className="radar-sparkle" />
              </div>
              <h3 className="loading-title">Parsing Resume & Calculating ATS Score...</h3>
              <p className="loading-desc">Extracting technical skills, analyzing document structure, and running AI evaluation against your job criteria.</p>
            </div>
          )}

          {result && !loading && (
            <div className="results-content">
              {/* Score Gauge & Status Banner */}
              <div className="score-summary-box">
                <div className="gauge-container">
                  <svg className="gauge-svg" width="130" height="130" viewBox="0 0 130 130">
                    <circle
                      className="gauge-bg"
                      cx="65"
                      cy="65"
                      r={radius}
                      strokeWidth="10"
                    />
                    <circle
                      className="gauge-progress"
                      cx="65"
                      cy="65"
                      r={radius}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        stroke: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e'
                      }}
                    />
                  </svg>
                  <div className="gauge-text-overlay">
                    <span className="gauge-score-value">{score}%</span>
                    <span className="gauge-score-label">ATS Score</span>
                  </div>
                </div>

                <div className="score-details-text">
                  <div className="verdict-tag">
                    {isShortlisted ? (
                      <div className="status-badge-hero status-pass">
                        <CheckCircle2 size={18} />
                        <span>Congratulations! You are Shortlisted</span>
                      </div>
                    ) : (
                      <div className="status-badge-hero status-consider">
                        <AlertTriangle size={18} />
                        <span>Profile Under Consideration</span>
                      </div>
                    )}
                  </div>
                  <p className="candidate-meta">
                    Candidate: <strong>{result.candidate?.fullName}</strong> ({result.candidate?.targetRole})
                  </p>
                  {result.emailNotificationSent && (
                    <div className="email-sent-badge">
                      <Mail size={13} />
                      <span>Exam Invitation Email Sent to {result.candidate?.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rule-Based Breakdown */}
              {result.atsAnalysis?.ruleBased && (
                <div className="analysis-section">
                  <h4 className="section-subtitle">
                    <TrendingUp size={16} /> Scoring Metrics Breakdown
                  </h4>
                  <div className="metrics-grid">
                    <div className="metric-box">
                      <span className="metric-label">Keywords Match</span>
                      <span className="metric-val">{result.atsAnalysis.ruleBased.breakdown?.keywordScore ?? 0} pts</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Structure & Layout</span>
                      <span className="metric-val">{result.atsAnalysis.ruleBased.breakdown?.structureScore ?? 0} pts</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Contact Details</span>
                      <span className="metric-val">{result.atsAnalysis.ruleBased.breakdown?.contactScore ?? 0} pts</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills Analysis */}
              <div className="analysis-section">
                <h4 className="section-subtitle">
                  <CheckCircle2 size={16} className="text-emerald" /> Matched Skills Found
                </h4>
                <div className="chips-wrap">
                  {(result.atsAnalysis?.ruleBased?.matchedKeywords?.length > 0
                    ? result.atsAnalysis.ruleBased.matchedKeywords
                    : result.atsAnalysis?.aiEvaluation?.matchedSkills || ['JavaScript', 'React', 'Node.js']
                  ).map((skill, idx) => (
                    <span key={idx} className="skill-chip matched">
                      <Check size={12} /> {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              {(result.atsAnalysis?.ruleBased?.missingKeywords?.length > 0 ||
                result.atsAnalysis?.aiEvaluation?.missingSkills?.length > 0) && (
                <div className="analysis-section">
                  <h4 className="section-subtitle text-amber">
                    <AlertCircle size={16} /> Recommended Additional Skills
                  </h4>
                  <div className="chips-wrap">
                    {(result.atsAnalysis?.ruleBased?.missingKeywords?.length > 0
                      ? result.atsAnalysis.ruleBased.missingKeywords
                      : result.atsAnalysis?.aiEvaluation?.missingSkills || []
                    ).map((skill, idx) => (
                      <span key={idx} className="skill-chip missing">
                        <X size={12} /> {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Evaluation Insights */}
              {result.atsAnalysis?.aiEvaluation && (
                <div className="analysis-section ai-insights-card">
                  <h4 className="section-subtitle text-indigo">
                    <Sparkles size={16} /> Ollama AI Assessment Insights
                  </h4>
                  {result.atsAnalysis.aiEvaluation.matchSummary && (
                    <p className="ai-summary-quote">
                      "{result.atsAnalysis.aiEvaluation.matchSummary}"
                    </p>
                  )}

                  {result.atsAnalysis.aiEvaluation.strengths?.length > 0 && (
                    <div className="insight-block">
                      <span className="insight-title text-emerald">Key Strengths:</span>
                      <ul className="insight-list">
                        {result.atsAnalysis.aiEvaluation.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.atsAnalysis.aiEvaluation.improvementSuggestions?.length > 0 && (
                    <div className="insight-block">
                      <span className="insight-title text-amber">Suggestions for Improvement:</span>
                      <ul className="insight-list">
                        {result.atsAnalysis.aiEvaluation.improvementSuggestions.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action: Proceed to Proctored Exam */}
              <div className="proceed-action-box">
                <button
                  type="button"
                  className="btn btn-emerald btn-lg w-full proceed-exam-btn"
                  onClick={() => onStartExam({
                    candidateId: result.recordId,
                    candidateName: result.candidate?.fullName || formData.fullName,
                    targetRole: result.candidate?.targetRole || formData.targetRole,
                    atsScore: score
                  })}
                  id="proceed-to-proctored-exam-btn"
                >
                  <span>Proceed to Proctored Assessment Room</span>
                  <ArrowRight size={18} />
                </button>
                <span className="exam-hint">
                  Proctored exam session will monitor camera, microphone, and anti-cheat triggers.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
