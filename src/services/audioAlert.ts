// Web Audio API sound alert generator for Alarms, Timers, and Reminders
class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private isRinging: boolean = false;
  private ringInterval: number | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play a short pleasant chime (for timer or reminder trigger)
  public playChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Three note chord (C5, E5, G5)
      [523.25, 659.25, 783.99].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0.15, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.6);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Play repeating alarm ring until stopped
  public startAlarmRing(onBeep?: () => void) {
    if (this.isRinging) return;
    this.isRinging = true;

    const playBeepSequence = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        // Alarm dual-tone beep
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now + i * 0.15); // A5
          osc.frequency.setValueAtTime(1046.5, now + i * 0.15 + 0.07); // C6

          gain.gain.setValueAtTime(0.2, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.12);
        }

        if (onBeep) onBeep();
      } catch (e) {
        console.warn('Alarm ring error:', e);
      }
    };

    playBeepSequence();
    // Repeat every 1.2 seconds
    this.ringInterval = window.setInterval(playBeepSequence, 1200);
  }

  public stopAlarmRing() {
    this.isRinging = false;
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
      } catch (e) {
        // ignore
      }
      this.activeOscillator = null;
    }
  }
}

export const audioAlert = new AudioAlertService();
