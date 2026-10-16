import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { API_BASE_URL } from '../../utils/constants';
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
} from 'lucide-react';

import './AssignmentView.css';

const AssignmentView = () => {
  const { assignmentToken } = useParams();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [assignment, setAssignment] = useState(null);

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

  // Timer countdown (default 60 mins)
  const [timeLeft, setTimeLeft] = useState(3600);

  // Code editor textarea ref
  const textareaRef = useRef(null);

  // App Lock and Credential Verification state
  const [unlockUsername, setUnlockUsername] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

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

  // Reset starter code
  const handleResetCode = () => {
    if (!activeQuestion) return;
    setSolutions((prev) => ({
      ...prev,
      [activeQuestion.id]: activeQuestion.starter_code || '',
    }));
    toast.info('Starter code reset to default template.');
  };

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
        language: 'python',
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
        language: 'python',
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

  // Unlock assessment using Username & Unique Exam Number
  const handleUnlock = async (e) => {
    e?.preventDefault();
    if (!unlockUsername.trim() || !unlockCode.trim()) {
      setVerifyError('Please enter both your Username and Unique Exam Number from your invitation email.');
      return;
    }
    setIsVerifying(true);
    setVerifyError('');
    try {
      await assignmentApi.verifyAccess(assignmentToken, {
        username: unlockUsername.trim(),
        uniqueCode: unlockCode.trim(),
      });
      const data = await assignmentApi.getAssignment(assignmentToken, {
        username: unlockUsername.trim(),
        uniqueCode: unlockCode.trim(),
      });
      setAssignment(data);
      const initialSolutions = {};
      if (data.questions && data.questions.length > 0) {
        data.questions.forEach((q) => {
          initialSolutions[q.id] = q.starter_code || '';
        });
      }
      setSolutions(initialSolutions);
      toast.success('Credentials verified! Assessment unlocked successfully.');
    } catch (err) {
      setVerifyError(
        err.response?.data?.detail || err.message || 'Invalid Username or Unique Exam Number. Please verify credentials from your invitation email.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Loader text="AI Engine is synthesizing your personalized technical assessment using Ollama (Llama 3)..." />
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

  // LOCKED VIEW: DEDICATED APP REQUIRED
  if (assignment?.locked) {
    return (
      <div className="assignment-container" style={{ maxWidth: '680px', marginTop: '2.5rem' }}>
        <Card elevated style={{ padding: '2.5rem', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(15, 23, 42, 0.85)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <Lock size={32} />
            </div>
            <Badge variant="primary" style={{ marginBottom: '0.75rem' }}>
              Candidate Verification Required
            </Badge>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
              Access Your AI Coding Assessment
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto' }}>
              Please enter your Username and Unique Exam Code from your invitation email to begin your coding assessment.
            </p>
          </div>

          {/* Verification Form */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <KeyRound size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f3f4f6' }}>
                Unlock Online Assessment with Credentials
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Enter the <strong>Username</strong> and <strong>Unique Exam Number</strong> received in your Gmail invitation:
            </p>

            {verifyError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {verifyError}
              </div>
            )}

            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Candidate Username / Email:
                </label>
                <input
                  type="text"
                  placeholder="e.g. candidate@example.com"
                  value={unlockUsername}
                  onChange={(e) => setUnlockUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Unique Exam Passcode / Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. EXAM-849201"
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    letterSpacing: '1px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={isVerifying}
                style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
              >
                {isVerifying ? 'Verifying Credentials...' : 'Verify & Unlock Assessment'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }


  // SUBMISSION COMPLETED VIEW
  if (submissionCompleted && submissionReport) {
    const isPassing = (submissionReport.score ?? 0) >= 60;
    return (
      <div className="assignment-container">
        <div className="results-modal-card">
          <div className="score-hero-circle">
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f9fafb' }}>
              {Math.round(submissionReport.score ?? 0)}%
            </span>
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Score
            </span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Badge variant={isPassing ? 'success' : 'warning'} style={{ marginBottom: '0.75rem' }}>
              {isPassing ? 'Technical Assessment Satisfied' : 'Review in Progress'}
            </Badge>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Assessment Evaluation Complete
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              Candidate: <strong>{assignment?.candidate_name}</strong> • Course: <strong>{assignment?.course_title}</strong>
            </p>
          </div>

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

          {/* AI Review from Ollama */}
          {submissionReport.ai_review && (
            <div className="ai-review-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BrainCircuit size={20} color="#a855f7" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
                  Ollama AI Code Review (Llama 3)
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <Link to="/courses" className="btn btn-secondary">
              Back to Catalog
            </Link>
            <Link to="/my-enrollments" className="btn btn-primary">
              View My Applications
            </Link>
          </div>
        </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                {assignment?.course_title || 'AI Technical Assessment'}
              </h2>
              <Badge variant="success">Shortlisted Candidate</Badge>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Candidate: <strong style={{ color: '#e5e7eb' }}>{assignment?.candidate_name}</strong> • Powered by Ollama & Llama 3
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
                <div className="editor-lang-badge">
                  <FileCode size={16} />
                  <span>Python 3 (CPython 3.12)</span>
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
                  placeholder="def solution(...):&#10;    # Write your solution here"
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

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Assessment Submission"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            You are about to submit your solutions for both coding problems. Our evaluation engine and
            Ollama AI will test all public and hidden test cases, compile code metrics, and finalize your score.
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
