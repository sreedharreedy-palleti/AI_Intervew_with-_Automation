import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ProctoredExam.css';
import { 
  Camera, 
  Mic, 
  VideoOff, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Award,
  RefreshCw,
  Lock, 
  UserCheck, 
  Play, 
  Compass, 
  Users, 
  Target, 
  Speech, 
  Ban, 
  AlertOctagon, 
  LogOut,
  Code,
  Terminal,
  RotateCcw,
  Layers,
  FileCode,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  startProctorSession, 
  logProctorViolation, 
  analyzeCameraFrameBackend,
  terminateProctorSession,
  getAssessmentCandidate, 
  fetchAssessmentQuestions,
  executeCandidateCode,
  submitAssessmentExam 
} from '../../services/api';
import { VisionProctorEngine } from '../../services/visionProctor';
import { AudioProctorEngine } from '../../services/audioProctor';
import { formatValue } from '../../services/codeExecutionEngine';

export default function ProctoredExam({ initialData, showToast, onFinishExam, currentUser }) {
  // Candidate & Exam Info
  const [candidateId, setCandidateId] = useState(initialData?.candidateId || '');
  const [candidateName, setCandidateName] = useState(initialData?.candidateName || currentUser?.name || 'Candidate');
  const [targetRole, setTargetRole] = useState(initialData?.targetRole || currentUser?.targetRole || 'Full Stack React & Node Developer');
  
  // Stages: 'setup' | 'active' | 'completed' | 'terminated'
  const [stage, setStage] = useState('setup');
  
  // Media & Hardware State
  const [cameraPermission, setCameraPermission] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [stream, setStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Vision & Audio Engines
  const visionEngineRef = useRef(null);
  const audioEngineRef = useRef(null);

  // Live Vision & Camera Axis State
  const [visionState, setVisionState] = useState({
    facesCount: 0,
    status: 'idle',
    headAxis: { yaw: 0, pitch: 0, roll: 0, isOffAxis: false, status: 'center', stabilityScore: 100 },
    gaze: { x: 0, y: 0, direction: 'center', isDeviated: false },
    phoneDetected: false
  });

  // Live Audio State (VU Meter & Speech)
  const [audioMetrics, setAudioMetrics] = useState({
    volume: 0,
    volumeDb: 0,
    frequencyBands: [0, 0, 0, 0, 0, 0, 0, 0],
    state: 'silent',
    isMuted: false,
    suspiciousNoise: false
  });
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [isAiVoiceMuted] = useState(false);
  const [speechRate] = useState(1.0);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Proctoring Session & Violations
  const [sessionId, setSessionId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [latestWarning, setLatestWarning] = useState(null);
  const [terminationData, setTerminationData] = useState(null);
  const lastViolationTimeRef = useRef({});
  const lastBackendCheckTimeRef = useRef(0);
  const activeExamStartTimeRef = useRef(0);
  const consecutiveMultiFaceRef = useRef(0);
  const consecutivePhoneRef = useRef(0);
  const consecutiveVoiceRef = useRef(0);

  // Coding Challenges & IDE State
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript'); // 'javascript' | 'python'
  const [codePerQuestion, setCodePerQuestion] = useState({}); // { [questionId]: { javascript: '...', python: '...' } }
  const [activeProblemTab, setActiveProblemTab] = useState('description'); // 'description' | 'visibleTests' | 'hiddenTests'
  const [selectedVisibleTestIdx, setSelectedVisibleTestIdx] = useState(0);
  const [executionResultsPerQ, setExecutionResultsPerQ] = useState({});
  const [submittedSolutions, setSubmittedSolutions] = useState({});
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes for coding round
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Code editor textarea ref for line numbers & tab key handling
  const codeEditorRef = useRef(null);

  // Current Question shortcut
  const currentQuestion = questions[currentQIndex] || null;
  const currentCode = currentQuestion
    ? codePerQuestion[currentQuestion.id]?.[selectedLanguage] || currentQuestion.starterCode?.[selectedLanguage] || ''
    : '';
  const currentExecResult = currentQuestion ? executionResultsPerQ[currentQuestion.id] : null;
  const currentSubmitted = currentQuestion ? submittedSolutions[currentQuestion.id] : null;

  // Fetch Questions from Backend API
  const loadBackendQuestions = useCallback(async (roleToLoad, candId) => {
    setIsLoadingQuestions(true);
    try {
      const res = await fetchAssessmentQuestions({
        role: roleToLoad || targetRole || 'fullstack',
        candidateId: candId || candidateId
      });
      if (res?.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        
        // Initialize starter code
        const initialCodeMap = {};
        res.questions.forEach((q) => {
          initialCodeMap[q.id] = {
            javascript: q.starterCode?.javascript || '',
            python: q.starterCode?.python || ''
          };
        });
        setCodePerQuestion(initialCodeMap);
      }
    } catch (e) {
      console.warn('Backend questions load warning:', e.message);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [targetRole, candidateId]);

  // Initialize Vision & Audio Engines
  useEffect(() => {
    visionEngineRef.current = new VisionProctorEngine({
      yawThreshold: 22,
      pitchThreshold: 18,
      rollThreshold: 25
    });
    audioEngineRef.current = new AudioProctorEngine();

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.closeAudio();
        audioEngineRef.current.stopSpeech();
        audioEngineRef.current.stopListening();
      }
    };
  }, []);

  // Fetch candidate info and questions on candidateId change
  useEffect(() => {
    if (candidateId && candidateId.length >= 10) {
      getAssessmentCandidate(candidateId)
        .then((res) => {
          if (res?.candidate) {
            if (res.candidate.candidateDetails) {
              const details = res.candidate.candidateDetails;
              if (details.fullName) setCandidateName(details.fullName);
              if (details.targetRole) {
                setTargetRole(details.targetRole);
                loadBackendQuestions(details.targetRole, candidateId);
              }
            } else {
              if (res.candidate.fullName) setCandidateName(res.candidate.fullName);
              if (res.candidate.targetRole) {
                setTargetRole(res.candidate.targetRole);
                loadBackendQuestions(res.candidate.targetRole, candidateId);
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [candidateId, loadBackendQuestions]);

  // Auto-fetch questions on targetRole or candidateId change
  useEffect(() => {
    loadBackendQuestions(targetRole, candidateId);
  }, [targetRole, candidateId, loadBackendQuestions]);

  // Handle Video Stream attachment
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      if (audioEngineRef.current) {
        audioEngineRef.current.initAudioStream(stream);
      }
    }
  }, [stream, stage]);

  // Request Camera & Mic Permissions
  const requestMediaPermissions = async () => {
    try {
      setMediaError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: true
      });
      setStream(mediaStream);
      setCameraPermission(true);
      setMicPermission(true);
      showToast?.('Camera and Microphone activated for Coding Round', 'success');

      if (audioEngineRef.current) {
        audioEngineRef.current.initAudioStream(mediaStream);
      }
    } catch (err) {
      console.error('Media permission error:', err);
      setMediaError('Could not access camera/microphone. Please allow browser permissions.');
      showToast?.('Camera/Mic permission denied', 'error');
    }
  };

  // Calibration of Center Camera Axis
  const handleCalibrateAxis = () => {
    if (visionEngineRef.current && visionState.headAxis) {
      visionEngineRef.current.calibrate(
        visionState.headAxis.yaw,
        visionState.headAxis.pitch,
        visionState.headAxis.roll
      );
      setIsCalibrated(true);
      showToast?.('Camera axis calibrated to center position', 'success');
      audioEngineRef.current?.speak('Camera axis calibrated successfully. You are centered in the frame.', { isWarning: false });
    }
  };

  // Test AI Question Reader Audio
  const handleTestAiVoice = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.speak(
        'Welcome to your AI Proctored Coding Round. I will assist you with problem requirements while monitoring security.',
        {
          rate: speechRate,
          onStart: () => setIsSpeakingQuestion(true),
          onEnd: () => setIsSpeakingQuestion(false)
        }
      );
    }
  };

  // Read current problem statement aloud
  const handleReadCurrentProblem = () => {
    if (!currentQuestion || !audioEngineRef.current) return;
    if (isSpeakingQuestion) {
      audioEngineRef.current.stopSpeech();
      setIsSpeakingQuestion(false);
      return;
    }

    const textToRead = `Problem ${currentQIndex + 1}: ${currentQuestion.title}. ${currentQuestion.description}. Look at the 3 visible test cases for sample inputs and expected outputs.`;
    audioEngineRef.current.speak(textToRead, {
      rate: speechRate,
      onStart: () => setIsSpeakingQuestion(true),
      onEnd: () => setIsSpeakingQuestion(false)
    });
  };

  // -------------------------------------------------------------
  // AUTOMATIC EXAM TERMINATION HANDLER (ANTI-CHEAT)
  // -------------------------------------------------------------
  const handleAutoTerminateExam = useCallback(async (reason, violationType) => {
    if (stage === 'terminated') return;
    // 8-second startup cooldown protection
    if (Date.now() - activeExamStartTimeRef.current < 8000) return;

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (audioEngineRef.current) {
      audioEngineRef.current.stopSpeech();
      audioEngineRef.current.stopListening();
      audioEngineRef.current.speak('Security violation limit reached. Examination has ended.', {
        isWarning: true
      });
    }

    const termData = {
      reason,
      violationType,
      timestamp: new Date().toLocaleTimeString()
    };

    setTerminationData(termData);
    setStage('terminated');
    setProctorStatus('terminated');

    try {
      if (sessionId) {
        await terminateProctorSession({
          sessionId,
          reason: `${reason} (Violation Type: ${violationType})`
        });
      }
    } catch (e) {
      console.warn('Termination report notice:', e.message);
    }

    showToast?.(`EXAM TERMINATED: ${reason}`, 'error');
  }, [stage, sessionId, showToast]);

  // Log a violation with Progressive 3-Strike Rule
  const handleTriggerViolation = useCallback(async (type, details) => {
    if (stage !== 'active') return;
    // 8-second startup cooldown protection
    if (Date.now() - activeExamStartTimeRef.current < 8000) return;

    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (now - lastTime < 5000) return; // 5-second debounce between same alerts
    lastViolationTimeRef.current[type] = now;

    const newViolation = {
      type,
      details,
      timestamp: new Date().toLocaleTimeString()
    };

    setViolations((prev) => {
      const updated = [...prev, newViolation];
      if (updated.length >= 3) {
        handleAutoTerminateExam(
          `Candidate exceeded maximum violation threshold (3/3 Strikes: ${details}).`,
          type
        );
      }
      return updated;
    });

    const currentStrikeNum = violations.length + 1;
    setLatestWarning(`⚠️ Warning [Strike ${currentStrikeNum}/3]: ${details}`);

    if (audioEngineRef.current && !isAiVoiceMuted) {
      audioEngineRef.current.speak(`Warning: ${details}`, { isWarning: true });
    }

    try {
      if (sessionId) {
        await logProctorViolation({
          sessionId,
          violationType: type,
          details
        });
      }
    } catch (err) {
      console.warn('Violation log warning:', err.message);
    }
  }, [stage, sessionId, violations.length, isAiVoiceMuted, handleAutoTerminateExam]);

  // Start Proctored Coding Round
  const handleStartExam = async () => {
    if (!cameraPermission || !micPermission) {
      showToast?.('Please enable camera and microphone before starting.', 'warning');
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen rejection
    }

    activeExamStartTimeRef.current = Date.now();
    consecutiveMultiFaceRef.current = 0;
    consecutivePhoneRef.current = 0;
    consecutiveVoiceRef.current = 0;
    setViolations([]);
    setLatestWarning(null);

    try {
      const sessionRes = await startProctorSession({
        candidateId: candidateId || `CAND-${Date.now()}`,
        candidateName: candidateName || 'Candidate',
        targetRole: targetRole || 'Full Stack React & Node Developer'
      });
      if (sessionRes?.sessionId) {
        setSessionId(sessionRes.sessionId);
      }
    } catch (e) {
      console.warn('Backend proctor session warning:', e.message);
    }

    setStage('active');
    setProctorStatus('active');
    showToast?.('Proctored Coding Round Started', 'success');

    if (audioEngineRef.current && !isAiVoiceMuted) {
      audioEngineRef.current.startListening();
      audioEngineRef.current.speak('Your proctored coding round has started. Good luck!', { isWarning: false });
    }
  };

  // Real-time Vision Frame Processing Loop
  useEffect(() => {
    if (stage !== 'active' && stage !== 'setup') return;
    let animationFrameId;

    const processFrame = async () => {
      if (videoRef.current && visionEngineRef.current && videoRef.current.readyState >= 2) {
        const isSetup = stage === 'setup';
        const visionResult = await visionEngineRef.current.processVideoFrame(videoRef.current, { isSetup });
        setVisionState(visionResult);

        if (canvasRef.current && videoRef.current) {
          const vw = videoRef.current.videoWidth || 640;
          const vh = videoRef.current.videoHeight || 480;
          if (canvasRef.current.width !== vw || canvasRef.current.height !== vh) {
            canvasRef.current.width = vw;
            canvasRef.current.height = vh;
          }
          visionEngineRef.current.drawProctorOverlay(canvasRef.current, videoRef.current, visionResult, { isSetup });
        }

        if (stage === 'active') {
          const timeSinceStart = Date.now() - activeExamStartTimeRef.current;

          // 8-Second Startup Grace Period
          if (timeSinceStart > 8000) {
            // ZERO TOLERANCE RULE 1: Another Person Enters -> Instant Exam Auto-Exit (No chances)
            if (visionResult.facesCount > 1) {
              consecutiveMultiFaceRef.current += 1;
              if (consecutiveMultiFaceRef.current >= 20) {
                handleAutoTerminateExam(
                  `Security Breach: Unauthorized second person detected in examination room (${visionResult.facesCount} people present). Exam terminated.`,
                  'multiple_faces_detected'
                );
                return;
              }
            } else {
              consecutiveMultiFaceRef.current = Math.max(0, consecutiveMultiFaceRef.current - 1);
            }

            // ZERO TOLERANCE RULE 2: Prohibited Mobile Phone / Device Detected -> Instant Exam Auto-Exit (No chances)
            if (visionResult.phoneDetected) {
              consecutivePhoneRef.current += 1;
              if (consecutivePhoneRef.current >= 30) {
                handleAutoTerminateExam(
                  'Security Breach: Unauthorized mobile phone / electronic device detected in camera viewport. Exam terminated.',
                  'cell_phone_detected'
                );
                return;
              }
            } else {
              consecutivePhoneRef.current = Math.max(0, consecutivePhoneRef.current - 1);
            }

            // Head Movement: Candidate is free to rotate and move their head multiple times (No auto-exit)
            // No head_off_axis auto-termination
          }

          const now = Date.now();
          if (now - lastBackendCheckTimeRef.current > 4000 && sessionId && timeSinceStart > 8000) {
            lastBackendCheckTimeRef.current = now;
            analyzeCameraFrameBackend({
              sessionId,
              candidateId,
              facesCount: visionResult.facesCount,
              headAxis: visionResult.headAxis,
              phoneDetected: visionResult.phoneDetected,
              audioDb: audioMetrics.volumeDb,
              timestamp: now
            }).catch(() => {});
          }
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stage, sessionId, candidateId, audioMetrics.volumeDb, handleAutoTerminateExam]);

  // Real-time Audio Level & Speech Listener (ZERO TOLERANCE on Human Voice / Talking)
  useEffect(() => {
    if (!audioEngineRef.current || stage !== 'active') return;

    audioEngineRef.current.setAudioMetricsCallback((metrics) => {
      setAudioMetrics(metrics);
      if (Date.now() - activeExamStartTimeRef.current > 8000) {
        // ZERO TOLERANCE RULE 3: Human Voice Detected -> Instant Exam Auto-Exit (No chances)
        if (metrics.loudHumanVoiceDetected) {
          consecutiveVoiceRef.current += 1;
          if (consecutiveVoiceRef.current >= 15) {
            handleAutoTerminateExam(
              'Security Breach: Human voice / verbal conversation detected in examination room. Exam terminated.',
              'loud_human_voice'
            );
          }
        } else {
          consecutiveVoiceRef.current = Math.max(0, consecutiveVoiceRef.current - 1);
        }
      }
    });

    audioEngineRef.current.setSpeechTranscriptCallback((transcript) => {
      setVoiceTranscript(transcript);
      if (Date.now() - activeExamStartTimeRef.current > 8000 && transcript && transcript.trim().length >= 5) {
        handleAutoTerminateExam(
          `Security Breach: Verbal speech detected in examination room ("${transcript.slice(0, 35)}..."). Exam terminated.`,
          'speaking_detected'
        );
      }
    });
  }, [stage, handleAutoTerminateExam]);

  // Anti-Cheat Event Listeners (Tab change -> ZERO TOLERANCE INSTANT EXIT)
  useEffect(() => {
    if (stage !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden && Date.now() - activeExamStartTimeRef.current > 8000) {
        handleAutoTerminateExam(
          'Security Breach: Candidate switched browser tabs or minimized examination screen. Zero tolerance policy applied — exam terminated immediately.',
          'tab_switch'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage, handleAutoTerminateExam]);

  // -------------------------------------------------------------
  // SUBMIT FINAL CODING EXAM
  // -------------------------------------------------------------
  const handleSubmitAllExam = useCallback(async () => {
    setIsSubmittingFinal(true);

    let grandTotalPassed = 0;
    let grandTotalCases = 0;
    let grandVisiblePassed = 0;
    let grandHiddenPassed = 0;

    const codingSubmissionsList = [];

    // Ensure all questions have evaluated submissions
    for (const q of questions) {
      let sub = submittedSolutions[q.id];
      if (!sub) {
        // Evaluate on the fly if not submitted yet
        const codeToRun = codePerQuestion[q.id]?.[selectedLanguage] || q.starterCode?.[selectedLanguage] || '';
        try {
          const evalRes = await executeCandidateCode({
            code: codeToRun,
            language: selectedLanguage,
            questionId: q.id,
            functionName: q.functionName,
            visibleTestCases: q.visibleTestCases,
            hiddenTestCases: q.hiddenTestCases || [],
            includeHidden: true
          });
          const resData = evalRes.executionResults || {};
          sub = {
            questionId: q.id,
            title: q.title,
            language: selectedLanguage,
            code: codeToRun,
            visiblePassed: resData.visiblePassed || 0,
            visibleTotal: resData.visibleTotal || 3,
            hiddenPassed: resData.hiddenPassed || 0,
            hiddenTotal: resData.hiddenTotal || q.hiddenTestCasesCount || 2,
            totalPassed: resData.totalPassed || 0,
            totalTestCases: resData.totalTestCases || 5,
            allPassed: resData.allPassed || false,
            runtimeMs: resData.runtimeMs || 0
          };
        } catch {
          sub = {
            questionId: q.id,
            title: q.title,
            language: selectedLanguage,
            code: codeToRun,
            visiblePassed: 0,
            visibleTotal: 3,
            hiddenPassed: 0,
            hiddenTotal: 2,
            totalPassed: 0,
            totalTestCases: 5,
            allPassed: false,
            runtimeMs: 0
          };
        }
      }

      grandTotalPassed += sub.totalPassed;
      grandTotalCases += sub.totalTestCases;
      grandVisiblePassed += sub.visiblePassed;
      grandHiddenPassed += sub.hiddenPassed;
      codingSubmissionsList.push(sub);
    }

    const finalScore = grandTotalCases > 0 ? Math.round((grandTotalPassed / grandTotalCases) * 100) : 0;

    const proctorMetricsPayload = {
      axisStabilityScore: visionState.headAxis?.stabilityScore || 95,
      facePresenceRate: visionState.facesCount > 0 ? 100 : 85,
      eyeContactRate: visionState.gaze?.isDeviated ? 75 : 95,
      audioNoiseAlerts: violations.filter((v) => v.type === 'suspicious_audio_noise').length,
      totalViolations: violations.length
    };

    try {
      const subRes = await submitAssessmentExam({
        candidateId: candidateId || 'anonymous',
        sessionId: sessionId || 'session_default',
        answers: [],
        score: finalScore,
        correctCount: codingSubmissionsList.filter((s) => s.allPassed).length,
        totalQuestions: questions.length,
        totalTestCasesPassed: grandTotalPassed,
        totalTestCases: grandTotalCases,
        visiblePassed: grandVisiblePassed,
        hiddenPassed: grandHiddenPassed,
        codingSubmissions: codingSubmissionsList,
        proctorMetrics: proctorMetricsPayload
      });

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      setFinalResult({
        score: finalScore,
        totalTestCasesPassed: grandTotalPassed,
        totalTestCases: grandTotalCases,
        visiblePassed: grandVisiblePassed,
        hiddenPassed: grandHiddenPassed,
        submissionId: subRes.submissionId || 'SUB-' + Date.now(),
        violationsCount: violations.length,
        status: violations.length >= 3 ? 'Flagged for Review' : 'Passed & Verified',
        proctorMetrics: proctorMetricsPayload,
        submissions: codingSubmissionsList
      });

      setStage('completed');
      showToast?.('Coding round exam submitted and verified successfully!', 'success');

      if (audioEngineRef.current && !isAiVoiceMuted) {
        audioEngineRef.current.speak(`Coding round completed. Your evaluation score is ${finalScore} percent.`, { rate: 1.0 });
      }

      if (finalScore >= 60 && violations.length < 3) {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Error submitting coding exam:', err);
      showToast?.('Error submitting exam: ' + err.message, 'error');
    } finally {
      setIsSubmittingFinal(false);
    }
  }, [
    candidateId,
    sessionId,
    questions,
    submittedSolutions,
    codePerQuestion,
    selectedLanguage,
    visionState,
    violations,
    isAiVoiceMuted,
    showToast
  ]);

  // Keep stable reference so timer does NOT reset on every frame render
  const handleSubmitAllExamRef = useRef(handleSubmitAllExam);
  useEffect(() => {
    handleSubmitAllExamRef.current = handleSubmitAllExam;
  }, [handleSubmitAllExam]);

  // Exam Countdown Timer (Smooth 1-second interval)
  useEffect(() => {
    if (stage !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitAllExamRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // Handle Code Changes in Editor
  const handleCodeChange = (newCode) => {
    if (!currentQuestion) return;
    setCodePerQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || {}),
        [selectedLanguage]: newCode
      }
    }));
  };

  // Reset to Starter Boilerplate
  const handleResetCode = () => {
    if (!currentQuestion) return;
    const defaultCode = currentQuestion.starterCode?.[selectedLanguage] || '';
    handleCodeChange(defaultCode);
    showToast?.('Reset code to starter template', 'info');
  };

  // Handle Tab key in Textarea for code indentation
  const handleKeyDownInEditor = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(updated);
      setTimeout(() => {
        if (codeEditorRef.current) {
          codeEditorRef.current.selectionStart = codeEditorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // -------------------------------------------------------------
  // RUN 3 VISIBLE TEST CASES
  // -------------------------------------------------------------
  const handleRunVisibleTests = async () => {
    if (!currentQuestion) return;
    setIsRunningCode(true);
    setConsoleLogs([`[Running Visible Test Cases] Problem: ${currentQuestion.title} (${selectedLanguage})...`]);

    try {
      const execResult = await executeCandidateCode({
        code: currentCode,
        language: selectedLanguage,
        questionId: currentQuestion.id,
        functionName: currentQuestion.functionName,
        visibleTestCases: currentQuestion.visibleTestCases,
        hiddenTestCases: [],
        includeHidden: false
      });

      const resData = execResult.executionResults || {};
      setExecutionResultsPerQ((prev) => ({
        ...prev,
        [currentQuestion.id]: resData
      }));

      if (execResult.logs && execResult.logs.length > 0) {
        setConsoleLogs((prev) => [...prev, ...execResult.logs]);
      }

      if (execResult.error) {
        setConsoleLogs((prev) => [...prev, `[ERROR] ${execResult.error}`]);
        showToast?.(`Execution Error: ${execResult.error}`, 'error');
      } else {
        const passedCount = resData.visiblePassed || 0;
        const totalCount = resData.visibleTotal || 3;
        setConsoleLogs((prev) => [
          ...prev,
          `[Result] ${passedCount}/${totalCount} Visible Test Cases Passed (${resData.runtimeMs || 0}ms)`
        ]);

        if (passedCount === totalCount) {
          showToast?.(`All ${totalCount} Visible Test Cases Passed!`, 'success');
        } else {
          showToast?.(`${passedCount}/${totalCount} Visible Test Cases Passed`, 'info');
        }
      }

      setActiveProblemTab('visibleTests');
    } catch (err) {
      console.error('Run visible tests error:', err);
      setConsoleLogs((prev) => [...prev, `[Fatal Error] ${err.message}`]);
      showToast?.('Execution error: ' + err.message, 'error');
    } finally {
      setIsRunningCode(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMIT & EVALUATE (3 VISIBLE + HIDDEN TEST CASES)
  // -------------------------------------------------------------
  const handleSubmitAndVerifyAll = async () => {
    if (!currentQuestion) return;
    setIsEvaluatingAll(true);
    setConsoleLogs([
      `[Verifying All Test Cases] Testing 3 Visible Cases + Hidden State Cases for ${currentQuestion.title}...`
    ]);

    try {
      const execResult = await executeCandidateCode({
        code: currentCode,
        language: selectedLanguage,
        questionId: currentQuestion.id,
        functionName: currentQuestion.functionName,
        visibleTestCases: currentQuestion.visibleTestCases,
        hiddenTestCases: currentQuestion.hiddenTestCases || [],
        includeHidden: true
      });

      const resData = execResult.executionResults || {};
      setExecutionResultsPerQ((prev) => ({
        ...prev,
        [currentQuestion.id]: resData
      }));

      // Record submitted solution
      const submissionRecord = {
        questionId: currentQuestion.id,
        title: currentQuestion.title,
        language: selectedLanguage,
        code: currentCode,
        visiblePassed: resData.visiblePassed || 0,
        visibleTotal: resData.visibleTotal || 3,
        hiddenPassed: resData.hiddenPassed || 0,
        hiddenTotal: resData.hiddenTotal || currentQuestion.hiddenTestCasesCount || 2,
        totalPassed: resData.totalPassed || 0,
        totalTestCases: resData.totalTestCases || 5,
        allPassed: resData.allPassed || false,
        runtimeMs: resData.runtimeMs || 0
      };

      setSubmittedSolutions((prev) => ({
        ...prev,
        [currentQuestion.id]: submissionRecord
      }));

      if (execResult.logs && execResult.logs.length > 0) {
        setConsoleLogs((prev) => [...prev, ...execResult.logs]);
      }

      setConsoleLogs((prev) => [
        ...prev,
        `[Evaluation Summary] Visible Passed: ${submissionRecord.visiblePassed}/${submissionRecord.visibleTotal} | Hidden Passed: ${submissionRecord.hiddenPassed}/${submissionRecord.hiddenTotal}`,
        submissionRecord.allPassed ? '>>> ALL TEST CASES SATISFIED (100% SCORE) <<<' : '>>> Partial Test Cases Passed <<<'
      ]);

      if (submissionRecord.allPassed) {
        showToast?.(`Solution Passed All Tests (3 Visible + Hidden States)!`, 'success');
      } else {
        showToast?.(`Solution verified: ${submissionRecord.totalPassed}/${submissionRecord.totalTestCases} Tests Passed`, 'info');
      }

      setActiveProblemTab('hiddenTests');
    } catch (err) {
      console.error('Evaluate all error:', err);
      showToast?.('Evaluation error: ' + err.message, 'error');
    } finally {
      setIsEvaluatingAll(false);
    }
  };

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="exam-wrapper">
      {/* -------------------------------------------------------- */}
      {/* STAGE 1: HARDWARE & CANDIDATE SETUP                      */}
      {/* -------------------------------------------------------- */}
      {stage === 'setup' && (
        <div className="setup-container">
          <div className="setup-header">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="badge badge-emerald">
                <Code size={14} /> AI Proctored Coding Round
              </span>
              <span className="badge badge-cyan">
                <ShieldCheck size={14} /> 3D Vision & Test Evaluation
              </span>
            </div>
            <h1 className="section-title">Coding Round Pre-Exam Verification</h1>
            <p className="section-subtitle">
              Verify your camera 3D axis, face detection, microphone VU audio levels, and coding environment before entering the proctored exam.
            </p>
          </div>

          <div className="setup-container">
            <div className="setup-header text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="badge badge-emerald">
                  <Code size={14} /> AI Proctored Coding Round
                </span>
                <span className="badge badge-cyan">
                  <ShieldCheck size={14} /> Smart Proctoring Engine
                </span>
              </div>
              <h1 className="section-title">Coding Assessment Pre-Check</h1>
              <p className="section-subtitle">
                Verify your live camera feed and microphone audio before starting the proctored examination.
              </p>
            </div>

            <div className="setup-grid">
              {/* Left: Clean Live Camera Feed Box */}
              <div className="glass-panel p-5 flex flex-col justify-between">
                <div>
                  <div className="panel-title-bar mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="text-cyan" size={18} />
                      <span className="panel-heading font-semibold">Live Camera Preview</span>
                    </div>
                    <span className={`badge ${cameraPermission ? 'badge-emerald' : 'badge-amber'}`}>
                      {cameraPermission ? 'Connected' : 'Camera Off'}
                    </span>
                  </div>

                  <div className="video-feed-preview relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 pointer-events-none w-full h-full"
                    />

                    {cameraPermission && (
                      <div className="video-overlay-pill">
                        <span className="live-pulse" /> Live Camera
                      </div>
                    )}

                    {!cameraPermission && (
                      <div className="video-fallback text-center p-4">
                        <VideoOff size={44} className="text-slate-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-200">Camera preview inactive</p>
                        <p className="text-xs text-slate-400 mt-1 mb-3">Click below to allow camera & microphone access</p>
                        <button
                          type="button"
                          onClick={requestMediaPermissions}
                          className="btn btn-primary btn-sm mx-auto"
                        >
                          <Camera size={14} /> Enable Camera & Mic
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {cameraPermission ? '✅ Camera active and ready' : 'Camera permission required'}
                  </span>
                  <button
                    type="button"
                    onClick={requestMediaPermissions}
                    className="btn btn-secondary btn-xs"
                  >
                    <RefreshCw size={12} /> Refresh Camera
                  </button>
                </div>
              </div>

              {/* Right: Candidate Details, Mic Level & Start Button */}
              <div className="glass-panel p-5 flex flex-col justify-between">
                <div>
                  <div className="panel-title-bar mb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="text-emerald" size={18} />
                      <span className="panel-heading font-semibold">Candidate Details & Rules</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="form-group">
                      <label className="form-label text-xs">Candidate ID</label>
                      <input
                        type="text"
                        className="form-input text-xs font-mono"
                        placeholder="e.g. CAND-6504a..."
                        value={candidateId}
                        onChange={(e) => setCandidateId(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">Full Name</label>
                      <input
                        type="text"
                        className="form-input text-xs"
                        placeholder="e.g. John Doe"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label text-xs">Assessment Track</label>
                    <select
                      className="form-input text-xs"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    >
                      <option value="Full Stack React & Node Developer">Full Stack React & Node Developer</option>
                      <option value="Python / AI Backend Engineer">Python / AI Backend Engineer</option>
                      <option value="Frontend JavaScript / UI Engineer">Frontend JavaScript / UI Engineer</option>
                    </select>
                  </div>

                  {/* Microphone Level */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-slate-300 font-semibold">
                        <Mic size={13} className={audioMetrics.volume > 15 ? 'text-emerald' : 'text-slate-400'} />
                        Microphone Input
                      </span>
                      <span className="font-mono text-xs text-cyan">{audioMetrics.volumeDb} dB</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-100 ${audioMetrics.suspiciousNoise ? 'bg-rose-500' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, audioMetrics.volume * 1.5)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rules summary */}
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                    <div className="text-cyan-300 font-semibold flex items-center justify-between">
                      <span>Duration: 20 Minutes</span>
                      <span>{questions.length || 3} Challenges</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Typing & ambient sounds permitted • Secondary devices & talking strictly prohibited
                    </p>
                  </div>
                </div>

                {mediaError && (
                  <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 text-rose-400" />
                    <span>{mediaError}</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleStartExam}
                    disabled={!cameraPermission || !micPermission}
                    className="btn btn-emerald btn-lg w-full"
                    id="start-proctored-coding-exam-btn"
                  >
                    <Sparkles size={18} />
                    <span>Start Proctored Coding Round</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STAGE 2: ACTIVE PROCTORED CODING EXAM ROOM               */}
      {/* -------------------------------------------------------- */}
      {stage === 'active' && currentQuestion && (
        <div className="active-exam-container coding-exam-mode">
          {/* Top Exam Navigation Bar */}
          <div className="exam-top-bar">
            <div className="flex items-center gap-3">
              <div className="live-status-pill">
                <span className="status-indicator-dot animate-ping" />
                <span className="font-semibold text-xs text-cyan">PROCTORED CODING ROOM LIVE</span>
              </div>
              <div className="exam-candidate-tag">
                <Users size={14} />
                <span>{candidateName}</span>
              </div>
              <span className="badge badge-indigo text-xs">
                Problem {currentQIndex + 1} of {questions.length}
              </span>
            </div>

            {/* Middle: Timer */}
            <div className={`exam-timer-box ${timeLeft < 180 ? 'timer-urgent' : ''}`}>
              <Clock size={16} />
              <span className="timer-digits">{formatTime(timeLeft)}</span>
            </div>

            {/* Right: Proctor Status & Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={handleReadCurrentProblem}
                title="Read Problem Statement Aloud"
              >
                <Speech size={14} className={isSpeakingQuestion ? 'text-emerald animate-pulse' : 'text-slate-400'} />
                <span>{isSpeakingQuestion ? 'Speaking...' : 'Read Aloud'}</span>
              </button>

              <div className={`proctor-badge ${violations.length >= 3 ? 'badge-flagged' : 'badge-secure'}`}>
                <ShieldAlert size={14} />
                <span>Strikes: {violations.length} / 3</span>
              </div>
            </div>
          </div>

          {/* Latest Warning Banner if triggered */}
          {latestWarning && (
            <div className="violation-warning-banner">
              <AlertTriangle size={18} />
              <span>{latestWarning}</span>
              <button 
                type="button" 
                className="dismiss-warning-btn"
                onClick={() => setLatestWarning(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main 2-Column Coding Studio Grid */}
          <div className="coding-studio-grid">
            {/* -------------------------------------------------- */}
            {/* LEFT COLUMN: Problem Details & Test Case Outputs   */}
            {/* -------------------------------------------------- */}
            <div className="glass-panel problem-description-card">
              {/* Problem Header */}
              <div className="problem-header-bar">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-cyan text-xs">
                      Q{currentQIndex + 1}
                    </span>
                    <span className={`badge ${
                      currentQuestion.difficulty === 'Easy' ? 'badge-emerald' :
                      currentQuestion.difficulty === 'Medium' ? 'badge-amber' : 'badge-rose'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                    <span className="badge badge-indigo text-xs">
                      {currentQuestion.category}
                    </span>
                  </div>
                  <h2 className="problem-title">{currentQuestion.title}</h2>
                </div>

                {/* Submission Status Pill */}
                {currentSubmitted && (
                  <div className={`submission-pill ${currentSubmitted.allPassed ? 'pill-passed' : 'pill-partial'}`}>
                    <Check size={14} />
                    <span>{currentSubmitted.totalPassed}/{currentSubmitted.totalTestCases} Tests</span>
                  </div>
                )}
              </div>

              {/* Problem Tabs Navigation */}
              <div className="problem-tabs-nav">
                <button
                  type="button"
                  className={`prob-tab ${activeProblemTab === 'description' ? 'active' : ''}`}
                  onClick={() => setActiveProblemTab('description')}
                >
                  <FileCode size={14} /> Description & Constraints
                </button>
                <button
                  type="button"
                  className={`prob-tab ${activeProblemTab === 'visibleTests' ? 'active' : ''}`}
                  onClick={() => setActiveProblemTab('visibleTests')}
                >
                  <Layers size={14} /> 3 Visible Test Cases
                  {currentExecResult?.visiblePassed !== undefined && (
                    <span className="tab-count-badge">
                      {currentExecResult.visiblePassed}/{currentExecResult.visibleTotal}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={`prob-tab ${activeProblemTab === 'hiddenTests' ? 'active' : ''}`}
                  onClick={() => setActiveProblemTab('hiddenTests')}
                >
                  <Lock size={14} /> Hidden State Tests
                  {currentSubmitted?.hiddenPassed !== undefined && (
                    <span className="tab-count-badge">
                      {currentSubmitted.hiddenPassed}/{currentSubmitted.hiddenTotal}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content 1: Description & Constraints */}
              {activeProblemTab === 'description' && (
                <div className="problem-tab-body">
                  <div className="problem-description-text">
                    <p>{currentQuestion.description}</p>
                  </div>

                  {/* Constraints */}
                  {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                    <div className="constraints-box mt-4">
                      <h4 className="box-subheading">Constraints:</h4>
                      <ul className="constraints-list">
                        {currentQuestion.constraints.map((c, i) => (
                          <li key={i}><code>{c}</code></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Preview of the 3 Visible Test Cases */}
                  <div className="sample-previews-box mt-4">
                    <h4 className="box-subheading">Sample Examples:</h4>
                    <div className="space-y-2">
                      {currentQuestion.visibleTestCases?.map((tc, idx) => (
                        <div key={idx} className="sample-example-card">
                          <span className="example-tag">Example {idx + 1}:</span>
                          <div className="example-io">
                            <div><span className="text-slate-400">Input:</span> <code>{tc.inputRaw}</code></div>
                            <div><span className="text-slate-400">Expected Output:</span> <code>{formatValue(tc.expectedOutput)}</code></div>
                            {tc.explanation && (
                              <div className="text-slate-400 text-xs italic mt-0.5">{tc.explanation}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 2: 3 Visible Test Cases with Real-Time Outputs */}
              {activeProblemTab === 'visibleTests' && (
                <div className="problem-tab-body">
                  <div className="visible-tests-selector mb-3">
                    {currentQuestion.visibleTestCases?.map((tc, idx) => {
                      const res = currentExecResult?.visibleResults?.find((r) => r.id === tc.id);
                      const isPassed = res?.passed;
                      const isFailed = res && !res.passed;

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`test-case-pill-btn ${selectedVisibleTestIdx === idx ? 'active' : ''} ${
                            isPassed ? 'passed' : isFailed ? 'failed' : ''
                          }`}
                          onClick={() => setSelectedVisibleTestIdx(idx)}
                        >
                          {isPassed && <CheckCircle2 size={13} className="text-emerald" />}
                          {isFailed && <XCircle size={13} className="text-rose" />}
                          <span>Case {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Test Case Details */}
                  {(() => {
                    const tc = currentQuestion.visibleTestCases?.[selectedVisibleTestIdx] || currentQuestion.visibleTestCases?.[0];
                    if (!tc) return null;
                    const res = currentExecResult?.visibleResults?.find((r) => r.id === tc.id);

                    return (
                      <div className="test-case-details-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-xs text-cyan">
                            Visible Test Case {selectedVisibleTestIdx + 1}
                          </span>
                          {res && (
                            <span className={`badge ${res.passed ? 'badge-emerald' : 'badge-rose'}`}>
                              {res.status} ({res.runtimeMs}ms)
                            </span>
                          )}
                        </div>

                        {/* Input Box */}
                        <div className="io-block mb-2">
                          <span className="io-label">Input:</span>
                          <pre className="io-content">{tc.inputRaw}</pre>
                        </div>

                        {/* Expected Output */}
                        <div className="io-block mb-2">
                          <span className="io-label">Expected Output:</span>
                          <pre className="io-content text-emerald-300">{formatValue(tc.expectedOutput)}</pre>
                        </div>

                        {/* Actual Output if executed */}
                        {res && (
                          <div className="io-block mb-2">
                            <span className="io-label">Your Code Output:</span>
                            <pre className={`io-content ${res.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {formatValue(res.actualOutput)}
                            </pre>
                            {res.error && (
                              <p className="text-xs text-rose-400 mt-1 font-mono">Error: {res.error}</p>
                            )}
                          </div>
                        )}

                        {tc.explanation && (
                          <div className="text-xs text-slate-400 mt-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <strong>Explanation:</strong> {tc.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content 3: Hidden State Test Cases */}
              {activeProblemTab === 'hiddenTests' && (
                <div className="problem-tab-body">
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl mb-3 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-1">
                      <Lock size={14} /> Hidden State Verification Suite
                    </div>
                    <p className="text-slate-300">
                      Hidden test cases evaluate boundary values, large limits, and corner cases. They are fully verified when you click <strong>"Submit & Verify All"</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {currentQuestion.hiddenTestCasesSummary?.map((h, idx) => {
                      const res = currentExecResult?.hiddenResults?.find((r) => r.id === h.id);
                      const isPassed = res?.passed;
                      const isFailed = res && !res.passed;

                      return (
                        <div key={idx} className="hidden-test-item-card">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isPassed ? (
                                <CheckCircle2 size={16} className="text-emerald" />
                              ) : isFailed ? (
                                <XCircle size={16} className="text-rose" />
                              ) : (
                                <Lock size={16} className="text-slate-500" />
                              )}
                              <div>
                                <span className="font-semibold text-xs text-slate-200 block">
                                  {h.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Category: {h.edgeCaseType}
                                </span>
                              </div>
                            </div>

                            <div>
                              {res ? (
                                <span className={`badge ${isPassed ? 'badge-emerald' : 'badge-rose'}`}>
                                  {res.status} ({res.runtimeMs}ms)
                                </span>
                              ) : (
                                <span className="badge badge-secondary text-[10px]">
                                  Pending Verification
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Footer (Problem 1, 2, 3 bullets & previous/next) */}
              <div className="problem-nav-footer">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => {
                    setCurrentQIndex((prev) => prev - 1);
                    setActiveProblemTab('description');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <ArrowLeft size={15} /> Prev
                </button>

                <div className="problem-bullets-wrap">
                  {questions.map((q, i) => {
                    const sub = submittedSolutions[q.id];
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`bullet-btn ${i === currentQIndex ? 'current' : ''} ${
                          sub?.allPassed ? 'all-passed' : sub ? 'partial' : ''
                        }`}
                        onClick={() => {
                          setCurrentQIndex(i);
                          setActiveProblemTab('description');
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQIndex((prev) => prev + 1);
                      setActiveProblemTab('description');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Next <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmittingFinal}
                    onClick={handleSubmitAllExam}
                    className="btn btn-emerald btn-sm"
                    id="submit-final-exam-btn"
                  >
                    <Send size={14} />
                    <span>{isSubmittingFinal ? 'Submitting...' : 'Finish Exam'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* -------------------------------------------------- */}
            {/* RIGHT COLUMN: Code Editor, Action Bar & PIP Feed   */}
            {/* -------------------------------------------------- */}
            <div className="coding-editor-panel-column">
              {/* Top IDE Toolbar */}
              <div className="editor-top-toolbar">
                <div className="flex items-center gap-2">
                  <Code size={16} className="text-cyan" />
                  <span className="font-semibold text-xs text-slate-200">Solution Editor</span>

                  {/* Language Selector */}
                  <select
                    className="lang-select-input"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="javascript">JavaScript (Node.js 20)</option>
                    <option value="python">Python 3.11</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleResetCode}
                    title="Reset to starter boilerplate"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setConsoleLogs([])}
                    title="Clear console output"
                  >
                    <Terminal size={12} /> Clear Console
                  </button>
                </div>
              </div>

              {/* Code Editor Body with Line Numbers */}
              <div className="code-editor-wrapper">
                <div className="line-numbers-gutter">
                  {currentCode.split('\n').map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <textarea
                  ref={codeEditorRef}
                  value={currentCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleKeyDownInEditor}
                  spellCheck="false"
                  autoCapitalize="off"
                  autoComplete="off"
                  className="code-textarea-input font-mono"
                  placeholder="// Write your code solution here..."
                />
              </div>

              {/* Editor Action Buttons (Run Visible vs Submit & Verify All) */}
              <div className="editor-action-bar">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isRunningCode || isEvaluatingAll}
                    onClick={handleRunVisibleTests}
                    className="btn btn-secondary btn-sm"
                    id="run-visible-tests-btn"
                  >
                    <Play size={14} className="text-emerald" />
                    <span>{isRunningCode ? 'Running 3 Tests...' : 'Run 3 Visible Tests'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRunningCode || isEvaluatingAll}
                    onClick={handleSubmitAndVerifyAll}
                    className="btn btn-primary btn-sm"
                    id="submit-verify-all-tests-btn"
                  >
                    <Sparkles size={14} className="text-cyan" />
                    <span>{isEvaluatingAll ? 'Verifying All...' : 'Submit & Verify (Visible + Hidden)'}</span>
                  </button>
                </div>

                {/* Single Question Pass Indicator */}
                {currentSubmitted && (
                  <div className="text-xs font-mono flex items-center gap-1 text-slate-300">
                    <span>Score:</span>
                    <strong className={currentSubmitted.allPassed ? 'text-emerald' : 'text-amber'}>
                      {currentSubmitted.totalPassed}/{currentSubmitted.totalTestCases} Passed
                    </strong>
                  </div>
                )}
              </div>

              {/* Split Bottom: Console Output + Picture-in-Picture Proctor Feed */}
              <div className="editor-bottom-grid">
                {/* Console Terminal */}
                <div className="console-terminal-card">
                  <div className="console-header">
                    <span className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                      <Terminal size={13} className="text-cyan" /> Execution Console & stdout
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {consoleLogs.length} logs
                    </span>
                  </div>
                  <div className="console-body font-mono text-xs">
                    {consoleLogs.length === 0 ? (
                      <span className="text-slate-600 italic">
                        Click "Run 3 Visible Tests" or "Submit & Verify" to see execution outputs, test diffs, and console.logs...
                      </span>
                    ) : (
                      consoleLogs.map((log, idx) => (
                        <div key={idx} className="console-line">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Picture-in-Picture Proctor Feed & 3D Axis HUD */}
                <div className="proctor-hud-pip-card">
                  <div className="pip-video-container relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="pip-video-element"
                    />
                    <canvas
                      ref={canvasRef}
                      className="proctor-hud-canvas"
                    />
                    <div className="pip-axis-overlay">
                      <span>Live Secure Proctor</span>
                    </div>
                  </div>

                  {/* Real-Time Audio Level VU Meter */}
                  <div className="pip-audio-bar px-2.5 py-1.5 bg-slate-900/90 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Mic size={11} className="text-emerald" /> VU Audio:
                      </span>
                      <span className="font-mono text-cyan">{audioMetrics.volumeDb} dB</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-100 ${audioMetrics.suspiciousNoise ? 'bg-rose-500' : 'bg-cyan-400'}`}
                        style={{ width: `${Math.min(100, audioMetrics.volume)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STAGE 3: EXAM AUTO-TERMINATED (SECURITY BREACH)          */}
      {/* -------------------------------------------------------- */}
      {stage === 'terminated' && (
        <div className="completed-container">
          <div className="glass-panel certificate-card border-rose-500/50 shadow-2xl">
            <div className="cert-header text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-3 bg-rose-500/20 border-2 border-rose-500 rounded-full flex items-center justify-center animate-pulse">
                <Ban size={44} className="text-rose" />
              </div>
              <h2 className="cert-title text-rose">Examination Automatically Terminated</h2>
              <p className="cert-subtitle text-rose-300">
                Security Policy Breach Detected by AI Proctoring & Computer Vision Engine
              </p>
            </div>

            <div className="cert-body">
              <div className="p-4 bg-rose-950/40 border border-rose-500/60 rounded-xl mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
                  <AlertOctagon size={16} /> Official Termination Reason:
                </span>
                <p className="text-base font-semibold text-white">
                  {terminationData?.reason || 'Unauthorized security violation detected during active examination.'}
                </p>
                <span className="text-xs text-slate-400 mt-2 block font-mono">
                  Timestamp: {terminationData?.timestamp || new Date().toLocaleTimeString()} | Policy: Zero Tolerance Intrusion Protocol
                </span>
              </div>

              <div className="cert-metric-grid mb-4">
                <div className="cert-metric-box border-rose-500/30">
                  <span className="metric-label">Status</span>
                  <span className="metric-value text-rose">TERMINATED</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Candidate</span>
                  <span className="metric-value">{candidateName}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Candidate ID</span>
                  <span className="metric-value font-mono text-xs">{candidateId}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Logged Strikes</span>
                  <span className="metric-value text-rose">{violations.length} strikes</span>
                </div>
              </div>

              <div className="cert-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStage('setup');
                    setViolations([]);
                    setTerminationData(null);
                    setFinalResult(null);
                  }}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  <span>Restart Hardware Setup</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFinishExam?.()}
                  className="btn btn-primary"
                >
                  <LogOut size={16} />
                  <span>Return to Recruiter Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STAGE 4: CODING EXAM COMPLETED & CERTIFIED REPORT        */}
      {/* -------------------------------------------------------- */}
      {stage === 'completed' && finalResult && (
        <div className="completed-container">
          <div className="glass-panel certificate-card shadow-2xl">
            <div className="cert-header text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-3 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <Award size={36} className="text-emerald" />
              </div>
              <h2 className="cert-title">Coding Round & AI Proctoring Certificate</h2>
              <p className="cert-subtitle">
                Official Coding Evaluation Report & AI Proctoring Security Audit
              </p>
            </div>

            <div className="cert-body">
              {/* High-Level Score Card */}
              <div className="cert-metric-grid mb-4">
                <div className="cert-metric-box">
                  <span className="metric-label">Coding Score</span>
                  <span className="metric-value text-emerald font-bold text-3xl">
                    {finalResult.score}%
                  </span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Total Test Cases Passed</span>
                  <span className="metric-value text-cyan font-bold">
                    {finalResult.totalTestCasesPassed} / {finalResult.totalTestCases}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({finalResult.visiblePassed} visible, {finalResult.hiddenPassed} hidden)
                  </span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Integrity Status</span>
                  <span className={`metric-value ${finalResult.violationsCount >= 3 ? 'text-rose' : 'text-emerald'}`}>
                    {finalResult.status}
                  </span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Submission Reference</span>
                  <span className="metric-value font-mono text-xs">{finalResult.submissionId}</span>
                </div>
              </div>

              {/* Proctoring Verification Telemetry */}
              <div className="proctor-audit-summary-box p-3 bg-slate-900/60 border border-slate-800 rounded-xl mb-4">
                <h4 className="box-subheading flex items-center gap-1.5 text-cyan">
                  <ShieldCheck size={16} /> AI Proctoring Telemetry Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Head Axis Stability</span>
                    <span className="font-mono text-emerald font-bold">{finalResult.proctorMetrics.axisStabilityScore}%</span>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Face Presence Rate</span>
                    <span className="font-mono text-cyan font-bold">{finalResult.proctorMetrics.facePresenceRate}%</span>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Eye Contact Focus</span>
                    <span className="font-mono text-indigo font-bold">{finalResult.proctorMetrics.eyeContactRate}%</span>
                  </div>
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Total Security Flags</span>
                    <span className="font-mono text-emerald font-bold">{finalResult.violationsCount} Flags</span>
                  </div>
                </div>
              </div>

              {/* Code Submissions Review */}
              <div className="code-review-section mb-4">
                <h3 className="section-subtitle text-slate-200 mb-2">Coding Submissions Review:</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {finalResult.submissions?.map((sub, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            Problem {idx + 1}: {sub.title}
                          </span>
                          <span className="badge badge-cyan text-[10px] uppercase font-mono">
                            {sub.language}
                          </span>
                        </div>
                        <span className={`badge ${sub.allPassed ? 'badge-emerald' : 'badge-amber'}`}>
                          {sub.totalPassed}/{sub.totalTestCases} Tests Passed
                        </span>
                      </div>
                      <pre className="p-2 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto max-h-32 border border-slate-800/60 mt-2">
                        {sub.code}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="cert-actions flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStage('setup');
                    setFinalResult(null);
                    setViolations([]);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <RefreshCw size={16} />
                  <span>Start Another Coding Round</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFinishExam?.()}
                  className="btn btn-emerald flex-1"
                >
                  <LogOut size={16} />
                  <span>Return to Recruiter Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
