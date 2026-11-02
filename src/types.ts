export interface RegisteredPerson {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  sampleCount: number;
  thumbnail: string; // base64 data url
  descriptors: number[][]; // array of 128D feature vectors
  username?: string; // unique lowercase username
  passwordHash?: string; // PBKDF2 hash of password
  salt?: string; // hex-encoded salt
}

export interface FaceSample {
  id: string;
  personId: string;
  imageBase64: string;
  descriptor: number[];
  timestamp: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFaceItem {
  bbox: BoundingBox;
  label: string;
  personName?: string;
  personId?: string;
  isRegistered: boolean;
  distance?: number;
  descriptor?: number[];
  faceThumbnail?: string;
  landmarks?: { x: number; y: number }[];
  confidence: number;
}

export interface DetectionResult {
  faceDetected: boolean;
  confidence: number;
  bbox?: BoundingBox;
  label: string; // "Mithun" | "Unknown Person" | "No face detected"
  personName?: string;
  personId?: string;
  isRegistered: boolean;
  distance?: number;
  descriptor?: number[];
  faceThumbnail?: string;
  landmarks?: { x: number; y: number }[];
  detectedFaces?: DetectedFaceItem[];
}

export interface VoiceSettings {
  enabled: boolean;
  pitch: number;
  rate: number;
  volume: number;
  selectedVoiceURI: string;
}

export type AppMode = 'detect' | 'scan' | 'register' | 'people' | 'gesture';

export type HandGestureType =
  | 'open_palm'
  | 'victory_sign'
  | 'closed_fist'
  | 'point_up'
  | 'point_down'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'horns_sign'
  | 'ok_sign'
  | 'love_you'
  | 'none';

export interface GestureDetectionResult {
  gesture: HandGestureType;
  label: string;
  confidence: number;
  landmarks?: { x: number; y: number; z: number }[];
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  thumbnail?: string;
  username?: string;
}

export type EventCategory = 'work' | 'personal' | 'study' | 'urgent' | 'health';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  category: EventCategory;
  recurrence: RecurrenceType;
  reminderMinutesBefore: number; // e.g. 0, 10, 30, 60
  completed?: boolean;
}

export interface Alarm {
  id: string;
  userId: string;
  time: string; // "08:30" (24-hr format)
  label: string;
  enabled: boolean;
  days?: string[];
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  datetime: string; // ISO string
  completed: boolean;
  notified?: boolean;
}

export interface LapTime {
  id: string;
  lapNumber: number;
  splitTime: number;
  totalTime: number;
}

export type VoiceAssistantMode = 'simple' | 'detailed' | 'analysis';

export interface VoiceAssistantSource {
  title: string;
  url: string;
}

export interface VoiceAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: VoiceAssistantMode;
  sources?: VoiceAssistantSource[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: VoiceAssistantMessage[];
  updatedAt: string; // ISO string
}

export interface ProductivitySession {
  id: string;
  userId: string;
  date: string;
  duration: number; // in seconds
  emotions: {
    focused: number;
    distracted: number;
    tired: number;
    [key: string]: number;
  };
  score: number;
}

export interface UserMusicPreferences {
  userId: string;
  lastSongId?: string;
  volume?: number;
  selectedGenre?: string;
  favoriteSongIds?: string[];
  recentlyPlayedSongIds?: string[];
}

export interface UserClockPreferences {
  is24Hour: boolean;
}

export interface UserTimerSettings {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface UserGestureSettings {
  enabledGestures?: Record<string, boolean>;
  holdDurationMs?: number;
}

export interface TimetableEntry {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  day: string; // e.g. "Monday"
  periodNumber: number; // 1, 2, ...
  startTime: string; // "09:00"
  endTime: string; // "09:50"
  subject: string;
  venue?: string;
}
