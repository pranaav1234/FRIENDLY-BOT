import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Search,
  BookOpen,
  BarChart3,
  MessageSquare,
  Globe,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Compass,
  Scan,
  Users,
  Hand,
  Home,
  Plus,
  Edit2,
  Menu,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { musicService } from '../services/musicService';
import { classifyTranscriptionText } from '../utils/transcriptionUtils';
import { localAiEngine } from '../services/localAiEngine';
import { processUnifiedCommand } from '../services/sharedCommandEngine';
import { KnowledgeBaseManagerModal } from './KnowledgeBaseManagerModal';
import { VoiceAssistantMode, VoiceAssistantMessage, VoiceAssistantSource, ChatSession, UserProfile } from '../types';
import { userDataService } from '../services/userDataService';
import { parseAndExecuteTimeCommand } from '../services/timeCommandParser';

async function decodeBlobTo16kPCM(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const pcmData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  if (sampleRate === 16000) return pcmData;

  const ratio = sampleRate / 16000;
  const newLength = Math.round(pcmData.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < pcmData.length; i++) {
      accum += pcmData[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

interface VoiceAssistantViewProps {
  voiceEnabled: boolean;
  currentUser?: UserProfile | null;
  onExit: () => void;
  onNavigateToScanPage?: () => void;
  onNavigateToDetectPage?: () => void;
  onNavigateToGesturePage?: () => void;
  onNavigateToTimeManagementPage?: (tab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable') => void;
  onNavigateToCalendarPage?: () => void;
  onNavigateToProductivityPage?: () => void;
  onNavigateToMusicPage?: () => void;
  onNavigateToHomePage?: () => void;
  onNavigateToSettingsPage?: () => void;
  onNavigateToVoiceAssistantPage?: () => void;
  onNavigateToSummarisePage?: () => void;
  onGlobalListeningChange?: (isListening: boolean) => void;
  onGlobalProcessingChange?: (isProcessing: boolean) => void;
  onGlobalTranscriptChange?: (text: string) => void;
  onGlobalMatchedCommandChange?: (command: string) => void;
  onGlobalStatusChange?: (status: 'idle' | 'listening' | 'processing' | 'executing') => void;
  onGlobalVolumeChange?: (volume: number) => void;
  onGlobalResponseChange?: (text: string) => void;
  onGlobalSpeakingChange?: (isSpeaking: boolean) => void;
  onGlobalSpokenWordIndexChange?: (wordIndex: number) => void;
  onRegisterToggleGlobalListeningHandler?: (handler: () => void) => void;
  onRegisterCancelGlobalListeningHandler?: (handler: () => void) => void;
  autoStartListening?: boolean;
  autoSubmitQuery?: string | null;
  onClearAutoSubmitQuery?: () => void;
}

export const VoiceAssistantView: React.FC<VoiceAssistantViewProps> = ({
  voiceEnabled,
  currentUser,
  onExit,
  onNavigateToScanPage,
  onNavigateToDetectPage,
  onNavigateToGesturePage,
  onNavigateToTimeManagementPage,
  onNavigateToCalendarPage,
  onNavigateToProductivityPage,
  onNavigateToMusicPage,
  onNavigateToHomePage,
  onNavigateToSettingsPage,
  onNavigateToVoiceAssistantPage,
  onNavigateToSummarisePage,
  onGlobalListeningChange,
  onGlobalProcessingChange,
  onGlobalTranscriptChange,
  onGlobalMatchedCommandChange,
  onGlobalStatusChange,
  onGlobalVolumeChange,
  onGlobalResponseChange,
  onGlobalSpeakingChange,
  onGlobalSpokenWordIndexChange,
  onRegisterToggleGlobalListeningHandler,
  onRegisterCancelGlobalListeningHandler,
  autoStartListening = false,
  autoSubmitQuery,
  onClearAutoSubmitQuery,
}) => {
  const [responseMode, setResponseMode] = useState<VoiceAssistantMode>('simple');
  const [inputText, setInputText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isGlobalListening, setIsGlobalListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Stop speech playback helper
  const stopSpeech = useCallback(() => {
    voiceService.stop();
    setIsSpeaking(false);
    setPlayingMessageId(null);
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState<boolean>(false);

  // Active session and messages derivation
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const sessionsRef = useRef<ChatSession[]>([]);
  const activeSessionIdRef = useRef<string>('');

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Load from UserDataService (partitioned by userId)
  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    const userSessions = userDataService.getChatSessions(userId);
    if (userSessions && userSessions.length > 0) {
      setSessions(userSessions);
      const sorted = [...userSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setActiveSessionId(sorted[0].id);
    } else {
      const initialSessionId = `session-${Date.now()}`;
      const initialSession: ChatSession = {
        id: initialSessionId,
        userId,
        title: 'New Chat',
        messages: [],
        updatedAt: new Date().toISOString()
      };
      setSessions([initialSession]);
      setActiveSessionId(initialSessionId);
    }

    if (currentUser?.id) {
      const savedMode = userDataService.getChatResponseMode(currentUser.id);
      setResponseMode(savedMode);
    }
  }, [currentUser?.id]);

  // Save response mode whenever it changes
  useEffect(() => {
    if (currentUser?.id) {
      userDataService.saveChatResponseMode(currentUser.id, responseMode);
    }
  }, [responseMode, currentUser?.id]);

  // Save to UserDataService whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      const userId = currentUser?.id || 'guest';
      userDataService.saveChatSessions(userId, sessions);
    }
  }, [sessions, currentUser?.id]);

  const updateActiveSessionMessages = useCallback((newMessages: VoiceAssistantMessage[] | ((prev: VoiceAssistantMessage[]) => VoiceAssistantMessage[])) => {
    setSessions(prevSessions => {
      let targetId = activeSessionIdRef.current || activeSessionId;
      let sessionsList = [...prevSessions];

      if (!targetId || !sessionsList.some(s => s.id === targetId)) {
        if (sessionsList.length > 0) {
          targetId = sessionsList[0].id;
        } else {
          targetId = `session-${Date.now()}`;
          sessionsList = [{
            id: targetId,
            title: 'New Chat',
            messages: [],
            updatedAt: new Date().toISOString()
          }];
        }
        activeSessionIdRef.current = targetId;
        setTimeout(() => setActiveSessionId(targetId), 0);
      }

      return sessionsList.map(session => {
        if (session.id === targetId) {
          const updatedMsgs = typeof newMessages === 'function' ? newMessages(session.messages) : newMessages;
          
          // Generate title automatically from first user message if it's currently "New Chat" or empty
          let title = session.title;
          if (title === 'New Chat' || !title.trim()) {
            const firstUserMsg = updatedMsgs.find(m => m.role === 'user');
            if (firstUserMsg) {
              const cleanText = firstUserMsg.text.trim();
              title = cleanText.length > 25 ? cleanText.substring(0, 25) + '...' : cleanText;
            }
          }
          
          return {
            ...session,
            title,
            messages: updatedMsgs,
            updatedAt: new Date().toISOString()
          };
        }
        return session;
      });
    });
  }, [activeSessionId]);

  const handleNewChat = useCallback(() => {
    stopSpeech();
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      userId: currentUser?.id || 'guest',
      title: 'New Chat',
      messages: [],
      updatedAt: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
  }, [stopSpeech, currentUser?.id]);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        // If no sessions left, create a fresh one
        const newSessionId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          userId: currentUser?.id || 'guest',
          title: 'New Chat',
          messages: [],
          updatedAt: new Date().toISOString()
        };
        setTimeout(() => setActiveSessionId(newSessionId), 0);
        return [newSession];
      }
      
      // If we deleted the active session, switch to the most recently updated remaining one
      if (activeSessionId === id) {
        const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setTimeout(() => setActiveSessionId(sorted[0].id), 0);
      }
      return filtered;
    });
    setDeleteConfirmSessionId(null);
  }, [activeSessionId]);

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setEditingSessionId(id);
    setEditingTitle(currentTitle);
  }, []);

  const handleSaveRename = useCallback((id: string) => {
    if (!editingTitle.trim()) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editingTitle.trim(), updatedAt: new Date().toISOString() } : s));
    setEditingSessionId(null);
    setEditingTitle('');
  }, [editingTitle]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const isSpeechRecognitionPermittedRef = useRef<boolean>(true);
  const shouldListenRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef<boolean>(true);

  const keepListeningRef = useRef<boolean>(false);
  const speechTimeoutRef = useRef<any>(null);
  const initialSilenceTimeoutRef = useRef<any>(null);
  const globalProcessingTimeoutRef = useRef<any>(null);
  const isGlobalSessionCancelledRef = useRef<boolean>(false);
  const currentSpeechIdRef = useRef<number>(0);
  const handleSubmitQueryRef = useRef<any>(null);

  const checkAndExecuteVoiceNavigationRef = useRef<((text: string) => boolean) | null>(null);

  const [micVolume, setMicVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const lastVoiceActivityTimeRef = useRef<number>(0);
  const voiceSpeakingDetectedRef = useRef<boolean>(false);
  const startListenTimeRef = useRef<number>(0);

  const onGlobalListeningChangeRef = useRef(onGlobalListeningChange);
  const onGlobalTranscriptChangeRef = useRef(onGlobalTranscriptChange);
  const onGlobalProcessingChangeRef = useRef(onGlobalProcessingChange);
  const onGlobalMatchedCommandChangeRef = useRef(onGlobalMatchedCommandChange);
  const onGlobalStatusChangeRef = useRef(onGlobalStatusChange);
  const onGlobalVolumeChangeRef = useRef(onGlobalVolumeChange);

  useEffect(() => {
    onGlobalListeningChangeRef.current = onGlobalListeningChange;
    onGlobalTranscriptChangeRef.current = onGlobalTranscriptChange;
    onGlobalProcessingChangeRef.current = onGlobalProcessingChange;
    onGlobalMatchedCommandChangeRef.current = onGlobalMatchedCommandChange;
    onGlobalStatusChangeRef.current = onGlobalStatusChange;
    onGlobalVolumeChangeRef.current = onGlobalVolumeChange;
  }, [
    onGlobalListeningChange,
    onGlobalTranscriptChange,
    onGlobalProcessingChange,
    onGlobalMatchedCommandChange,
    onGlobalStatusChange,
    onGlobalVolumeChange,
  ]);

  useEffect(() => {
    handleSubmitQueryRef.current = handleSubmitQuery;
  });

  const stopMicStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicVolume(0);
  }, []);

  // Predefined Voice Navigation & Shortcut Command Matcher & Executer
  const checkAndExecuteVoiceNavigation = useCallback(
    (text: string): boolean => {
      if (!text || !text.trim()) return false;

      // Check for natural language Time Management shortcuts first
      const currentUserId = currentUser?.id || 'guest';
      const parsedTimeCmd = parseAndExecuteTimeCommand(text, currentUserId);
      if (parsedTimeCmd.handled) {
        shouldListenRef.current = false;
        setIsListening(false);
        setIsGlobalListening(false);
        if (onGlobalListeningChangeRef.current) {
          onGlobalListeningChangeRef.current(false);
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
        stopMicStream();
        stopSpeech();
        setInputText('');

        voiceService.speak(parsedTimeCmd.feedbackMessage, { force: true });

        if (onGlobalStatusChangeRef.current) {
          onGlobalStatusChangeRef.current('executing');
        }
        if (onGlobalMatchedCommandChangeRef.current) {
          onGlobalMatchedCommandChangeRef.current(parsedTimeCmd.feedbackMessage);
        }

        if (onNavigateToTimeManagementPage) {
          onNavigateToTimeManagementPage(parsedTimeCmd.tab || 'clock');
        }

        return true;
      }

      // 1. Check Music Voice Commands directly via musicService first
      const musicResult = musicService.handleVoiceCommand(text);
      if (musicResult.handled) {
        shouldListenRef.current = false;
        setIsListening(false);
        setIsGlobalListening(false);
        if (onGlobalListeningChangeRef.current) {
          onGlobalListeningChangeRef.current(false);
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
        stopMicStream();
        stopSpeech();
        setInputText('');

        if (musicResult.feedbackMessage) {
          voiceService.speak(musicResult.feedbackMessage, { force: true });
        }

        if (onGlobalStatusChangeRef.current) {
          onGlobalStatusChangeRef.current('executing');
        }
        if (onGlobalMatchedCommandChangeRef.current && musicResult.feedbackMessage) {
          onGlobalMatchedCommandChangeRef.current(musicResult.feedbackMessage);
        }

        if (musicResult.navigateToMusic && onNavigateToMusicPage) {
          onNavigateToMusicPage();
        }

        return true;
      }

      // Normalize speech-to-text input: lowercased, punctuation removed, collapse whitespace
      const clean = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean || isGlobalSessionCancelledRef.current) return false;

      const words = clean.split(' ');
      const firstWord = words[0];

      // Exclude long general query questions unless explicitly starting with a navigation verb
      const isGeneralQuestion =
        words.length > 5 &&
        ['what', 'why', 'how', 'explain', 'tell', 'describe', 'compare', 'define'].includes(firstWord) &&
        !['open', 'go', 'navigate', 'take', 'show', 'switch'].includes(firstWord);

      if (isGeneralQuestion) return false;

      let targetAction: 'home' | 'scan' | 'detect' | 'gesture' | 'settings' | 'time_management' | 'calendar' | 'productivity' | 'music' | 'voice_assistant' | 'reload' | 'close' | 'help' | null = null;
      let timeTab: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | null = null;
      let announcement = '';

      // Define synonym and phrase matcher helper
      const matches = (phrases: string[]) => phrases.some(phrase => clean.includes(phrase) || clean === phrase);

      // 1. Home Page Matcher
      if (matches([
        'open home', 'go home', 'go to home', 'open dashboard', 'show dashboard', 'return home', 
        'back to home', 'homepage', 'open homepage', 'show home', 'return to home', 'main page', 
        'go back home', 'take me home', 'open main page', 'take me to home', 'home screen', 'dashboard'
      ]) || clean === 'home') {
        targetAction = 'home';
        announcement = 'Opening Home Page.';
      }
      // 2. Facial Recognition Matchers
      // Camera Controls
      else if (matches(['start camera', 'turn on camera'])) {
        targetAction = 'scan';
        announcement = 'Turning on Camera.';
      }
      else if (matches(['stop camera', 'turn off camera', 'exit camera'])) {
        targetAction = 'home';
        announcement = 'Camera turned off.';
      }
      // Face Scan Matcher
      else if (matches([
        'scan face', 'register face', 'add my face', 'start face scan', 'begin face scan', 
        'capture my face', 'open scan', 'go to scan', 'navigate to scan', 'start scan', 
        'face scan', 'scan page', 'open scanner', 'go to scanner', 'open face scanner'
      ]) || clean === 'scan') {
        targetAction = 'scan';
        announcement = 'Opening Face Scan Page.';
      }
      // Face Recognition / Scan Matcher
      else if (matches([
        'detect face', 'start detection', 'recognise face', 'recognize face', 'identify person', 
        'detect me', 'start face recognition', 'open detect', 'go to detect', 'navigate to detect', 
        'face detection', 'detection mode', 'detect page', 'open detection', 'open face detection'
      ]) || clean === 'detect' || clean === 'detection') {
        targetAction = 'scan';
        announcement = 'Opening Face Scan Page.';
      }
      // Generic Facial Recognition Page
      else if (matches([
        'open facial recognition', 'open face recognition', 'open face scanner', 'open scan page', 
        'open detect page', 'go to facial recognition', 'facial recognition', 'face recognition'
      ])) {
        targetAction = 'scan';
        announcement = 'Opening Facial Recognition Page.';
      }
      // 3. Gesture Control Intent Matcher
      else if (matches([
        'open gesture', 'open gesture mode', 'go to gesture', 'start gesture recognition', 
        'start gesture detection', 'enable gesture mode', 'stop gesture recognition', 
        'exit gesture mode', 'hand gesture', 'gesture control', 'go gesture', 'navigate gesture', 
        'take me gesture', 'open gesture page', 'gesture page', 'gesture mode'
      ]) || clean === 'gesture') {
        targetAction = 'gesture';
        announcement = 'Opening Gesture Mode.';
      }
      // 4. Calendar Intent Matcher
      else if (matches([
        'open calendar', 'show calendar', 'go to calendar', 'open events', 'show events', 
        'today\'s events', 'todays events', 'this week\'s events', 'this weeks events', 
        'monthly calendar', 'weekly calendar', 'daily calendar', 'upcoming events', 
        'my calendar', 'calendar page', 'schedule', 'events'
      ]) || clean === 'calendar') {
        targetAction = 'calendar';
        announcement = 'Opening Calendar.';
      }
      // 5. Productivity Dashboard Intent Matcher
      else if (matches([
        'open productivity dashboard', 'open productivity', 'show productivity', 'start analysis', 
        'stop analysis', 'start focus tracking', 'stop focus tracking', 'recalibrate', 
        'show session history', 'clear session history', 'productivity dashboard', 
        'productivity', 'focus tracking', 'open productivity page'
      ]) || clean === 'productivity') {
        targetAction = 'productivity';
        announcement = 'Opening Productivity Dashboard.';
      }
      // 6. Time Management Direct Tabs
      // TIMER Tab:
      else if (matches([
        'timer', 'start timer', 'stop timer', 'pause timer', 'resume timer', 'reset timer', 
        'open timer', 'show timer', 'start a timer', 'set a timer', 'timer section', 'go to timer'
      ])) {
        targetAction = 'time_management';
        timeTab = 'timer';
        announcement = 'Starting Timer.';
      }
      // ALARM Tab:
      else if (matches([
        'alarm', 'open alarm', 'show alarm', 'set alarm', 'set an alarm', 'alarm clock', 
        'alarm section', 'go to alarm'
      ])) {
        targetAction = 'time_management';
        timeTab = 'alarm';
        announcement = 'Opening Alarm Section.';
      }
      // STOPWATCH Tab:
      else if (matches([
        'stopwatch', 'open stopwatch', 'show stopwatch', 'start stopwatch', 'stop stopwatch', 
        'reset stopwatch', 'stopwatch section', 'go to stopwatch'
      ])) {
        targetAction = 'time_management';
        timeTab = 'stopwatch';
        announcement = 'Opening Stopwatch.';
      }
      // REMINDER Tab:
      else if (matches([
        'reminder', 'reminders', 'open reminder', 'show reminder', 'add reminder', 'set reminder', 
        'delete reminder', 'set a reminder', 'go to reminder', 'remind me', 'reminders section'
      ])) {
        targetAction = 'time_management';
        timeTab = 'reminder';
        announcement = 'Opening Reminders.';
      }
      // CLOCK Tab:
      else if (matches([
        'clock', 'open clock', 'show clock', 'world clock', 'clock section', 'go to clock'
      ])) {
        targetAction = 'time_management';
        timeTab = 'clock';
        announcement = 'Opening Clock.';
      }
      // Time Management Main Page
      else if (matches([
        'open time management', 'go to time management', 'navigate to time management', 
        'take me to time management', 'time management'
      ])) {
        targetAction = 'time_management';
        announcement = 'Opening Time Management.';
      }
      // 7. Music Player Page
      else if (matches([
        'open music player', 'open music', 'go to music player', 'navigate to music player', 
        'take me to music player', 'music player', 'music library', 'music page', 'show music player', 'music'
      ])) {
        targetAction = 'music';
        announcement = 'Opening Music Player.';
      }
      // 8. Settings Page Matcher
      else if (matches([
        'settings', 'voice settings', 'setting', 'configure', 'configuration', 'open settings', 'go to settings', 'navigate to settings'
      ])) {
        targetAction = 'settings';
        announcement = 'Opening Voice Output Settings.';
      }
      // 9. Chat Bot Page / Shortcuts
      else if (matches([
        'open chat bot', 'open chat', 'open ai chat', 'open assistant', 'open conversation', 
        'start chat', 'new chat', 'clear chat', 'go to chat bot', 'talk to assistant', 
        'open voice assistant', 'open ai voice assistant'
      ])) {
        targetAction = 'voice_assistant';
        announcement = 'Opening Chat Bot.';
      }
      // 10. General System Commands
      else if (matches(['reload application', 'reload app', 'refresh page', 'reload'])) {
        targetAction = 'reload';
        announcement = 'Reloading application.';
      }
      else if (matches(['cancel', 'stop listening', 'close', 'exit', 'go back'])) {
        targetAction = 'close';
        announcement = 'Closing voice command listener.';
      }
      else if (matches(['help', 'what can you do', 'show commands'])) {
        targetAction = 'help';
        announcement = 'Available commands: Home, Facial Recognition, Gesture Mode, Chat Bot, Time Management, Calendar, Productivity, Music Player.';
      }

      if (!targetAction || isGlobalSessionCancelledRef.current) return false;

      // Navigation Intent Matched! Execute navigation before calling any AI functions
      shouldListenRef.current = false;
      setIsListening(false);
      setIsGlobalListening(false);
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(false);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopMicStream();
      stopSpeech();
      setInputText('');

      // Voice feedback announcement
      voiceService.speak(announcement || 'Navigating.', { force: true });

      if (onGlobalStatusChangeRef.current) {
        onGlobalStatusChangeRef.current('executing');
      }
      if (onGlobalMatchedCommandChangeRef.current) {
        onGlobalMatchedCommandChangeRef.current(announcement || 'Navigating.');
      }

      // Execute target action immediately
      if (targetAction === 'home') {
        if (onNavigateToHomePage) onNavigateToHomePage();
        else if (onExit) onExit();
      } else if (targetAction === 'scan' && onNavigateToScanPage) {
        onNavigateToScanPage();
      } else if (targetAction === 'detect' && onNavigateToDetectPage) {
        onNavigateToDetectPage();
      } else if (targetAction === 'gesture' && onNavigateToGesturePage) {
        onNavigateToGesturePage();
      } else if (targetAction === 'settings' && onNavigateToSettingsPage) {
        onNavigateToSettingsPage();
      } else if (targetAction === 'time_management' && onNavigateToTimeManagementPage) {
        onNavigateToTimeManagementPage(timeTab || 'clock');
      } else if (targetAction === 'calendar' && onNavigateToCalendarPage) {
        onNavigateToCalendarPage();
      } else if (targetAction === 'productivity' && onNavigateToProductivityPage) {
        onNavigateToProductivityPage();
      } else if (targetAction === 'music' && onNavigateToMusicPage) {
        onNavigateToMusicPage();
      } else if (targetAction === 'voice_assistant' && onNavigateToVoiceAssistantPage) {
        onNavigateToVoiceAssistantPage();
      } else if (targetAction === 'reload') {
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else if (targetAction === 'close') {
        if (onExit) onExit();
      }

      return true;
    },
    [
      onNavigateToHomePage,
      onExit,
      onNavigateToScanPage,
      onNavigateToDetectPage,
      onNavigateToGesturePage,
      onNavigateToTimeManagementPage,
      onNavigateToCalendarPage,
      onNavigateToProductivityPage,
      onNavigateToMusicPage,
      onNavigateToSettingsPage,
      onNavigateToVoiceAssistantPage,
      stopMicStream,
      stopSpeech,
    ]
  );

  useEffect(() => {
    checkAndExecuteVoiceNavigationRef.current = checkAndExecuteVoiceNavigation;
  }, [checkAndExecuteVoiceNavigation]);

  // Force page scroll position to top when Voice Assistant view opens
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Auto-scroll chat box container internally only when new messages arrive
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToBottom();
  }, [messages.length, isLoading]);

  const micSourceRef = useRef<'local' | 'global' | null>(null);
  const globalTranscriptRef = useRef<string>('');
  const handleGlobalMicCommandRef = useRef<((text: string) => void) | null>(null);
  const localSpectralFramesRef = useRef<number[][]>([]);
  const speechStartTimeRef = useRef<number>(0);

  // Initialize Web Speech API SpeechRecognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      setSpeechError('Web Speech API is not supported in this browser. You can still type queries!');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      // Enable continuous listening so browser does not shut off after 1 second of initial silence
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (micSourceRef.current === 'global') {
          setIsGlobalListening(true);
          setIsListening(false);
        } else {
          setIsListening(true);
          setIsGlobalListening(false);
          setSpeechError(null);
        }
      };

      recognition.onresult = (event: any) => {
        // Clear initial silence timeout since we received a speech transcript
        if (initialSilenceTimeoutRef.current) {
          clearTimeout(initialSilenceTimeoutRef.current);
          initialSilenceTimeoutRef.current = null;
        }

        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const phrase = event.results[i][0].transcript;
          fullTranscript += phrase + ' ';
        }

        const textToUse = fullTranscript.trim();

        if (textToUse) {
          if (micSourceRef.current === 'global') {
            globalTranscriptRef.current = textToUse;
            // Update VAD timestamps on receiving speech results to reset silence timer
            lastVoiceActivityTimeRef.current = Date.now();
            voiceSpeakingDetectedRef.current = true;
            const classified = classifyTranscriptionText(textToUse);
            if (onGlobalTranscriptChangeRef.current) {
              onGlobalTranscriptChangeRef.current(classified.displayText);
            }
          } else {
            setInputText(textToUse);
            // AI Voice Assistant Microphone (local): speech-to-text ONLY.
            // Do NOT execute shortcuts and do NOT auto-submit.
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current);
            }
            // Automatically stop listening after 2.5s of silence so user can review text and click Ask AI
            speechTimeoutRef.current = setTimeout(() => {
              keepListeningRef.current = false;
              stopMicAndTranscribe();
            }, 2500);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('Web Speech API is not permitted in this context (e.g. running inside an iframe). Falling back to high-reliability native MediaRecorder.');
          isSpeechRecognitionPermittedRef.current = false;
          // Do NOT turn off the microphone stream or set shouldListenRef.current = false.
          // This keeps the MediaRecorder and AudioContext VAD active for high-reliability fallback transcription.
        } else if (event.error === 'no-speech') {
          // 'no-speech' is a non-fatal pause event. Keep listening state active; onend will seamlessly restart if user hasn't toggled off.
        } else if (event.error === 'network') {
          console.warn('Speech recognition network timeout.');
        } else if (event.error !== 'aborted') {
          console.warn(`Voice capture info: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          if (isSpeechRecognitionPermittedRef.current) {
            // If user still intends to listen and speech recognition is allowed, restart it seamlessly
            try {
              recognition.start();
            } catch (e) {
              // Ignore if already started
            }
          } else {
            console.log('Web Speech Recognition ended, but keeping native stream active for recording fallback.');
          }
        } else {
          setIsListening(false);
          setIsGlobalListening(false);
          if (onGlobalListeningChangeRef.current) {
            onGlobalListeningChangeRef.current(false);
          }
          stopMicStream();
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setSpeechSupported(false);
    }

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      if (initialSilenceTimeoutRef.current) {
        clearTimeout(initialSilenceTimeoutRef.current);
      }
      voiceService.stop();
    };
  }, []);

  // Stop microphone recording and process audio if needed
  const stopMicAndTranscribe = useCallback(() => {
    const currentSource = micSourceRef.current;
    shouldListenRef.current = false;
    setIsListening(false);
    setIsGlobalListening(false);

    if (currentSource === 'global') {
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(false);
      }
      if (onGlobalProcessingChangeRef.current) {
        onGlobalProcessingChangeRef.current(true);
      }
      if (onGlobalStatusChangeRef.current) {
        onGlobalStatusChangeRef.current('processing');
      }
    } else {
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(false);
      }
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (initialSilenceTimeoutRef.current) {
      clearTimeout(initialSilenceTimeoutRef.current);
      initialSilenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    stopMicStream();

    setTimeout(async () => {
      if (currentSource === 'global') {
        if (isGlobalSessionCancelledRef.current) return;

        // 1. Check if Web Speech API captured an online transcript in real-time
        const webSpeechTranscript = (globalTranscriptRef.current || '').trim();
        globalTranscriptRef.current = '';

        if (webSpeechTranscript) {
          console.log('Online Speech Recognition (Web Speech API):', webSpeechTranscript);
          if (handleGlobalMicCommandRef.current) {
            handleGlobalMicCommandRef.current(webSpeechTranscript);
          }
          return;
        }

        // 2. Transcribe recorded audio chunks using Online Gemini Speech-to-Text API
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
          if (audioBlob.size > 400) {
            try {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                const base64Audio = (reader.result as string)?.split(',')[1];
                if (base64Audio) {
                  try {
                    const res = await fetch('/api/voice-assistant/transcribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        audioData: base64Audio,
                        mimeType: audioBlob.type || 'audio/webm',
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const onlineTranscript = (data.transcript || '').trim();
                      if (onlineTranscript) {
                        console.log('Online Speech Recognition (Gemini STT API):', onlineTranscript);
                        if (handleGlobalMicCommandRef.current) {
                          handleGlobalMicCommandRef.current(onlineTranscript);
                        }
                        return;
                      }
                    }
                  } catch (apiErr) {
                    console.warn('Online STT API request error:', apiErr);
                  }
                }
                if (handleGlobalMicCommandRef.current) {
                  handleGlobalMicCommandRef.current('[UNCLEAR]');
                }
              };
              return;
            } catch (err) {
              console.warn('Audio processing exception:', err);
            }
          }
        }

        // 3. No speech audio captured or silent signal -> [NO_SPEECH]
        if (handleGlobalMicCommandRef.current) {
          handleGlobalMicCommandRef.current('[NO_SPEECH]');
        }
        return;
      }

      const chunks = audioChunksRef.current;
      if (chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        audioChunksRef.current = [];

        if (inputText && inputText.trim()) {
          return;
        }

        if (audioBlob.size > 800) {
          setIsTranscribing(true);
          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = (reader.result as string)?.split(',')[1];
              if (base64Audio) {
                const res = await fetch('/api/voice-assistant/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audioData: base64Audio,
                    mimeType: audioBlob.type || 'audio/webm',
                  }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const rawTranscript = (data.transcript || '').trim();
                  const classified = classifyTranscriptionText(rawTranscript);
                  if (classified.type === 'valid') {
                    setInputText(classified.displayText);
                  } else {
                    setSpeechError(classified.displayText);
                  }
                  setSpeechError(null);
                  setIsTranscribing(false);
                  return;
                } else if (res.status === 429) {
                  setSpeechError('Voice transcription rate limit reached. Please use browser speech recognition or click voice shortcut buttons below.');
                }
              }
              setIsTranscribing(false);
            };
          } catch (err) {
            console.warn('Gemini transcription failed:', err);
            setIsTranscribing(false);
          }
        } else {
          setIsTranscribing(false);
        }
      }
    }, 20);
  }, [stopMicStream, inputText]);

  // Start microphone listening process for a specific source ('local' | 'global')
  const startListeningWithSource = async (source: 'local' | 'global') => {
    if (isListening || isGlobalListening || shouldListenRef.current) {
      keepListeningRef.current = false;
      stopMicAndTranscribe();
      return;
    }

    isSpeechRecognitionPermittedRef.current = true;
    micSourceRef.current = source;
    keepListeningRef.current = true;
    shouldListenRef.current = true;
    localSpectralFramesRef.current = [];
    speechStartTimeRef.current = Date.now();
    setSpeechError(null);
    musicService.pause(); // Immediately pause music when voice assistant starts listening
    voiceService.stop(); // stop any active AI voice output
    setIsSpeaking(false);
    setPlayingMessageId(null);

    if (source === 'global') {
      isGlobalSessionCancelledRef.current = false;
      setIsGlobalListening(true);
      setIsListening(false);
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(true);
      }

      // Initialize VAD state variables
      lastVoiceActivityTimeRef.current = Date.now();
      voiceSpeakingDetectedRef.current = false;
      startListenTimeRef.current = Date.now();

      if (onGlobalStatusChangeRef.current) onGlobalStatusChangeRef.current('listening');
      if (onGlobalTranscriptChangeRef.current) onGlobalTranscriptChangeRef.current('');
      if (onGlobalMatchedCommandChangeRef.current) onGlobalMatchedCommandChangeRef.current('');

      // Clear any previous initial silence timeout
      if (initialSilenceTimeoutRef.current) {
        clearTimeout(initialSilenceTimeoutRef.current);
        initialSilenceTimeoutRef.current = null;
      }
    } else {
      setIsListening(true);
      setIsGlobalListening(false);
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(false);
      }
    }

    // Request native microphone stream for permission check & volume level meter
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setSpeechError(
          'Microphone API is unavailable. Browsers require a Secure Context (http://localhost:3000 or HTTPS) to access microphone input. If running locally from a downloaded ZIP, run "npm run dev" and open http://localhost:3000.'
        );
        shouldListenRef.current = false;
        setIsListening(false);
        setIsGlobalListening(false);
        if (onGlobalListeningChangeRef.current) {
          onGlobalListeningChangeRef.current(false);
        }
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Start MediaRecorder to capture audio chunks for transcription fallback
      audioChunksRef.current = [];
      try {
        if (typeof MediaRecorder !== 'undefined') {
          let mimeType = 'audio/webm';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }

          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
        }
      } catch (recErr) {
        console.warn('MediaRecorder setup warning:', recErr);
      }

      // AudioContext for level visualizer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        sourceNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!shouldListenRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const currentVol = Math.min(100, Math.round((avg / 128) * 100));
          setMicVolume(currentVol);

          // Voice Activity Detection (VAD) for Global Mic - update volume activity timestamp & auto silence stop
          if (micSourceRef.current === 'global') {
            const frame = Array.from(dataArray);
            if (localSpectralFramesRef.current.length < 500) {
              localSpectralFramesRef.current.push(frame);
            }
            if (onGlobalVolumeChangeRef.current) {
              onGlobalVolumeChangeRef.current(currentVol);
            }
            const now = Date.now();
            if (avg > 1.5) {
              lastVoiceActivityTimeRef.current = now;
              voiceSpeakingDetectedRef.current = true;
            }

            // Auto-stopping after silence
            if (voiceSpeakingDetectedRef.current) {
              if (now - lastVoiceActivityTimeRef.current > 1400) {
                // 1.4s of silence after speech started
                keepListeningRef.current = false;
                stopMicAndTranscribe();
              }
            } else {
              if (now - startListenTimeRef.current > 7000) {
                // 7.0s of initial silence without speech
                keepListeningRef.current = false;
                stopMicAndTranscribe();
              }
            }
          }

          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (ctxErr) {
        console.warn('AudioContext setup warning:', ctxErr);
      }

      // Start Web Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err: any) {
          if (err?.name !== 'InvalidStateError') {
            console.warn('Speech recognition start exception:', err);
          }
        }
      }
    } catch (micErr: any) {
      console.warn('Microphone getUserMedia access error:', micErr);
      shouldListenRef.current = false;
      setIsListening(false);
      setIsGlobalListening(false);
      if (onGlobalListeningChangeRef.current) {
        onGlobalListeningChangeRef.current(false);
      }
      stopMicStream();
      setSpeechError(
        'Microphone access denied or unavailable. Please grant microphone permission in your browser or type below.'
      );
    }
  };

  const toggleListening = useCallback(async () => {
    if (isListening) {
      keepListeningRef.current = false;
      stopMicAndTranscribe();
    } else {
      await startListeningWithSource('local');
    }
  }, [isListening, isGlobalListening, stopMicAndTranscribe]);

  const toggleGlobalListening = useCallback(async () => {
    if (isGlobalListening) {
      keepListeningRef.current = false;
      stopMicAndTranscribe();
    } else {
      await startListeningWithSource('global');
    }
  }, [isGlobalListening, isListening, stopMicAndTranscribe]);

  const cancelGlobalListening = useCallback(() => {
    isGlobalSessionCancelledRef.current = true;
    currentSpeechIdRef.current++;
    shouldListenRef.current = false;
    keepListeningRef.current = false;

    // Immediately stop active TTS speech synthesis
    voiceService.stop();

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (initialSilenceTimeoutRef.current) {
      clearTimeout(initialSilenceTimeoutRef.current);
      initialSilenceTimeoutRef.current = null;
    }
    if (globalProcessingTimeoutRef.current) {
      clearTimeout(globalProcessingTimeoutRef.current);
      globalProcessingTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    audioChunksRef.current = [];
    globalTranscriptRef.current = '';
    stopMicStream();

    setIsListening(false);
    setIsGlobalListening(false);
    setIsTranscribing(false);

    if (onGlobalListeningChangeRef.current) onGlobalListeningChangeRef.current(false);
    if (onGlobalProcessingChangeRef.current) onGlobalProcessingChangeRef.current(false);
    if (onGlobalStatusChangeRef.current) onGlobalStatusChangeRef.current('idle');
    if (onGlobalTranscriptChangeRef.current) onGlobalTranscriptChangeRef.current('');
    if (onGlobalMatchedCommandChangeRef.current) onGlobalMatchedCommandChangeRef.current('');
  }, [stopMicStream]);

  useEffect(() => {
    if (onRegisterToggleGlobalListeningHandler) {
      onRegisterToggleGlobalListeningHandler(toggleGlobalListening);
    }
    if (onRegisterCancelGlobalListeningHandler) {
      onRegisterCancelGlobalListeningHandler(cancelGlobalListening);
    }
  }, [toggleGlobalListening, cancelGlobalListening, onRegisterToggleGlobalListeningHandler, onRegisterCancelGlobalListeningHandler]);

  // Handle automatic mic activation on mount if autoStartListening is true
  useEffect(() => {
    if (autoStartListening && speechSupported) {
      const timer = setTimeout(() => {
        toggleListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartListening, speechSupported]);


  // Speak AI Answer aloud using Voice Service
  const speakAnswer = useCallback(
    (text: string, messageId?: string, onSpeechEnd?: () => void) => {
      const isVoiceOutputEnabled = voiceEnabled || voiceService.getSettings().enabled;
      if (!isVoiceOutputEnabled) {
        if (onSpeechEnd) onSpeechEnd();
        return;
      }

      voiceService.stop();
      setIsSpeaking(true);
      if (messageId) setPlayingMessageId(messageId);

      // Clean text of markdown code blocks or brackets for smoother speech
      const cleanText = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#_~`>]/g, '')
        .trim();

      let ended = false;
      const handleEnd = () => {
        if (ended) return;
        ended = true;
        setIsSpeaking(false);
        setPlayingMessageId(null);
        if (onSpeechEnd) onSpeechEnd();
      };

      voiceService.speak(cleanText, {
        force: true, // Force because user/auto-speak requested this specific answer readout
        onEnd: handleEnd,
        onError: (err) => {
          console.warn('Speech readout error:', err);
          handleEnd();
        },
      });

      // Backup monitor when speech stops
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis && !window.speechSynthesis.speaking) {
          clearInterval(checkInterval);
          handleEnd();
        }
      }, 400);
    },
    [voiceEnabled]
  );

  // Submit Query to Online Gemini AI for Homepage Chatbot (with local fallback for app navigation)
  const handleSubmitQueryDirect = useCallback(
    async (textToSubmit: string) => {
      if (!textToSubmit || !textToSubmit.trim()) return;

      stopSpeech();

      const userMsgId = `user-${Date.now()}`;
      const userMsg: VoiceAssistantMessage = {
        id: userMsgId,
        role: 'user',
        text: textToSubmit,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsLoading(true);

      const currentUserId = currentUser?.id || 'guest';

      // 1. Check for navigation shortcut
      const cleanLower = textToSubmit.toLowerCase().trim();
      const isNavShortcut =
        /^(open|go to|show|start|navigate to)\s+(home|calendar|timer|alarm|stopwatch|reminder|clock|music|productivity|gesture|scan|detect|settings)/i.test(cleanLower) ||
        /^(go home|open calendar|open music|open timer|open alarm|open stopwatch|open reminder|open clock|open productivity|open gesture|open settings)$/i.test(cleanLower);

      if (isNavShortcut) {
        const cmdResult = await processUnifiedCommand(textToSubmit, currentUserId, responseMode, {
          onNavigateToHomePage,
          onNavigateToScanPage,
          onNavigateToDetectPage,
          onNavigateToGesturePage,
          onNavigateToSettingsPage,
          onNavigateToTimeManagementPage,
          onNavigateToCalendarPage,
          onNavigateToProductivityPage,
          onNavigateToMusicPage,
          onNavigateToVoiceAssistantPage,
          onNavigateToSummarisePage,
          onExit,
        });

        if (cmdResult.type === 'shortcut') {
          const assistantMsgId = `assistant-${Date.now()}`;
          const assistantMsg: VoiceAssistantMessage = {
            id: assistantMsgId,
            role: 'assistant',
            text: cmdResult.feedbackMessage,
            mode: responseMode,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          updateActiveSessionMessages((prev) => [...prev, assistantMsg]);
          setIsLoading(false);
          speakAnswer(cmdResult.feedbackMessage, assistantMsgId);
          return;
        }
      }

      // 2. Query Online Streaming API for instant response tokens
      try {
        const assistantMsgId = `assistant-${Date.now()}`;
        let accumulatedText = '';
        let hasStartedStreaming = false;

        const historyContext = (activeSession?.messages || []).slice(-6).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.text,
        }));

        const res = await fetch('/api/voice-assistant/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSubmit,
            mode: responseMode,
            history: historyContext,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(payload);
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    if (!hasStartedStreaming) {
                      hasStartedStreaming = true;
                      setIsLoading(false);
                      const initialMsg: VoiceAssistantMessage = {
                        id: assistantMsgId,
                        role: 'assistant',
                        text: accumulatedText,
                        mode: responseMode,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      };
                      updateActiveSessionMessages((prev) => [...prev, initialMsg]);
                    } else {
                      updateActiveSessionMessages((prev) =>
                        prev.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulatedText } : m))
                      );
                    }
                  }
                } catch {
                  // ignore JSON parse error on partial chunks
                }
              }
            }
          }

          if (accumulatedText.trim()) {
            setIsLoading(false);
            speakAnswer(accumulatedText, assistantMsgId);
            return;
          }
        }
      } catch (err) {
        console.warn('Streaming API failed, falling back:', err);
      }

      // 2b. Direct generation fallback if streaming unsupported
      try {
        const res = await fetch('/api/voice-assistant/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSubmit,
            mode: responseMode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const assistantMsgId = `assistant-${Date.now()}`;
          const assistantMsg: VoiceAssistantMessage = {
            id: assistantMsgId,
            role: 'assistant',
            text: data.text || 'No response generated.',
            mode: responseMode,
            sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          updateActiveSessionMessages((prev) => [...prev, assistantMsg]);
          setIsLoading(false);
          speakAnswer(data.text, assistantMsgId);
          return;
        }
      } catch (err) {
        console.warn('AI API fetch failed, falling back to local engine:', err);
      }

      // 3. Local fallback if offline or API unavailable
      const cmdResult = await processUnifiedCommand(textToSubmit, currentUserId, responseMode, {
        onNavigateToHomePage,
        onNavigateToScanPage,
        onNavigateToDetectPage,
        onNavigateToGesturePage,
        onNavigateToSettingsPage,
        onNavigateToTimeManagementPage,
        onNavigateToCalendarPage,
        onNavigateToProductivityPage,
        onNavigateToMusicPage,
        onNavigateToVoiceAssistantPage,
        onNavigateToSummarisePage,
        onExit,
      });

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg: VoiceAssistantMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: cmdResult.feedbackMessage,
        mode: responseMode,
        sources: cmdResult.matchedTopic
          ? [{ title: `Offline Local AI (${cmdResult.matchedTopic})`, url: 'local://knowledge-engine' }]
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
      speakAnswer(cmdResult.feedbackMessage, assistantMsgId);
    },
    [
      responseMode,
      currentUser,
      speakAnswer,
      stopSpeech,
      onNavigateToHomePage,
      onNavigateToScanPage,
      onNavigateToDetectPage,
      onNavigateToGesturePage,
      onNavigateToSettingsPage,
      onNavigateToTimeManagementPage,
      onNavigateToCalendarPage,
      onNavigateToProductivityPage,
      onNavigateToMusicPage,
      onNavigateToVoiceAssistantPage,
      onNavigateToSummarisePage,
      onExit,
    ]
  );

  // Auto-submit incoming query forwarded from Offline Bot's [Ask AI Online] button
  useEffect(() => {
    if (autoSubmitQuery && autoSubmitQuery.trim()) {
      const queryToSubmit = autoSubmitQuery.trim();
      onClearAutoSubmitQuery?.();
      setInputText(queryToSubmit);
      handleSubmitQueryDirect(queryToSubmit);
    }
  }, [autoSubmitQuery, handleSubmitQueryDirect, onClearAutoSubmitQuery]);

  // Handler for Global Mic AI queries using Offline Local AI Engine
  const handleGlobalMicQueryDirect = useCallback(
    async (textToSubmit: string) => {
      stopSpeech();

      try {
        const { cleanQuery } = localAiEngine.extractQuestionQuery(textToSubmit);
        const localRes = localAiEngine.generateResponse(cleanQuery || textToSubmit, responseMode);
        speakAnswer(localRes.answer);
      } catch (err: any) {
        console.error('Error handling background voice query:', err);
      }
    },
    [responseMode, speakAnswer, stopSpeech]
  );

  // Handle Global Microphone speech command processing (entirely local & offline)
  const handleGlobalMicCommand = useCallback(
    (speechText: string) => {
      if (isGlobalSessionCancelledRef.current) return;

      const classified = classifyTranscriptionText(speechText);

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      if (globalProcessingTimeoutRef.current) {
        clearTimeout(globalProcessingTimeoutRef.current);
        globalProcessingTimeoutRef.current = null;
      }

      if (isGlobalSessionCancelledRef.current) return;

      // Ensure modal displays classified display text
      if (onGlobalTranscriptChangeRef.current && !isGlobalSessionCancelledRef.current) {
        onGlobalTranscriptChangeRef.current(classified.displayText);
      }

      // Trigger "Processing your request..." state
      if (onGlobalProcessingChange && !isGlobalSessionCancelledRef.current) {
        onGlobalProcessingChange(true);
      }
      if (onGlobalStatusChange && !isGlobalSessionCancelledRef.current) {
        onGlobalStatusChange('processing');
      }

      // Brief delay for analysis & execution
      globalProcessingTimeoutRef.current = setTimeout(async () => {
        globalProcessingTimeoutRef.current = null;

        if (isGlobalSessionCancelledRef.current) return;

        if (classified.type !== 'valid') {
          if (!isGlobalSessionCancelledRef.current) {
            voiceService.speak(classified.displayText, { force: true });
            if (onGlobalProcessingChange) {
              onGlobalProcessingChange(false);
            }
            if (onGlobalStatusChange) {
              onGlobalStatusChange('executing');
            }
            if (onGlobalMatchedCommandChange) {
              onGlobalMatchedCommandChange('');
            }
          }
          return;
        }

        const cleanText = classified.displayText;

        if (isGlobalSessionCancelledRef.current) return;

        // Helper to speak response and pass word boundary callbacks to GlobalVoiceModal
        const speakGlobalResponse = (answerText: string) => {
          currentSpeechIdRef.current++;
          const speechId = currentSpeechIdRef.current;

          if (onGlobalResponseChange && !isGlobalSessionCancelledRef.current) {
            onGlobalResponseChange(answerText);
          }
          if (onGlobalSpeakingChange && !isGlobalSessionCancelledRef.current) {
            onGlobalSpeakingChange(true);
          }
          if (onGlobalSpokenWordIndexChange && !isGlobalSessionCancelledRef.current) {
            onGlobalSpokenWordIndexChange(0);
          }

          voiceService.speak(answerText, {
            force: true,
            onStart: () => {
              if (speechId === currentSpeechIdRef.current) {
                if (onGlobalSpeakingChange && !isGlobalSessionCancelledRef.current) {
                  onGlobalSpeakingChange(true);
                }
              }
            },
            onWordBoundary: (wordIdx) => {
              if (speechId === currentSpeechIdRef.current) {
                if (onGlobalSpokenWordIndexChange && !isGlobalSessionCancelledRef.current) {
                  onGlobalSpokenWordIndexChange(wordIdx);
                }
              }
            },
            onEnd: () => {
              if (speechId === currentSpeechIdRef.current) {
                if (onGlobalSpeakingChange && !isGlobalSessionCancelledRef.current) {
                  onGlobalSpeakingChange(false);
                }
              }
            },
          });
        };

        // Process via unified offline command pipeline
        const currentUserId = currentUser?.id || 'guest';
        const cmdResult = await processUnifiedCommand(cleanText, currentUserId, responseMode, {
          onNavigateToHomePage,
          onNavigateToScanPage,
          onNavigateToDetectPage,
          onNavigateToGesturePage,
          onNavigateToSettingsPage,
          onNavigateToTimeManagementPage,
          onNavigateToCalendarPage,
          onNavigateToProductivityPage,
          onNavigateToMusicPage,
          onNavigateToVoiceAssistantPage,
          onExit,
        });

        if (onGlobalProcessingChange && !isGlobalSessionCancelledRef.current) {
          onGlobalProcessingChange(false);
        }
        if (onGlobalStatusChange && !isGlobalSessionCancelledRef.current) {
          onGlobalStatusChange('executing');
        }
        if (onGlobalMatchedCommandChange && !isGlobalSessionCancelledRef.current) {
          onGlobalMatchedCommandChange(
            cmdResult.matchedTopic ? `Offline AI: ${cmdResult.matchedTopic}` : cmdResult.feedbackMessage
          );
        }

        speakGlobalResponse(cmdResult.feedbackMessage);
      }, 500);

    },
    [
      checkAndExecuteVoiceNavigation,
      onGlobalProcessingChange,
      onGlobalStatusChange,
      onGlobalMatchedCommandChange,
      onGlobalResponseChange,
      onGlobalSpeakingChange,
      onGlobalSpokenWordIndexChange,
      responseMode,
    ]
  );

  useEffect(() => {
    handleGlobalMicCommandRef.current = handleGlobalMicCommand;
  }, [handleGlobalMicCommand]);

  // Submit Query to AI Voice Assistant Endpoint when user clicks "Ask AI", hits Enter, or clicks Suggested Question
  const handleSubmitQuery = async (queryText?: string) => {
    let textToSubmit = (queryText || inputText).trim();
    if (!textToSubmit) return;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // Support "Question" Voice Trigger prefix
    const questionTriggerRegex = /^(\s*hey\s+)?question\b[\s,:\.-]*/i;
    if (questionTriggerRegex.test(textToSubmit)) {
      const stripped = textToSubmit.replace(questionTriggerRegex, '').trim();
      if (stripped) {
        textToSubmit = stripped.charAt(0).toUpperCase() + stripped.slice(1);
      }
    }

    await handleSubmitQueryDirect(textToSubmit);
  };

  // Copy text to clipboard
  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear conversation history
  const clearHistory = () => {
    stopSpeech();
    updateActiveSessionMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        text: 'History cleared. How else can I assist you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper for formatting last message time
  const formatLastMessageTime = useCallback((isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }, []);

  // Helper for message preview in list
  const getLastMessagePreview = useCallback((session: ChatSession): string => {
    if (!session.messages || session.messages.length === 0) {
      return 'No messages yet';
    }
    const lastMsg = session.messages[session.messages.length - 1];
    const prefix = lastMsg.role === 'user' ? 'You: ' : 'AI: ';
    const text = lastMsg.text;
    return prefix + (text.length > 30 ? text.substring(0, 30) + '...' : text);
  }, []);

  // Filter sessions based on search query (title or message contents)
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      
      if (session.title.toLowerCase().includes(query)) return true;
      
      return session.messages.some((msg) => msg.text.toLowerCase().includes(query));
    });
  }, [sessions, searchQuery]);

  const samplePrompts = [
    'What is Java programming?',
    'Explain Object-Oriented Programming (OOP)',
    'What is Data Structures & Algorithms (DSA)?',
    'How does Virtual Memory work in Operating Systems?',
    'Who won the soccer world cup? (Test Out-of-Scope Refusal)',
  ];

  return (
    <div className="flex h-[calc(100vh-6.5rem)] w-full gap-4 md:gap-6 pb-2 relative overflow-hidden">
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Chat History Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 border border-slate-800 md:border-slate-800/60 p-4 flex flex-col gap-4 transform transition-all duration-300 ease-in-out md:relative md:transform-none shrink-0 rounded-2xl h-full ${
          isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 opacity-0 md:w-0 md:p-0 md:overflow-hidden md:border-transparent'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Chat History</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-600/10 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats by title/content..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl p-2.5 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-500 text-xs leading-relaxed">
              {searchQuery ? 'No matching conversations found.' : 'No conversations yet.'}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = session.id === editingSessionId;
              const lastMsgPreview = getLastMessagePreview(session);
              const lastMsgTime = formatLastMessageTime(session.updatedAt);

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isEditing) {
                      setActiveSessionId(session.id);
                    }
                  }}
                  className={`group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-850 border-cyan-500/30 text-white shadow-md'
                      : 'bg-slate-900/40 border-transparent hover:bg-slate-850/60 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center space-x-1.5 z-10 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-slate-950 border border-cyan-500 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingSessionId(null)}
                        className="p-1 text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full">
                      {/* Top row: Title and time */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm truncate pr-1 flex-1">
                          {session.title || 'New Chat'}
                        </span>
                        
                        {/* Session Actions & Date */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {deleteConfirmSessionId === session.id ? (
                            <div className="flex items-center space-x-1 shrink-0 z-10 bg-slate-850 rounded-lg p-0.5 px-1.5 border border-red-500/30" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-[9px] bg-red-600 hover:bg-red-500 text-white font-bold px-1 rounded transition-colors cursor-pointer"
                              >
                                Del
                              </button>
                              <button
                                onClick={() => setDeleteConfirmSessionId(null)}
                                className="text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-1 rounded transition-colors cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-500 group-hover:hidden font-medium">
                                {lastMsgTime}
                              </span>
                              <div className="hidden group-hover:flex items-center space-x-0.5 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartRename(session.id, session.title);
                                  }}
                                  className="p-0.5 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
                                  title="Rename Chat"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmSessionId(session.id);
                                  }}
                                  className="p-0.5 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                                  title="Delete Chat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Bottom row: Message preview */}
                      <span className="text-[11px] text-slate-500 truncate max-w-full">
                        {lastMsgPreview}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full gap-4 overflow-hidden">
        
        {/* Main Chat Display & Controls Container */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          
          {/* Mode Selector Header Bar */}
          <div className="bg-slate-950/70 border-b border-slate-800 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title={isSidebarOpen ? "Hide Chat History" : "Show Chat History"}
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="hidden sm:flex items-center space-x-2 pl-1 border-l border-slate-800">
                <div className="p-1.5 bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white block leading-none">
                    CHATBOT
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold block leading-none mt-0.5">
                    Online AI • Requires Internet
                  </span>
                </div>
              </div>
            </div>

            {/* Mode selector pills */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
              <button
                onClick={() => setResponseMode('simple')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  responseMode === 'simple'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Concise 1-2 sentence direct response"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simple Answers</span>
                <span className="sm:hidden">Simple</span>
              </button>

              <button
                onClick={() => setResponseMode('detailed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  responseMode === 'detailed'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Comprehensive, full context explanation"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detailed Answers</span>
                <span className="sm:hidden">Detailed</span>
              </button>

              <button
                onClick={() => setResponseMode('analysis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  responseMode === 'analysis'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="In-depth analytical breakdown with comparisons and key points"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Analysis Mode</span>
                <span className="sm:hidden">Analysis</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <button
                  onClick={stopSpeech}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-all shadow-sm cursor-pointer whitespace-nowrap animate-pulse"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Speaking...</span>
                </button>
              )}

              <button
                onClick={() => setIsKnowledgeModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/80 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                title="View and Manage Offline Domain Knowledge Base"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Knowledge Base</span>
              </button>

              <button
                onClick={clearHistory}
                className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            </div>
          </div>

        {/* Conversation Message List */}
        <div ref={chatContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center max-w-xl mx-auto space-y-6 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">CHATBOT</h2>
                <p className="text-xs sm:text-sm text-cyan-400 font-semibold">Online AI • Requires Internet</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ask questions, chat naturally, check your timetable, or execute app commands.
                </p>
              </div>


            </div>
          ) : (
            messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPlayingThis = playingMessageId === msg.id && isSpeaking;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`flex flex-col space-y-2 rounded-2xl p-4 shadow-lg border ${
                    isUser
                      ? 'bg-blue-600/20 border-blue-500/30 text-slate-100'
                      : 'bg-slate-850 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      {isUser ? 'You' : 'Chatbot'}
                    </span>

                    <div className="flex items-center space-x-2">
                      {msg.mode && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-cyan-300 border border-slate-700 uppercase">
                          {msg.mode === 'simple'
                            ? 'Simple'
                            : msg.mode === 'detailed'
                            ? 'Detailed'
                            : 'Analysis'}
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {/* Main Text Content */}
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* Web Search Sources / Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center text-slate-400 font-semibold gap-1">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Sources from Web Search:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-slate-700/80 transition-colors text-xs"
                          >
                            <span className="truncate max-w-[200px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Action Toolbar */}
                  {!isUser && (
                    <div className="flex items-center space-x-2 pt-2 text-xs">
                      <button
                        onClick={() =>
                          isPlayingThis ? stopSpeech() : speakAnswer(msg.text, msg.id)
                        }
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-all ${
                          isPlayingThis
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title={isPlayingThis ? 'Stop voice readout' : 'Read answer aloud'}
                      >
                        {isPlayingThis ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Speak Answer</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}

          {/* AI Thinking / Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-2xl mr-auto animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 animate-bounce" />
              </div>
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-1 text-slate-300 shadow-lg">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400">
                  <span>Chatbot</span>
                  <span className="text-[11px] text-cyan-300 font-medium animate-pulse">Responding...</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Connecting...</span>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Input Controls & Microphone Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          
          {/* Speech capture alert if any */}
          {speechError && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between">
              <span>{speechError}</span>
              <button
                onClick={() => setSpeechError(null)}
                className="text-amber-400 hover:text-amber-200 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Real-time Text / Query Input Box */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitQuery();
                  }
                }}
                placeholder="Type your message, ask a question, or enter a shortcut command..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 placeholder-slate-500 rounded-2xl p-3 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all"
              />

              {inputText && (
                <button
                  onClick={() => setInputText('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs font-bold"
                  title="Clear text"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Send Query Button */}
            <button
              onClick={() => handleSubmitQuery()}
              disabled={isLoading || !inputText.trim()}
              className="h-12 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 transition-all shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>

          {/* Active Listening & Transcribing Indicator Banners */}
          {isTranscribing && micSourceRef.current === 'local' && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300 animate-pulse">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span className="font-semibold">Transcribing your voice into text...</span>
            </div>
          )}

          {isListening && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="font-semibold">Transcribing your voice into text...</span>
              </div>
              <button
                onClick={toggleListening}
                className="text-[11px] font-extrabold uppercase hover:underline text-cyan-200 cursor-pointer"
              >
                Stop Listening
              </button>
            </div>
          )}
        </div>

      </div>
    </div>

    {/* Domain Knowledge Base Manager Modal */}
    <KnowledgeBaseManagerModal
      isOpen={isKnowledgeModalOpen}
      onClose={() => setIsKnowledgeModalOpen(false)}
    />
  </div>
  );
};
