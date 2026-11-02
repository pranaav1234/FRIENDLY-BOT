import {
  UserProfile,
  ChatSession,
  Alarm,
  Reminder,
  CalendarEvent,
  ProductivitySession,
  UserMusicPreferences,
  TimetableEntry,
} from '../types';

type UserChangeListener = (user: UserProfile | null) => void;

class UserDataService {
  private currentUser: UserProfile | null = null;
  private userChangeListeners: UserChangeListener[] = [];

  constructor() {
    this.loadActiveSession();
  }

  // --- Active Session Management ---
  private loadActiveSession(): void {
    try {
      const stored = localStorage.getItem('friendly_bot_active_user') || sessionStorage.getItem('friendly_bot_active_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load active user session:', e);
      this.currentUser = null;
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile | null): void {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem('friendly_bot_active_user', JSON.stringify(user));
        sessionStorage.setItem('friendly_bot_active_user', JSON.stringify(user));
        this.migrateLegacyDataIfNeeded(user.id);
      } else {
        localStorage.removeItem('friendly_bot_active_user');
        sessionStorage.removeItem('friendly_bot_active_user');
      }
    } catch (e) {
      console.warn('Failed to persist active user session:', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: UserChangeListener): () => void {
    this.userChangeListeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.userChangeListeners = this.userChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.userChangeListeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error in user change listener:', err);
      }
    });
  }

  // --- Namespaced Storage Keys ---
  private getChatKey(userId: string): string {
    return `friendly_bot_${userId}_chats`;
  }

  private getAlarmsKey(userId: string): string {
    return `friendly_bot_${userId}_alarms`;
  }

  private getRemindersKey(userId: string): string {
    return `friendly_bot_${userId}_reminders`;
  }

  private getCalendarKey(userId: string): string {
    return `friendly_bot_${userId}_calendar`;
  }

  private getProductivityKey(userId: string): string {
    return `friendly_bot_${userId}_productivity`;
  }

  private getMusicPrefsKey(userId: string): string {
    return `friendly_bot_${userId}_music_prefs`;
  }

  private getClockPrefsKey(userId: string): string {
    return `friendly_bot_${userId}_clock_prefs`;
  }

  private getTimerSettingsKey(userId: string): string {
    return `friendly_bot_${userId}_timer_settings`;
  }

  private getStopwatchLapsKey(userId: string): string {
    return `friendly_bot_${userId}_stopwatch_laps`;
  }

  private getCalibrationKey(userId: string): string {
    return `friendly_bot_${userId}_productivity_calibration`;
  }

  private getGestureSettingsKey(userId: string): string {
    return `friendly_bot_${userId}_gesture_settings`;
  }

  private getChatResponseModeKey(userId: string): string {
    return `friendly_bot_${userId}_chat_response_mode`;
  }

  private getTimetableKey(userId: string): string {
    return `friendly_bot_${userId}_timetable`;
  }

  // --- Chat Sessions Persistence (Partitioned by userId) ---
  public getChatSessions(userId: string): ChatSession[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getChatKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as ChatSession[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all have userId
          return parsed.map((s) => ({ ...s, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load chats for user ${userId}:`, e);
    }
    return [];
  }

  public saveChatSessions(userId: string, sessions: ChatSession[]): void {
    if (!userId) return;
    try {
      const sanitized = sessions.map((s) => ({
        ...s,
        userId,
      }));
      localStorage.setItem(this.getChatKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save chats for user ${userId}:`, e);
    }
  }

  // --- Alarms Persistence (Partitioned by userId) ---
  public getAlarms(userId: string): Alarm[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getAlarmsKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Alarm[];
        if (Array.isArray(parsed)) {
          return parsed.map((a) => ({ ...a, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load alarms for user ${userId}:`, e);
    }
    return [];
  }

  public saveAlarms(userId: string, alarms: Alarm[]): void {
    if (!userId) return;
    try {
      const sanitized = alarms.map((a) => ({
        ...a,
        userId,
      }));
      localStorage.setItem(this.getAlarmsKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save alarms for user ${userId}:`, e);
    }
  }

  // --- Reminders Persistence (Partitioned by userId) ---
  public getReminders(userId: string): Reminder[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getRemindersKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Reminder[];
        if (Array.isArray(parsed)) {
          return parsed.map((r) => ({ ...r, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load reminders for user ${userId}:`, e);
    }
    return [];
  }

  public saveReminders(userId: string, reminders: Reminder[]): void {
    if (!userId) return;
    try {
      const sanitized = reminders.map((r) => ({
        ...r,
        userId,
      }));
      localStorage.setItem(this.getRemindersKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save reminders for user ${userId}:`, e);
    }
  }

  // --- Calendar Events Persistence (Partitioned by userId) ---
  public getCalendarEvents(userId: string): CalendarEvent[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getCalendarKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as CalendarEvent[];
        if (Array.isArray(parsed)) {
          return parsed.map((e) => ({ ...e, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load calendar events for user ${userId}:`, e);
    }
    return [];
  }

  public saveCalendarEvents(userId: string, events: CalendarEvent[]): void {
    if (!userId) return;
    try {
      const sanitized = events.map((e) => ({
        ...e,
        userId,
      }));
      localStorage.setItem(this.getCalendarKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save calendar events for user ${userId}:`, e);
    }
  }

  // --- Productivity Sessions Persistence (Partitioned by userId) ---
  public getProductivitySessions(userId: string): ProductivitySession[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getProductivityKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as ProductivitySession[];
        if (Array.isArray(parsed)) {
          return parsed.map((s) => ({ ...s, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load productivity sessions for user ${userId}:`, e);
    }
    return [];
  }

  public saveProductivitySessions(userId: string, sessions: ProductivitySession[]): void {
    if (!userId) return;
    try {
      const sanitized = sessions.map((s) => ({
        ...s,
        userId,
      }));
      localStorage.setItem(this.getProductivityKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save productivity sessions for user ${userId}:`, e);
    }
  }

  // --- Music Preferences Persistence (Partitioned by userId) ---
  public getMusicPreferences(userId: string): UserMusicPreferences | null {
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(this.getMusicPrefsKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to load music prefs for user ${userId}:`, e);
    }
    return null;
  }

  public saveMusicPreferences(userId: string, prefs: UserMusicPreferences): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getMusicPrefsKey(userId), JSON.stringify({ ...prefs, userId }));
    } catch (e) {
      console.error(`Failed to save music prefs for user ${userId}:`, e);
    }
  }

  // --- Clock Preferences Persistence (12h vs 24h) ---
  public getClockPreference(userId: string): boolean {
    if (!userId) return false;
    try {
      const raw = localStorage.getItem(this.getClockPrefsKey(userId));
      if (raw !== null) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to load clock pref for user ${userId}:`, e);
    }
    return false;
  }

  public saveClockPreference(userId: string, is24Hour: boolean): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getClockPrefsKey(userId), JSON.stringify(is24Hour));
    } catch (e) {
      console.error(`Failed to save clock pref for user ${userId}:`, e);
    }
  }

  // --- Timer Settings Persistence ---
  public getTimerSettings(userId: string): { hours: number; minutes: number; seconds: number } {
    if (!userId) return { hours: 0, minutes: 5, seconds: 0 };
    try {
      const raw = localStorage.getItem(this.getTimerSettingsKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to load timer settings for user ${userId}:`, e);
    }
    return { hours: 0, minutes: 5, seconds: 0 };
  }

  public saveTimerSettings(userId: string, settings: { hours: number; minutes: number; seconds: number }): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getTimerSettingsKey(userId), JSON.stringify(settings));
    } catch (e) {
      console.error(`Failed to save timer settings for user ${userId}:`, e);
    }
  }

  // --- Stopwatch Laps Persistence ---
  public getStopwatchLaps(userId: string): any[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getStopwatchLapsKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(`Failed to load stopwatch laps for user ${userId}:`, e);
    }
    return [];
  }

  public saveStopwatchLaps(userId: string, laps: any[]): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getStopwatchLapsKey(userId), JSON.stringify(laps));
    } catch (e) {
      console.error(`Failed to save stopwatch laps for user ${userId}:`, e);
    }
  }

  // --- Productivity Calibration Persistence ---
  public getCalibrationProfile(userId: string): any | null {
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(this.getCalibrationKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to load calibration profile for user ${userId}:`, e);
    }
    return null;
  }

  public saveCalibrationProfile(userId: string, profile: any): void {
    if (!userId) return;
    try {
      if (profile) {
        localStorage.setItem(this.getCalibrationKey(userId), JSON.stringify(profile));
      } else {
        localStorage.removeItem(this.getCalibrationKey(userId));
      }
    } catch (e) {
      console.error(`Failed to save calibration profile for user ${userId}:`, e);
    }
  }

  // --- Gesture Settings Persistence ---
  public getGestureSettings(userId: string): any {
    if (!userId) return {};
    try {
      const raw = localStorage.getItem(this.getGestureSettingsKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to load gesture settings for user ${userId}:`, e);
    }
    return {};
  }

  public saveGestureSettings(userId: string, settings: any): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getGestureSettingsKey(userId), JSON.stringify(settings));
    } catch (e) {
      console.error(`Failed to save gesture settings for user ${userId}:`, e);
    }
  }

  // --- Chat Response Mode Persistence ---
  public getChatResponseMode(userId: string): 'simple' | 'detailed' | 'analysis' {
    if (!userId) return 'simple';
    try {
      const raw = localStorage.getItem(this.getChatResponseModeKey(userId));
      if (raw && (raw === 'simple' || raw === 'detailed' || raw === 'analysis')) {
        return raw as any;
      }
    } catch (e) {
      console.warn(`Failed to load chat response mode for user ${userId}:`, e);
    }
    return 'simple';
  }

  public saveChatResponseMode(userId: string, mode: 'simple' | 'detailed' | 'analysis'): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getChatResponseModeKey(userId), mode);
    } catch (e) {
      console.error(`Failed to save chat response mode for user ${userId}:`, e);
    }
  }

  // --- Timetable Persistence (Partitioned by userId) ---
  public getTimetable(userId: string): TimetableEntry[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.getTimetableKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as TimetableEntry[];
        if (Array.isArray(parsed)) {
          return parsed.map((t) => ({ ...t, userId }));
        }
      }
    } catch (e) {
      console.warn(`Failed to load timetable for user ${userId}:`, e);
    }
    return [];
  }

  public saveTimetable(userId: string, entries: TimetableEntry[]): void {
    if (!userId) return;
    try {
      const sanitized = entries.map((t) => ({
        ...t,
        userId,
      }));
      localStorage.setItem(this.getTimetableKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Failed to save timetable for user ${userId}:`, e);
    }
  }

  // --- User Initialization Check (Partitioned by userId) ---
  public isUserInitialized(userId: string): boolean {
    if (!userId) return false;
    return localStorage.getItem(`friendly_bot_${userId}_initialized`) === 'true';
  }

  public initializeUser(userId: string): void {
    if (!userId) return;
    localStorage.setItem(`friendly_bot_${userId}_initialized`, 'true');
    // Explicitly set empty scopes for all user history categories so they start 100% fresh
    localStorage.setItem(this.getChatKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getCalendarKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getAlarmsKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getRemindersKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getProductivityKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getMusicPrefsKey(userId), JSON.stringify({}));
    localStorage.setItem(this.getClockPrefsKey(userId), JSON.stringify(false));
    localStorage.setItem(this.getTimerSettingsKey(userId), JSON.stringify({ hours: 0, minutes: 5, seconds: 0 }));
    localStorage.setItem(this.getStopwatchLapsKey(userId), JSON.stringify([]));
    localStorage.setItem(this.getCalibrationKey(userId), JSON.stringify(null));
    localStorage.setItem(this.getTimetableKey(userId), JSON.stringify([]));
  }

  // --- Purge User Data (Permanently delete all application data for this user) ---
  public purgeUserData(userId: string): void {
    if (!userId) return;
    try {
      const prefix = `friendly_bot_${userId}`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((key) => localStorage.removeItem(key));

      // Also clean up active session if it belonged to this user
      if (this.currentUser?.id === userId) {
        this.setCurrentUser(null);
      }
    } catch (e) {
      console.error(`Failed to purge user data for ${userId}:`, e);
    }
  }

  // --- Migration of Existing Legacy Unscoped Data ---
  public migrateLegacyDataIfNeeded(userId: string): void {
    // Disabled to prevent inheritance or copying of any previous/legacy/unscoped data for new users
  }
}

export const userDataService = new UserDataService();
