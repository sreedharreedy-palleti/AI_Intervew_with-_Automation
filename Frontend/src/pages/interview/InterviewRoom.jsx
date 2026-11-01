import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Clock,
  BrainCircuit,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  Award,
  Radio,
  RotateCcw,
  Headphones,
  Play,
  Pause,
  Smartphone,
  Users,
  UserX,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import interviewApi from '../../api/interviewApi';

const InterviewRoom = ({
  session,
  onInterviewComplete,
}) => {
  const [currentIdx, setCurrentIdx] = useState(session.current_question_index || 0);
  const questions = session.questions || [];
  const currentQuestion = questions[currentIdx] || session.current_question;

  // Conversational state: 'ai_asking' | 'candidate_turn' | 'candidate_paused' | 'evaluating'
  const [conversationPhase, setConversationPhase] = useState('ai_asking');
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);

  // Voice-synchronized question text streaming states
  // "before voice text not come, text also voice through come"
  const [displayedQuestionText, setDisplayedQuestionText] = useState('');
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const speechTimerRef = useRef(null);
  const speechWordIndexRef = useRef(0);
  const boundaryReceivedRef = useRef(false);

  // Hidden candidate answer state (candidate never sees this text)
  const [answerText, setAnswerText] = useState('');
  const answerTextRef = useRef('');
  const speechActiveRef = useRef(false);
  const recognitionRef = useRef(null);
  const [recognitionError, setRecognitionError] = useState(null);

  // Candidate answer duration timer (counts up while candidate is speaking)
  const [answerDuration, setAnswerDuration] = useState(0);

  // Total Question timer (180s countdown per question)
  const [questionTimer, setQuestionTimer] = useState(180);

  // Audio recording fallback via MediaRecorder
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Submitting / Evaluation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  // Live candidate webcam stream
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Audio level meter
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // --------------------------------------------------------------------------
  // AI PROCTORING STATES: Mobile Detection, Multi-Faces, Second Person Sound
  // --------------------------------------------------------------------------
  const [mobileDetected, setMobileDetected] = useState(false);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(1);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [secondPersonSoundDetected, setSecondPersonSoundDetected] = useState(false);

  // Active proctoring alert message banner & total flagged violations
  const [proctorAlert, setProctorAlert] = useState(null);
  const [proctorViolationCount, setProctorViolationCount] = useState(0);

  const proctorCanvasRef = useRef(null);
  const isAnalyzingProctorRef = useRef(false);
  const alertDismissTimerRef = useRef(null);

  const triggerProctorAlert = useCallback((type, message) => {
    setProctorAlert({ type, message, timestamp: Date.now() });
    if (alertDismissTimerRef.current) clearTimeout(alertDismissTimerRef.current);
    alertDismissTimerRef.current = setTimeout(() => {
      setProctorAlert(null);
    }, 4500);
  }, []);

  // Initialize Candidate Webcam & Audio stream
  useEffect(() => {
    let activeStream = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: true })
      .then((stream) => {
        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup live audio analyser
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const poll = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let s = 0;
            for (let i = 0; i < dataArray.length; i++) s += dataArray[i];
            const currentLvl = Math.min(100, Math.round((s / dataArray.length / 128) * 100));
            setAudioLevel(currentLvl);
            animFrameRef.current = requestAnimationFrame(poll);
          };
          poll();
        }
      })
      .catch((err) => {
        console.warn('Interview webcam feed warning:', err);
      });

    return () => {
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Countdown timer per question
  useEffect(() => {
    setQuestionTimer(180);
    const interval = setInterval(() => {
      setQuestionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx]);

  // Candidate answer duration ticker
  useEffect(() => {
    let ticker = null;
    if (conversationPhase === 'candidate_turn') {
      ticker = setInterval(() => {
        setAnswerDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [conversationPhase]);

  // MediaRecorder helper to buffer candidate's spoken audio
  const startAudioRecording = useCallback(() => {
    audioChunksRef.current = [];
    if (!streamRef.current) return;
    try {
      const audioTracks = streamRef.current.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) return;
      const audioStream = new MediaStream(audioTracks);
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mime ? new MediaRecorder(audioStream, { mimeType: mime }) : new MediaRecorder(audioStream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('MediaRecorder init error:', e);
    }
  }, []);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
    }
  }, []);

  const getAudioBase64 = useCallback(async () => {
    if (!audioChunksRef.current || audioChunksRef.current.length === 0) return null;
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, []);

  // Background Speech Recognition (Voice converted to text, hidden from candidate)
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const recognizer = new SpeechRec();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          const cleaned = transcript.trim();
          answerTextRef.current = cleaned;
          setAnswerText(cleaned);
        }
      };

      recognizer.onerror = (e) => {
        console.warn('Speech recognition warning:', e);
      };

      recognizer.onend = () => {
        if (speechActiveRef.current) {
          try {
            recognizer.start();
          } catch {}
        }
      };

      recognitionRef.current = recognizer;
    } else {
      setRecognitionError('Speech recognition will record audio stream directly for Gemini AI analysis.');
    }

    return () => {
      speechActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Start Candidate Listening Turn
  const startCandidateTurn = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setConversationPhase('candidate_turn');
    setAudioAutoplayBlocked(false);

    speechActiveRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {}
    }

    startAudioRecording();
  }, [startAudioRecording]);

  // Pause Candidate Turn
  const pauseCandidateTurn = useCallback(() => {
    setConversationPhase('candidate_paused');
    speechActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // Resume Candidate Turn
  const resumeCandidateTurn = useCallback(() => {
    setConversationPhase('candidate_turn');
    speechActiveRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  }, []);

  // Reset / Re-speak Answer
  const handleRespeak = useCallback(() => {
    answerTextRef.current = '';
    setAnswerText('');
    setAnswerDuration(0);
    audioChunksRef.current = [];
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    stopAudioRecording();
    startCandidateTurn();
  }, [startCandidateTurn, stopAudioRecording]);

  // AI Agent Speaks Question Aloud (Voice Output & Voice-Synced Text Streaming)
  const speakQuestion = useCallback((qText) => {
    if (!qText) return;

    if (!('speechSynthesis' in window)) {
      setDisplayedQuestionText(qText);
      setIsVoiceSpeaking(false);
      setVoiceCompleted(true);
      startCandidateTurn();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (speechTimerRef.current) {
        clearInterval(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      // "before voice text not come" -> clear text before speech starts
      setDisplayedQuestionText('');
      setIsVoiceSpeaking(false);
      setVoiceCompleted(false);
      speechWordIndexRef.current = 0;
      boundaryReceivedRef.current = false;

      const fullWords = qText.trim().split(/\s+/);
      const utterance = new SpeechSynthesisUtterance(qText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices() || [];
      const englishVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Neural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      const startWordStreamingFallback = () => {
        if (speechTimerRef.current) clearInterval(speechTimerRef.current);
        const intervalMs = Math.max(260, Math.min(420, Math.round(380 / utterance.rate)));
        speechTimerRef.current = setInterval(() => {
          if (boundaryReceivedRef.current) return;

          speechWordIndexRef.current += 1;
          const count = speechWordIndexRef.current;
          if (count <= fullWords.length) {
            setDisplayedQuestionText(fullWords.slice(0, count).join(' '));
          } else {
            clearInterval(speechTimerRef.current);
          }
        }, intervalMs);
      };

      utterance.onstart = () => {
        setConversationPhase('ai_asking');
        setIsVoiceSpeaking(true);
        setVoiceCompleted(false);
        setAudioAutoplayBlocked(false);
        startWordStreamingFallback();
      };

      // "text also voice through come" -> words appear exactly as voice pronounces them
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          boundaryReceivedRef.current = true;
          const charIdx = event.charIndex;
          let nextSpace = qText.indexOf(' ', charIdx);
          let endIdx = nextSpace === -1 ? qText.length : nextSpace;
          setDisplayedQuestionText(qText.slice(0, endIdx));
        }
      };

      utterance.onend = () => {
        if (speechTimerRef.current) {
          clearInterval(speechTimerRef.current);
          speechTimerRef.current = null;
        }
        setDisplayedQuestionText(qText);
        setIsVoiceSpeaking(false);
        setVoiceCompleted(true);
        startCandidateTurn();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (speechTimerRef.current) {
          clearInterval(speechTimerRef.current);
          speechTimerRef.current = null;
        }
        setDisplayedQuestionText(qText);
        setIsVoiceSpeaking(false);
        setVoiceCompleted(true);
        startCandidateTurn();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis call failed:', e);
      setAudioAutoplayBlocked(true);
      setDisplayedQuestionText(qText);
      setIsVoiceSpeaking(false);
      setVoiceCompleted(true);
      startCandidateTurn();
    }
  }, [startCandidateTurn]);

  // Automatically trigger AI Agent Voice whenever the question changes
  useEffect(() => {
    setDisplayedQuestionText('');
    setIsVoiceSpeaking(false);
    setVoiceCompleted(false);

    answerTextRef.current = '';
    setAnswerText('');
    setAnswerDuration(0);
    setConversationPhase('ai_asking');

    const timer = setTimeout(() => {
      if (currentQuestion?.question_text) {
        speakQuestion(currentQuestion.question_text);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      if (speechTimerRef.current) {
        clearInterval(speechTimerRef.current);
        speechTimerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIdx, currentQuestion?.question_text, speakQuestion]);

  // --------------------------------------------------------------------------
  // PERIODIC AI PROCTORING ENGINE (Mobile, Multi-faces, Second Person Sound)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!session?.interview_token) return;

    let isChecking = false;

    const runProctorCycle = async () => {
      if (isChecking) return;
      const video = videoRef.current;
      const canvas = proctorCanvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

      isChecking = true;
      try {
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.65);

        const isVoice = audioLevel > 18;

        const analysis = await interviewApi.analyzeProctorFrame(session.interview_token, {
          image_base64: imageBase64,
          audio_noise_level: audioLevel,
          voice_detected: isVoice,
          conversation_phase: conversationPhase,
          question_id: currentQuestion?.question_id,
        });

        // 1. Mobile Detection Update
        if (analysis?.mobile_detected) {
          setMobileDetected(true);
          triggerProctorAlert('mobile', '📱 WARNING: Mobile phone detected in camera feed! Mobile devices are strictly prohibited.');
        } else {
          setMobileDetected(false);
        }

        // 2. Multi-Faces / People Count Update
        const fCount = Number(analysis?.face_count ?? 1);
        const pCount = Number(analysis?.person_count ?? 1);
        setFaceCount(fCount);

        if (analysis?.multiple_faces || fCount > 1 || pCount > 1) {
          setMultipleFacesDetected(true);
          setNoFaceDetected(false);
          triggerProctorAlert('multifaces', `👥 WARNING: Multiple faces (${Math.max(fCount, pCount)}) detected! Only the candidate may be present.`);
        } else if (!analysis?.face_detected && pCount === 0) {
          setNoFaceDetected(true);
          setMultipleFacesDetected(false);
        } else {
          setMultipleFacesDetected(false);
          setNoFaceDetected(false);
        }

        // 3. Second Person Sound Update
        // Also check client-side: voice detected while AI is speaking
        const clientSecondaryVoice = conversationPhase === 'ai_asking' && audioLevel > 35;
        if (analysis?.second_person_sound || clientSecondaryVoice) {
          setSecondPersonSoundDetected(true);
          triggerProctorAlert('sound', '🔊 WARNING: Second person sound or background speaking detected in your room!');
        } else {
          setSecondPersonSoundDetected(false);
        }

        if (analysis?.violation_detected) {
          setProctorViolationCount((prev) => prev + 1);
        }
      } catch (err) {
        console.warn('Proctor check cycle notice:', err);
      } finally {
        isChecking = false;
      }
    };

    const initialTimer = setTimeout(runProctorCycle, 2000);
    const interval = setInterval(runProctorCycle, 3200);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [session?.interview_token, audioLevel, conversationPhase, currentQuestion?.question_id, triggerProctorAlert]);

  // Skip AI Voice directly to Candidate Turn (reveals full text immediately)
  const handleSkipToAnswer = () => {
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setDisplayedQuestionText(currentQuestion?.question_text || '');
    setIsVoiceSpeaking(false);
    setVoiceCompleted(true);
    startCandidateTurn();
  };

  // Replay AI Question (clears text and streams again with voice)
  const handleReplayQuestion = () => {
    setDisplayedQuestionText('');
    setIsVoiceSpeaking(false);
    setVoiceCompleted(false);
    speakQuestion(currentQuestion?.question_text);
  };

  // Submit Answer to Backend for AI Analysis
  const handleSubmitAnswer = async () => {
    speechActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    stopAudioRecording();

    setConversationPhase('evaluating');
    setIsSubmitting(true);

    try {
      const audioBase64 = await getAudioBase64();
      const finalAnswerText = answerTextRef.current || answerText || '';

      const res = await interviewApi.submitAnswer(session.interview_token, {
        question_id: currentQuestion.question_id,
        answer_text: finalAnswerText,
        duration_seconds: answerDuration,
        audio_base64: audioBase64 || null,
        audio_metrics: {
          audio_level: audioLevel,
          duration_seconds: answerDuration,
          words_recognized: finalAnswerText.split(/\s+/).filter(Boolean).length,
          proctor_violation_count: proctorViolationCount,
        },
      });

      setLastEvaluation(res);
      setShowEvaluationModal(true);

      if (res.is_interview_complete) {
        setTimeout(() => {
          onInterviewComplete(res.final_report);
        }, 3400);
      }
    } catch (err) {
      console.error('Answer submission failed:', err);
      alert(err.response?.data?.detail || err.message || 'Failed to submit response. Please retry.');
      setConversationPhase('candidate_turn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToNextQuestion = () => {
    setShowEvaluationModal(false);
    setAnswerText('');
    answerTextRef.current = '';
    setLastEvaluation(null);
    setDisplayedQuestionText('');
    setIsVoiceSpeaking(false);
    setVoiceCompleted(false);
    setCurrentIdx((prev) => prev + 1);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '1rem' }}>
      {/* Hidden Proctor Frame Capture Canvas */}
      <canvas ref={proctorCanvasRef} style={{ display: 'none' }} />

      {/* Floating Real-Time AI Proctor Alert Banner */}
      {proctorAlert && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid rgba(239, 68, 68, 0.55)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.45rem',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                AI PROCTOR INTEGRITY WARNING
              </div>
              <div style={{ fontSize: '0.83rem', color: '#fecaca', fontWeight: 500 }}>
                {proctorAlert.message}
              </div>
            </div>
          </div>
          <Badge variant="danger" style={{ fontWeight: 700 }}>
            Incident Recorded
          </Badge>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.55rem',
              borderRadius: '12px',
              background: conversationPhase === 'ai_asking' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: conversationPhase === 'ai_asking' ? '#818cf8' : '#34d399',
              transition: 'all 0.3s ease',
            }}
          >
            <BrainCircuit size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                {session.course_title || 'AI Technical Interview'}
              </h2>
              <Badge variant="success">Stage 2 Live</Badge>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Candidate: <strong style={{ color: '#e5e7eb' }}>{session.candidate_name}</strong> • AI Voice & Proctor Engine Active
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Conversational Status Indicator */}
          {conversationPhase === 'ai_asking' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                background: 'rgba(99, 102, 241, 0.18)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: 'var(--radius-full)',
                color: '#a5b4fc',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Volume2 size={14} className="animate-pulse" />
              <span>{isVoiceSpeaking ? 'AI Voice Speaking' : 'AI Preparing Question...'}</span>
            </div>
          )}

          {conversationPhase === 'candidate_turn' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                background: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-full)',
                color: '#6ee7b7',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Radio size={14} className="animate-pulse" />
              <span>Candidate Speaking • Voice Recording</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              background: questionTimer < 30 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${questionTimer < 30 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-full)',
              color: questionTimer < 30 ? '#fda4af' : '#93c5fd',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <Clock size={15} />
            <span>{formatTimer(questionTimer)}</span>
          </div>

          <Badge variant="primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            Question {currentIdx + 1} of {questions.length}
          </Badge>
        </div>
      </div>

      {/* Main Grid: Left Question & Voice Console, Right Webcam & Proctor Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: AI Question & Candidate Voice Response Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AI Question Card */}
          <Card elevated style={{ position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background:
                  conversationPhase === 'ai_asking'
                    ? 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)'
                    : 'linear-gradient(90deg, #10b981, #06b6d4)',
                transition: 'background 0.5s ease',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge variant="primary">{currentQuestion?.topic || 'Core Architecture'}</Badge>
                <Badge variant="warning">{currentQuestion?.difficulty || 'Medium'}</Badge>
              </div>

              {/* AI Voice State & Audio Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {conversationPhase === 'ai_asking' ? (
                  <button
                    type="button"
                    onClick={handleSkipToAnswer}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: 'var(--radius-full)',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.78rem',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <span>Skip to Answer</span>
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReplayQuestion}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Volume2 size={13} color="#818cf8" />
                    <span>Replay Voice Question</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Agent Speaking Banner with Soundwave */}
            {conversationPhase === 'ai_asking' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.9rem',
                  background: 'rgba(99, 102, 241, 0.09)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}>
                  <span style={{ width: '3px', height: '100%', background: '#818cf8', borderRadius: '2px', animation: 'pulse 0.8s infinite alternate' }} />
                  <span style={{ width: '3px', height: '60%', background: '#a855f7', borderRadius: '2px', animation: 'pulse 1.1s infinite alternate' }} />
                  <span style={{ width: '3px', height: '85%', background: '#818cf8', borderRadius: '2px', animation: 'pulse 0.9s infinite alternate' }} />
                  <span style={{ width: '3px', height: '40%', background: '#a855f7', borderRadius: '2px', animation: 'pulse 1.2s infinite alternate' }} />
                </div>
                <span style={{ fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 600 }}>
                  {isVoiceSpeaking
                    ? 'AI Agent is asking question aloud... Text is streaming in sync with voice.'
                    : 'AI Agent is starting voice synthesis...'}
                </span>
              </div>
            )}

            {/* Autoplay fallback button */}
            {audioAutoplayBlocked && (
              <div style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => speakQuestion(currentQuestion?.question_text)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Volume2 size={15} color="#818cf8" />
                  <span>Click to Listen to AI Agent Question</span>
                </button>
              </div>
            )}

            {/* Question Text Area:
                "before voice text not come" - Before voice starts, text is hidden.
                "text also voice through come" - Text streams word-by-word with voice! */}
            <div style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!displayedQuestionText && !isVoiceSpeaking && (
                <div
                  style={{
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.04)',
                    border: '1px dashed rgba(99, 102, 241, 0.25)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '3px', height: '12px', background: '#818cf8', borderRadius: '2px', animation: 'pulse 0.7s infinite alternate' }} />
                    <span style={{ width: '3px', height: '20px', background: '#a855f7', borderRadius: '2px', animation: 'pulse 0.9s infinite alternate' }} />
                    <span style={{ width: '3px', height: '10px', background: '#818cf8', borderRadius: '2px', animation: 'pulse 1.1s infinite alternate' }} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#c7d2fe', fontWeight: 600 }}>
                    AI Interviewer is preparing the question...
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Question text will stream as the voice speaks.
                  </span>
                </div>
              )}

              {displayedQuestionText && (
                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.55,
                    marginBottom: '0.85rem',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {displayedQuestionText}
                  {isVoiceSpeaking && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '3px',
                        height: '1.15em',
                        background: '#818cf8',
                        marginLeft: '5px',
                        verticalAlign: 'text-bottom',
                        borderRadius: '1px',
                        boxShadow: '0 0 8px #818cf8',
                        animation: 'pulse 0.7s infinite',
                      }}
                    />
                  )}
                </h3>
              )}

              {/* Key Focus hint: Only reveal AFTER voice completes speaking */}
              {voiceCompleted && currentQuestion?.context_hint && (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#93c5fd',
                    background: 'rgba(56, 189, 248, 0.08)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    margin: 0,
                  }}
                >
                  💡 <strong>Key Focus:</strong> {currentQuestion.context_hint}
                </p>
              )}
            </div>
          </Card>

          {/* Candidate Voice Response Console (Text is HIDDEN from candidate) */}
          <Card
            elevated
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at top, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.95))',
              border: conversationPhase === 'candidate_turn' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-medium)',
              boxShadow: conversationPhase === 'candidate_turn' ? '0 0 25px rgba(16, 185, 129, 0.15)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Header / Mode Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Candidate Voice Response</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.18rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Direct Voice Mode
                </span>
              </div>

              {/* Live duration timer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  color: conversationPhase === 'candidate_turn' ? '#6ee7b7' : 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                <Clock size={14} />
                <span>Recorded: {formatTimer(answerDuration)}</span>
              </div>
            </div>

            {/* Central Animated Voice Recording Interface */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
              }}
            >
              {/* Pulsing Voice Orb / Microphone Aura */}
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background:
                    conversationPhase === 'candidate_turn'
                      ? 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0.05) 75%)'
                      : conversationPhase === 'ai_asking'
                      ? 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0.05) 75%)'
                      : 'rgba(255, 255, 255, 0.05)',
                  boxShadow:
                    conversationPhase === 'candidate_turn' && audioLevel > 15
                      ? '0 0 35px rgba(16, 185, 129, 0.6)'
                      : conversationPhase === 'ai_asking'
                      ? '0 0 30px rgba(99, 102, 241, 0.4)'
                      : 'none',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.25rem',
                }}
              >
                {/* Concentric ripple wave rings */}
                {conversationPhase === 'candidate_turn' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-8px',
                      borderRadius: '50%',
                      border: `2px solid ${audioLevel > 15 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.25)'}`,
                      animation: 'pulse 1.8s infinite',
                    }}
                  />
                )}

                {conversationPhase === 'ai_asking' ? (
                  <Headphones size={36} color="#818cf8" />
                ) : conversationPhase === 'candidate_paused' ? (
                  <MicOff size={36} color="#f43f5e" />
                ) : (
                  <Mic size={36} color={audioLevel > 15 ? '#34d399' : '#10b981'} />
                )}
              </div>

              {/* Status Message */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                {conversationPhase === 'ai_asking' && (
                  <>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#c7d2fe' }}>
                      {isVoiceSpeaking ? 'AI Agent Asking Question...' : 'Preparing Question Voice...'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Listen to the voice question. As the AI speaks, words will stream on screen. Your turn begins once the AI finishes.
                    </p>
                  </>
                )}

                {conversationPhase === 'candidate_turn' && (
                  <>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#6ee7b7' }}>
                      {audioLevel > 15 ? 'Active Speech Detected • Recording...' : 'AI is Listening to You • Speak Your Answer'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                      Speak naturally facing your camera. Your explanation is being captured and transcribed for Gemini AI analysis.
                    </p>
                  </>
                )}

                {conversationPhase === 'candidate_paused' && (
                  <>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#fda4af' }}>
                      Microphone Paused
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Click "Resume Mic" whenever you are ready to continue your response.
                    </p>
                  </>
                )}

                {conversationPhase === 'evaluating' && (
                  <>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#a5b4fc' }}>
                      Gemini AI Analyzing Your Answer...
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Evaluating technical correctness, architectural depth, and communication clarity.
                    </p>
                  </>
                )}
              </div>

              {/* Real-time Dynamic Equalizer Frequency Waveform (16 frequency bars) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  height: '42px',
                  width: '100%',
                  maxWidth: '340px',
                  padding: '0 1rem',
                  marginBottom: '1rem',
                }}
              >
                {[0.4, 0.7, 1.0, 0.6, 0.9, 1.2, 0.8, 1.1, 1.3, 0.7, 1.0, 0.5, 0.8, 1.1, 0.6, 0.4].map((multiplier, idx) => {
                  const baseLevel = conversationPhase === 'candidate_turn' ? Math.max(4, Math.round(audioLevel * multiplier * 0.38)) : 3;
                  const barHeight = Math.min(38, Math.max(4, baseLevel));
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${barHeight}px`,
                        background:
                          conversationPhase === 'candidate_turn'
                            ? audioLevel > 15
                              ? 'linear-gradient(180deg, #34d399, #059669)'
                              : 'rgba(16, 185, 129, 0.35)'
                            : conversationPhase === 'ai_asking'
                            ? 'linear-gradient(180deg, #818cf8, #4f46e5)'
                            : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        transition: 'height 0.08s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* Confidentiality / No-Text Confirmation Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.9rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <ShieldCheck size={13} color="#10b981" />
                <span>
                  Audio converted securely for AI scoring • Candidate transcript hidden during live session
                </span>
              </div>
            </div>

            {/* Candidate Voice Controls Deck */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Pause / Resume Mic Toggle */}
                {conversationPhase === 'candidate_turn' ? (
                  <button
                    type="button"
                    onClick={pauseCandidateTurn}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#e5e7eb',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Pause size={14} />
                    <span>Pause Mic</span>
                  </button>
                ) : conversationPhase === 'candidate_paused' ? (
                  <button
                    type="button"
                    onClick={resumeCandidateTurn}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#6ee7b7',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={14} />
                    <span>Resume Mic</span>
                  </button>
                ) : null}

                {/* Re-speak Answer */}
                {(conversationPhase === 'candidate_turn' || conversationPhase === 'candidate_paused') && (
                  <button
                    type="button"
                    onClick={handleRespeak}
                    title="Clear current recording and speak fresh from the start"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Re-speak Answer</span>
                  </button>
                )}
              </div>

              {/* Submit Voice Answer Button */}
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || conversationPhase === 'ai_asking'}
                className="btn btn-primary"
                style={{
                  background:
                    conversationPhase === 'ai_asking'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow:
                    conversationPhase === 'ai_asking'
                      ? 'none'
                      : '0 4px 14px rgba(16, 185, 129, 0.4)',
                  padding: '0.7rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: conversationPhase === 'ai_asking' ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Gemini AI Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>
                      {currentIdx + 1 === questions.length ? 'Submit Final Answer' : 'Submit Answer & Proceed'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Candidate Camera & Proctor Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card elevated style={{ padding: '0.85rem' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '4/3',
                background: '#070b14',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                border: mobileDetected || multipleFacesDetected
                  ? '2px solid #ef4444'
                  : secondPersonSoundDetected
                  ? '2px solid #f59e0b'
                  : '1px solid var(--border-subtle)',
                transition: 'border 0.25s ease',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />

              {/* Dynamic Live Proctoring Overlay Status */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  background: 'rgba(0, 0, 0, 0.85)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: mobileDetected || multipleFacesDetected
                    ? '#fca5a5'
                    : secondPersonSoundDetected
                    ? '#fcd34d'
                    : '#6ee7b7',
                  border: mobileDetected || multipleFacesDetected
                    ? '1px solid #ef4444'
                    : secondPersonSoundDetected
                    ? '1px solid #f59e0b'
                    : '1px solid rgba(16, 185, 129, 0.4)',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: mobileDetected || multipleFacesDetected
                      ? '#ef4444'
                      : secondPersonSoundDetected
                      ? '#f59e0b'
                      : '#10b981',
                    animation: (mobileDetected || multipleFacesDetected || secondPersonSoundDetected) ? 'pulse 0.8s infinite' : 'none',
                  }}
                />
                <span>
                  {mobileDetected
                    ? 'PHONE FLAGGED'
                    : multipleFacesDetected
                    ? 'MULTI-FACES FLAGGED'
                    : secondPersonSoundDetected
                    ? '2ND VOICE FLAGGED'
                    : noFaceDetected
                    ? 'NO FACE VISIBLE'
                    : 'AI PROCTOR ACTIVE'}
                </span>
              </div>
            </div>

            {/* Real-Time AI Proctor Telemetry Monitors (Mobile, Faces, Sound) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.75rem' }}>
              {/* 1. Mobile Detection Monitor */}
              <div
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: mobileDetected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${mobileDetected ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 800, color: mobileDetected ? '#fca5a5' : '#6ee7b7' }}>
                  <Smartphone size={12} />
                  <span>{mobileDetected ? 'Phone!' : 'Phone: OK'}</span>
                </div>
              </div>

              {/* 2. Multi-Faces Monitor */}
              <div
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: multipleFacesDetected
                    ? 'rgba(239, 68, 68, 0.25)'
                    : noFaceDetected
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${multipleFacesDetected ? '#ef4444' : noFaceDetected ? '#f59e0b' : 'rgba(16, 185, 129, 0.3)'}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 800, color: multipleFacesDetected ? '#fca5a5' : noFaceDetected ? '#fcd34d' : '#6ee7b7' }}>
                  <Users size={12} />
                  <span>{multipleFacesDetected ? 'Multi-Faces!' : noFaceDetected ? 'No Face' : '1 Face: OK'}</span>
                </div>
              </div>

              {/* 3. Second Person Sound Monitor */}
              <div
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  background: secondPersonSoundDetected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${secondPersonSoundDetected ? '#f59e0b' : 'rgba(16, 185, 129, 0.3)'}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 800, color: secondPersonSoundDetected ? '#fcd34d' : '#6ee7b7' }}>
                  <Volume2 size={12} />
                  <span>{secondPersonSoundDetected ? '2nd Voice!' : 'Sound: OK'}</span>
                </div>
              </div>
            </div>

            {/* Audio Voice Input Meter */}
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mic Volume</span>
                <span style={{ color: audioLevel > 15 ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                  {audioLevel > 15 ? 'Active Speech' : 'Silent'}
                </span>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${audioLevel}%`,
                    background: audioLevel > 15 ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '999px',
                    transition: 'width 0.08s ease',
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Voice & Proctoring Rules Card */}
          <Card style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={15} color="#10b981" />
              <span>AI Proctoring Rules</span>
            </h4>
            <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              <li><strong>Mobile Detection:</strong> Keep cell phones outside camera view.</li>
              <li><strong>Multi-Faces:</strong> Only the candidate is allowed in the room.</li>
              <li><strong>Audio Isolation:</strong> External / secondary voices are flagged.</li>
              <li>Speak clearly facing the camera when answering.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Live Gemini Question Evaluation Modal */}
      {showEvaluationModal && lastEvaluation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#0f172a',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-accent)',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <Award size={32} />
            </div>

            <Badge variant="success" style={{ marginBottom: '0.5rem' }}>
              {lastEvaluation.verdict || 'Voice Answer Evaluated'}
            </Badge>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff' }}>
              Score: {lastEvaluation.score}%
            </h3>

            <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {lastEvaluation.feedback}
            </p>

            {lastEvaluation.is_interview_complete ? (
              <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.95rem' }}>
                🎉 Final Question Completed! Compiling Your Executive Scorecard...
              </div>
            ) : (
              <Button variant="primary" onClick={proceedToNextQuestion}>
                <span>Proceed to Question {currentIdx + 2}</span>
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
