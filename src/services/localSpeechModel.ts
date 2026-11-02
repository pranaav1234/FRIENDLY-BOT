import { whisperSpeechService, WhisperStatus } from './whisperSpeechService';

export type OfflineModelStatus = WhisperStatus;

export interface AcousticTemplate {
  intent: string;
  phrases: string[];
}

export class LocalSpeechModel {
  constructor() {
    this.loadModel();
  }

  public subscribeStatus(listener: (status: OfflineModelStatus) => void): () => void {
    return whisperSpeechService.subscribeStatus(listener);
  }

  public async loadModel(): Promise<void> {
    await whisperSpeechService.initModel();
  }

  public getStatus(): OfflineModelStatus {
    return whisperSpeechService.getStatus();
  }

  /**
   * Delegates raw PCM audio transcription to the offline Whisper ASR engine.
   * Returns exact text spoken by the user.
   */
  public async transcribeAudio(
    pcmAudio16k: Float32Array
  ): Promise<{ text: string; rawText: string; isSpeech: boolean }> {
    return await whisperSpeechService.transcribeAudio(pcmAudio16k);
  }

  /**
   * Safe natural language intent parser that runs 100% locally on transcribed text.
   * Normalizes, strips punctuation, and extracts values for Alarms, Timers, Reminders,
   * Navigation, Music, and Timetable queries.
   * NEVER returns UNKNOWN as 'Open Clock'.
   */
  public matchOfflineCommand(text: string): {
    intent: string;
    matchedPhrase: string;
    confidence: number;
    extractedArgs?: any;
  } {
    const normalized = (text || '')
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return { intent: 'UNKNOWN', matchedPhrase: '', confidence: 0 };
    }

    // --- Navigation Shortcuts ---
    if (normalized === 'open home' || normalized === 'go home' || normalized === 'home') {
      return { intent: 'OPEN_HOME', matchedPhrase: 'open home', confidence: 0.98 };
    }
    if (
      normalized.includes('facial recognition') ||
      normalized.includes('face recognition') ||
      normalized.includes('scan face') ||
      normalized.includes('detect face')
    ) {
      return { intent: 'OPEN_FACIAL_RECOGNITION', matchedPhrase: 'open facial recognition', confidence: 0.98 };
    }
    if (normalized.includes('gesture mode') || normalized.includes('open gesture') || normalized === 'gesture') {
      return { intent: 'OPEN_GESTURE', matchedPhrase: 'open gesture mode', confidence: 0.98 };
    }
    if (normalized.includes('chat bot') || normalized.includes('open chat') || normalized.includes('voice assistant')) {
      return { intent: 'OPEN_CHAT', matchedPhrase: 'open chat bot', confidence: 0.98 };
    }
    if (normalized.includes('calendar')) {
      return { intent: 'OPEN_CALENDAR', matchedPhrase: 'open calendar', confidence: 0.98 };
    }
    if (normalized.includes('productivity')) {
      return { intent: 'OPEN_PRODUCTIVITY', matchedPhrase: 'open productivity', confidence: 0.98 };
    }
    if (normalized.includes('time management')) {
      return { intent: 'OPEN_TIME_MANAGEMENT', matchedPhrase: 'open time management', confidence: 0.98 };
    }
    if (normalized.includes('music')) {
      return { intent: 'OPEN_MUSIC', matchedPhrase: 'open music', confidence: 0.98 };
    }

    // --- Time Management Specific Section Tabs ---
    if (normalized === 'open clock' || normalized === 'show clock' || normalized === 'clock') {
      return { intent: 'OPEN_CLOCK', matchedPhrase: 'open clock', confidence: 0.98 };
    }
    if (normalized === 'open alarm' || normalized === 'show alarm' || normalized === 'alarm') {
      return { intent: 'OPEN_ALARM', matchedPhrase: 'open alarm', confidence: 0.98 };
    }
    if (normalized === 'open timer' || normalized === 'show timer' || normalized === 'timer') {
      return { intent: 'OPEN_TIMER', matchedPhrase: 'open timer', confidence: 0.98 };
    }
    if (normalized === 'open stopwatch' || normalized === 'show stopwatch' || normalized === 'stopwatch') {
      return { intent: 'OPEN_STOPWATCH', matchedPhrase: 'open stopwatch', confidence: 0.98 };
    }
    if (normalized === 'open reminder' || normalized === 'show reminder' || normalized === 'reminder') {
      return { intent: 'OPEN_REMINDER', matchedPhrase: 'open reminder', confidence: 0.98 };
    }

    // --- Alarm Creation ---
    if (normalized.includes('alarm') || normalized.includes('wake me up')) {
      const timeArgs = this.extractTimeAndDate(normalized);
      const labelMatch = normalized.match(/(?:called|labeled|title|named|label)\s+([a-zA-Z0-9\s]+)$/i);
      const label = labelMatch ? labelMatch[1].trim() : 'Alarm';

      if (timeArgs) {
        return {
          intent: 'SET_ALARM',
          matchedPhrase: 'set alarm',
          confidence: 0.98,
          extractedArgs: {
            ...timeArgs,
            label,
          },
        };
      }
    }

    // --- Reminder Creation ---
    if (normalized.includes('remind') || normalized.includes('reminder')) {
      const timeArgs = this.extractTimeAndDate(normalized);
      let task = normalized
        .replace(/^(?:set a reminder to|set a reminder|remind me to|remind me|create a reminder to|create a reminder)\s+/gi, '')
        .replace(/(?:at|for|tomorrow|today|called|on)\s+.*$/gi, '')
        .trim();

      if (!task || task.length < 2) {
        task = 'Reminder';
      }
      task = task.charAt(0).toUpperCase() + task.slice(1);

      if (timeArgs) {
        return {
          intent: 'SET_REMINDER',
          matchedPhrase: 'set reminder',
          confidence: 0.98,
          extractedArgs: {
            ...timeArgs,
            text: task,
          },
        };
      }
    }

    // --- Timer Creation ---
    if (normalized.includes('timer')) {
      const durationMatch = normalized.match(/(\d+)\s*(hour|hr|minute|min|second|sec|s)/i);
      if (durationMatch) {
        const val = parseInt(durationMatch[1], 10);
        const unit = durationMatch[2].toLowerCase();
        let seconds = val;

        if (unit.startsWith('min')) {
          seconds = val * 60;
        } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
          seconds = val * 3600;
        }

        return {
          intent: 'SET_TIMER',
          matchedPhrase: 'set timer',
          confidence: 0.99,
          extractedArgs: {
            seconds,
            originalText: `${val} ${unit}`,
          },
        };
      }
    }

    // --- Stopwatch Actions ---
    if (normalized.includes('stopwatch')) {
      if (normalized.includes('start')) {
        return { intent: 'START_STOPWATCH', matchedPhrase: 'start stopwatch', confidence: 0.95 };
      } else if (normalized.includes('stop') || normalized.includes('pause')) {
        return { intent: 'PAUSE_STOPWATCH', matchedPhrase: 'pause stopwatch', confidence: 0.95 };
      } else if (normalized.includes('resume')) {
        return { intent: 'RESUME_STOPWATCH', matchedPhrase: 'resume stopwatch', confidence: 0.95 };
      } else if (normalized.includes('reset')) {
        return { intent: 'RESET_STOPWATCH', matchedPhrase: 'reset stopwatch', confidence: 0.95 };
      }
    }

    // --- Timetable Lookups ---
    if (normalized.includes('next period') || normalized.includes('next class') || normalized.includes('class is next')) {
      return { intent: 'GET_NEXT_PERIOD', matchedPhrase: 'next period', confidence: 0.98 };
    }
    if (normalized.includes('timetable today') || normalized.includes('schedule today') || normalized.includes('classes today')) {
      return { intent: 'GET_TODAYS_TIMETABLE', matchedPhrase: 'today timetable', confidence: 0.98 };
    }
    if (normalized.includes('timetable tomorrow') || normalized.includes('schedule tomorrow') || normalized.includes('classes tomorrow')) {
      return { intent: 'GET_TOMORROWS_TIMETABLE', matchedPhrase: 'tomorrow timetable', confidence: 0.98 };
    }

    // --- Music Songs playback matching ---
    const songs = [
      'perfect',
      'blinding lights',
      'cruel summer',
      'blank space',
      'jai ho',
      'tere bina',
      'naa ready',
      'chaleya',
      'levitating',
      'stay',
    ];
    if (normalized.includes('play')) {
      for (const song of songs) {
        if (normalized.includes(song)) {
          return {
            intent: 'PLAY_SONG',
            matchedPhrase: `play ${song}`,
            confidence: 0.99,
            extractedArgs: { songName: song },
          };
        }
      }
      return { intent: 'PLAY_ANY', matchedPhrase: 'play music', confidence: 0.90 };
    }

    if (normalized.includes('pause music')) {
      return { intent: 'PAUSE_MUSIC', matchedPhrase: 'pause music', confidence: 0.95 };
    }
    if (normalized.includes('resume music')) {
      return { intent: 'RESUME_MUSIC', matchedPhrase: 'resume music', confidence: 0.95 };
    }
    if (normalized.includes('stop music')) {
      return { intent: 'STOP_MUSIC', matchedPhrase: 'stop music', confidence: 0.95 };
    }
    if (normalized.includes('next song') || normalized.includes('play another song')) {
      return { intent: 'NEXT_SONG', matchedPhrase: 'next song', confidence: 0.95 };
    }
    if (normalized.includes('previous song')) {
      return { intent: 'PREVIOUS_SONG', matchedPhrase: 'previous song', confidence: 0.95 };
    }

    // No matching intent -> UNKNOWN
    return { intent: 'UNKNOWN', matchedPhrase: '', confidence: 0 };
  }

  private extractTimeAndDate(normalizedText: string): { time: string; date: string } | null {
    const timeMatch =
      normalizedText.match(/(?:at|for|for\s+an?|at\s+about|around)\s+(\d+)(?::(\d+))?\s*(am|pm)?/i) ||
      normalizedText.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);

    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (meridian === 'pm' && hour < 12) {
      hour += 12;
    } else if (meridian === 'am' && hour === 12) {
      hour = 0;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeString = `${pad(hour)}:${pad(minute)}`;

    let targetDate = new Date();
    if (normalizedText.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const year = targetDate.getFullYear();
    const month = pad(targetDate.getMonth() + 1);
    const day = pad(targetDate.getDate());
    const dateString = `${year}-${month}-${day}`;

    return {
      time: timeString,
      date: dateString,
    };
  }
}

export const localSpeechModel = new LocalSpeechModel();
