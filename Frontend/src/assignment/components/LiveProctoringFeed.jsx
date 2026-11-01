import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Mic,
  MicOff,
  Smartphone,
  Eye,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { assignmentApi } from '../../api/assignmentApi';

const LiveProctoringFeed = ({
  assignmentToken,
  onTerminate,
  onWarning,
  isActive = true,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const virtualIntervalRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [proctorStatus, setProctorStatus] = useState('initializing'); // 'initializing' | 'active' | 'warning' | 'violation'
  const [activeMessage, setActiveMessage] = useState('Initializing AI Proctoring...');
  const [strikes, setStrikes] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);

  // Store recent violation history
  const violationsRef = useRef([]);
  const strikesRef = useRef(0);
  strikesRef.current = strikes;

  // Record a violation and terminate immediately if critical/mobile/multiple persons (NO strikes, NO warning)
  const triggerViolation = useCallback(
    async (type, message, isCritical = false) => {
      const isMobile = type === 'mobile_phone';
      const isMultiplePersons = type === 'multiple_persons' || type === 'multiple_persons_warning';
      const mustTerminate = isCritical || isMobile || isMultiplePersons;

      const record = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isoTime: new Date().toISOString(),
        type,
        message,
        isCritical: mustTerminate,
        strike: mustTerminate ? 'CRITICAL EXIT' : (strikesRef.current + 1),
      };
      violationsRef.current.push(record);

      if (!mustTerminate) {
        const newCount = strikesRef.current + 1;
        setStrikes(newCount);
      }

      setProctorStatus('violation');
      setActiveMessage(message);

      if (onWarning) {
        onWarning(record);
      }

      // Single sighting of a mobile device or another person ends the exam at once (NO strikes, NO warnings)!
      if (mustTerminate || strikesRef.current + 1 >= 3) {
        const reason = isMobile
          ? (message || 'CRITICAL VIOLATION: Mobile phone detected by YOLO Deep Learning! Immediate exam exit triggered.')
          : isMultiplePersons
          ? (message || 'CRITICAL VIOLATION: Multiple persons detected in camera view! Immediate exam exit triggered.')
          : isCritical
          ? message
          : `Exceeded security violation limit (3/3 strikes). Recent violation: ${message}`;

        // 1. Immediately terminate UI in frontend state with zero delay
        if (onTerminate) {
          onTerminate(reason, violationsRef.current);
        }

        // 2. Concurrently record termination in MongoDB backend
        assignmentApi
          .terminateExam(assignmentToken, {
            reason,
            violation_history: violationsRef.current,
          })
          .catch((e) => console.error('Failed to log termination:', e));
      }
    },
    [assignmentToken, onTerminate, onWarning]
  );

  // Fallback virtual camera for environments without hardware webcam
  const startVirtualFeed = useCallback(() => {
    if (virtualIntervalRef.current) clearInterval(virtualIntervalRef.current);

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    let frame = 0;
    virtualIntervalRef.current = setInterval(() => {
      frame++;
      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Silhouette
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(160, 95, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(160, 220, 75, 0, Math.PI, true);
      ctx.fill();

      // Scanning line
      const scanY = (frame * 3) % canvas.height;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('LIVE AI PROCTOR STREAM ? SECURE', 10, 20);
    }, 100);

    const stream = canvas.captureStream(15);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    setHasCamera(true);
    setIsVirtualMode(true);
    setCameraError(null);
    setProctorStatus('active');
    setActiveMessage('AI Proctoring Active ? Simulated Stream');
  }, []);

  // 1. Initialize Webcam & Microphone with adaptive fallback
  const startMedia = useCallback(async () => {
    setCameraError(null);

    // Try combined video and audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setIsVirtualMode(false);
      setProctorStatus('active');
      setActiveMessage('AI Proctoring Active ? Secure Environment');

      // Setup Web Audio Analyser
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (audioErr) {
        console.warn('Audio analyser setup notice:', audioErr);
      }
      return;
    } catch (combinedErr) {
      console.warn('Combined stream failed, trying separate video/audio:', combinedErr);
    }

    // Attempt video only
    let videoGot = false;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = videoStream;
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      setHasCamera(true);
      setIsVirtualMode(false);
      videoGot = true;
    } catch (vErr) {
      console.warn('Video stream failed:', vErr);
    }

    // Attempt audio only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      if (streamRef.current) {
        audioStream.getAudioTracks().forEach((t) => streamRef.current.addTrack(t));
      }
    } catch (aErr) {
      console.warn('Audio stream failed:', aErr);
    }

    if (videoGot) {
      setProctorStatus('active');
      setActiveMessage('AI Proctoring Active ? Camera Connected');
    } else {
      setCameraError('Requested device not found');
      setProctorStatus('warning');
      setActiveMessage('Camera / Mic required for examination integrity.');
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    startMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (virtualIntervalRef.current) {
        clearInterval(virtualIntervalRef.current);
      }
    };
  }, [isActive, startMedia]);

  // 2. Real-time Screen Shift & Focus Detection (Debounced to prevent false positives)
  useEffect(() => {
    if (!isActive) return;

    let shiftTimeout = null;
    let blurTimeout = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        shiftTimeout = setTimeout(() => {
          triggerViolation(
            'screen_shift',
            'Screen shift: Navigated away from active exam tab to another window or tab.',
            false
          );
        }, 2000);
      } else {
        if (shiftTimeout) clearTimeout(shiftTimeout);
      }
    };

    const handleWindowBlur = () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus() && document.hidden) {
          triggerViolation(
            'screen_shift',
            'Window focus lost: Examination window lost focus or secondary monitor accessed.',
            false
          );
        }
      }, 2500);
    };

    const handleWindowFocus = () => {
      if (blurTimeout) clearTimeout(blurTimeout);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (shiftTimeout) clearTimeout(shiftTimeout);
      if (blurTimeout) clearTimeout(blurTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, triggerViolation]);

  // 3. Audio Stream Monitoring (Detects other person's voice / loud speech)
  useEffect(() => {
    if (!isActive) return;

    let animationId;
    let voiceSpikeCount = 0;

    const checkAudio = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.round(avg));

        // High vocal energy threshold
        if (avg > 55) {
          voiceSpikeCount++;
          setIsVoiceDetected(true);
          if (voiceSpikeCount > 18) {
            triggerViolation(
              'other_voice',
              'Secondary voice / external conversation detected in examination room!',
              false
            );
            voiceSpikeCount = 0;
          }
        } else {
          setIsVoiceDetected(false);
          voiceSpikeCount = Math.max(0, voiceSpikeCount - 1);
        }
      }

      animationId = requestAnimationFrame(checkAudio);
    };

    animationId = requestAnimationFrame(checkAudio);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, triggerViolation]);

  // 4. Ultra-Fast Live Snapshot Analysis (1.0s interval + 640x480 resolution for instant mobile detection)
  useEffect(() => {
    if (!isActive) return;

    let isAnalyzing = false;

    const interval = setInterval(async () => {
      // Prevent overlapping concurrent requests if one is still in-flight
      if (isAnalyzing) return;

      let base64Data = null;

      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
          // Use 640x480 high-def frame so YOLO easily catches phones in hands
          const targetWidth = Math.min(640, video.videoWidth || 640);
          const targetHeight = Math.min(480, video.videoHeight || 480);
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          base64Data = canvas.toDataURL('image/jpeg', 0.70);
        }
      }

      isAnalyzing = true;
      try {
        // Send snapshot and audio metrics to backend (analyzed with YOLO11n)
        const analysis = await assignmentApi.analyzeProctorFrame(assignmentToken, {
          image_base64: base64Data,
          screen_visible: !document.hidden,
          fullscreen_active: !!document.fullscreenElement,
          audio_noise_level: audioLevel,
          voice_detected: isVoiceDetected,
          warning_count: strikesRef.current,
        });

        if (analysis?.violation_detected) {
          const isCriticalExit =
            analysis.should_terminate ||
            analysis.violation_type === 'mobile_phone' ||
            analysis.violation_type === 'multiple_persons' ||
            analysis.violation_type === 'multiple_persons_warning';

          if (isCriticalExit) {
            triggerViolation(
              analysis.violation_type || 'critical_violation',
              analysis.message || 'CRITICAL VIOLATION: Immediate exam exit triggered.',
              true
            );
          } else {
            triggerViolation(
              analysis.violation_type,
              analysis.message || 'Proctoring violation flagged.',
              false
            );
          }
        } else {
          if (strikesRef.current === 0) {
            setProctorStatus('active');
            setActiveMessage(
              isVirtualMode
                ? 'AI Proctoring Active ? Simulated Feed'
                : 'AI Proctoring Active ? Candidate Verified'
            );
          }
        }
      } catch (err) {
        console.warn('Proctor frame poll warning:', err);
      } finally {
        isAnalyzing = false;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isActive, assignmentToken, audioLevel, isVoiceDetected, isVirtualMode, triggerViolation]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '260px',
        background: '#0f172a',
        borderRadius: '12px',
        border: `2px solid ${
          proctorStatus === 'violation'
            ? '#ef4444'
            : proctorStatus === 'warning'
            ? '#f59e0b'
            : '#10b981'
        }`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
        zIndex: 90,
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Video Container */}
      <div style={{ position: 'relative', width: '100%', height: '160px', background: '#020617' }}>
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
            opacity: hasCamera ? 1 : 0.2,
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live scanning overlay grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '1px dashed rgba(255,255,255,0.15)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: proctorStatus === 'violation' ? '#ef4444' : '#10b981',
                background: 'rgba(0,0,0,0.65)',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                letterSpacing: '0.05em',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: proctorStatus === 'violation' ? '#ef4444' : '#10b981',
                  display: 'inline-block',
                }}
              />
              LIVE AI PROCTOR
            </span>

            {/* Strikes Counter */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: strikes >= 2 ? '#ef4444' : strikes > 0 ? '#f59e0b' : '#94a3b8',
                background: 'rgba(0,0,0,0.7)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Strikes: {strikes}/3
            </span>
          </div>

          {/* Audio Visualizer Level */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0,0,0,0.65)',
              padding: '2px 6px',
              borderRadius: '4px',
              width: 'fit-content',
            }}
          >
            <Mic size={12} color={audioLevel > 50 ? '#f59e0b' : '#38bdf8'} />
            <div style={{ width: '40px', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (audioLevel / 80) * 100)}%`,
                  height: '100%',
                  background: audioLevel > 55 ? '#ef4444' : '#38bdf8',
                  transition: 'width 0.1s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* When Camera device is not found or error */}
        {!hasCamera && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '8px',
              textAlign: 'center',
              background: 'rgba(2, 6, 23, 0.95)',
            }}
          >
            <CameraOff size={24} style={{ marginBottom: '4px', color: '#ef4444' }} />
            <span style={{ color: '#fca5a5', fontWeight: 600, marginBottom: '6px' }}>
              {cameraError || 'Requested device not found'}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={startMedia}
                style={{
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={startVirtualFeed}
                style={{
                  padding: '2px 8px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Use Virtual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ padding: '8px 10px', background: '#0b1120', borderTop: '1px solid #1e293b' }}>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            lineHeight: 1.35,
            color:
              proctorStatus === 'violation'
                ? '#f87171'
                : proctorStatus === 'warning'
                ? '#fbbf24'
                : '#94a3b8',
            fontWeight: proctorStatus === 'active' ? 500 : 700,
          }}
        >
          {activeMessage}
        </p>
      </div>
    </div>
  );
};

export default LiveProctoringFeed;
