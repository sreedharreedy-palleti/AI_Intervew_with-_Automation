/**
 * AudioProctor.js - Comprehensive Audio Processing & AI Voice Engine
 * 1. Real-time Microphone Decibel & Frequency VU Visualizer via Web Audio API
 * 2. AI Text-To-Speech (TTS) Voice Question Reader & Spoken Proctor Alerts
 * 3. Real-Time Speech-to-Text (STT) Voice Answer Transcriber
 */

export class AudioProctorEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.freqArray = null;
    this.isRunning = false;

    // Speech synthesis
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.selectedVoice = null;
    this.speechRate = 1.0;
    this.isMuted = false;

    // Speech recognition
    this.recognition = null;
    this.isListening = false;
    this.initSpeechRecognition();
  }

  // -------------------------------------------------------------
  // 1. Microphone Analysis & VU Meter
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
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

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
        suspiciousNoise: false
      };
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);

    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const val = (this.dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const volumePercentage = Math.min(100, Math.round(rms * 280));
    const volumeDb = Math.round(volumePercentage * 0.85);

    // Extract 8 normalized frequency bands for equalizer bars
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

    let state = 'silent';
    if (volumePercentage < 4) state = 'silent';
    else if (volumePercentage < 45) state = 'speaking';
    else state = 'noisy';

    return {
      volume: volumePercentage,
      volumeDb,
      frequencyBands,
      state,
      isMuted: volumePercentage === 0,
      suspiciousNoise: volumePercentage > 75
    };
  }

  closeAudio() {
    this.isRunning = false;
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
    }
  }

  // -------------------------------------------------------------
  // 2. AI Voice Text-To-Speech (TTS)
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

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    if (onError) utterance.onerror = onError;

    this.synth.speak(utterance);
  }

  stopSpeech() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
    return this.isMuted;
  }

  // -------------------------------------------------------------
  // 3. Speech-to-Text (STT) Voice Recognition
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

      if (onTranscript) {
        onTranscript({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          text: (finalTranscript + interimTranscript).trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
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
