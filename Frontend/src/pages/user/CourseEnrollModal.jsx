import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  GraduationCap,
  Award,
  AlertCircle,
  LogIn,
  Clock,
} from 'lucide-react';

const CourseEnrollModal = ({ isOpen, onClose, course, onEnrollSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    college: '',
    year: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  // Prepopulate candidate name if available from active session
  useEffect(() => {
    if (user?.name && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: user.name }));
    }
  }, [user, isOpen]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(ext)) {
        setError('Only PDF or Word (.docx, .doc) files are allowed.');
        return;
      }
      setResumeFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError('Please sign in to your candidate account before submitting an application.');
      return;
    }

    if (course.is_enrolled || isAlreadyEnrolled) {
      setError('You are already enrolled in this course track. Re-enrollment is not allowed.');
      return;
    }

    if (!resumeFile) {
      setError('Please upload your resume to run the AI ATS screening.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await courseApi.enrollWithResume(course.id, {
        fullName: formData.fullName,
        dob: formData.dob,
        college: formData.college,
        year: formData.year,
        resumeFile,
      });

      setResult(res);
      if (res.status === 'shortlisted') {
        toast.success(`Congratulations! Shortlisted with ATS Score: ${res.ats_score}%`);
      } else {
        toast.warning(`Application processed. ATS Score: ${res.ats_score}% (Threshold: 70%)`);
      }

      if (onEnrollSuccess) {
        onEnrollSuccess(res);
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit application.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFormData({ fullName: user?.name || '', dob: '', college: '', year: '' });
    setResumeFile(null);
    setError('');
    onClose();
  };

  if (!course) return null;

  const isAlreadyEnrolled =
    Boolean(course.is_enrolled) ||
    error.toLowerCase().includes('already enrolled') ||
    error.toLowerCase().includes('already submitted') ||
    error.toLowerCase().includes('already being processed') ||
    error.toLowerCase().includes('re-enrollment');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={result ? 'AI ATS Evaluation Report' : `Enroll in ${course.title}`}
      maxWidth={result ? '640px' : '560px'}
    >
      {/* If evaluation result received, display AI ATS Screen */}
      {result ? (
        <div className="animate-fade-in">
          {/* Header Status Card */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              background:
                result.status === 'shortlisted'
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border:
                result.status === 'shortlisted'
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(244, 63, 94, 0.4)',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {/* Radial Score Indicator */}
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                background: '#111827',
                border: `4px solid ${result.status === 'shortlisted' ? '#10b981' : '#f43f5e'}`,
                boxShadow:
                  result.status === 'shortlisted'
                    ? '0 0 25px rgba(16, 185, 129, 0.35)'
                    : '0 0 20px rgba(244, 63, 94, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                {result.ats_score}%
              </span>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                ATS Match
              </span>
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              {result.status === 'shortlisted'
                ? 'Candidate Shortlisted!'
                : 'Application Needs Alignment'}
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {result.message}
            </p>
          </div>

          {/* AI Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#6ee7b7',
                  marginBottom: '0.6rem',
                }}
              >
                <CheckCircle size={16} />
                <span>Identified Strengths & Highlights</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.strengths.map((str, idx) => (
                  <Badge key={idx} variant="success">
                    {str}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {result.missing_skills && result.missing_skills.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#fcd34d',
                  marginBottom: '0.6rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>Identified Skill Gaps to Focus On</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.missing_skills.map((skill, idx) => (
                  <Badge key={idx} variant="warning">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Interview Scheduling Notice: Admin will assign interview date & time */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.1rem 1.25rem',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Clock size={22} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#f0f9ff', fontSize: '0.92rem', marginBottom: '4px' }}>
                Technical Interview Scheduling Pending
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                Your resume has been analyzed and shortlisted! The admissions administrator will review your profile and schedule your official interview date, time slot, and duration. You will receive an email routine once your slot is assigned.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => {
                handleReset();
                onClose();
              }}
              style={{ flex: 1 }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleReset();
                onClose();
                navigate('/my-courses');
              }}
              style={{ flex: 1.5 }}
              icon={<ArrowRight size={16} />}
            >
              View My Applications
            </Button>
          </div>
        </div>
      ) : (
        /* Enrollment & Resume Upload Form */
        <form onSubmit={handleSubmit}>
          {/* Not authenticated banner */}
          {!isAuthenticated && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#c7d2fe',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={16} color="var(--primary)" />
                <span>You need to sign in as a candidate to submit your resume.</span>
              </div>
              <Link to="/login" className="btn btn-primary btn-sm" onClick={onClose}>
                Sign In
              </Link>
            </div>
          )}

          {/* Already Enrolled Banner */}
          {isAlreadyEnrolled && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6ee7b7',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <CheckCircle size={18} color="#10b981" />
                <span>Application Already Submitted</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                You have already submitted an application with your resume for this course. You can view
                your application status and access your tracks from your dashboard.
              </p>
              <Link
                to="/my-enrollments"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                style={{ alignSelf: 'flex-start' }}
              >
                <span>Go to My Applications</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Error Banner */}
          {error && !isAlreadyEnrolled && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isAlreadyEnrolled && !isSubmitting && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid var(--border-accent)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Sparkles size={20} color="#818cf8" />
              <div style={{ fontSize: '0.82rem', color: '#c7d2fe' }}>
                Your resume will be parsed and evaluated using Gemini AI against{' '}
                <strong>{course.title}</strong> prerequisites.
              </div>
            </div>
          )}

          {isSubmitting && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.12) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#c7d2fe',
                fontSize: '0.84rem',
              }}
            >
              <Sparkles size={20} color="#a5b4fc" className="animate-spin" />
              <div>
                <strong>AI ATS Evaluation in Progress...</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Parsing candidate qualifications against syllabus topics. Please keep this modal open.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="fullName"
              label="Full Name"
              placeholder="Candidate Name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              disabled={isAlreadyEnrolled || isSubmitting}
              icon={<User size={15} />}
            />

            <Input
              id="dob"
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
              required
              disabled={isAlreadyEnrolled || isSubmitting}
              icon={<Calendar size={15} />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="college"
              label="College / University"
              placeholder="e.g. Stanford / IIT"
              value={formData.college}
              onChange={handleInputChange}
              required
              disabled={isAlreadyEnrolled || isSubmitting}
              icon={<GraduationCap size={15} />}
            />

            <Input
              id="year"
              label="Graduation Year"
              placeholder="e.g. 2027"
              value={formData.year}
              onChange={handleInputChange}
              required
              disabled={isAlreadyEnrolled || isSubmitting}
              icon={<Award size={15} />}
            />
          </div>

          {/* Resume Upload Dropzone */}
          <div className="form-group">
            <label className="form-label">
              <span>
                Upload Resume (PDF / DOCX) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </span>
            </label>

            <div
              className={`dropzone ${resumeFile ? 'active' : ''}`}
              onClick={() => {
                if (!isAlreadyEnrolled && !isSubmitting) {
                  document.getElementById('resumeFileInput')?.click();
                }
              }}
              style={{
                cursor: (isAlreadyEnrolled || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (isAlreadyEnrolled || isSubmitting) ? 0.7 : 1,
              }}
            >
              <input
                id="resumeFileInput"
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isAlreadyEnrolled || isSubmitting}
              />

              {resumeFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem' }}>
                  <FileText size={28} color="#6366f1" />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {resumeFile.name}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Parsing
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <UploadCloud size={32} color="#818cf8" />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Click or drag resume here
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supports PDF, DOCX (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={handleReset} disabled={isSubmitting}>
              Close
            </Button>
            {!isAlreadyEnrolled && (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!isAuthenticated}
                icon={<Sparkles size={16} />}
              >
                Submit & Run AI ATS
              </Button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};

export default CourseEnrollModal;
