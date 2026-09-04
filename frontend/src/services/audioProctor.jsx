/**
 * AudioProctor.js - Comprehensive Audio Processing & AI Voice Engine
 * 1. Real-time Microphone Decibel & Frequency VU Visualizer via Web Audio API
 * 2. Human Voice vs Background Noise Discrimination (Formant Band Filtering)
 * 3. Tolerant of small ambient noises (keystrokes, fans, breathing) while detecting Loud Human Speech
 * 4. AI Text-To-Speech (TTS) Voice Question Reader with Self-Echo Suppression
 * 5. Real-Time Speech-to-Text (STT) Voice Answer Transcriber
 */

export class AudioProctorEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.freqArray = null;
    this.isRunning = false;

    // Speech synthesis (TTS) & Self-Echo Suppression
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.selectedVoice = null;
    this.speechRate = 1.0;
    this.isMuted = false;
    this.isSpeakingTTS = false;
    this.ttsEndCooldownTimer = null;

    // Speech recognition (STT)
    this.recognition = null;
    this.isListening = false;
    this.initSpeechRecognition();

    // Noise filtering & sustained human voice detection
    this.consecutiveLoudVoiceTicks = 0;
    this.recentVolumeLevels = [];
    this.lastVolume = 0;
  }

  // -------------------------------------------------------------
  // 1. Microphone Analysis & Human Voice vs Ambient Noise Filter
  // -------------------------------------------------------------
  initAudioStream(stream) {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return false;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256; // 128 frequency bins for accurate formant analysis
      this.analyser.smoothingTimeConstant = 0.75;

      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.freqArray = new Uint8Array(bufferLength);
      this.isRunning = true;
      return true;
    } catch (err) {
      console.warn('AudioContext init error:', err);
      return false;
    }
  }

  getAudioMetrics() {
    if (!this.isRunning || !this.analyser || !this.dataArray) {
      return {
        volume: 0,
        volumeDb: 0,
        frequencyBands: [0, 0, 0, 0, 0, 0, 0, 0],
        state: 'silent',
        isMuted: true,
        isSmallNoise: false,
        loudHumanVoiceDetected: false,
        suspiciousNoise: false
      };
    }

    // If AI voice TTS is actively speaking, suppress microphone metrics to prevent feedback loops
    if (this.isSpeakingTTS) {
      return {
        volume: 0,
        volumeDb: 0,
        frequencyBands: [0, 0, 0, 0, 0, 0, 0, 0],
        state: 'tts_active',
        isMuted: false,
        isSmallNoise: false,
        loudHumanVoiceDetected: false,
        suspiciousNoise: false
      };
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);

    // Calculate RMS volume (0 - 100%)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const val = (this.dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const rawVolume = Math.min(100, Math.round(rms * 300));
    const volumeDb = Math.round(rawVolume * 0.85);
    this.lastVolume = rawVolume;

    // Track volume smoothing window
    this.recentVolumeLevels.push(rawVolume);
    if (this.recentVolumeLevels.length > 10) this.recentVolumeLevels.shift();

    // Extract 8 frequency bands for equalizer UI
    const bandsCount = 8;
    const bandSize = Math.floor(this.freqArray.length / bandsCount);
    const frequencyBands = [];

    for (let b = 0; b < bandsCount; b++) {
      let bSum = 0;
      for (let i = b * bandSize; i < (b + 1) * bandSize; i++) {
        bSum += this.freqArray[i] || 0;
      }
      const avg = bSum / (bandSize || 1);
      frequencyBands.push(Math.min(100, Math.round((avg / 255) * 100)));
    }

    // -------------------------------------------------------------
    // Frequency-Domain Human Vocal Band Discrimination
    // Human vocal range fundamental + formants: ~250 Hz - 3400 Hz (Bins ~2 to ~20)
    // Mechanical rumble / fans: < 200 Hz (Bins 0-1)
    // High-frequency clicks / keyboard taps: > 4000 Hz (Bins > 24)
    // -------------------------------------------------------------
    let vocalEnergySum = 0;
    let totalEnergySum = 0;
    const vocalStartBin = 2;
    const vocalEndBin = Math.min(22, this.freqArray.length);

    for (let i = 0; i < this.freqArray.length; i++) {
      const val = this.freqArray[i];
      totalEnergySum += val;
      if (i >= vocalStartBin && i <= vocalEndBin) {
        vocalEnergySum += val;
      }
    }

    const avgVocalEnergy = vocalEnergySum / ((vocalEndBin - vocalStartBin + 1) || 1);
    const isVocalDominant = avgVocalEnergy > 25 && (vocalEnergySum / Math.max(1, totalEnergySum)) > 0.30;

    // -------------------------------------------------------------
    // Sound Classification:
    // 1. Silent: rawVolume < 8
    // 2. Normal Ambient (Keystrokes, mouse clicks, gentle breathing, fan hum): Permitted, exam continues!
    // 3. Human Speech / Voice Detected: Triggers exam auto-termination!
    // -------------------------------------------------------------
    const isLoudVolume = rawVolume >= 58;
    const isExtremeLoud = rawVolume >= 80;

    let isHumanVoice = false;
    let state = 'ambient';

    if (rawVolume < 8) {
      state = 'silent';
      this.consecutiveLoudVoiceTicks = 0;
    } else if (isExtremeLoud && isVocalDominant) {
      // Immediate loud human voice / shouting in room
      this.consecutiveLoudVoiceTicks += 2;
      if (this.consecutiveLoudVoiceTicks >= 3) {
        isHumanVoice = true;
        state = 'loud_human_voice';
      }
    } else if (isLoudVolume && isVocalDominant) {
      // Sustained talking in human vocal frequency
      this.consecutiveLoudVoiceTicks++;
      if (this.consecutiveLoudVoiceTicks >= 5) { // ~0.5s of speech
        isHumanVoice = true;
        state = 'loud_human_voice';
      } else {
        state = 'speaking';
      }
    } else {
      // Typing clicks, fan noise, chair rustling - 100% tolerated! Exam continues!
      this.consecutiveLoudVoiceTicks = Math.max(0, this.consecutiveLoudVoiceTicks - 1);
      state = rawVolume > 40 ? 'normal_noise' : 'ambient';
    }

    return {
      volume: rawVolume,
      volumeDb,
      frequencyBands,
      state,
      isMuted: rawVolume === 0,
      isSmallNoise: rawVolume > 8 && !isHumanVoice, // Permitted normal room/keyboard sounds
      loudHumanVoiceDetected: isHumanVoice,
      suspiciousNoise: isHumanVoice
    };
  }

  setAudioMetricsCallback(cb) {
    this.metricsCallback = cb;
    if (cb && !this.metricsInterval) {
      this.metricsInterval = setInterval(() => {
        if (this.isRunning && this.metricsCallback) {
          const m = this.getAudioMetrics();
          this.metricsCallback(m);
        }
      }, 100);
    }
  }

  setSpeechTranscriptCallback(cb) {
    this.transcriptCallback = cb;
    if (cb && !this.isListening && this.isSpeechRecognitionSupported()) {
      this.startListening((res) => {
        if (this.transcriptCallback && res.text) {
          this.transcriptCallback(res.text);
        }
      });
    }
  }

  closeAudio() {
    this.isRunning = false;
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    if (this.ttsEndCooldownTimer) {
      clearTimeout(this.ttsEndCooldownTimer);
      this.ttsEndCooldownTimer = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
    }
    this.stopListening();
  }

  // -------------------------------------------------------------
  // 2. AI Voice Text-To-Speech (TTS) with Echo Feedback Shield
  // -------------------------------------------------------------
  speak(text, { onStart, onEnd, onError, rate = 1.0, isWarning = false } = {}) {
    if (!this.synth || this.isMuted) return;

    // Cancel current speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate || this.speechRate;
    utterance.pitch = isWarning ? 1.15 : 1.0;

    // Pick pleasant natural voice
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      const preferred = voices.find(
        (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.lang.startsWith('en'))
      );
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeakingTTS = true;
      if (this.ttsEndCooldownTimer) {
        clearTimeout(this.ttsEndCooldownTimer);
        this.ttsEndCooldownTimer = null;
      }
      if (onStart) onStart();
    };

    const handleSpeechEnd = () => {
      // 600ms grace period after AI finishes speaking to prevent room reverberation from triggering mic
      this.ttsEndCooldownTimer = setTimeout(() => {
        this.isSpeakingTTS = false;
      }, 600);
      if (onEnd) onEnd();
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      this.isSpeakingTTS = false;
      if (onError) onError(e);
    };

    this.synth.speak(utterance);
  }

  stopSpeech() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeakingTTS = false;
    if (this.ttsEndCooldownTimer) {
      clearTimeout(this.ttsEndCooldownTimer);
      this.ttsEndCooldownTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.synth) {
      this.stopSpeech();
    }
    return this.isMuted;
  }

  // -------------------------------------------------------------
  // 3. Speech-to-Text (STT) with Noise Rejection
  // -------------------------------------------------------------
  initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  isSpeechRecognitionSupported() {
    return !!this.recognition;
  }

  startListening(onTranscript, onError, onEnd) {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event) => {
      // Ignore speech recognition if AI voice is speaking or volume is quiet background noise
      if (this.isSpeakingTTS || this.lastVolume < 55) {
        return;
      }

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const fullText = (finalTranscript + interimTranscript).trim();

      // Detect any spoken human words or talking in room
      if (fullText.length >= 4 && onTranscript) {
        onTranscript({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          text: fullText
        });
      }
    };

    this.recognition.onerror = (event) => {
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.warn('Recognition start error:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }
}
