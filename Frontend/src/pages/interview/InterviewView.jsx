import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import interviewApi from '../../api/interviewApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { BrainCircuit, AlertTriangle, ArrowLeft } from 'lucide-react';

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
  const [precheckVerified, setPrecheckVerified] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. If we have an existing specific interviewToken
      if (interviewToken && interviewToken !== 'start' && interviewToken !== 'demo') {
        const data = await interviewApi.getInterviewSession(interviewToken);
        setSession(data);
        setPrecheckVerified(Boolean(data.precheck_verified));

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
      setPrecheckVerified(Boolean(data.precheck_verified));

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
  }, [interviewToken, searchParams, user, navigate]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (isLoading) {
    return <Loader text="Connecting to AI Interview Engine and retrieving session questions..." />;
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

  // Precheck Verification: Hardware Camera & Microphone Access Check
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

  // Live AI Technical Interview Workspace
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

