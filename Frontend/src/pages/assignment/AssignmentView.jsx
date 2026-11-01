import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { API_BASE_URL } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import {
  BrainCircuit,
  Play,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  EyeOff,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Award,
  ArrowRight,
  Code2,
  FileCode,
  CheckCheck,
  Lock,
  KeyRound,
  ShieldAlert,
  VideoOff,
  Upload,
  Smartphone,
  Volume2,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import ChromeRequiredCard from '../../components/common/ChromeRequiredCard';
import { checkIsGoogleChrome } from '../../utils/browserCheck';
import LiveProctoringFeed from '../../assignment/components/LiveProctoringFeed';
import PreExamVerification from '../../assignment/components/PreExamVerification';

import './AssignmentView.css';

// ── Language config ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'python',     label: 'Python 3 (CPython 3.12)' },
  { value: 'javascript', label: 'JavaScript (Node.js)' },
  { value: 'java',       label: 'Java 17' },
  { value: 'cpp',        label: 'C++ 17' },
  { value: 'c',          label: 'C (GCC)' },
];

const STARTER_TEMPLATES = {
  python: `def solution(data):
    # Write your solution here
    pass
`,
  javascript: `function solution(data) {
  // Write your solution here
  return null;
}
`,
  java: `import java.util.*;

public class Solution {
    public static Object solution(Object data) {
        // Write your solution here
        return null;
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

auto solution(auto data) {
    // Write your solution here
    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>

int solution(int data) {
    /* Write your solution here */
    return 0;
}
`,
};

const AssignmentView = () => {
  const { assignmentToken } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const isUnlimitedTrial = Boolean(
    user?.email?.trim().toLowerCase() === '23091a32j4@rgmcet.edu.in'
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const handleResetTrial = async () => {
    if (!window.confirm('Reset this coding assessment and start a fresh attempt (Unlimited Free Trial)?')) return;
    try {
      setIsLoading(true);
      await assignmentApi.resetTrial(assignmentToken);
      toast.success('Assessment reset! Starting fresh attempt.');
      setSubmissionCompleted(false);
      setSubmissionReport(null);
      setIsExamTerminated(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to reset assessment');
      setIsLoading(false);
    }
  };

  // Active question index (0 or 1)
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Solutions map: { [questionId]: code }
  const [solutions, setSolutions] = useState({});

  // Test results per question: { [questionId]: RunTestsResponse }
  const [testResults, setTestResults] = useState({});

  // UI state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionCompleted, setSubmissionCompleted] = useState(false);
  const [submissionReport, setSubmissionReport] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('tests'); // 'tests' | 'output'

  // Timer countdown (dynamically initialized from assignment duration_minutes)
  const [timeLeft, setTimeLeft] = useState(3600);

  // Schedule Countdown for future-dated interviews
  const [scheduleCountdown, setScheduleCountdown] = useState(null);

  // Code editor textarea ref
  const textareaRef = useRef(null);

  // Language selector
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  // Pre-exam Face & Audio verification
  const [isPrecheckVerified, setIsPrecheckVerified] = useState(false);

  // Proctoring / exam termination
  const [isExamTerminated, setIsExamTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationLogs, setTerminationLogs] = useState([]);

  // Browser restriction state (Google Chrome only)
  const [browserState, setBrowserState] = useState(() => checkIsGoogleChrome());

  // Live countdown effect for future scheduled interviews
  useEffect(() => {
    if (assignment?.locked && assignment.schedule_status === 'scheduled_future' && assignment.assignment_datetime) {
      const targetTime = new Date(assignment.assignment_datetime).getTime();
      const updateCountdown = () => {
        const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        setScheduleCountdown(diff);
        if (diff <= 0) {
          window.location.reload();
        }
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [assignment]);

  const formatScheduleDiff = (secs) => {
    if (secs === null || secs === undefined) return 'Calculating...';
    if (secs <= 0) return 'Opening room now...';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Fetch or generate assignment on mount
  useEffect(() => {
    let isMounted = true;
    const fetchAssignmentData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await assignmentApi.getAssignment(assignmentToken);
        if (!isMounted) return;

        setAssignment(data);
        if (data.duration_minutes) {
          setTimeLeft(Number(data.duration_minutes) * 60);
        }
        if (data.verification_completed) {
          setIsPrecheckVerified(true);
        }

        // Populate initial solutions from questions starter_code
        const initialSolutions = {};
        if (data.questions && data.questions.length > 0) {
          data.questions.forEach((q) => {
            initialSolutions[q.id] = q.starter_code || '';
          });
        }
        setSolutions(initialSolutions);

        // If already submitted in past
        if (data.status === 'submitted') {
          setSubmissionCompleted(true);
          setSubmissionReport({
            score: data.score,
            status: data.status,
            ai_review: data.ai_review,
            submitted_at: data.submitted_at,
          });
        } else if (data.status === 'terminated_violation') {
          setIsExamTerminated(true);
          setTerminationReason(
            data.termination_reason || 'Examination terminated due to security violations.'
          );
          setTerminationLogs(data.proctor_violation_history || data.proctor_logs || []);
        }
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err.message || 'Failed to load technical assessment.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAssignmentData();
    return () => {
      isMounted = false;
    };
  }, [assignmentToken]);

  // Countdown timer effect
  useEffect(() => {
    if (submissionCompleted || !assignment) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submissionCompleted, assignment]);

  // Format timer MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeQuestion = assignment?.questions?.[activeQIndex];
  const activeCode = activeQuestion ? solutions[activeQuestion.id] || '' : '';
  const currentTestResult = activeQuestion ? testResults[activeQuestion.id] : null;

  // Handle code change
  const handleCodeChange = (e) => {
    if (!activeQuestion) return;
    const val = e.target.value;
    setSolutions((prev) => ({
      ...prev,
      [activeQuestion.id]: val,
    }));
  };

  // Support Tab key indentation in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    '; // 4 spaces

      const newCode = activeCode.substring(0, start) + spaces + activeCode.substring(end);
      setSolutions((prev) => ({
        ...prev,
        [activeQuestion.id]: newCode,
      }));

      // Set cursor position after the 4 spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Reset starter code (uses language-specific template)
  const handleResetCode = () => {
    if (!activeQuestion) return;
    const template = STARTER_TEMPLATES[selectedLanguage] || activeQuestion.starter_code || '';
    setSolutions((prev) => ({
      ...prev,
      [activeQuestion.id]: template,
    }));
    toast.info('Starter code reset to default template.');
  };

  // When language changes: update code to appropriate starter template
  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    if (!activeQuestion) return;
    const template = STARTER_TEMPLATES[newLang] || '';
    setSolutions((prev) => ({
      ...prev,
      [activeQuestion.id]: template,
    }));
  };

  // Proctoring: warning callback
  const handleProctoringWarning = useCallback((violation) => {
    if (violation?.isCritical || violation?.type === 'mobile_phone' || violation?.type === 'multiple_persons') {
      return; // Do not display warning toast for mobile or multiple persons; instant critical exit
    }
    toast.warning(violation?.message || 'Proctoring violation detected.');
  }, [toast]);

  // Proctoring: termination callback
  const handleProctoringTerminate = useCallback((reason, history) => {
    setIsExamTerminated(true);
    setTerminationReason(reason || 'Examination terminated due to proctoring violations.');
    if (history && Array.isArray(history) && history.length > 0) {
      setTerminationLogs(history);
    }
  }, []);

  // Copy code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopiedCode(true);
    toast.success('Code copied to clipboard.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Run Test Cases against public & hidden test suites
  const handleRunTests = async () => {
    if (!activeQuestion) return;
    setIsRunningTests(true);
    setActiveConsoleTab('tests');
    try {
      const res = await assignmentApi.runTests(assignmentToken, {
        questionId: activeQuestion.id,
        code: activeCode,
        language: selectedLanguage,
      });

      setTestResults((prev) => ({
        ...prev,
        [activeQuestion.id]: res,
      }));

      if (res.all_passed) {
        toast.success(`All ${res.total_tests} test cases (Public & Hidden) passed!`);
      } else if (res.compile_error) {
        toast.error('Execution encountered errors.');
        setActiveConsoleTab('output');
      } else {
        toast.warning(`${res.passed_tests} / ${res.total_tests} tests passed.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to execute test cases.');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!assignment) return;
    setIsSubmitting(true);
    try {
      const submissions = assignment.questions.map((q) => ({
        question_id: q.id,
        code: solutions[q.id] || q.starter_code || '',
        language: selectedLanguage,
      }));

      const res = await assignmentApi.submitAssignment(assignmentToken, submissions);
      setSubmissionReport(res);
      setSubmissionCompleted(true);
      setShowSubmitModal(false);
      toast.success('Assignment submitted successfully!');
    } catch (err) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // BROWSER RESTRICTION: GOOGLE CHROME ONLY
  if (!browserState.isChrome) {
    return (
      <ChromeRequiredCard
        currentBrowser={browserState.currentBrowser}
        onRecheck={() => setBrowserState(checkIsGoogleChrome())}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="page-wrapper" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Loader text="AI Engine is synthesizing your personalized technical assessment using Gemini AI..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="assignment-container" style={{ maxWidth: '640px', marginTop: '3rem' }}>
        <Card elevated style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <AlertTriangle size={48} color="#f87171" style={{ margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Assessment Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {loadError}
          </p>
          <Link to="/courses" className="btn btn-primary">
            Return to Courses
          </Link>
        </Card>
      </div>
    );
  }

  // LOCKED VIEW: CANDIDATE VERIFICATION (ONLINE CHROME ENVIRONMENT)
  if (assignment?.locked) {
    // 1. If Admin has NOT scheduled the assignment yet
    if (assignment.schedule_status === 'not_scheduled') {
      return (
        <div className="assignment-container" style={{ maxWidth: '640px', marginTop: '3rem' }}>
          <Card elevated style={{ padding: '2.5rem', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(15, 23, 42, 0.9)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Clock size={32} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Badge variant="warning">Interview Schedule Pending</Badge>
              <Badge variant="primary">{assignment.course_title || 'Course Track'}</Badge>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
              Assessment Date Not Assigned Yet
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.75rem' }}>
              Your application has been received and shortlisted! Technical assessments can only be started at the official date and time scheduled by the admissions team.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#94a3b8' }}>
              <div style={{ marginBottom: '6px' }}><strong style={{ color: '#fff' }}>Candidate:</strong> {assignment.candidate_name || 'Candidate'}</div>
              <div style={{ marginBottom: '6px' }}><strong style={{ color: '#fff' }}>Course Track:</strong> {assignment.course_title}</div>
              <div><strong style={{ color: '#fff' }}>Next Step:</strong> You will receive an official email invitation once the administrator sets your interview date and duration.</div>
            </div>

            <Link to="/my-courses" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <span>Return to My Applications</span>
              <ArrowRight size={16} />
            </Link>
          </Card>
        </div>
      );
    }

    // 2. If Admin scheduled the assignment for the FUTURE (Time not arrived yet)
    return (
      <div className="assignment-container" style={{ maxWidth: '640px', marginTop: '3rem' }}>
        <Card elevated style={{ padding: '2.5rem', border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(15, 23, 42, 0.9)', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <Calendar size={32} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Badge variant="primary">Scheduled Interview</Badge>
            <Badge variant="success">Google Chrome Required</Badge>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
            Your Technical Assessment is Scheduled
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            The administrator has scheduled your technical coding interview. The examination room will unlock automatically at your scheduled start time.
          </p>

          {/* Schedule Details Card */}
          <div style={{ background: 'rgba(56, 189, 248, 0.06)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled Start Time</span>
                <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{assignment.scheduled_datetime_display || assignment.assignment_datetime}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allocated Duration</span>
                <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>{assignment.duration_minutes || 60} Minutes</strong>
              </div>
            </div>
          </div>

          {/* Live Countdown Clock */}
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.75rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Room Unlocks In
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '2px' }}>
              {formatScheduleDiff(scheduleCountdown)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/my-courses" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <span>View My Applications</span>
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} />
              <span>Refresh Status</span>
            </button>
          </div>
        </Card>
      </div>
    );
  }


  // SUBMISSION COMPLETED VIEW
  if (submissionCompleted && submissionReport) {
    const scoreVal = Math.round(submissionReport.score ?? 0);
    const isSelectedForInterview = scoreVal >= 50;

    return (
      <div className="assignment-container">
        <div className="results-modal-card">
          <div
            className="score-hero-circle"
            style={{
              borderColor: isSelectedForInterview ? '#10b981' : '#f59e0b',
              boxShadow: isSelectedForInterview ? '0 0 35px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f9fafb' }}>
              {scoreVal}%
            </span>
            <span style={{ fontSize: '0.75rem', color: isSelectedForInterview ? '#6ee7b7' : '#fcd34d', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Score
            </span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Badge
              variant={isSelectedForInterview ? 'success' : 'warning'}
              style={{
                marginBottom: '0.85rem',
                fontSize: '0.85rem',
                padding: '0.35rem 0.85rem',
                letterSpacing: '0.03em',
              }}
            >
              {isSelectedForInterview
                ? '★ SELECTED FOR NEXT AI INTERVIEW PROCESS'
                : 'ASSESSMENT COMPLETED (BELOW 50% THRESHOLD)'}
            </Badge>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {isSelectedForInterview
                ? 'Congratulations! You Have Been Selected'
                : 'Assessment Evaluation Complete'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              {isSelectedForInterview ? (
                <span>
                  Your assessment score of <strong style={{ color: '#10b981' }}>{scoreVal}%</strong> is above the 50% cutoff threshold. You have been officially selected to advance to the <strong>Next AI Interview Process</strong> for <strong>{assignment?.course_title}</strong>.
                </span>
              ) : (
                <span>
                  You achieved a score of <strong style={{ color: '#fbbf24' }}>{scoreVal}%</strong> for <strong>{assignment?.course_title}</strong>. A minimum score of <strong>50%</strong> is required to advance to the next AI Interview process.
                </span>
              )}
            </p>
          </div>

          {/* Qualified Interview Next Steps Callout */}
          {isSelectedForInterview && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 700, fontSize: '1rem' }}>
                <Sparkles size={18} color="#10b981" />
                <span>Next Stage: AI Technical Interview Process</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Your code implementation and logic benchmarks satisfied the prerequisite standards. Your profile has been updated to <strong>Selected for Next AI Interview</strong>. Check your applications dashboard for scheduling details.
              </p>
            </div>
          )}

          {/* Test stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                {submissionReport.passed_questions ?? assignment?.passed_questions ?? '-'} /{' '}
                {submissionReport.total_questions ?? assignment?.total_questions ?? 2}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Problems Solved
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
                {submissionReport.total_tests_passed ?? '-'} / {submissionReport.total_tests_count ?? '-'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                All Test Cases (Public + Hidden)
              </div>
            </div>
          </div>

          {/* AI Review from Gemini */}
          {submissionReport.ai_review && (
            <div className="ai-review-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BrainCircuit size={20} color="#a855f7" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
                  Gemini AI Code Review
                </h3>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#c084fc',
                    background: 'rgba(168, 85, 247, 0.15)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {submissionReport.ai_review.verdict || 'Evaluated'}
                </span>
              </div>

              <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {submissionReport.ai_review.technical_feedback}
              </p>

              {submissionReport.ai_review.strengths && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem' }}>
                    Key Strengths:
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {submissionReport.ai_review.strengths.map((str, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {submissionReport.ai_review.areas_for_growth && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
                    Recommendations:
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {submissionReport.ai_review.areas_for_growth.map((str, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {isSelectedForInterview && (
              <Link
                to={`/interview/start?assignment_token=${assignmentToken}`}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={16} />
                <span>Launch Stage 2: AI Interview (Camera & Mic Check)</span>
              </Link>
            )}
            {isUnlimitedTrial && (
              <button
                type="button"
                onClick={handleResetTrial}
                className="btn btn-warning"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <RotateCcw size={16} />
                <span>Retake Assessment (Unlimited Free Trial)</span>
              </button>
            )}
            <Link to="/my-enrollments" className="btn btn-secondary">
              View My Applications
            </Link>
            <Link to="/courses" className="btn btn-secondary">
              Back to Catalog
            </Link>
          </div>
          <div style={{ width: '100%', textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: isUnlimitedTrial ? '#a5b4fc' : '#94a3b8' }}>
            {isUnlimitedTrial ? (
              <span>★ Unlimited Free Trial Active for <strong>23091a32j4@rgmcet.edu.in</strong> (Unlimited Retries)</span>
            ) : (
              <span>Candidate Examination Policy: <strong>Single Attempt Limit (1/1 Completed)</strong></span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // EXAM TERMINATED VIEW (Detailed Reason & Proctoring Incident Breakdown)
  if (isExamTerminated) {
    const formattedTerminatedAt = assignment?.terminated_at
      ? new Date(assignment.terminated_at).toLocaleString()
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
      <div className="assignment-container" style={{ maxWidth: '780px', marginTop: '2.5rem', marginBottom: '3rem' }}>
        <Card
          elevated
          style={{
            padding: '2.5rem',
            border: '1px solid rgba(239, 68, 68, 0.55)',
            background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(30, 15, 20, 0.92))',
            boxShadow: '0 25px 60px rgba(239, 68, 68, 0.15)',
          }}
        >
          {/* Header Icon & Badges */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '20px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 1.25rem',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)',
              }}
            >
              <AlertOctagon size={42} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <Badge variant="danger">Academic Integrity Lockout</Badge>
              <Badge variant="secondary">Proctoring System Enforced</Badge>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Examination Terminated
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto' }}>
              Candidate: <strong>{assignment?.candidate_name || 'Candidate'}</strong> ? Course: <strong>{assignment?.course_title || 'AI Technical Assessment'}</strong>
            </p>
          </div>

          {/* Primary Reason Callout Box */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <ShieldAlert size={20} color="#f87171" />
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#fca5a5',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Official Termination Reason
              </span>
            </div>

            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.5, marginBottom: '0.5rem' }}>
              {terminationReason || 'Multiple proctoring violations detected exceeding security limits.'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#fca5a5' }}>
              <Clock size={14} />
              <span>Terminated At: {formattedTerminatedAt}</span>
            </div>
          </div>

          {/* Chronological Breakdown of Detected Violations / Strikes */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#f59e0b" />
              Violation Audit Trail ({terminationLogs.length > 0 ? `${terminationLogs.length} incident(s) logged` : 'Security Strikes Log'})
            </h3>

            {terminationLogs && terminationLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {terminationLogs.map((log, index) => {
                  const isCritical = log.isCritical || log.severity === 'critical';
                  const strikeNum = log.strike || index + 1;

                  return (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`,
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isCritical ? '#f87171' : '#fbbf24',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {log.type === 'mobile_phone' ? (
                          <Smartphone size={16} />
                        ) : log.type === 'other_voice' ? (
                          <Volume2 size={16} />
                        ) : log.type === 'screen_shift' ? (
                          <EyeOff size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: isCritical ? '#f87171' : '#fbbf24',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {isCritical ? 'Immediate Critical Exit' : `Security Strike ${strikeNum} of 3`}
                          </span>

                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {log.timestamp || log.isoTime || formattedTerminatedAt}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.45 }}>
                          {log.message || log.details || 'Integrity violation detected.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  fontSize: '0.88rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                }}
              >
                The assessment was locked because the monitoring system detected one or more severe integrity breaches:
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                  <li>Unauthorized mobile device usage observed by camera vision</li>
                  <li>Candidate navigated away from active assessment tab or window</li>
                  <li>Secondary voice or background conversation detected in room</li>
                  <li>Security strike limit (3/3 strikes) exceeded during examination</li>
                </ul>
              </div>
            )}
          </div>

          {/* Administrative Notice Box */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.84rem',
              color: '#94a3b8',
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1' }}>
              <strong>Policy Notice:</strong> In accordance with technical examination regulations, all webcam snapshots, audio telemetry, and window focus logs have been permanently recorded in the database.
            </p>
            <div>
              Assessment Result: <strong style={{ color: '#f87171' }}>Disqualified (Score: 0.0%)</strong> ? Status: <strong style={{ color: '#fca5a5' }}>Terminated (Proctoring Violation)</strong>
            </div>
            {assignmentToken && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                Incident Reference Token: {assignmentToken}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/courses" className="btn btn-secondary">
              Back to Catalog
            </Link>
            <Link to="/my-enrollments" className="btn btn-primary">
              View My Applications
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // PRE-EXAM VERIFICATION VIEW: FACE & AUDIO CHECK BEFORE OPENING CODE EDITOR
  if (!isPrecheckVerified && !assignment?.locked && !submissionCompleted) {
    return (
      <div className="assignment-container">
        <PreExamVerification
          assignmentToken={assignmentToken}
          candidateName={assignment?.candidate_name}
          courseTitle={assignment?.course_title}
          onVerificationComplete={() => {
            setIsPrecheckVerified(true);
            toast.success('Face & Audio verification saved in database! Coding workspace unlocked.');
          }}
        />
      </div>
    );
  }

  // ACTIVE INTERVIEW & CODING WORKSPACE
  return (
    <div className="assignment-container">
      {/* Top Header Bar */}
      <div className="assignment-header">
        <div className="assignment-meta-left">
          <div className="assignment-icon-badge">
            <BrainCircuit size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                {assignment?.course_title || 'AI Technical Assessment'}
              </h2>
              <Badge variant="success">Shortlisted Candidate</Badge>
              <Badge variant="primary">Google Chrome</Badge>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Candidate: <strong style={{ color: '#e5e7eb' }}>{assignment?.candidate_name}</strong> • Powered by Gemini AI
            </p>
          </div>
        </div>

        <div className="assignment-header-actions">
          {/* Live countdown timer */}
          <div className={`timer-pill ${timeLeft < 600 ? 'warning' : ''}`}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<Send size={16} />}
            onClick={() => setShowSubmitModal(true)}
            disabled={isExamTerminated}
          >
            Submit Assessment
          </Button>
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="question-tabs-bar">
        {assignment?.questions?.map((q, index) => {
          const qResult = testResults[q.id];
          const isPassed = qResult?.all_passed;

          return (
            <button
              key={q.id}
              className={`question-tab-btn ${activeQIndex === index ? 'active' : ''}`}
              onClick={() => setActiveQIndex(index)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Code2 size={18} color={activeQIndex === index ? '#818cf8' : 'var(--text-muted)'} />
                <span>
                  Question {index + 1}: {q.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  className={
                    q.difficulty.toLowerCase() === 'easy'
                      ? 'badge-difficulty-easy'
                      : q.difficulty.toLowerCase() === 'hard'
                      ? 'badge-difficulty-hard'
                      : 'badge-difficulty-medium'
                  }
                >
                  {q.difficulty}
                </span>
                {isPassed && (
                  <CheckCircle size={16} color="#34d399" title="All tests passed" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split IDE Grid */}
      {activeQuestion && (
        <div className="ide-split-grid">
          {/* Left Pane: Problem Description */}
          <div className="problem-pane">
            <div className="problem-header">
              <div>
                <h3 className="problem-title">{activeQuestion.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <span
                    className={
                      activeQuestion.difficulty.toLowerCase() === 'easy'
                        ? 'badge-difficulty-easy'
                        : activeQuestion.difficulty.toLowerCase() === 'hard'
                        ? 'badge-difficulty-hard'
                        : 'badge-difficulty-medium'
                    }
                  >
                    {activeQuestion.difficulty}
                  </span>
                  <Badge variant="default">{activeQuestion.category}</Badge>
                </div>
              </div>
            </div>

            {/* AI Personalization Banner */}
            <div className="ai-tailored-banner">
              <Sparkles size={16} color="#a5b4fc" style={{ flexShrink: 0 }} />
              <span>
                Generated specifically from your resume background and the requirements for{' '}
                <strong>{assignment?.course_title}</strong>.
              </span>
            </div>

            {/* Problem Statement */}
            <div>
              <h4 className="problem-section-title">Problem Statement</h4>
              <p className="problem-description-text">{activeQuestion.problem_statement}</p>
            </div>

            {/* Constraints */}
            {activeQuestion.constraints && activeQuestion.constraints.length > 0 && (
              <div>
                <h4 className="problem-section-title">Constraints</h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                  {activeQuestion.constraints.map((c, idx) => (
                    <li key={idx} style={{ marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Public Test Cases Examples */}
            <div>
              <h4 className="problem-section-title">Example Test Cases (Visible)</h4>
              {activeQuestion.public_test_cases?.map((example, idx) => (
                <div key={idx} className="test-case-example-card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.5rem' }}>
                    Example {idx + 1}
                  </div>
                  <div className="example-row">
                    <strong>Input: </strong>
                    <code>{JSON.stringify(example.input)}</code>
                  </div>
                  <div className="example-row">
                    <strong>Expected Output: </strong>
                    <code>{JSON.stringify(example.expected_output)}</code>
                  </div>
                  {example.explanation && (
                    <div className="example-row" style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      <em>Explanation: {example.explanation}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Hidden Test Cases Security Notice */}
            <div className="hidden-security-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <EyeOff size={16} color="#94a3b8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {activeQuestion.hidden_test_cases_count} Hidden Test Cases Active
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Boundary edge cases and large scale states are evaluated on the backend when you run tests.
                Inputs and expected outputs are confidential during the interview, but your pass/fail status
                is evaluated in real-time.
              </p>
            </div>
          </div>

          {/* Right Pane: Code Editor & Console */}
          <div className="editor-pane">
            <div className="code-editor-box">
              {/* Editor Toolbar */}
              <div className="editor-toolbar">
                {/* Language Selector */}
                <div className="editor-lang-badge" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                  <FileCode size={16} style={{ marginRight: '4px', flexShrink: 0 }} />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    style={{
                      background: 'rgba(15,23,42,0.9)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleCopyCode}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleResetCode}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                    title="Reset to default starter template"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Editor Textarea */}
              <div className="editor-textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  value={activeCode}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  className="code-textarea"
                  placeholder={selectedLanguage === 'python' ? 'def solution(...):\n    # Write your solution here' : '// Write your solution here'}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Test Results Console */}
            <div className="console-panel">
              <div className="console-tabs-header">
                <div className="console-tab-buttons">
                  <button
                    className={`console-tab-btn ${activeConsoleTab === 'tests' ? 'active' : ''}`}
                    onClick={() => setActiveConsoleTab('tests')}
                  >
                    Test Cases Evaluation {currentTestResult && `(${currentTestResult.passed_tests}/${currentTestResult.total_tests})`}
                  </button>
                  <button
                    className={`console-tab-btn ${activeConsoleTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveConsoleTab('output')}
                  >
                    <Terminal size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Console / Stderr
                  </button>
                </div>

                {currentTestResult && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: currentTestResult.all_passed ? '#34d399' : '#f87171',
                    }}
                  >
                    {currentTestResult.all_passed ? 'All Tests Passed' : 'Tests Incomplete'}
                  </span>
                )}
              </div>

              <div className="console-content">
                {activeConsoleTab === 'tests' ? (
                  !currentTestResult ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Click <strong>"Run Code & Tests"</strong> below to test your solution against both public and hidden test cases.
                    </div>
                  ) : (
                    <div className="test-results-grid">
                      {/* Public Test Cases */}
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>
                        Public Test Cases:
                      </div>

                      {currentTestResult.public_results?.map((pub) => (
                        <div
                          key={pub.test_index}
                          className={`test-result-card ${pub.passed ? 'passed' : 'failed'}`}
                        >
                          <div className="test-result-top">
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6' }}>
                              Case {pub.test_index}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {pub.execution_time_ms} ms
                              </span>
                              {pub.passed ? (
                                <span className="badge-passed">
                                  <CheckCircle size={14} /> Passed
                                </span>
                              ) : (
                                <span className="badge-failed">
                                  <XCircle size={14} /> Failed
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Input: </span>
                              <code style={{ color: '#93c5fd' }}>{JSON.stringify(pub.input)}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                              <code style={{ color: '#86efac' }}>{JSON.stringify(pub.expected_output)}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Output: </span>
                              <code style={{ color: pub.passed ? '#86efac' : '#fca5a5' }}>
                                {JSON.stringify(pub.actual_output)}
                              </code>
                            </div>
                            {pub.error && (
                              <div style={{ color: '#f87171', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                                Error: {pub.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Hidden Test Cases */}
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#e2e8f0',
                          marginTop: '0.6rem',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Hidden Test Cases (Confidential States):
                      </div>

                      {currentTestResult.hidden_results?.map((hid) => (
                        <div
                          key={hid.test_index}
                          className={`hidden-result-pill ${hid.passed ? 'passed' : 'failed'}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <EyeOff size={15} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f3f4f6' }}>
                              Hidden Test Case {hid.test_index}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {hid.execution_time_ms} ms
                            </span>
                            {hid.passed ? (
                              <span className="badge-passed">
                                <CheckCircle size={14} /> Passed
                              </span>
                            ) : (
                              <span className="badge-failed">
                                <XCircle size={14} /> Hidden State Not Satisfied
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div>
                    {currentTestResult?.stdout && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Stdout:</div>
                        <pre
                          style={{
                            background: '#030712',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            color: '#e2e8f0',
                          }}
                        >
                          {currentTestResult.stdout}
                        </pre>
                      </div>
                    )}

                    {currentTestResult?.compile_error ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.25rem' }}>Execution Error:</div>
                        <pre
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            color: '#fca5a5',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {currentTestResult.compile_error}
                        </pre>
                      </div>
                    ) : (
                      !currentTestResult?.stdout && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No output generated. Print statements will appear here.
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="editor-actions-bar">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activeQIndex > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setActiveQIndex((prev) => prev - 1)}
                  >
                    Previous Question
                  </Button>
                )}
                {activeQIndex < (assignment?.questions?.length || 1) - 1 && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setActiveQIndex((prev) => prev + 1)}
                  >
                    Next Question
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Play size={15} />}
                  isLoading={isRunningTests}
                  onClick={handleRunTests}
                >
                  Run Code & Tests
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Send size={15} />}
                  onClick={() => setShowSubmitModal(true)}
                >
                  Submit All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live AI Proctoring Feed */}
      {!submissionCompleted && !isExamTerminated && assignment && !assignment.locked && (
        <LiveProctoringFeed
          assignmentToken={assignmentToken}
          isActive={!submissionCompleted && !isExamTerminated}
          onWarning={handleProctoringWarning}
          onTerminate={handleProctoringTerminate}
        />
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Assessment Submission"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            You are about to submit your solutions for both coding problems. Our evaluation engine and
            Gemini AI will test all public and hidden test cases, compile code metrics, and finalize your score.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {assignment?.questions?.map((q, idx) => {
              const res = testResults[q.id];
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: idx === 0 ? '0.75rem' : 0,
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    Question {idx + 1}: {q.title}
                  </span>
                  {res?.all_passed ? (
                    <Badge variant="success">All Tests Passed</Badge>
                  ) : res ? (
                    <Badge variant="warning">{res.passed_tests} / {res.total_tests} Passed</Badge>
                  ) : (
                    <Badge variant="default">Untested</Badge>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
              Continue Coding
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleFinalSubmit}
            >
              Confirm Final Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssignmentView;
