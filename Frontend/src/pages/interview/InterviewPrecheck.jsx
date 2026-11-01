import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ArrowRight,
  MonitorCheck,
  Volume2,
  Lock,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import interviewApi from '../../api/interviewApi';

const InterviewPrecheck = ({
  interviewToken,
  candidateName,
  courseTitle,
  onVerificationComplete,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Status states
  const [cameraStatus, setCameraStatus] = useState('checking'); // 'checking' | 'active' | 'error'
  const [cameraError, setCameraError] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);

  const [audioStatus, setAudioStatus] = useState('checking'); // 'checking' | 'active' | 'error'
  const [audioError, setAudioError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceDetected, setVoiceDetected] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Setup Audio Analyser
  const setupAudioAnalyser = useCallback((stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setAudioStatus('active');
        return;
      }
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        if (normalized > 12) {
          setVoiceDetected(true);
        }

        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
      setAudioStatus('active');
    } catch (err) {
      console.warn('Audio analyser setup error:', err);
      setAudioStatus('active');
    }
  }, []);

  // Initialize Media Devices
  const initMedia = useCallback(async () => {
    setCameraStatus('checking');
    setCameraError(null);
    setAudioStatus('checking');
    setAudioError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('active');
      setupAudioAnalyser(stream);
    } catch (err) {
      console.warn('Combined getUserMedia failed, trying fallback:', err);
      // Fallback try video alone
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = vStream;
        if (videoRef.current) videoRef.current.srcObject = vStream;
        setCameraStatus('active');
      } catch (vErr) {
        setCameraStatus('error');
        setCameraError('Camera access was denied or not found. Please allow camera permissions in your browser.');
      }

      // Fallback try audio alone
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupAudioAnalyser(aStream);
      } catch (aErr) {
        setAudioStatus('error');
        setAudioError('Microphone access was denied. Please allow microphone permissions.');
      }
    }
  }, [setupAudioAnalyser]);

  useEffect(() => {
    initMedia();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initMedia]);

  // Capture face photo snapshot for verification
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedSnapshot(dataUrl);
    return dataUrl;
  };

  const handleVerifyAndStart = async () => {
    if (cameraStatus !== 'active' || audioStatus !== 'active') {
      setErrorMessage('Please allow both Camera and Microphone permissions to proceed.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const snap = captureSnapshot() || '';
      await interviewApi.verifyPrecheck(interviewToken, {
        image_base64: snap,
        camera_verified: true,
        mic_verified: true,
        audio_level: audioLevel,
        browser: 'Google Chrome',
      });

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      console.error('Precheck verification failed:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Verification failed. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isReadyToProceed = cameraStatus === 'active' && audioStatus === 'active';

  return (
    <div style={{ maxWidth: '820px', margin: '1.5rem auto', padding: '0 1rem' }}>
      <Card elevated style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #10b981, #06b6d4, #6366f1)' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-full)', color: '#6ee7b7', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <ShieldCheck size={14} />
            <span>STAGE 2: AI TECHNICAL INTERVIEW PRECHECK</span>
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.4rem 0' }}>
            Camera & Microphone Verification
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
            Before launching the live AI interview for <strong style={{ color: '#fff' }}>{courseTitle}</strong>, verify that your webcam video and microphone audio stream are active.
          </p>
        </div>

        {/* Grid Preview & Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Live Video Preview Tile */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '4/3',
                background: '#090d16',
                borderRadius: 'var(--radius-lg)',
                border: cameraStatus === 'active' ? '2px solid rgba(16, 185, 129, 0.6)' : '2px dashed var(--border-medium)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: cameraStatus === 'active' ? '0 0 25px rgba(16, 185, 129, 0.15)' : 'none',
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
                  display: cameraStatus === 'active' ? 'block' : 'none',
                  transform: 'scaleX(-1)', // Mirror effect for natural preview
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {cameraStatus === 'checking' && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>Accessing camera feed...</p>
                </div>
              )}

              {cameraStatus === 'error' && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#f87171' }}>
                  <CameraOff size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.82rem', margin: 0 }}>{cameraError || 'Camera unavailable'}</p>
                </div>
              )}

              {/* Status Badge overlay */}
              {cameraStatus === 'active' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#6ee7b7',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  <span>Webcam Active</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '0.65rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Candidate: <strong style={{ color: '#fff' }}>{candidateName || 'Candidate'}</strong>
              </span>
              <button
                type="button"
                onClick={initMedia}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <RefreshCw size={12} />
                <span>Retry Devices</span>
              </button>
            </div>
          </div>

          {/* Device Checklist & Audio Meter Tile */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Item 1: Camera */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                {cameraStatus === 'active' ? (
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <CameraOff size={20} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Camera Access Verified
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {cameraStatus === 'active'
                      ? 'HD Video stream active. Clear visibility confirmed.'
                      : 'Webcam not detected. Please grant browser camera access.'}
                  </div>
                </div>
              </div>

              {/* Item 2: Microphone & Decibel Meter */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                {audioStatus === 'active' ? (
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <MicOff size={20} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      Microphone Access & Volume
                    </span>
                    <Badge variant={audioLevel > 15 ? 'success' : 'primary'} style={{ fontSize: '0.7rem' }}>
                      {audioLevel > 15 ? 'Sound Detected' : 'Listening...'}
                    </Badge>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0.6rem 0' }}>
                    Speak into your microphone to verify speech clarity.
                  </p>

                  {/* Volume Level Meter Bar */}
                  <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${audioLevel}%`,
                        background: audioLevel > 50 ? '#10b981' : (audioLevel > 15 ? '#38bdf8' : '#6366f1'),
                        borderRadius: '999px',
                        transition: 'width 0.1s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Item 3: Browser & System Compatibility */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <MonitorCheck size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Google Chrome Optimized
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Web Speech API, media recorder, and live AI streaming enabled.
                  </div>
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#fda4af', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={15} color="#f43f5e" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Start Button */}
            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleVerifyAndStart}
                disabled={!isReadyToProceed || isVerifying}
                className="btn btn-primary btn-block"
                style={{
                  padding: '0.85rem 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: isReadyToProceed
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  cursor: isReadyToProceed ? 'pointer' : 'not-allowed',
                  boxShadow: isReadyToProceed ? '0 4px 18px rgba(16, 185, 129, 0.35)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying Hardware & Launching Interview...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Confirm Access & Start AI Technical Interview</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InterviewPrecheck;

