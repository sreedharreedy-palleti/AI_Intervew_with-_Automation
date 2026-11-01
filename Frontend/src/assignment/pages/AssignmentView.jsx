import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentApi } from '../services/assignmentApi';
import { API_BASE_URL } from '../../utils/constants';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { Play, Send, AlertTriangle } from 'lucide-react';

// Section components
import AssignmentHeader from '../sections/AssignmentHeader';
import QuestionTabsBar from '../sections/QuestionTabsBar';
import ProblemViewer from '../sections/ProblemViewer';
import CodeEditorPanel from '../sections/CodeEditorPanel';
import ConsoleRunner from '../sections/ConsoleRunner';
import SecurityLockModal from '../sections/SecurityLockModal';
import SubmissionReportModal from '../sections/SubmissionReportModal';
import ChromeRequiredCard from '../../components/common/ChromeRequiredCard';
import { checkIsGoogleChrome } from '../../utils/browserCheck';

import '../styles/AssignmentView.css';

const AssignmentView = () => {
  const { assignmentToken } = useParams();
  const toast = useToast();
  const [browserState, setBrowserState] = useState(() => checkIsGoogleChrome());

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

  // LOCKED VIEW: DEDICATED APP REQUIRED
  if (assignment?.locked) {
    return (
      <SecurityLockModal
        assignment={assignment}
        unlockUsername={unlockUsername}
        setUnlockUsername={setUnlockUsername}
        unlockCode={unlockCode}
        setUnlockCode={setUnlockCode}
        handleUnlock={handleUnlock}
        isVerifying={isVerifying}
        verifyError={verifyError}
      />
    );
  }

  // SUBMISSION COMPLETED VIEW
  if (submissionCompleted && submissionReport) {
    return (
      <SubmissionReportModal
        submissionReport={submissionReport}
        assignment={assignment}
      />
    );
  }

  // ACTIVE INTERVIEW & CODING WORKSPACE
  return (
    <div className="assignment-container">
      {/* Top Header Bar */}
      <AssignmentHeader
        courseTitle={assignment?.course_title}
        candidateName={assignment?.candidate_name}
        timeLeft={timeLeft}
        formatTime={formatTime}
        onSubmitClick={() => setShowSubmitModal(true)}
      />

      {/* Question Selector Tabs */}
      <QuestionTabsBar
        questions={assignment?.questions}
        activeQIndex={activeQIndex}
        setActiveQIndex={setActiveQIndex}
        testResults={testResults}
      />

      {/* Main Split IDE Grid */}
      {activeQuestion && (
        <div className="ide-split-grid">
          {/* Left Pane: Problem Description */}
          <ProblemViewer
            question={activeQuestion}
            courseTitle={assignment?.course_title}
          />

          {/* Right Pane: Code Editor & Console */}
          <div className="editor-pane">
            <CodeEditorPanel
              activeCode={activeCode}
              handleCodeChange={handleCodeChange}
              handleKeyDown={handleKeyDown}
              handleCopyCode={handleCopyCode}
              handleResetCode={handleResetCode}
              copiedCode={copiedCode}
              textareaRef={textareaRef}
            />

            {/* Test Results Console */}
            <ConsoleRunner
              activeConsoleTab={activeConsoleTab}
              setActiveConsoleTab={setActiveConsoleTab}
              currentTestResult={currentTestResult}
            />

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
      <SubmitConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        assignment={assignment}
        testResults={testResults}
        isSubmitting={isSubmitting}
        handleFinalSubmit={handleFinalSubmit}
      />
    </div>
  );
};

export default AssignmentView;
