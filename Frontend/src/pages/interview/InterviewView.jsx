import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import interviewApi from '../../api/interviewApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import {
  BrainCircuit,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  User,
  BookOpen,
  Award,
  Sparkles,
  Lock,
} from 'lucide-react';

import InterviewPrecheck from './InterviewPrecheck';
import InterviewRoom from './InterviewRoom';
import InterviewReport from './InterviewReport';

const InterviewView = () => {
  const { interviewToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  // Step 1: Candidate Verification & Initial Details state
  const [isDetailsVerified, setIsDetailsVerified] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isVerifyingDetails, setIsVerifyingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Step 2: Camera & Voice Precheck state
  const [precheckVerified, setPrecheckVerified] = useState(false);

  const activeToken = interviewToken || searchParams.get('assignment_token') || '';

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. If we have a token in route (interview_token OR assignment_token)
      if (interviewToken && interviewToken !== 'start' && interviewToken !== 'demo') {
        const data = await interviewApi.getInterviewSession(interviewToken);
        setSession(data);
        if (data.candidate_email && !inputEmail) {
          setInputEmail(data.candidate_email);
        }
        if (data.unique_code && !inputCode) {
          setInputCode(data.unique_code);
        }
        if (data.precheck_verified) {
          setIsDetailsVerified(true);
          setPrecheckVerified(true);
        }

        if (data.status === 'completed' && data.final_report) {
          setFinalReport(data.final_report);
        }
        return;
      }

      // 2. Otherwise start/resume via query parameters (e.g. ?assignment_token=... or ?user_id=...)
      const assignmentTokenParam = searchParams.get('assignment_token');
      const courseIdParam = searchParams.get('course_id');
      const forceRestartParam = searchParams.get('force_restart') === 'true';

      const data = await interviewApi.startOrResumeInterview({
        assignment_token: assignmentTokenParam,
        course_id: courseIdParam,
        user_id: user?.id,
        candidate_name: user?.name,
        candidate_email: user?.email,
        force_restart: forceRestartParam,
      });

      setSession(data);
      if (data.candidate_email && !inputEmail) {
        setInputEmail(data.candidate_email);
      }
      if (data.unique_code && !inputCode) {
        setInputCode(data.unique_code);
      }
      if (data.precheck_verified) {
        setIsDetailsVerified(true);
        setPrecheckVerified(true);
      }

      if (data.interview_token && data.interview_token !== interviewToken) {
        navigate(`/interview/${data.interview_token}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load interview session:', err);
      const detail = err.response?.data?.detail || err.message || 'Unable to load interview session.';
      setLoadError(detail);
    } finally {
      setIsLoading(false);
    }
  }, [interviewToken, searchParams, user, navigate, inputEmail, inputCode]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Handle Step 1 Verification
  const handleVerifyDetails = async (e) => {
    if (e) e.preventDefault();
    const emailToVerify = (inputEmail || user?.email || session?.candidate_email || '').trim().toLowerCase();
    const codeToVerify = inputCode.trim().toUpperCase();

    if (!emailToVerify) {
      setDetailsError('Please enter your registered candidate email address.');
      return;
    }
    if (!codeToVerify) {
      setDetailsError('Please enter your Unique Exam Code from your invitation.');
      return;
    }

    setIsVerifyingDetails(true);
    setDetailsError(null);

    try {
      const targetToken = session?.interview_token || activeToken;
      await interviewApi.verifyAccess(targetToken, {
        username: emailToVerify,
        unique_code: codeToVerify,
      });

      setIsDetailsVerified(true);
      toast.success('Credentials verified! Please test your camera & microphone.');
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Access Denied: The Email or Unique Exam Code does not match the candidate record.';
      setDetailsError(errorMsg);
    } finally {
      setIsVerifyingDetails(false);
    }
  };

  if (isLoading) {
    return <Loader text="Connecting to AI Interview Engine and retrieving session details..." />;
  }

  // Pending Prerequisite Coding Assessment state
  if (session && session.status === 'pending_qualification') {
    return (
      <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1rem' }}>
        <Card elevated style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <Badge variant="warning" style={{ marginBottom: '1rem' }}>
            Prerequisite Assessment Required
          </Badge>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            AI Coding Assessment Incomplete
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Candidate <strong>{session.candidate_name}</strong> has not completed the practical coding simulation assessment yet (minimum 50% score required to qualify for Stage 2).
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to={`/assignment/${session.assignment_token || activeToken}`}
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <Sparkles size={16} />
              <span>Launch AI Coding Assessment</span>
            </Link>
            <Link to="/my-enrollments" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={14} />
              <span>My Applications</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1rem' }}>
        <Card elevated style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            Interview Access Restricted
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            {loadError}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/my-enrollments" className="btn btn-secondary">
              <ArrowLeft size={14} />
              <span>Back to My Applications</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Completed State: Show Scorecard
  if (finalReport || session?.status === 'completed') {
    return (
      <InterviewReport
        report={finalReport || session?.final_report || {}}
        interviewToken={session?.interview_token || interviewToken}
        onRetake={() => {
          navigate('/interview/start?force_restart=true', { replace: true });
          window.location.reload();
        }}
      />
    );
  }

  // STEP 1: CANDIDATE VERIFICATION & INITIAL DETAILS (Matching AI Assignment)
  if (!isDetailsVerified) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          padding: '2rem 1rem',
        }}
      >
        <Card
          elevated
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2.5rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #38bdf8)',
            }}
          />

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#818cf8',
            }}
          >
            <BrainCircuit size={32} />
          </div>

          <Badge variant="primary" style={{ marginBottom: '0.85rem' }}>
            Stage 2: AI Voice Technical Interview
          </Badge>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem', color: '#fff' }}>
            Candidate Identity Verification
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            Review your candidate details and verify your credentials to begin your interview.
          </p>

          {/* Initial Candidate Details Box (Resolved from Token) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Candidate:</span>
              <strong style={{ color: '#fff' }}>{session?.candidate_name || 'Candidate'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target Track:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{session?.course_title || 'Technical Track'}</span>
            </div>
            {session?.assignment_score != null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stage 1 Coding Score:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  {Math.round(session.assignment_score)}% (Qualified)
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Interview Format:</span>
              <span style={{ color: '#c084fc', fontWeight: 600 }}>Interactive AI Voice & Camera Proctoring</span>
            </div>
          </div>

          {detailsError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                color: '#fca5a5',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{detailsError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyDetails} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Candidate Email Address
              </label>
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="candidate@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Unique Exam Code / Passcode
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. EXAM-XXXXXX"
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ display: 'block', marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                Enter the passcode from your invitation or candidate dashboard.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isVerifyingDetails}
              style={{
                width: '100%',
                padding: '0.9rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            >
              {isVerifyingDetails ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Verify & Proceed to Camera Check</span>
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>

          {/* Stepper Footer */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>Flow: 1. Verify Details → 2. Camera & Mic Check → 3. AI Voice Interview</span>
            {session?.is_unlimited_trial && (
              <span style={{ color: '#10b981', fontWeight: 600 }}>Unlimited Trial Account</span>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // STEP 2: PRECHECK VERIFICATION (CAMERA & MICROPHONE ACCESS)
  if (!precheckVerified) {
    return (
      <InterviewPrecheck
        interviewToken={session?.interview_token}
        candidateName={session?.candidate_name}
        courseTitle={session?.course_title}
        onVerificationComplete={() => {
          setPrecheckVerified(true);
          toast.success('Camera and microphone verified! Interview started.');
        }}
      />
    );
  }

  // STEP 3: LIVE AI VOICE TECHNICAL INTERVIEW WORKSPACE
  return (
    <InterviewRoom
      session={session}
      onInterviewComplete={(report) => {
        setFinalReport(report);
      }}
    />
  );
};

export default InterviewView;


