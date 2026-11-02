import { VoiceSettings } from '../types';

export interface SpeakOptions {
  force?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onWordBoundary?: (wordIndex: number, totalWords: number) => void;
}

type VoiceListener = (settings: VoiceSettings) => void;
type VoicesLoadedListener = (voices: SpeechSynthesisVoice[]) => void;

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private settingsListeners: VoiceListener[] = [];
  private voiceChangeListeners: VoicesLoadedListener[] = [];
  private keepAliveTimer: any = null;
  private wordTimer: any = null;
  private settings: VoiceSettings = {
    enabled: true,
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0,
    selectedVoiceURI: '',
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSettings();
      this.initVoices();
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('facial_rec_voice_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
  }

  private initVoices() {
    if (!this.synth) return;

    const updateVoices = () => {
      if (this.synth) {
        const v = this.synth.getVoices();
        if (v && v.length > 0) {
          this.cachedVoices = v;
          this.voiceChangeListeners.forEach((fn) => fn(this.cachedVoices));
        }
      }
    };

    updateVoices();

    if (typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  public subscribe(listener: VoiceListener): () => void {
    this.settingsListeners.push(listener);
    return () => {
      this.settingsListeners = this.settingsListeners.filter((l) => l !== listener);
    };
  }

  public onVoicesChanged(listener: VoicesLoadedListener): () => void {
    this.voiceChangeListeners.push(listener);
    if (this.cachedVoices.length > 0) {
      listener(this.cachedVoices);
    }
    return () => {
      this.voiceChangeListeners = this.voiceChangeListeners.filter((l) => l !== listener);
    };
  }

  public saveSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('facial_rec_voice_settings', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.settingsListeners.forEach((fn) => fn(this.getSettings()));
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    const freshVoices = this.synth.getVoices();
    if (freshVoices && freshVoices.length > 0) {
      this.cachedVoices = freshVoices;
    }
    return this.cachedVoices;
  }

  private playWebAudioFallbackSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const pitchMultiplier = Number(this.settings.pitch) || 1.0;
      const volume = Number(this.settings.volume) || 1.0;

      // Create a warm 3-tone announcement chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * pitchMultiplier, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25 * volume, now + idx * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch (e) {
      console.warn('Web Audio chime fallback exception:', e);
    }
  }

  public speak(
    text: string,
    options?: SpeakOptions
  ) {
    if (!options?.force && !this.settings.enabled) {
      if (options?.onEnd) options.onEnd();
      return;
    }

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    if (this.wordTimer) {
      clearInterval(this.wordTimer);
      this.wordTimer = null;
    }

    if (!this.synth) {
      this.playWebAudioFallbackSound();
      if (options?.onEnd) options.onEnd();
      return;
    }

    try {
      this.synth.cancel();

      setTimeout(() => {
        if (!this.synth) return;

        try {
          this.synth.resume();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.pitch = Math.min(2, Math.max(0.5, Number(this.settings.pitch) || 1.0));
          utterance.rate = Math.min(2, Math.max(0.5, Number(this.settings.rate) || 1.0));
          utterance.volume = Math.min(1, Math.max(0, Number(this.settings.volume) || 1.0));

          const voices = this.getAvailableVoices();
          if (this.settings.selectedVoiceURI) {
            const foundVoice = voices.find((v) => v.voiceURI === this.settings.selectedVoiceURI);
            if (foundVoice) utterance.voice = foundVoice;
          } else if (voices.length > 0) {
            const enVoice =
              voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              voices[0];
            if (enVoice) utterance.voice = enVoice;
          }

          // Compute word array & offsets for word-by-word real-time highlighting
          const rawWords = text.trim().split(/\s+/).filter(Boolean);
          const totalWords = rawWords.length;
          const wordOffsets: number[] = [];
          let searchIdx = 0;
          rawWords.forEach((w) => {
            const idx = text.indexOf(w, searchIdx);
            if (idx !== -1) {
              wordOffsets.push(idx);
              searchIdx = idx + w.length;
            } else {
              wordOffsets.push(searchIdx);
            }
          });

          let currentWordIdx = 0;
          let hasEnded = false;
          let lastBoundaryTime = Date.now();

          const finish = () => {
            if (hasEnded) return;
            hasEnded = true;
            if (this.keepAliveTimer) {
              clearInterval(this.keepAliveTimer);
              this.keepAliveTimer = null;
            }
            if (this.wordTimer) {
              clearInterval(this.wordTimer);
              this.wordTimer = null;
            }
            if (options?.onWordBoundary) {
              options.onWordBoundary(totalWords, totalWords);
            }
            if (options?.onEnd) options.onEnd();
          };

          utterance.onstart = () => {
            if (options?.onStart) options.onStart();
            if (options?.onWordBoundary && totalWords > 0) {
              options.onWordBoundary(0, totalWords);
            }

            // Word timing ticker fallback
            const rate = Math.min(2, Math.max(0.5, Number(this.settings.rate) || 1.0));
            // Standard speaking speed ~220 WPM (approx 270ms per word at rate 1.0)
            const msPerWord = Math.round(270 / rate);

            this.wordTimer = setInterval(() => {
              if (Date.now() - lastBoundaryTime > msPerWord * 1.2) {
                if (currentWordIdx < totalWords - 1) {
                  currentWordIdx++;
                  if (options?.onWordBoundary) {
                    options.onWordBoundary(currentWordIdx, totalWords);
                  }
                }
              }
            }, msPerWord);
          };

          utterance.onboundary = (evt) => {
            if (evt.name === 'word' || !evt.name) {
              lastBoundaryTime = Date.now();
              const charIdx = evt.charIndex;
              let closestWordIdx = 0;
              for (let i = 0; i < wordOffsets.length; i++) {
                if (charIdx >= wordOffsets[i]) {
                  closestWordIdx = i;
                } else {
                  break;
                }
              }
              currentWordIdx = closestWordIdx;
              if (options?.onWordBoundary) {
                options.onWordBoundary(currentWordIdx, totalWords);
              }
            }
          };

          utterance.onend = () => {
            finish();
          };

          utterance.onerror = (evt) => {
            if (evt.error === 'canceled' || evt.error === 'interrupted') {
              finish();
              return;
            }
            console.warn('SpeechSynthesis error:', evt);
            this.playWebAudioFallbackSound();
            finish();
          };

          // Chrome bug fix: keepalive timer
          this.keepAliveTimer = setInterval(() => {
            if (!this.synth || !this.synth.speaking) {
              clearInterval(this.keepAliveTimer);
              this.keepAliveTimer = null;
            } else {
              this.synth.pause();
              this.synth.resume();
            }
          }, 10000);

          this.synth.speak(utterance);
        } catch (err) {
          console.warn('TTS speak exception:', err);
          this.playWebAudioFallbackSound();
          if (options?.onEnd) options.onEnd();
        }
      }, 50);
    } catch (err) {
      console.warn('TTS cancel exception:', err);
      this.playWebAudioFallbackSound();
      if (options?.onEnd) options.onEnd();
    }
  }

  public testVoice(
    sampleText = 'Hello! Voice output is working correctly.',
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    this.playWebAudioFallbackSound();
    this.speak(sampleText, { force: true, onEnd, onError });
  }

  public stop() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
      this.wordTimer = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
    }
  }

  // Voice announcement helpers according to strict rules:
  // 1. During Registration: "Mithun has been registered successfully."
  public announceRegistrationCompleted(name: string) {
    this.speak(`${name} has been registered successfully.`);
  }

  // 2. During Detection: "This is Mithun."
  public announceFaceRecognised(name: string) {
    this.speak(`This is ${name}.`);
  }

  // Stubs for status messages to keep speech limited strictly to registration & detection
  public announceScanningStarted() {}
  public announceFaceDetected() {}
  public announceAlreadyRegistered(name: string) {}
  public announceUnknownPerson() {}
  public announceFaceDeleted(name: string) {}
  public announceNoFaceDetected() {}
  public announcePleaseLookAtCamera() {}
  public announceScanningCompleted() {}
}

export const voiceService = new VoiceService();



