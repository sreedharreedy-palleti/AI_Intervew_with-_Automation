import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Maximize2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Award,
  RefreshCw,
  Eye,
  Lock,
  UserCheck,
  Volume2,
  VolumeX,
  Play,
  Square,
  Compass,
  Radio,
  Activity,
  Smartphone,
  Users,
  Target,
  Speech,
  Ban,
  AlertOctagon,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  startProctorSession, 
  logProctorViolation, 
  analyzeCameraFrameBackend,
  terminateProctorSession,
  getAssessmentCandidate, 
  fetchAssessmentQuestions,
  submitAssessmentExam 
} from '../services/api';
import { VisionProctorEngine } from '../services/visionProctor';
import { AudioProctorEngine } from '../services/audioProctor';

export default function ProctoredExam({ initialData, showToast, onFinishExam }) {
  // Candidate & Exam Info
  const [candidateId, setCandidateId] = useState(initialData?.candidateId || '');
  const [candidateName, setCandidateName] = useState(initialData?.candidateName || '');
  const [targetRole, setTargetRole] = useState(initialData?.targetRole || 'Python Developer');
  
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
  const [isCalibrated, setIsCalibrated] = useState(false);

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
  const [isAiVoiceMuted, setIsAiVoiceMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Proctoring Session & Violations
  const [sessionId, setSessionId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [proctorStatus, setProctorStatus] = useState('in-progress'); // 'in-progress' | 'flagged' | 'completed' | 'terminated'
  const [latestWarning, setLatestWarning] = useState(null);
  const [terminationData, setTerminationData] = useState(null);
  const lastViolationTimeRef = useRef({});
  const lastBackendCheckTimeRef = useRef(0);

  // Exam State & Dynamic Backend Questions
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Fetch Questions from Backend API
  const loadBackendQuestions = useCallback(async (roleToLoad, candId) => {
    setIsLoadingQuestions(true);
    try {
      const res = await fetchAssessmentQuestions({
        role: roleToLoad || targetRole || 'python',
        candidateId: candId || candidateId
      });
      if (res?.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      }
    } catch (e) {
      console.warn('Backend questions load warning:', e.message);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [targetRole, candidateId]);

  // Initialize Engines
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
            if (res.candidate.fullName) setCandidateName(res.candidate.fullName);
            if (res.candidate.targetRole) {
              setTargetRole(res.candidate.targetRole);
              loadBackendQuestions(res.candidate.targetRole, candidateId);
            }
          }
        })
        .catch(() => {});
    }
  }, [candidateId, loadBackendQuestions]);

  // Auto-fetch questions on targetRole change
  useEffect(() => {
    loadBackendQuestions(targetRole, candidateId);
  }, [targetRole, loadBackendQuestions]);


  // Handle Video Stream attachment & Audio Context
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
      showToast?.('Camera and Microphone activated successfully', 'success');

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
      showToast?.('Camera axis calibrated to your center position', 'success');
      audioEngineRef.current?.speak('Camera axis calibrated successfully. You are centered.', { isWarning: false });
    }
  };

  // Test AI Question Reader Audio
  const handleTestAiVoice = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.speak(
        'Welcome to your AI Proctored Assessment. I will read each question aloud, and monitor your camera axis and audio in real-time.',
        {
          rate: speechRate,
          onStart: () => setIsSpeakingQuestion(true),
          onEnd: () => setIsSpeakingQuestion(false)
        }
      );
    }
  };

  // -------------------------------------------------------------
  // AUTOMATIC EXAM TERMINATION HANDLER
  // -------------------------------------------------------------
  const handleAutoTerminateExam = useCallback(async (reason, violationType) => {
    if (stage === 'terminated') return;

    // 1. Exit fullscreen mode immediately
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // 2. Stop audio/speech & play alert
    if (audioEngineRef.current) {
      audioEngineRef.current.stopSpeech();
      audioEngineRef.current.stopListening();
      audioEngineRef.current.speak('Security violation detected. Your examination has been automatically terminated.', {
        rate: 1.05,
        isWarning: true
      });
    }

    const termData = {
      reason: reason || 'Unauthorized security violation detected during examination',
      violationType: violationType || 'security_breach',
      timestamp: new Date().toLocaleTimeString()
    };

    setTerminationData(termData);
    setProctorStatus('terminated');
    setStage('terminated');

    showToast?.(`CRITICAL SECURITY BREACH: ${termData.reason}`, 'error');

    // 3. Notify backend database of termination
    if (sessionId) {
      try {
        await terminateProctorSession({
          sessionId,
          reason: termData.reason
        });
      } catch (err) {
        console.warn('Backend termination notify error:', err.message);
      }
    }
  }, [stage, sessionId, showToast]);

  // Record Violation Helper with Debounce & Voice Warning
  const recordViolation = useCallback(async (violationType, details) => {
    if (stage !== 'active' || !sessionId) return;

    // 3.5-second debounce per violation type to avoid flooding
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[violationType] || 0;
    if (now - lastTime < 3500) return;
    lastViolationTimeRef.current[violationType] = now;

    const violationObj = {
      type: violationType,
      details,
      timestamp: new Date().toLocaleTimeString()
    };

    setViolations((prev) => {
      const updated = [...prev, violationObj];
      if (updated.length >= 3) {
        setProctorStatus('flagged');
      }
      return updated;
    });

    setLatestWarning(`Proctor Alert: ${details}`);
    showToast?.(`Security Alert: ${details}`, 'error');

    // Immediate check for critical violations that warrant instant auto-termination
    if (
      violationType === 'multiple_faces_detected' ||
      violationType === 'cell_phone_detected' ||
      violationType === 'unauthorized_object'
    ) {
      handleAutoTerminateExam(details, violationType);
      return;
    }

    // AI Proctor Spoken Warning
    if (audioEngineRef.current && !isAiVoiceMuted) {
      let voiceMsg = 'Please maintain focus on your screen.';
      if (violationType === 'head_off_axis') voiceMsg = 'Warning: Please face the camera directly.';
      else if (violationType === 'no_face_detected') voiceMsg = 'Warning: Candidate face not detected in viewport.';
      else if (violationType === 'tab_switch') voiceMsg = 'Warning: Tab switching is strictly prohibited.';

      audioEngineRef.current.speak(voiceMsg, { rate: 1.05, isWarning: true });
    }

    // Report to backend API
    try {
      const res = await logProctorViolation({
        sessionId,
        violationType,
        details
      });

      if (res?.action === 'terminate_exam') {
        handleAutoTerminateExam(res.terminationReason || details, violationType);
      }
    } catch (err) {
      console.warn('Violation logging error:', err.message);
    }
  }, [stage, sessionId, isAiVoiceMuted, showToast, handleAutoTerminateExam]);

  // Real-Time Computer Vision & Backend Frame Analysis Loop
  useEffect(() => {
    if (!stream || stage === 'terminated') return;

    let animFrameId;
    let lastVisionTime = 0;

    const processTick = async (timestamp) => {
      // 1. Process Video Frame (~15 FPS)
      if (videoRef.current && videoRef.current.readyState >= 2 && visionEngineRef.current) {
        if (timestamp - lastVisionTime > 65) {
          lastVisionTime = timestamp;
          try {
            const vResult = await visionEngineRef.current.processFrame(videoRef.current);
            setVisionState(vResult);

            // Draw HUD on canvas overlay
            if (canvasRef.current) {
              if (canvasRef.current.width !== videoRef.current.videoWidth) {
                canvasRef.current.width = videoRef.current.videoWidth || 640;
                canvasRef.current.height = videoRef.current.videoHeight || 480;
              }
              visionEngineRef.current.drawProctorHUD(canvasRef.current, vResult, { compact: stage === 'active' });
            }

            // --- STRICT SINGLE CANDIDATE ENFORCEMENT & AUTO-TERMINATION ---
            if (stage === 'active') {
              // Rule A: If multiple people enter the camera screen -> Instant Termination
              if (vResult.facesCount > 1) {
                handleAutoTerminateExam(
                  `Multiple persons detected in camera viewport (${vResult.facesCount} people). Only the registered candidate is allowed.`,
                  'multiple_faces_detected'
                );
                return;
              }

              // Rule B: If a mobile phone / prohibited device appears -> Instant Termination
              if (vResult.phoneDetected) {
                handleAutoTerminateExam(
                  'Unauthorized mobile phone or prohibited electronic screen detected in camera view.',
                  'cell_phone_detected'
                );
                return;
              }

              // Rule C: Check other non-fatal warnings (e.g. head turned, gaze)
              if (vResult.violations && vResult.violations.length > 0) {
                vResult.violations.forEach((v) => {
                  recordViolation(v.type, v.details);
                });
              }

              // Backend Camera Frame Verification (every 2 seconds)
              if (timestamp - lastBackendCheckTimeRef.current > 2000 && sessionId) {
                lastBackendCheckTimeRef.current = timestamp;
                analyzeCameraFrameBackend({
                  sessionId,
                  candidateId,
                  facesCount: vResult.facesCount,
                  headAxis: vResult.headAxis,
                  phoneDetected: vResult.phoneDetected,
                  audioDb: audioMetrics.volumeDb,
                  timestamp: Date.now()
                }).then((res) => {
                  if (res?.action === 'terminate_exam') {
                    handleAutoTerminateExam(
                      res.terminationReason || 'AI Proctor Server Security Policy: Immediate Exam Termination',
                      'multiple_faces_detected'
                    );
                  }
                }).catch(() => {});
              }
            }
          } catch (e) {
            // Frame error
          }
        }
      }

      // 2. Process Audio Metrics
      if (audioEngineRef.current) {
        const aMetrics = audioEngineRef.current.getAudioMetrics();
        setAudioMetrics(aMetrics);

        if (stage === 'active' && aMetrics.suspiciousNoise) {
          recordViolation('suspicious_audio_noise', `Abnormal background noise detected (${aMetrics.volumeDb} dB)`);
        }
      }

      animFrameId = requestAnimationFrame(processTick);
    };

    animFrameId = requestAnimationFrame(processTick);
    return () => cancelAnimationFrame(animFrameId);
  }, [stream, stage, sessionId, candidateId, audioMetrics.volumeDb, recordViolation, handleAutoTerminateExam]);

  // Read current question via AI Voice Text-to-Speech
  const handleReadCurrentQuestion = () => {
    const q = questions[currentQIndex];
    if (!q || !audioEngineRef.current) return;

    if (isSpeakingQuestion) {
      audioEngineRef.current.stopSpeech();
      setIsSpeakingQuestion(false);
      return;
    }

    const textToRead = `Question ${currentQIndex + 1}: ${q.question}. Option A: ${q.options[0]}. Option B: ${q.options[1]}. Option C: ${q.options[2]}. Option D: ${q.options[3]}.`;
    audioEngineRef.current.speak(textToRead, {
      rate: speechRate,
      onStart: () => setIsSpeakingQuestion(true),
      onEnd: () => setIsSpeakingQuestion(false),
      onError: () => setIsSpeakingQuestion(false)
    });
  };

  // Toggle Voice Input / Speech-to-Text
  const handleToggleVoiceInput = () => {
    if (!audioEngineRef.current) return;

    if (isListeningVoice) {
      audioEngineRef.current.stopListening();
      setIsListeningVoice(false);
      showToast?.('Voice recording stopped', 'info');
    } else {
      if (!audioEngineRef.current.isSpeechRecognitionSupported()) {
        showToast?.('Speech recognition not supported in this browser (Use Chrome/Edge)', 'error');
        return;
      }

      setVoiceTranscript('');
      audioEngineRef.current.startListening(
        (transcript) => {
          setVoiceTranscript(transcript.text);

          // Auto-select option if candidate says "Option A", "Option B", etc.
          const lower = transcript.text.toLowerCase();
          if (lower.includes('option a') || lower.includes('choice a')) handleSelectOption(questions[currentQIndex].id, 0);
          else if (lower.includes('option b') || lower.includes('choice b')) handleSelectOption(questions[currentQIndex].id, 1);
          else if (lower.includes('option c') || lower.includes('choice c')) handleSelectOption(questions[currentQIndex].id, 2);
          else if (lower.includes('option d') || lower.includes('choice d')) handleSelectOption(questions[currentQIndex].id, 3);
        },
        () => setIsListeningVoice(false),
        () => setIsListeningVoice(false)
      );
      setIsListeningVoice(true);
      showToast?.('Listening... Speak your answer or choice', 'info');
    }
  };

  // Start Proctor Session and Enter Fullscreen Exam Room
  const handleStartExam = async () => {
    if (!candidateId.trim()) {
      showToast?.('Please enter or verify Candidate ID', 'error');
      return;
    }
    if (!cameraPermission || !micPermission) {
      showToast?.('Camera and microphone must be enabled to enter the exam room', 'error');
      return;
    }

    try {
      // 1. Start session on localhost backend
      const res = await startProctorSession({
        candidateId: candidateId.trim(),
        candidateName: candidateName.trim() || 'Candidate',
        targetRole: targetRole.trim() || 'Developer',
        cameraGranted: cameraPermission,
        micGranted: micPermission
      });

      const newSessionId = res.sessionId || 'session_' + Date.now();
      setSessionId(newSessionId);
      setStage('active');
      setTimeLeft(600); // 10 mins

      // Auto read first question
      setTimeout(() => {
        if (audioEngineRef.current && !isAiVoiceMuted) {
          const q1 = questions[0];
          audioEngineRef.current.speak(`Assessment started. Question 1: ${q1.question}`, { rate: speechRate });
        }
      }, 1000);

      // 2. Request Fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      showToast?.('Proctored Exam Session Started. Only candidate permitted on screen!', 'info');
    } catch (err) {
      console.error('Failed to start proctor session:', err);
      showToast?.('Starting session in fallback mode: ' + err.message, 'info');
      setSessionId('session-' + Date.now());
      setStage('active');
    }
  };

  // Anti-Cheat Event Listeners (Tab change, window blur, fullscreen exit) -> INSTANT AUTO-EXIT TERMINATION
  useEffect(() => {
    if (stage !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAutoTerminateExam(
          'Security Violation: Candidate opened another browser tab or minimized examination screen.',
          'tab_switch'
        );
      }
    };

    const handleWindowBlur = () => {
      handleAutoTerminateExam(
        'Security Violation: Candidate switched focus away from exam screen (Alt+Tab, secondary monitor, or external application).',
        'window_blur'
      );
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stage === 'active') {
        handleAutoTerminateExam(
          'Security Violation: Candidate exited secure fullscreen examination mode.',
          'fullscreen_exit'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stage, handleAutoTerminateExam]);

  // Exam Countdown Timer
  useEffect(() => {
    if (stage !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  const handleSelectOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    let correctCount = 0;

    const answersPayload = questions.map((q) => {
      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        selectedAnswer: selected !== undefined ? q.options[selected] : 'Skipped',
        isCorrect
      };
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    const proctorMetricsPayload = {
      axisStabilityScore: visionState.headAxis?.stabilityScore || 95,
      facePresenceRate: visionState.facesCount > 0 ? 100 : 80,
      eyeContactRate: visionState.gaze?.isDeviated ? 75 : 95,
      audioNoiseAlerts: violations.filter((v) => v.type === 'suspicious_audio_noise').length,
      totalViolations: violations.length
    };

    try {
      const subRes = await submitAssessmentExam({
        candidateId: candidateId || 'anonymous',
        sessionId: sessionId || 'session_default',
        answers: answersPayload,
        score: finalScore,
        correctCount,
        totalQuestions: questions.length,
        proctorMetrics: proctorMetricsPayload
      });

      // Exit fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      setFinalResult({
        score: finalScore,
        correctCount,
        total: questions.length,
        submissionId: subRes.submissionId || 'SUB-' + Date.now(),
        violationsCount: violations.length,
        status: violations.length >= 3 ? 'Flagged for Review' : 'Passed & Verified',
        proctorMetrics: proctorMetricsPayload,
        answers: answersPayload
      });

      setStage('completed');
      showToast?.('Assessment submitted and proctor metrics saved to backend!', 'success');

      if (audioEngineRef.current && !isAiVoiceMuted) {
        audioEngineRef.current.speak(`Assessment completed. Your score is ${finalScore} percent.`, { rate: 1.0 });
      }

      if (finalScore >= 60 && violations.length < 3) {
        confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      showToast?.('Error submitting assessment: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
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
          <div className="section-header text-center">
            <div className="badge badge-cyan">
              <ShieldCheck size={14} />
              <span>AI Proctoring Room & 3D Axis Engine</span>
            </div>
            <h1 className="section-title">Assessment Pre-Exam Hardware & Security Verification</h1>
            <p className="section-description">
              Verify your camera 3D axis, face detection, microphone VU audio levels, and AI question voice reader before entering the proctored assessment room.
            </p>
          </div>

          <div className="setup-grid">
            {/* Live Camera, 3D Axis & Audio VU Meter Card */}
            <div className="glass-panel setup-card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="card-title">
                  <Camera size={19} className="text-cyan" />
                  <span>Camera 3D Axis & Security Scanner</span>
                </h2>
                <span className="badge badge-indigo">
                  <Compass size={13} />
                  <span>Pitch: {visionState.headAxis.pitch}° | Yaw: {visionState.headAxis.yaw}°</span>
                </span>
              </div>
              <p className="card-subtitle">Real-time single-candidate verification, head pose & audio level</p>

              {/* Video Feed Preview with Overlay Canvas HUD */}
              <div className="video-feed-preview relative">
                {stream ? (
                  <div className="video-wrapper">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="live-camera-video"
                    />
                    <canvas
                      ref={canvasRef}
                      className="proctor-hud-canvas"
                    />
                    <div className="video-overlay-pill">
                      <span className="live-pulse"></span>
                      <span>3D Axis Active</span>
                    </div>

                    {/* Camera 3D Axis Compass Overlay */}
                    <div className="axis-hud-badge">
                      <Compass size={14} className="text-cyan" />
                      <span>
                        Yaw: <strong>{visionState.headAxis.yaw > 0 ? '+' : ''}{visionState.headAxis.yaw}°</strong> | 
                        Pitch: <strong>{visionState.headAxis.pitch > 0 ? '+' : ''}{visionState.headAxis.pitch}°</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="video-fallback">
                    <VideoOff size={42} className="text-muted" />
                    <p className="text-muted text-sm mt-2">Camera stream not active</p>
                    <button
                      type="button"
                      onClick={requestMediaPermissions}
                      className="btn btn-outline btn-sm mt-3"
                      id="enable-camera-mic-btn"
                    >
                      <Camera size={15} />
                      <span>Enable Camera & Mic</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3D Axis Calibration & Controls */}
              {stream && (
                <div className="axis-calibration-bar mt-3">
                  <button
                    type="button"
                    onClick={handleCalibrateAxis}
                    className={`btn btn-sm ${isCalibrated ? 'btn-emerald' : 'btn-secondary'}`}
                  >
                    <Target size={15} />
                    <span>{isCalibrated ? 'Center Calibrated' : 'Calibrate Center Axis'}</span>
                  </button>

                  <div className="axis-status-tag">
                    <span className={`status-dot ${visionState.headAxis.isOffAxis ? 'dot-rose' : 'dot-emerald'}`} />
                    <span>Status: <strong>{visionState.headAxis.status.toUpperCase()}</strong></span>
                  </div>
                </div>
              )}

              {/* Real-time Audio VU Decibel Equalizer */}
              <div className="audio-vu-meter-panel mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Activity size={14} className="text-emerald" />
                    <span>Microphone Input VU Meter:</span>
                  </span>
                  <span className="text-cyan font-mono">{audioMetrics.volumeDb} dB ({audioMetrics.state})</span>
                </div>

                {/* 8-band Equalizer Bars */}
                <div className="equalizer-bars">
                  {audioMetrics.frequencyBands.map((band, idx) => (
                    <div key={idx} className="eq-bar-track">
                      <div
                        className="eq-bar-fill"
                        style={{ height: `${Math.max(8, band)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Permission & Detection Checklist */}
              <div className="permission-indicators mt-3">
                <div className={`perm-item ${cameraPermission ? 'granted' : 'pending'}`}>
                  {cameraPermission ? <CheckCircle2 size={16} className="text-emerald" /> : <AlertTriangle size={16} />}
                  <span>Camera: {cameraPermission ? '3D Axis Active' : 'Required'}</span>
                </div>
                <div className={`perm-item ${micPermission ? 'granted' : 'pending'}`}>
                  {micPermission ? <CheckCircle2 size={16} className="text-emerald" /> : <AlertTriangle size={16} />}
                  <span>Microphone: {micPermission ? 'Audio Connected' : 'Required'}</span>
                </div>
                <div className={`perm-item ${visionState.facesCount === 1 ? 'granted' : 'pending'}`}>
                  <Users size={16} className={visionState.facesCount === 1 ? 'text-emerald' : 'text-amber'} />
                  <span>Candidate: {visionState.facesCount === 1 ? '1 Verified (Valid)' : `${visionState.facesCount} Detected`}</span>
                </div>
              </div>

              {mediaError && (
                <div className="error-alert mt-3">
                  <AlertTriangle size={16} />
                  <span>{mediaError}</span>
                </div>
              )}
            </div>

            {/* Candidate Credentials, AI Speaker Test & Exam Guidelines */}
            <div className="glass-panel setup-card">
              <h2 className="card-title">
                <UserCheck size={19} className="text-indigo" />
                <span>Candidate Verification & Audio Test</span>
              </h2>
              <p className="card-subtitle">Linked to MongoDB ATS Record & AI Voice Synthesizer</p>

              <div className="setup-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="examCandidateId">
                    Candidate Reference ID <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="examCandidateId"
                    value={candidateId}
                    onChange={(e) => setCandidateId(e.target.value)}
                    placeholder="e.g. 66c8a4f91b3e8c2..."
                    className="form-input"
                    required
                  />
                  <span className="text-xs text-muted">
                    Found in your ATS screening result or confirmation email.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Candidate Name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <div className="flex items-center justify-between">
                      <label className="form-label">Assessment Role</label>
                      <span className="text-[11px] text-cyan font-mono">
                        {isLoadingQuestions ? 'Loading API...' : `(${questions.length} questions loaded from Backend API)`}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Python, React, Full Stack"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* AI Voice Test Section */}
                <div className="ai-voice-test-box">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5 text-cyan">
                      <Volume2 size={15} /> AI Voice Question Reader Test:
                    </span>
                    <button
                      type="button"
                      onClick={handleTestAiVoice}
                      className="btn btn-outline btn-xs"
                    >
                      <Play size={13} />
                      <span>{isSpeakingQuestion ? 'Speaking...' : 'Test AI Voice'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    The AI reader will speak questions aloud during your examination.
                  </p>
                </div>

                {/* Anti-Cheat Strict Auto-Exit Notice */}
                <div className="rules-box mt-2 border-rose-500/40 bg-rose-950/20">
                  <span className="rules-title text-rose">
                    <AlertOctagon size={16} /> Strict Anti-Cheat & Auto-Termination Rules:
                  </span>
                  <ul className="rules-list">
                    <li><strong>Single Candidate Only:</strong> If anyone else enters the camera view, the exam will <strong>exit and terminate automatically</strong>.</li>
                    <li><strong>No Prohibited Devices:</strong> Mobile phones or electronic screens will trigger <strong>instant termination</strong>.</li>
                    <li><strong>Continuous Presence:</strong> Candidate must stay focused on the camera screen throughout the test.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={!cameraPermission || !micPermission || !candidateId.trim()}
                  className="btn btn-primary btn-lg w-full mt-3"
                  id="start-proctored-exam-now-btn"
                >
                  <Maximize2 size={18} />
                  <span>Enter Fullscreen & Start Exam</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STAGE 2: LIVE PROCTORED ACTIVE EXAM ROOM                 */}
      {/* -------------------------------------------------------- */}
      {stage === 'active' && (
        <div className="active-exam-container">
          {/* Top Proctor Header Bar */}
          <div className="exam-top-bar glass-panel">
            <div className="exam-candidate-info">
              <div className="candidate-avatar">
                {candidateName ? candidateName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <span className="exam-cand-name">{candidateName || 'Candidate'}</span>
                <span className="exam-role-tag">{targetRole}</span>
              </div>
            </div>

            {/* AI Voice Question Controls */}
            <div className="ai-voice-controls-bar">
              <button
                type="button"
                onClick={handleReadCurrentQuestion}
                className={`btn btn-xs ${isSpeakingQuestion ? 'btn-cyan animate-pulse' : 'btn-secondary'}`}
                title="Read question aloud"
              >
                {isSpeakingQuestion ? <Square size={14} /> : <Volume2 size={14} />}
                <span>{isSpeakingQuestion ? 'Stop Reading' : 'Read Question'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const muted = audioEngineRef.current?.toggleMute();
                  setIsAiVoiceMuted(muted);
                }}
                className={`btn btn-xs ${isAiVoiceMuted ? 'btn-rose' : 'btn-secondary'}`}
                title="Mute AI Voice"
              >
                {isAiVoiceMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`btn btn-xs ${isListeningVoice ? 'btn-emerald animate-pulse' : 'btn-secondary'}`}
                title="Speak to Answer / Transcribe Voice"
              >
                <Speech size={14} />
                <span>{isListeningVoice ? 'Listening...' : 'Voice Answer'}</span>
              </button>
            </div>

            <div className="exam-timer-box">
              <Clock size={18} className={timeLeft < 120 ? 'text-rose animate-pulse' : 'text-indigo'} />
              <span className={`timer-text ${timeLeft < 120 ? 'text-rose' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="exam-proctor-pill">
              <div className={`proctor-badge ${violations.length >= 3 ? 'badge-flagged' : 'badge-secure'}`}>
                <ShieldAlert size={15} />
                <span>Violations: {violations.length} / 3</span>
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

          {/* Main Exam Area Grid */}
          <div className="exam-main-grid">
            {/* Left: Question Box */}
            <div className="glass-panel question-box">
              <div className="question-header">
                <span className="badge badge-indigo">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-cyan text-xs">
                    <Compass size={12} />
                    <span>Axis: {visionState.headAxis.status}</span>
                  </span>
                  <span className="question-id">QID: 00{questions[currentQIndex].id}</span>
                </div>
              </div>

              <div className="question-body">
                <h3 className="question-title">
                  {questions[currentQIndex].question}
                </h3>

                <div className="options-list">
                  {questions[currentQIndex].options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[questions[currentQIndex].id] === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(questions[currentQIndex].id, optIdx)}
                      >
                        <div className="option-radio">
                          {isSelected && <div className="radio-dot" />}
                        </div>
                        <span className="option-label">{String.fromCharCode(65 + optIdx)}.</span>
                        <span className="option-text">{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Voice Transcript Display if candidate is speaking */}
                {voiceTranscript && (
                  <div className="voice-transcript-box mt-3">
                    <span className="flex items-center gap-1 text-xs text-emerald font-semibold">
                      <Speech size={14} /> Live Speech Transcript:
                    </span>
                    <p className="text-xs text-slate-200 mt-1 italic">"{voiceTranscript}"</p>
                  </div>
                )}
              </div>

              <div className="question-nav-bar">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => {
                    setCurrentQIndex((prev) => prev - 1);
                    setVoiceTranscript('');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <ArrowLeft size={16} />
                  <span>Previous</span>
                </button>

                <div className="question-bullets">
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`bullet-btn ${i === currentQIndex ? 'current' : ''} ${selectedAnswers[q.id] !== undefined ? 'answered' : ''}`}
                      onClick={() => {
                        setCurrentQIndex(i);
                        setVoiceTranscript('');
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQIndex((prev) => prev + 1);
                      setVoiceTranscript('');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Next</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitExam}
                    className="btn btn-emerald btn-sm"
                    id="submit-final-exam-btn"
                  >
                    <Send size={15} />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Exam'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Picture-in-Picture Proctor Feed & 3D Axis HUD */}
            <div className="glass-panel proctor-pip-card">
              <div className="pip-header">
                <span className="pip-title">
                  <Camera size={16} className="text-cyan" />
                  <span>Live 3D Axis & AI Security Feed</span>
                </span>
                <span className={`badge ${visionState.facesCount > 1 || visionState.headAxis.isOffAxis ? 'badge-rose' : 'badge-emerald'}`}>
                  {visionState.facesCount > 1 ? 'Multiple Faces!' : visionState.headAxis.isOffAxis ? 'Off-Axis' : '1 Candidate Aligned'}
                </span>
              </div>

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
                <div className="pip-watermark">
                  <span>Candidate: {candidateName}</span>
                </div>

                {/* 3D Axis Angles Pill */}
                <div className="pip-axis-overlay">
                  <span>Y: {visionState.headAxis.yaw}° | P: {visionState.headAxis.pitch}°</span>
                </div>
              </div>

              {/* Real-Time Audio Level VU Meter */}
              <div className="pip-audio-bar px-3 py-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-muted">
                    <Mic size={12} className="text-emerald" />
                    <span>Audio VU Level:</span>
                  </span>
                  <span className="font-mono text-xs text-cyan">{audioMetrics.volumeDb} dB</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-100 ${audioMetrics.suspiciousNoise ? 'bg-rose-500' : 'bg-cyan-400'}`}
                    style={{ width: `${Math.min(100, audioMetrics.volume)}%` }}
                  />
                </div>
              </div>

              {/* Real-time Violation Event Log */}
              <div className="violation-event-log">
                <span className="log-title">
                  <ShieldAlert size={14} /> Violation Audit Trail ({violations.length})
                </span>
                {violations.length === 0 ? (
                  <div className="no-violations-msg">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>No violations detected. Single candidate verified.</span>
                  </div>
                ) : (
                  <ul className="violations-list">
                    {violations.map((v, idx) => (
                      <li key={idx} className="violation-item">
                        <span className="violation-time">{v.timestamp}</span>
                        <span className="violation-desc">{v.details}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
              {/* Termination Reason Alert Box */}
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

              {/* Logged Violations Trail */}
              {violations.length > 0 && (
                <div className="answers-review-section mb-4">
                  <h3 className="section-subtitle text-rose-400">Security Audit Trail:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {violations.map((v, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-rose-400 uppercase mr-2">{v.type.replace(/_/g, ' ')}:</span>
                          <span className="text-slate-300">{v.details}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{v.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cert-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStage('setup');
                    setViolations([]);
                    setTerminationData(null);
                    setFinalResult(null);
                    setSelectedAnswers({});
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
      {/* STAGE 4: EXAM COMPLETED & RESULTS CERTIFICATE            */}
      {/* -------------------------------------------------------- */}
      {stage === 'completed' && finalResult && (
        <div className="completed-container">
          <div className="glass-panel certificate-card">
            <div className="cert-header">
              <div className="cert-badge-wrap">
                <Award size={42} className="text-emerald" />
              </div>
              <h2 className="cert-title">Assessment Report & Proctoring Certificate</h2>
              <p className="cert-subtitle">AI Interview, 3D Camera Axis & Anti-Cheat Verified Evaluation</p>
            </div>

            <div className="cert-body">
              <div className="cert-metric-grid">
                <div className="cert-metric-box">
                  <span className="metric-label">Assessment Score</span>
                  <span className="metric-value text-emerald">{finalResult.score}%</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Correct Answers</span>
                  <span className="metric-value">{finalResult.correctCount} / {finalResult.total}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Camera Axis Stability</span>
                  <span className="metric-value text-cyan">{finalResult.proctorMetrics?.axisStabilityScore || 95}%</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Proctoring Status</span>
                  <span className={`metric-value ${finalResult.violationsCount >= 3 ? 'text-rose' : 'text-emerald'}`}>
                    {finalResult.status}
                  </span>
                </div>
              </div>

              <div className="cert-details-block">
                <p><strong>Candidate:</strong> {candidateName} ({candidateId})</p>
                <p><strong>Role Evaluated:</strong> {targetRole}</p>
                <p><strong>Submission Token:</strong> <code>{finalResult.submissionId}</code></p>
                <p><strong>Violations Audit:</strong> {finalResult.violationsCount} strikes logged to MongoDB</p>
              </div>

              {/* Question review */}
              <div className="answers-review-section">
                <h3 className="section-subtitle">Questions & Answers Summary:</h3>
                <div className="answers-list">
                  {finalResult.answers.map((a, i) => (
                    <div key={i} className={`answer-row ${a.isCorrect ? 'correct' : 'wrong'}`}>
                      <div className="ans-header">
                        <span className="ans-num">Q{i + 1}.</span>
                        <span className="ans-q">{a.question}</span>
                      </div>
                      <div className="ans-choice">
                        <span>Selected: <strong>{a.selectedAnswer}</strong></span>
                        {a.isCorrect ? (
                          <span className="badge badge-emerald">Correct</span>
                        ) : (
                          <span className="badge badge-rose">Incorrect</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cert-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStage('setup');
                    setViolations([]);
                    setFinalResult(null);
                    setSelectedAnswers({});
                  }}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  <span>Take Another Test</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFinishExam?.()}
                  className="btn btn-primary"
                >
                  <span>Go to Recruiter CRM</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
