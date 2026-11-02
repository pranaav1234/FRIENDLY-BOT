import { VoiceAssistantMode } from '../types';
import { musicService } from './musicService';
import { localAiEngine } from './localAiEngine';
import { parseAndExecuteTimeCommand, normalizeSpellingAndSpeech } from './timeCommandParser';

export interface CommandNavigationCallbacks {
  onNavigateToHomePage?: () => void;
  onNavigateToScanPage?: () => void;
  onNavigateToDetectPage?: () => void;
  onNavigateToGesturePage?: () => void;
  onNavigateToSettingsPage?: () => void;
  onNavigateToTimeManagementPage?: (tab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable') => void;
  onNavigateToCalendarPage?: () => void;
  onNavigateToProductivityPage?: () => void;
  onNavigateToMusicPage?: () => void;
  onNavigateToVoiceAssistantPage?: () => void;
  onNavigateToSummarisePage?: () => void;
  onExit?: () => void;
}

export interface UnifiedCommandResult {
  handled: boolean;
  type: 'navigation' | 'shortcut' | 'app_data' | 'knowledge' | 'music' | 'chat' | 'unhandled';
  targetSection?: string;
  feedbackMessage: string;
  topic?: string;
  matchedTopic?: string;
  confidence?: number;
  isRefusal?: boolean;
  originalQuery?: string;
}

// =========================================================================
// LIGHT CONTROL HANDLERS FOR OFFLINE CHATBOT (#turn on light & #turn off light)
// FILE LOCATION: src/services/sharedCommandEngine.ts
// =========================================================================

export function handleTurnOnLightCommand(): UnifiedCommandResult {
  // =========================================================================
  // ENTRY POINT FOR "#turn on light"
  // FILE LOCATION: src/services/sharedCommandEngine.ts -> handleTurnOnLightCommand()
  //
  // YOU CAN PLACE YOUR CUSTOM FILE OPENING CODE HERE:
  // e.g.:
  // const fs = require('fs');
  // fs.readFileSync('/path/to/your/file.txt');
  // =========================================================================

  console.log('[Offline Command Engine] #turn on light command received.');

  return {
    handled: true,
    type: 'shortcut',
    feedbackMessage: 'Light turned ON successfully.',
  };
}

export function handleTurnOffLightCommand(): UnifiedCommandResult {
  // =========================================================================
  // ENTRY POINT FOR "#turn off light"
  // FILE LOCATION: src/services/sharedCommandEngine.ts -> handleTurnOffLightCommand()
  //
  // YOU CAN PLACE YOUR CUSTOM FILE OPENING CODE HERE:
  // e.g.:
  // const fs = require('fs');
  // fs.readFileSync('/path/to/your/file.txt');
  // =========================================================================

  console.log('[Offline Command Engine] #turn off light command received.');

  return {
    handled: true,
    type: 'shortcut',
    feedbackMessage: 'Light turned OFF successfully.',
  };
}

/**
 * Central Offline Command Engine.
 * 
 * Strict processing priority order:
 * 1. Normalize & spell-correct input
 * 2. Application Commands & Navigation (Calendar, Timer, Alarm, Reminder, Stopwatch, Clock, Music, etc.)
 * 3. Application Data Queries (Timetable, classes, alarms, reminders, timer, time, date)
 * 4. Offline Conversational & Knowledge responses
 * 5. Fallback: "I don't have an answer for that in my offline knowledge." with [Ask AI Online] trigger
 */
export async function processUnifiedCommand(
  rawText: string,
  userId: string = 'guest',
  mode: VoiceAssistantMode = 'simple',
  callbacks?: CommandNavigationCallbacks
): Promise<UnifiedCommandResult> {
  const originalQuery = rawText.trim();
  if (!originalQuery) {
    return {
      handled: false,
      type: 'unhandled',
      feedbackMessage: 'Please provide a voice or text command.',
      originalQuery,
    };
  }

  // Check for hashtag light control commands (#turn on light & #turn off light)
  const lowerRaw = originalQuery.toLowerCase();
  if (lowerRaw === '#turn on light') {
    return handleTurnOnLightCommand();
  }
  if (lowerRaw === '#turn off light') {
    return handleTurnOffLightCommand();
  }

  // ----------------------------------------------------
  // STEP 1: NORMALIZE / UNDERSTAND INPUT
  // ----------------------------------------------------
  const normalized = normalizeSpellingAndSpeech(originalQuery);

  // Helper matching functions
  const isExact = (words: string[]) => words.includes(normalized);
  const startsWithAny = (prefixes: string[]) => prefixes.some((p) => normalized.startsWith(p));
  const includesAny = (phrases: string[]) => phrases.some((p) => normalized.includes(p));

  // ----------------------------------------------------
  // STEP 2: APPLICATION COMMANDS - DIRECT NAVIGATION
  // ----------------------------------------------------

  // 2.1 Calendar Navigation
  // Handles: open calendar, calendar, open calender, calender, go to calendar, go to calender, show calendar, open calendar page
  const isCalendarNav =
    isExact(['calendar', 'open calendar', 'go to calendar', 'show calendar', 'open calendar page', 'calendar page', 'view calendar']) ||
    (startsWithAny(['open ', 'go to ', 'show ', 'navigate to ']) && normalized.endsWith('calendar'));

  if (isCalendarNav) {
    callbacks?.onNavigateToCalendarPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'calendar',
      feedbackMessage: 'Opening Calendar.',
      originalQuery,
    };
  }

  // 2.2 Home Page Navigation
  const isHomeNav =
    isExact(['home', 'open home', 'go home', 'go to home', 'homepage', 'open homepage', 'show home', 'return home', 'dashboard', 'open dashboard']) ||
    (startsWithAny(['open ', 'go to ', 'show ']) && (normalized.endsWith('home') || normalized.endsWith('homepage')));

  if (isHomeNav) {
    callbacks?.onNavigateToHomePage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'home',
      feedbackMessage: 'Opening Home Page.',
      originalQuery,
    };
  }

  // 2.3 Productivity Navigation
  const isProductivityNav =
    isExact(['productivity', 'open productivity', 'open productivity dashboard', 'productivity dashboard', 'focus session', 'open focus session']) ||
    (startsWithAny(['open ', 'go to ', 'show ']) && normalized.includes('productivity'));

  if (isProductivityNav) {
    callbacks?.onNavigateToProductivityPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'productivity',
      feedbackMessage: 'Opening Productivity Dashboard.',
      originalQuery,
    };
  }

  // 2.4 Gesture Mode Navigation
  const isGestureNav =
    isExact(['gesture', 'gesture mode', 'open gesture', 'open gesture mode', 'hand gestures', 'open gestures']) ||
    (startsWithAny(['open ', 'go to ']) && normalized.includes('gesture'));

  if (isGestureNav) {
    callbacks?.onNavigateToGesturePage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'gesture',
      feedbackMessage: 'Opening Gesture Mode.',
      originalQuery,
    };
  }

  // 2.5 Face Scan & Detection Navigation
  if (isExact(['scan face', 'open scan', 'face scan', 'scan page', 'open scan page'])) {
    callbacks?.onNavigateToScanPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'scan',
      feedbackMessage: 'Opening Face Scan.',
      originalQuery,
    };
  }

  if (isExact(['detect face', 'open detect', 'face detect', 'detect page', 'open detect page'])) {
    callbacks?.onNavigateToDetectPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'detect',
      feedbackMessage: 'Opening Face Detection.',
      originalQuery,
    };
  }

  // 2.6 Settings Navigation
  if (isExact(['settings', 'open settings', 'voice settings', 'open voice settings'])) {
    callbacks?.onNavigateToSettingsPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'settings',
      feedbackMessage: 'Opening Settings.',
      originalQuery,
    };
  }

  // 2.7 Online Chatbot Navigation
  if (isExact(['chatbot', 'open chatbot', 'open online chatbot', 'gemini chatbot', 'open chat bot'])) {
    callbacks?.onNavigateToVoiceAssistantPage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'voice_assistant',
      feedbackMessage: 'Opening Online Assistant.',
      originalQuery,
    };
  }

  // 2.75 Summarise Navigation
  if (isExact(['summarise', 'summarize', 'open summarise', 'open summarize', 'document summariser', 'document summarizer', 'open document summariser'])) {
    callbacks?.onNavigateToSummarisePage?.();
    return {
      handled: true,
      type: 'navigation',
      targetSection: 'summarise',
      feedbackMessage: 'Opening Document Summariser.',
      originalQuery,
    };
  }

  // 2.8 Music Player Navigation & Controls
  const isMusicNav =
    isExact(['music', 'open music', 'play music', 'open music player', 'music player']) ||
    (startsWithAny(['open ', 'go to ']) && normalized.includes('music'));

  if (isMusicNav) {
    callbacks?.onNavigateToMusicPage?.();
    return {
      handled: true,
      type: 'music',
      targetSection: 'music',
      feedbackMessage: 'Opening Music Player.',
      originalQuery,
    };
  }

  // Music in-app playback voice command
  const musicResult = musicService.handleVoiceCommand(normalized);
  if (musicResult.handled) {
    if (musicResult.navigateToMusic && callbacks?.onNavigateToMusicPage) {
      callbacks.onNavigateToMusicPage();
    }
    return {
      handled: true,
      type: 'music',
      targetSection: 'music',
      feedbackMessage: musicResult.feedbackMessage || 'Music updated.',
      originalQuery,
    };
  }

  // ----------------------------------------------------
  // STEP 3: TIME MANAGEMENT COMMANDS & APPLICATION DATA QUERIES
  // (Timer, Alarm, Reminder, Stopwatch, Clock, Timetable, Live Time/Date)
  // ----------------------------------------------------
  const timeResult = parseAndExecuteTimeCommand(originalQuery, userId);
  if (timeResult.handled) {
    // If it's a calendar event addition, navigate to calendar
    if (timeResult.type === 'calendar') {
      callbacks?.onNavigateToCalendarPage?.();
      return {
        handled: true,
        type: 'shortcut',
        targetSection: 'calendar',
        feedbackMessage: timeResult.feedbackMessage,
        originalQuery,
      };
    }

    // If it points to a Time Management tab, navigate there
    if (timeResult.tab && callbacks?.onNavigateToTimeManagementPage) {
      callbacks.onNavigateToTimeManagementPage(timeResult.tab);
    }

    return {
      handled: true,
      type: timeResult.type === 'timetable' || timeResult.type === 'app_data' ? 'app_data' : 'shortcut',
      targetSection: 'time_management',
      feedbackMessage: timeResult.feedbackMessage,
      originalQuery,
    };
  }

  // ----------------------------------------------------
  // STEP 4: OFFLINE CONVERSATIONAL & KNOWLEDGE RESPONSES
  // ----------------------------------------------------
  const aiResponse = localAiEngine.generateResponse(originalQuery, mode, userId);

  if (aiResponse.isSupportedDomain && aiResponse.answer !== "I don't have an answer for that in my offline knowledge.") {
    return {
      handled: true,
      type: 'knowledge',
      feedbackMessage: aiResponse.answer,
      topic: aiResponse.topic,
      confidence: aiResponse.confidence,
      originalQuery,
    };
  }

  // ----------------------------------------------------
  // STEP 5: OFFLINE KNOWLEDGE FALLBACK
  // When no reliable offline answer exists, return exact standard refusal
  // ----------------------------------------------------
  return {
    handled: false,
    type: 'unhandled',
    feedbackMessage: "I don't have an answer for that in my offline knowledge.",
    topic: 'Offline AI',
    confidence: 0,
    isRefusal: true,
    originalQuery,
  };
}
