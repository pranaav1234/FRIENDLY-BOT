import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { ControlPanel } from './components/ControlPanel';
import { RegisteredList } from './components/RegisteredList';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { AlreadyRegisteredModal } from './components/AlreadyRegisteredModal';
import { DetectedPersonModal } from './components/DetectedPersonModal';
import { GlobalVoiceModal } from './components/GlobalVoiceModal';
import { GestureRecognitionView } from './components/GestureRecognitionView';
import { VoiceAssistantView } from './components/VoiceAssistantView';
import { TimeManagementView } from './components/TimeManagementView';
import { CalendarView } from './components/CalendarView';
import { ProductivityDashboardView } from './components/ProductivityDashboardView';
import { MusicPlayerView } from './components/MusicPlayerView';
import { SummariseView } from './components/SummariseView';
import { EmailAssistantView } from './components/EmailAssistantView';
import { GlobalGestureNavigation } from './components/GlobalGestureNavigation';
import { Scan, Hand, Users, Sparkles, AlertCircle, CheckCircle, Bot, Mic, RotateCcw, Clock, Calendar as CalendarIcon, Activity, Music, LogOut, UserCheck, ShieldCheck, KeyRound, FileText, Mail } from 'lucide-react';
import { CredentialAuthForm } from './components/CredentialAuthForm';
import { AccountCredentialsModal } from './components/AccountCredentialsModal';
import { NewFaceDetectedModal } from './components/NewFaceDetectedModal';
import { AuthMethodPromptModal, MissingAuthPromptType } from './components/AuthMethodPromptModal';

import { dbService } from './services/dbService';
import { voiceService } from './services/voiceService';
import { faceRecognitionService } from './services/faceRecognitionService';
import { userDataService } from './services/userDataService';
import { RegisteredPerson, DetectionResult, UserProfile } from './types';
import { calculateMatchConfidence } from './utils/poseUtils';

import confetti from 'canvas-confetti';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return userDataService.getCurrentUser();
  });

  const [people, setPeople] = useState<RegisteredPerson[]>([]);
  const [loginMethod, setLoginMethod] = useState<'facial' | 'credentials'>('facial');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [globalGestureActive, setGlobalGestureActive] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [autoStartVoiceListening, setAutoStartVoiceListening] = useState<boolean>(false);
  const [isGlobalListening, setIsGlobalListening] = useState<boolean>(false);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState<boolean>(false);
  const [globalVoiceStatus, setGlobalVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'executing'>('idle');
  const [globalRecognizedText, setGlobalRecognizedText] = useState<string>('');
  const [globalExecutingCommand, setGlobalExecutingCommand] = useState<string>('');
  const [globalResponseText, setGlobalResponseText] = useState<string>('');
  const [isGlobalSpeaking, setIsGlobalSpeaking] = useState<boolean>(false);
  const [globalSpokenWordIndex, setGlobalSpokenWordIndex] = useState<number>(-1);
  const [globalMicVolume, setGlobalMicVolume] = useState<number>(0);
  const [isOfflineBotModalOpen, setIsOfflineBotModalOpen] = useState<boolean>(false);
  const toggleGlobalListeningRef = useRef<(() => void) | null>(null);
  const cancelGlobalListeningRef = useRef<(() => void) | null>(null);
  const [onlineChatbotInitialQuery, setOnlineChatbotInitialQuery] = useState<string | null>(null);

  const handleAskAiOnline = useCallback((query: string) => {
    setIsOfflineBotModalOpen(false);
    if (cancelGlobalListeningRef.current) {
      cancelGlobalListeningRef.current();
    }
    setGlobalVoiceStatus('idle');
    setOnlineChatbotInitialQuery(query);
    setActiveSection('voice_assistant');
  }, []);

  const handleOpenOfflineBot = useCallback(() => {
    setIsOfflineBotModalOpen(true);
    // Ensure microphone is OFF by default when opening Offline Bot
    if (cancelGlobalListeningRef.current) {
      cancelGlobalListeningRef.current();
    }
    setGlobalVoiceStatus('idle');
  }, []);

  // Main Section Navigation Tab: 'home' | 'facial' | 'gesture' | 'voice_assistant' | 'summarise' | 'time_management' | 'calendar' | 'productivity' | 'music' | 'email_assistant'
  // When the app starts without an active user session, Facial Recognition is the entry point
  const [activeSection, setActiveSection] = useState<'home' | 'facial' | 'gesture' | 'voice_assistant' | 'summarise' | 'time_management' | 'calendar' | 'productivity' | 'music' | 'email_assistant'>(() => {
    const existing = userDataService.getCurrentUser();
    return existing ? 'home' : 'facial';
  });

  // Module keys for reloading individual pages
  const [facialKey, setFacialKey] = useState<number>(0);
  const [gestureKey, setGestureKey] = useState<number>(0);
  const [voiceKey, setVoiceKey] = useState<number>(0);
  const [summariseKey, setSummariseKey] = useState<number>(0);
  const [timeManagementKey, setTimeManagementKey] = useState<number>(0);
  const [calendarKey, setCalendarKey] = useState<number>(0);
  const [productivityKey, setProductivityKey] = useState<number>(0);
  const [musicKey, setMusicKey] = useState<number>(0);
  const [emailAssistantKey, setEmailAssistantKey] = useState<number>(0);

  // Camera activation & mode states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isDetectMode, setIsDetectMode] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanInstruction, setScanInstruction] = useState<string>('Position your face inside the frame.');
  const scanAlignedStartTimeRef = useRef<number | null>(null);

  const scanCollectedSamplesRef = useRef<{ descriptor: number[]; thumbnail: string }[]>([]);
  const lastSampleCaptureTimeRef = useRef<number>(0);

  const [statusText, setStatusText] = useState<string>(
    'Click "Scan Face" to begin.'
  );
  const [statusType, setStatusType] = useState<
    'idle' | 'scanning' | 'detecting' | 'error' | 'success'
  >('idle');

  // Pending face for registration
  const [pendingRegisterFace, setPendingRegisterFace] = useState<{
    thumbnail: string;
    descriptors: number[][];
  } | null>(null);

  const [alreadyRegisteredPerson, setAlreadyRegisteredPerson] = useState<{
    name: string;
    thumbnail?: string;
  } | null>(null);

  // Modal for continuous 5-second detection in Detect Mode
  const [detectedPersonModal, setDetectedPersonModal] = useState<{
    personName: string;
    isUnknown: boolean;
    thumbnail?: string;
    descriptor?: number[];
    distance?: number;
    confidenceScore?: number;
  } | null>(null);


  const [detectProgress, setDetectProgress] = useState<number>(0);
  const [detectCountdownText, setDetectCountdownText] = useState<string>('');

  // Missing authentication method prompt modal (Case A & Case B)
  const [missingAuthPrompt, setMissingAuthPrompt] = useState<{
    isOpen: boolean;
    type: MissingAuthPromptType;
    user: RegisteredPerson;
  } | null>(null);
  const [dismissedPrompts, setDismissedPrompts] = useState<Record<string, boolean>>({});
  const [isLinkingFaceForUserId, setIsLinkingFaceForUserId] = useState<string | null>(null);

  const continuousDetectFaceRef = useRef<{
    name: string;
    isUnknown: boolean;
    firstSeen: number;
    popupTriggered: boolean;
  } | null>(null);

  // Tracking state for voice debouncing
  const lastAnnouncedPersonRef = useRef<string | null>(null);
  const lastFaceSeenTimeRef = useRef<number>(0);
  const currentVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const registeredPeopleRef = useRef<HTMLDivElement | null>(null);

  // Initial setup: Load models & DB people
  useEffect(() => {
    faceRecognitionService.loadModels();
    refreshPeople();
    setVoiceEnabled(voiceService.getSettings().enabled);

    const unsubscribe = voiceService.subscribe((updatedSettings) => {
      setVoiceEnabled(updatedSettings.enabled);
    });
    return () => unsubscribe();
  }, []);

  const handleDismissGlobalVoice = useCallback(() => {
    voiceService.stop();
    if (cancelGlobalListeningRef.current) {
      cancelGlobalListeningRef.current();
    }
    setIsOfflineBotModalOpen(false);
    setGlobalVoiceStatus('idle');
    setGlobalRecognizedText('');
    setGlobalExecutingCommand('');
    setGlobalResponseText('');
    setIsGlobalProcessing(false);
    setIsGlobalSpeaking(false);
    setGlobalSpokenWordIndex(-1);
  }, []);

  // Global Voice Modal stays open after command execution until user explicitly closes it
  useEffect(() => {
    // Keep status stable without auto-dismissing
  }, []);

  const refreshPeople = () => {
    setPeople(dbService.getRegisteredPeople());
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    voiceService.saveSettings({ enabled: newState });
    if (!newState) {
      voiceService.stop();
    }
  };

  // Navigation & Automatic Module Reload Handler
  const handleSectionChange = (section: 'home' | 'facial' | 'gesture' | 'voice_assistant' | 'summarise' | 'time_management' | 'calendar' | 'productivity' | 'music' | 'email_assistant') => {
    // If not authenticated, restrict navigation exclusively to facial authentication
    if (!currentUser && section !== 'facial') {
      return;
    }

    if (activeSection === section) {
      return;
    }
    // Reset camera & scanner state
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setScanInstruction('Position your face inside the circle');
    setIsCameraActive(false);
    setIsDetectMode(false);
    setIsScanning(false);
    setPendingRegisterFace(null);
    setAlreadyRegisteredPerson(null);
    setDetectedPersonModal(null);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    lastAnnouncedPersonRef.current = null;
    lastFaceSeenTimeRef.current = 0;
    setStatusText('Click "Scan Face" to begin.');
    setStatusType('idle');

    // Increment keys to trigger automatic fresh reload/remount of target module
    if (section === 'facial') {
      setFacialKey((prev) => prev + 1);
      refreshPeople();
    }
    if (section === 'gesture') setGestureKey((prev) => prev + 1);
    if (section === 'voice_assistant') setVoiceKey((prev) => prev + 1);
    if (section === 'summarise') setSummariseKey((prev) => prev + 1);
    if (section === 'time_management') setTimeManagementKey((prev) => prev + 1);
    if (section === 'calendar') setCalendarKey((prev) => prev + 1);
    if (section === 'productivity') setProductivityKey((prev) => prev + 1);
    if (section === 'music') setMusicKey((prev) => prev + 1);
    if (section === 'email_assistant') setEmailAssistantKey((prev) => prev + 1);

    if (section !== 'voice_assistant') {
      setAutoStartVoiceListening(false);
    }

    setActiveSection(section);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleGoHome = () => {
    if (!currentUser) {
      return;
    }
    handleSectionChange('home');
  };

  // AUTHENTICATION & LOGIN HANDLER
  const handleLoginUser = (person: RegisteredPerson, isNewSignup: boolean = false) => {
    // Reset camera and detection states
    setIsScanning(false);
    setIsDetectMode(false);
    setIsCameraActive(false);
    setDetectedPersonModal(null);
    setAlreadyRegisteredPerson(null);
    continuousDetectFaceRef.current = null;
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setDetectProgress(0);
    setDetectCountdownText('');

    // Ensure the user has a proper empty namespaced storage space on first login
    if (!userDataService.isUserInitialized(person.id)) {
      userDataService.initializeUser(person.id);
    }

    const userProfile: UserProfile = {
      id: person.id,
      name: person.name,
      createdAt: person.createdAt,
      thumbnail: person.thumbnail,
      username: person.username,
    };

    // Save active session in namespaced userDataService
    userDataService.setCurrentUser(userProfile);
    userDataService.migrateLegacyDataIfNeeded(person.id);
    setCurrentUser(userProfile);
    refreshPeople();

    // Completely clear all in-memory sub-view states by incrementing their React keys
    setFacialKey((prev) => prev + 1);
    setGestureKey((prev) => prev + 1);
    setVoiceKey((prev) => prev + 1);
    setTimeManagementKey((prev) => prev + 1);
    setCalendarKey((prev) => prev + 1);
    setProductivityKey((prev) => prev + 1);
    setMusicKey((prev) => prev + 1);

    setStatusText(`🎉 Welcome, ${person.name}! Authentication verified.`);
    setStatusType('success');
    voiceService.speak(`Welcome, ${person.name}!`);

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Navigate to Home
    setActiveSection('home');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Check for missing authentication method prompts (Requirement 7 & 8)
    if (isNewSignup || dismissedPrompts[person.id]) {
      return;
    }

    const hasFace = !!(person.descriptors && person.descriptors.length > 0);
    const hasCredentials = !!(person.username && person.passwordHash);

    if (hasFace && hasCredentials) {
      // Both exist! No setup prompt
      return;
    } else if (!hasFace && hasCredentials) {
      // Case A: Missing face
      setMissingAuthPrompt({
        isOpen: true,
        type: 'missing_face',
        user: person,
      });
    } else if (hasFace && !hasCredentials) {
      // Case B: Missing credentials
      setMissingAuthPrompt({
        isOpen: true,
        type: 'missing_credentials',
        user: person,
      });
    }
  };

  // Handlers for Missing Authentication Prompt Modal
  const handleAddFacialLoginFromPrompt = () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setMissingAuthPrompt(null);
    setIsLinkingFaceForUserId(uid);
    setActiveSection('facial');
    setLoginMethod('facial');
    setStatusText('Position your face inside the frame to link Facial Recognition to your account.');
    setStatusType('scanning');
    setScanInstruction('Position your face inside the frame to link to your account.');
    handleScanClick();
  };

  const handleCredentialsSavedFromPrompt = (updatedUser: RegisteredPerson) => {
    setMissingAuthPrompt(null);
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            username: updatedUser.username,
          }
        : null
    );
    refreshPeople();
    setStatusText('Credentials linked to your account successfully!');
    setStatusType('success');
  };

  const handleDismissMissingAuthPrompt = () => {
    if (missingAuthPrompt?.user) {
      setDismissedPrompts((prev) => ({
        ...prev,
        [missingAuthPrompt.user.id]: true,
      }));
    }
    setMissingAuthPrompt(null);
  };

  // LOGOUT HANDLER
  const handleLogout = () => {
    userDataService.setCurrentUser(null);
    setCurrentUser(null);
    setMissingAuthPrompt(null);
    setIsLinkingFaceForUserId(null);

    // Completely clear in-memory sub-view states by incrementing their keys
    setFacialKey((prev) => prev + 1);
    setGestureKey((prev) => prev + 1);
    setVoiceKey((prev) => prev + 1);
    setTimeManagementKey((prev) => prev + 1);
    setCalendarKey((prev) => prev + 1);
    setProductivityKey((prev) => prev + 1);
    setMusicKey((prev) => prev + 1);

    setStatusText('You have logged out.');
    setStatusType('idle');
    voiceService.speak('You have been logged out.');
    setActiveSection('facial');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // EXIT CAMERA / RESET ACTION (Turns off camera/scanning)
  const handleExitCamera = () => {
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setIsCameraActive(false);
    setIsDetectMode(false);
    setIsScanning(false);
    setPendingRegisterFace(null);
    setAlreadyRegisteredPerson(null);
    setDetectedPersonModal(null);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    lastAnnouncedPersonRef.current = null;
    setStatusText('Camera closed.');
    setStatusType('idle');
  };

  // STOP SCAN ACTION
  const handleStopScan = () => {
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setIsCameraActive(false);
    setIsScanning(false);
    setPendingRegisterFace(null);
    setAlreadyRegisteredPerson(null);
    setDetectedPersonModal(null);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    setStatusText('Scanning stopped.');
    setStatusType('idle');
  };

  // 1. SCAN FACE ACTION
  const handleScanClick = async () => {
    scanCollectedSamplesRef.current = [];
    lastSampleCaptureTimeRef.current = 0;
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setScanInstruction('Position your face inside the frame.');
    setIsDetectMode(false);
    setIsScanning(true);
    setIsCameraActive(true);
    setPendingRegisterFace(null);
    setAlreadyRegisteredPerson(null);
    setDetectedPersonModal(null);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    lastAnnouncedPersonRef.current = null;
    setStatusText('Position your face inside the frame to begin 5-second scan.');
    setStatusType('scanning');
    voiceService.speak('Position your face inside the frame.');
  };

  // 2. SAVE NEW PERSON REGISTRATION
  const handleConfirmRegistration = (name: string) => {
    if (!pendingRegisterFace) return;

    // Save registration with generated user_ prefix ID
    const newPerson = dbService.registerPerson(name, pendingRegisterFace.thumbnail, pendingRegisterFace.descriptors);
    setStatusText(`🎉 ${name} has been registered successfully! Logging you in...`);

    // Voice announcement rule: "Name has been registered successfully."
    voiceService.announceRegistrationCompleted(name);

    setPendingRegisterFace(null);
    refreshPeople();
    setStatusType('success');

    // Automatically authenticate the newly registered user and navigate into application!
    handleLoginUser(newPerson);
  };

  const handleCancelRegistration = () => {
    setPendingRegisterFace(null);
    setStatusText('Registration cancelled.');
    setStatusType('idle');
  };

  // 3. DETECT MODE TOGGLE
  const handleToggleDetectMode = () => {
    if (isDetectMode) {
      scanAlignedStartTimeRef.current = null;
      setScanProgress(0);
      setIsCameraActive(false);
      setIsDetectMode(false);
      setIsScanning(false);
      setPendingRegisterFace(null);
      setAlreadyRegisteredPerson(null);
      setDetectedPersonModal(null);
      continuousDetectFaceRef.current = null;
      setDetectProgress(0);
      setDetectCountdownText('');
      lastAnnouncedPersonRef.current = null;
      setStatusText('Detection stopped.');
      setStatusType('idle');
    } else {
      scanAlignedStartTimeRef.current = null;
      setScanProgress(0);
      setIsScanning(false);
      setIsCameraActive(true);
      setIsDetectMode(true);
      setPendingRegisterFace(null);
      setAlreadyRegisteredPerson(null);
      setDetectedPersonModal(null);
      continuousDetectFaceRef.current = null;
      setDetectProgress(0);
      setDetectCountdownText('');
      lastAnnouncedPersonRef.current = null;
      lastFaceSeenTimeRef.current = Date.now();
      setStatusText('Real-time Detect Mode active. Scanning camera...');
      setStatusType('detecting');
    }
  };

  // 4. SHOW REGISTERED PEOPLE SCROLL HANDLER
  const handleShowRegisteredPeople = () => {
    if (registeredPeopleRef.current) {
      registeredPeopleRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle closing detected person modal and stopping detection
  const handleCloseDetectedPersonModal = () => {
    setDetectedPersonModal(null);
    setIsDetectMode(false);
    setIsCameraActive(false);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    setStatusText('Detection stopped.');
    setStatusType('idle');
  };

  // Handle direct registration from continuous detection modal for unknown face
  const handleRegisterUnknownPersonNow = () => {
    if (detectedPersonModal && detectedPersonModal.thumbnail) {
      setPendingRegisterFace({
        thumbnail: detectedPersonModal.thumbnail,
        descriptors: detectedPersonModal.descriptor ? [detectedPersonModal.descriptor] : [],
      });
      setDetectedPersonModal(null);
      setIsDetectMode(false);
      setIsCameraActive(false);
      setStatusText('Face snapshot captured from detection scan. Enter person\'s name below to save registration.');
      setStatusType('success');
    }
  };

  // Shortcut triggers from Gesture Mode
  const handleScanFromGestureShortcut = () => {
    handleSectionChange('facial');
    setTimeout(() => {
      handleScanClick();
    }, 300);
  };

  const handleDetectFromGestureShortcut = () => {
    handleSectionChange('facial');
    setTimeout(() => {
      scanAlignedStartTimeRef.current = null;
      setScanProgress(0);
      setIsScanning(false);
      setIsCameraActive(true);
      setIsDetectMode(true);
      setPendingRegisterFace(null);
      setAlreadyRegisteredPerson(null);
      setDetectedPersonModal(null);
      continuousDetectFaceRef.current = null;
      setDetectProgress(0);
      setDetectCountdownText('');
      lastAnnouncedPersonRef.current = null;
      lastFaceSeenTimeRef.current = Date.now();
      setStatusText('Real-time Detect Mode active. Scanning camera...');
      setStatusType('detecting');
    }, 300);
  };

  const handleVoiceFromGestureShortcut = () => {
    setAutoStartVoiceListening(true);
    handleSectionChange('voice_assistant');
  };

  const [timeManagementTab, setTimeManagementTab] = useState<'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable'>('clock');

  const handleTimeManagementFromGestureShortcut = () => {
    setTimeManagementTab('clock');
    setTimeManagementKey((prev) => prev + 1);
    handleSectionChange('time_management');
  };

  const handleTimeManagementWithTab = (tab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable') => {
    setTimeManagementTab(tab || 'clock');
    setTimeManagementKey((prev) => prev + 1);
    handleSectionChange('time_management');
  };

  // Reload current page without taking the user to the home page
  const handleReloadApplication = () => {
    // Reset scanner / camera states
    scanAlignedStartTimeRef.current = null;
    setScanProgress(0);
    setScanInstruction('Position your face inside the circle');
    setIsCameraActive(false);
    setIsDetectMode(false);
    setIsScanning(false);
    setPendingRegisterFace(null);
    setAlreadyRegisteredPerson(null);
    setDetectedPersonModal(null);
    continuousDetectFaceRef.current = null;
    setDetectProgress(0);
    setDetectCountdownText('');
    lastAnnouncedPersonRef.current = null;
    lastFaceSeenTimeRef.current = 0;

    if (activeSection === 'facial') {
      setStatusText('Facial Recognition reloaded.');
      setStatusType('idle');
      setFacialKey((prev) => prev + 1);
    } else if (activeSection === 'gesture') {
      setGestureKey((prev) => prev + 1);
    } else if (activeSection === 'voice_assistant') {
      setVoiceKey((prev) => prev + 1);
    } else if (activeSection === 'summarise') {
      setSummariseKey((prev) => prev + 1);
    } else if (activeSection === 'time_management') {
      setTimeManagementKey((prev) => prev + 1);
    } else if (activeSection === 'calendar') {
      setCalendarKey((prev) => prev + 1);
    } else if (activeSection === 'productivity') {
      setProductivityKey((prev) => prev + 1);
    } else if (activeSection === 'music') {
      setMusicKey((prev) => prev + 1);
    }
  };

  // CONTINUOUS DETECTION CALLBACK FROM CAMERA FEED
  const handleDetectionUpdate = useCallback(
    (result: DetectionResult, videoEl: HTMLVideoElement) => {
      currentVideoElementRef.current = videoEl;

      const now = Date.now();

      if (isScanning && !isDetectMode) {
        if (!result.faceDetected || !result.bbox || !result.descriptor) {
          setScanInstruction('Position your face inside the frame.');
          setStatusText('Face not detected. Please position your face inside the frame.');
          setStatusType('scanning');
          return;
        }

        const videoW = videoEl.videoWidth || 640;
        const videoH = videoEl.videoHeight || 480;
        const { x, y, width: bw, height: bh } = result.bbox;
        const faceCenterX = x + bw / 2;
        const faceCenterY = y + bh / 2;
        const frameCenterX = videoW / 2;
        const frameCenterY = videoH / 2;
        const dx = Math.abs(faceCenterX - frameCenterX);
        const dy = Math.abs(faceCenterY - frameCenterY);
        const faceSizeRatio = bw / videoW;

        if (faceSizeRatio < 0.12) {
          setScanInstruction('Move closer to the camera.');
          setStatusText('Move closer to the camera.');
          setStatusType('scanning');
          return;
        }

        if (faceSizeRatio > 0.75) {
          setScanInstruction('Move farther from the camera.');
          setStatusText('Move farther from the camera.');
          setStatusType('scanning');
          return;
        }

        if (dx > videoW * 0.22 || dy > videoH * 0.22) {
          setScanInstruction('Move your face to the centre.');
          setStatusText('Move your face to the centre.');
          setStatusType('scanning');
          return;
        }

        // Start 5-second continuous facial scanning
        if (scanAlignedStartTimeRef.current === null) {
          scanAlignedStartTimeRef.current = now;
        }

        const elapsed = now - scanAlignedStartTimeRef.current;
        const progress = Math.min(100, (elapsed / 5000) * 100);
        const remainingSeconds = Math.max(1, Math.ceil((5000 - elapsed) / 1000));

        setScanProgress(progress);

        // Continuously collect facial feature descriptors every 250ms
        if (now - lastSampleCaptureTimeRef.current >= 250) {
          lastSampleCaptureTimeRef.current = now;
          scanCollectedSamplesRef.current.push({
            descriptor: result.descriptor,
            thumbnail: result.faceThumbnail || '',
          });
        }

        if (elapsed < 5000) {
          setScanInstruction('Scanning your face... Please slowly move your head naturally.');
          setStatusText(`Scanning your face... ${remainingSeconds}s remaining.`);
          setStatusType('scanning');
          return;
        }

        // 5 Seconds Face Scan Completed!
        const allDescriptors = scanCollectedSamplesRef.current.map((s) => s.descriptor);
        const primaryThumbnail = scanCollectedSamplesRef.current[0]?.thumbnail || result.faceThumbnail || '';

        setScanProgress(100);
        setScanInstruction('Face scan completed successfully.');
        setIsScanning(false);
        setIsCameraActive(false);

        // Check if linking face to current authenticated user (Section 7 Case A)
        if (isLinkingFaceForUserId) {
          try {
            const updated = dbService.linkFaceToUser(
              isLinkingFaceForUserId,
              primaryThumbnail,
              allDescriptors.length > 0 ? allDescriptors : [result.descriptor]
            );
            setIsLinkingFaceForUserId(null);
            refreshPeople();
            setCurrentUser((prev) =>
              prev
                ? {
                    ...prev,
                    thumbnail: updated.thumbnail || prev.thumbnail,
                  }
                : null
            );
            setStatusText(`🎉 Face linked to ${updated.name} successfully!`);
            setStatusType('success');
            voiceService.speak('Facial recognition added to your account successfully.');
            setActiveSection('home');
          } catch (err) {
            console.error('Failed to link face:', err);
            setIsLinkingFaceForUserId(null);
          }
          return;
        }

        voiceService.speak('Face scan completed successfully.');

        if (result.isRegistered && result.personName) {
          const matched = dbService.getPersonByName(result.personName);
          if (matched) {
            handleLoginUser(matched);
            return;
          }
          setAlreadyRegisteredPerson({
            name: result.personName,
            thumbnail: primaryThumbnail,
          });
          setStatusText(`⚠️ ${result.personName} is already registered in the database.`);
          setStatusType('error');
        } else {
          setPendingRegisterFace({
            thumbnail: primaryThumbnail,
            descriptors: allDescriptors.length > 0 ? allDescriptors : [result.descriptor],
          });
        }
        return;
      }

      if (!isDetectMode) return;
      if (detectedPersonModal) return; // Pause detection updates while modal popup is displayed

      if (result.faceDetected) {
        lastFaceSeenTimeRef.current = now;

        const isReg = !!(result.isRegistered && result.personName);
        const subjectName = isReg ? result.personName! : 'Unknown';
        const isUnknown = !isReg;

        // Track continuous 5-second face recognition in Detect Mode
        if (
          continuousDetectFaceRef.current &&
          continuousDetectFaceRef.current.name === subjectName
        ) {
          const elapsed = now - continuousDetectFaceRef.current.firstSeen;
          const clampedSeconds = Math.min(5.0, elapsed / 1000);
          const currentProgress = Math.min(100, Math.round((clampedSeconds / 5.0) * 100));
          setDetectProgress(currentProgress);
          setDetectCountdownText(`${clampedSeconds.toFixed(1)}s / 5.0s`);

          if (elapsed >= 5000 && !continuousDetectFaceRef.current.popupTriggered) {
            continuousDetectFaceRef.current.popupTriggered = true;

            // If user is verified and registered, authenticate and log them in directly
            if (!isUnknown) {
              const matched = dbService.getPersonByName(subjectName);
              if (matched) {
                handleLoginUser(matched);
                return;
              }
            }

            const confScore = calculateMatchConfidence(result.distance, !isUnknown);

            // Trigger 5-second detection modal popup (for unregistered face or verification)
            setDetectedPersonModal({
              personName: subjectName,
              isUnknown,
              thumbnail: result.faceThumbnail,
              descriptor: result.descriptor,
              distance: result.distance,
              confidenceScore: confScore,
            });


            // Voice announcement
            if (isUnknown) {
              voiceService.speak('Unknown person detected.');
            } else {
              voiceService.speak(`Person detected: This is ${subjectName}.`);
            }
          }
        } else {
          // Reset tracker for new face subject
          continuousDetectFaceRef.current = {
            name: subjectName,
            isUnknown,
            firstSeen: now,
            popupTriggered: false,
          };
          setDetectProgress(0);
          setDetectCountdownText('Starting 5s scan...');
        }

        if (isReg) {
          const name = result.personName!;
          setStatusText(`Recognized: This is ${name}`);
          setStatusType('detecting');

          // Announce ONLY ONCE per detection session until person leaves camera frame
          if (lastAnnouncedPersonRef.current !== name) {
            voiceService.announceFaceRecognised(name);
            lastAnnouncedPersonRef.current = name;
          }
        } else {
          // UNKNOWN FACE - show "Unknown Person" on screen
          setStatusText('Unknown Person Detected');
          setStatusType('scanning');
          lastAnnouncedPersonRef.current = 'Unknown';
        }
      } else {
        // Reset continuous tracker when face leaves frame
        if (now - lastFaceSeenTimeRef.current > 800) {
          continuousDetectFaceRef.current = null;
          setDetectProgress(0);
          setDetectCountdownText('');
        }

        // No face detected - reset announcement tracking after 1.5s absence
        if (now - lastFaceSeenTimeRef.current > 1500) {
          lastAnnouncedPersonRef.current = null;
          setStatusText('Real-time Detect Mode active. Looking for faces...');
          setStatusType('idle');
        }
      }
    },
    [isDetectMode, isScanning]
  );

  // DELETE PERSON HANDLER
  const handleDeletePerson = (id: string, name: string) => {
    dbService.deletePerson(id);
    userDataService.purgeUserData(id);
    if (currentUser?.id === id) {
      userDataService.setCurrentUser(null);
      setCurrentUser(null);
      setActiveSection('facial');
    }
    refreshPeople();
    setStatusText(`🗑️ ${name}'s account and personal data deleted permanently.`);
    setStatusType('idle');
  };

  const handleClearAll = () => {
    people.forEach((p) => userDataService.purgeUserData(p.id));
    dbService.clearAll();
    userDataService.setCurrentUser(null);
    setCurrentUser(null);
    refreshPeople();
    setStatusText('All registered accounts and personal data permanently cleared.');
    setStatusType('idle');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Gesture Navigation background tracking */}
      <GlobalGestureNavigation
        currentSection={activeSection}
        isCameraNeededElsewhere={isCameraActive && activeSection === 'facial'}
        onNavigateSection={handleSectionChange}
        onActiveChange={setGlobalGestureActive}
        isAuthenticated={!!currentUser}
      />

      {/* Header Navigation */}
      <Header
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
        isListening={isGlobalListening}
        isProcessing={isGlobalProcessing}
        gestureActive={globalGestureActive}
        currentUser={currentUser}
        onLogout={handleLogout}
        showMic={activeSection !== 'facial' && !!currentUser}
        onToggleGlobalMic={handleOpenOfflineBot}
        onOpenAccountSettings={() => setIsAccountModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Common Home Screen */}
        {activeSection === 'home' && (
          <div className="max-w-5xl mx-auto py-8 px-4 text-center space-y-8 animate-fade-in">
            {/* Header Greeting & User Badge */}
            <div className="space-y-3">
              <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 mb-1 shadow-inner">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
                Welcome, {currentUser?.name || 'User'} !
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Your personalized AI assistant is ready. Access hands-free gestures, voice commands, time management, calendars, productivity analytics, and music.
              </p>
            </div>

            {/* 6 Application Modules Grid (Facial Recognition acts as authentication gateway and is excluded here) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {/* Card 1: Gesture Mode */}
              <button
                onClick={() => handleSectionChange('gesture')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
                    <Hand className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors">
                    Gesture Mode
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Control apps hands-free using real-time hand gestures including Open Palm, Victory Sign, and Closed Fist.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-purple-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Gesture Mode</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 2: CHATBOT — Online AI */}
              <button
                onClick={() => handleSectionChange('voice_assistant')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <span>CHATBOT</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold">Online AI</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Your intelligent online AI assistant. Ask questions, have conversations, get detailed answers, and use voice or text input.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-cyan-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Chatbot</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 3: SUMMARISE */}
              <button
                onClick={() => handleSectionChange('summarise')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-teal-400 transition-colors flex items-center gap-2">
                    <span>SUMMARISE</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700 font-semibold">Docs & Text</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Turn documents, images and text into clear, useful summaries. Upload PDFs, images, DOCX, or paste text.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-teal-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Summarise</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 3: Time Management */}
              <button
                onClick={() => handleSectionChange('time_management')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors">
                    Time Management
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Access digital clock, multiple alarms, countdown timers, stopwatch with laps, and sound reminders.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-emerald-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Time Management</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 4: Calendar */}
              <button
                onClick={() => handleSectionChange('calendar')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-5 group-hover:scale-110 transition-transform">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-orange-400 transition-colors">
                    Calendar
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Manage your personal schedule, setup recurring events, and view upcoming plans in a smart calendar.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-orange-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Calendar</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 5: Productivity Dashboard */}
              <button
                onClick={() => handleSectionChange('productivity')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-fuchsia-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-fuchsia-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-5 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-fuchsia-400 transition-colors">
                    Productivity Dashboard
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Track your personal focus and emotions in real time using private expression analysis.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-fuchsia-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Dashboard</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 6: Music Player */}
              <button
                onClick={() => handleSectionChange('music')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-110 transition-transform">
                    <Music className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-rose-400 transition-colors">
                    Music Player
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Search songs, control playback, and stream music hands-free with AI Voice commands.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-rose-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Music Player</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 7: EMAIL ASSISTANT */}
              <button
                onClick={() => handleSectionChange('email_assistant')}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-left transition-all shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <span>EMAIL ASSISTANT</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold">Online AI</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Draft, summarize, rewrite, and organize your emails with AI.
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-indigo-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Open Email Assistant</span>
                  <span>→</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Active Mode Header Tabs / Back to Home */}
        {activeSection !== 'home' && activeSection !== 'facial' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGoHome}
                disabled={isScanning || (isCameraActive && isDetectMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 ${
                  isScanning || (isCameraActive && isDetectMode)
                    ? 'bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                }`}
              >
                <span>← Home</span>
              </button>

              <button
                onClick={handleReloadApplication}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                title="Reload current page"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>

            {/* If authenticated, show the 6 application modules */}
            {currentUser && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSectionChange('gesture')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'gesture'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" />
                  <span>Gesture Mode</span>
                </button>

                <button
                  onClick={() => handleSectionChange('voice_assistant')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'voice_assistant'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Chatbot</span>
                </button>

                <button
                  onClick={() => handleSectionChange('summarise')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'summarise'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Summarise</span>
                </button>

                <button
                  onClick={() => handleSectionChange('time_management')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'time_management'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time Management</span>
                </button>

                <button
                  onClick={() => handleSectionChange('calendar')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'calendar'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => handleSectionChange('productivity')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'productivity'
                      ? 'bg-fuchsia-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Productivity</span>
                </button>

                <button
                  onClick={() => handleSectionChange('music')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'music'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Music Player</span>
                </button>

                <button
                  onClick={() => handleSectionChange('email_assistant')}
                  disabled={isScanning || (isCameraActive && isDetectMode)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isScanning || (isCameraActive && isDetectMode)
                      ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                      : activeSection === 'email_assistant'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Assistant</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 1: Authentication & Facial Recognition System */}
        {activeSection === 'facial' && (
          <div key={facialKey} className="space-y-6 animate-fade-in pb-4">
            {/* Top Switcher: Two Login Options (Obvious Choice) */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2 shadow-inner">
                  <Bot className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-xs uppercase tracking-widest font-extrabold text-cyan-400">
                  CHATBOT
                </h2>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Choose how you want to sign in to your personalized AI assistant
                </p>
              </div>

              {/* Two Login Options Toggle */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800/80 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setLoginMethod('facial')}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    loginMethod === 'facial'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scan className="w-4 h-4" />
                  <span>Facial Recognition</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExitCamera();
                    setLoginMethod('credentials');
                  }}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    loginMethod === 'credentials'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Username & Password</span>
                </button>
              </div>
            </div>

            {/* Option 1: Facial Recognition Login */}
            {loginMethod === 'facial' && (
              <div className="space-y-6 animate-fade-in">
                {/* Options Control Panel at Top of Section */}
                <ControlPanel
                  onScanClick={handleScanClick}
                  onStopScan={handleStopScan}
                  isCameraActive={isCameraActive}
                  isScanning={isScanning}
                />

                {/* Layout: Camera Feed (Primary Focus) & Registered People Compact Side Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left 9 cols: Expanded Primary Webcam Feed */}
                  <div className="lg:col-span-9">
                    <CameraFeed
                      isCameraActive={isCameraActive}
                      onExitCamera={handleExitCamera}
                      onDetectionUpdate={handleDetectionUpdate}
                      isScanning={isScanning}
                      scanProgress={scanProgress}
                      scanInstruction={scanInstruction}
                    />
                  </div>

                  {/* Right 3 cols: Compact Registered People Side Panel */}
                  <div ref={registeredPeopleRef} className="lg:col-span-3 h-full">
                    <RegisteredList
                      people={people}
                      onDeletePerson={handleDeletePerson}
                      onClearAll={handleClearAll}
                      onSelectUser={handleLoginUser}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Option 2: Username & Password Login */}
            {loginMethod === 'credentials' && (
              <div className="animate-fade-in py-2">
                <CredentialAuthForm
                  onSuccessLogin={(user, isNew) => {
                    refreshPeople();
                    handleLoginUser(user, isNew);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Section 2: Gesture Mode */}
        {activeSection === 'gesture' && (
          <div className="animate-fade-in w-full">
            <GestureRecognitionView
              key={currentUser?.id ? `${currentUser.id}_${gestureKey}` : `guest_${gestureKey}`}
              onExit={handleExitCamera}
              onNavigateToOfflineChatbot={handleOpenOfflineBot}
              onNavigateToVoiceAssistant={() => handleSectionChange('voice_assistant')}
              onNavigateToSummarise={() => handleSectionChange('summarise')}
              onNavigateToTimeManagement={() => handleSectionChange('time_management')}
              onNavigateToCalendar={() => handleSectionChange('calendar')}
              onNavigateToProductivity={() => handleSectionChange('productivity')}
              onNavigateToMusic={() => handleSectionChange('music')}
              onNavigateToEmailAssistant={() => handleSectionChange('email_assistant')}
            />
          </div>
        )}

        {/* Section 3: AI Voice Assistant */}
        <div className={activeSection === 'voice_assistant' ? 'animate-fade-in' : 'hidden'}>
          <VoiceAssistantView
            key={currentUser?.id ? `${currentUser.id}_${voiceKey}` : `guest_${voiceKey}`}
            currentUser={currentUser}
            voiceEnabled={voiceEnabled}
            onExit={handleGoHome}
            onNavigateToScanPage={handleScanFromGestureShortcut}
            onNavigateToDetectPage={handleDetectFromGestureShortcut}
            onNavigateToGesturePage={() => handleSectionChange('gesture')}
            onNavigateToTimeManagementPage={handleTimeManagementWithTab}
            onNavigateToCalendarPage={() => handleSectionChange('calendar')}
            onNavigateToProductivityPage={() => handleSectionChange('productivity')}
            onNavigateToMusicPage={() => handleSectionChange('music')}
            onNavigateToHomePage={handleGoHome}
            onNavigateToSettingsPage={() => setIsVoiceModalOpen(true)}
            onNavigateToVoiceAssistantPage={() => handleSectionChange('voice_assistant')}
            autoSubmitQuery={onlineChatbotInitialQuery}
            onClearAutoSubmitQuery={() => setOnlineChatbotInitialQuery(null)}
            onGlobalListeningChange={(isListening) => {
              setIsGlobalListening(isListening);
              if (isListening) {
                setGlobalVoiceStatus('listening');
                setGlobalRecognizedText('');
                setGlobalExecutingCommand('');
              } else {
                setGlobalVoiceStatus((prev) => {
                  if (prev === 'listening') {
                    return 'idle';
                  }
                  return prev;
                });
              }
            }}
            onGlobalProcessingChange={(isProcessing) => {
              setIsGlobalProcessing(isProcessing);
              if (isProcessing) {
                setGlobalVoiceStatus('processing');
              }
            }}
            onGlobalTranscriptChange={setGlobalRecognizedText}
            onGlobalMatchedCommandChange={setGlobalExecutingCommand}
            onGlobalResponseChange={setGlobalResponseText}
            onGlobalSpeakingChange={setIsGlobalSpeaking}
            onGlobalSpokenWordIndexChange={setGlobalSpokenWordIndex}
            onGlobalStatusChange={setGlobalVoiceStatus}
            onGlobalVolumeChange={setGlobalMicVolume}
            onRegisterToggleGlobalListeningHandler={(handler) => {
              toggleGlobalListeningRef.current = handler;
            }}
            onRegisterCancelGlobalListeningHandler={(handler) => {
              cancelGlobalListeningRef.current = handler;
            }}
            autoStartListening={autoStartVoiceListening}
          />
        </div>

        {/* Section: Summarise */}
        {activeSection === 'summarise' && (
          <div className="animate-fade-in">
            <SummariseView
              key={currentUser?.id ? `${currentUser.id}_${summariseKey}` : `guest_${summariseKey}`}
              currentUser={currentUser}
              onExit={handleGoHome}
            />
          </div>
        )}

        {/* Section 4: Time Management */}
        {activeSection === 'time_management' && (
          <div className="animate-fade-in">
            <TimeManagementView
              key={currentUser?.id ? `${currentUser.id}_${timeManagementKey}` : `guest_${timeManagementKey}`}
              currentUser={currentUser}
              onExit={handleGoHome}
              initialTab={timeManagementTab}
            />
          </div>
        )}

        {/* Section 5: Calendar Page */}
        {activeSection === 'calendar' && (
          <div className="animate-fade-in">
            <CalendarView
              key={currentUser?.id ? `${currentUser.id}_${calendarKey}` : `guest_${calendarKey}`}
              currentUser={currentUser}
              onExit={handleGoHome}
            />
          </div>
        )}

        {/* Section 6: Productivity Dashboard */}
        {activeSection === 'productivity' && (
          <div className="animate-fade-in">
            <ProductivityDashboardView
              key={currentUser?.id ? `${currentUser.id}_${productivityKey}` : `guest_${productivityKey}`}
              currentUser={currentUser}
              onExit={handleGoHome}
            />
          </div>
        )}

        {/* Section 7: Music Player */}
        {activeSection === 'music' && (
          <div className="animate-fade-in">
            <MusicPlayerView
              key={currentUser?.id ? `${currentUser.id}_${musicKey}` : `guest_${musicKey}`}
              currentUser={currentUser}
              onExit={handleGoHome}
            />
          </div>
        )}

        {/* Section 8: Email Assistant */}
        {activeSection === 'email_assistant' && (
          <div className="animate-fade-in">
            <EmailAssistantView
              key={`email_assistant_${emailAssistantKey}`}
              onExit={handleGoHome}
            />
          </div>
        )}
      </main>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Account & Security Credentials Modal */}
      <AccountCredentialsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          userDataService.setCurrentUser(updated);
          refreshPeople();
        }}
      />

      {/* Already Registered Popup Modal (Scan Face mode only) */}
      {!isDetectMode && (
        <AlreadyRegisteredModal
          isOpen={!!alreadyRegisteredPerson}
          personName={alreadyRegisteredPerson?.name || ''}
          thumbnail={alreadyRegisteredPerson?.thumbnail}
          onClose={() => setAlreadyRegisteredPerson(null)}
          onLogin={() => {
            if (alreadyRegisteredPerson) {
              const matched = dbService.getPersonByName(alreadyRegisteredPerson.name);
              if (matched) {
                handleLoginUser(matched);
              }
            }
          }}
        />
      )}

      {/* New Face Scanned Registration Modal (Section 4 & 12) */}
      <NewFaceDetectedModal
        isOpen={!!pendingRegisterFace}
        thumbnail={pendingRegisterFace?.thumbnail || ''}
        descriptors={pendingRegisterFace?.descriptors || []}
        onClose={() => {
          setPendingRegisterFace(null);
          setStatusText('Registration cancelled.');
          setStatusType('idle');
        }}
        onSuccess={(newUser) => {
          setPendingRegisterFace(null);
          setStatusText(`🎉 ${newUser.name} registered successfully!`);
          setStatusType('success');
          voiceService.speak('Account created successfully.');
          handleLoginUser(newUser, true);
        }}
      />

      {/* Missing Authentication Method Prompt Modal (Section 7) */}
      {missingAuthPrompt && currentUser && (
        <AuthMethodPromptModal
          isOpen={missingAuthPrompt.isOpen}
          type={missingAuthPrompt.type}
          currentUser={missingAuthPrompt.user}
          onAddFacialLogin={handleAddFacialLoginFromPrompt}
          onCredentialsSaved={handleCredentialsSavedFromPrompt}
          onNotNow={handleDismissMissingAuthPrompt}
        />
      )}

      {/* 5-Second Continuous Detection Modal (Detect Mode only) */}
      {isDetectMode && (
        <DetectedPersonModal
          isOpen={!!detectedPersonModal}
          personName={detectedPersonModal?.personName || ''}
          isUnknown={detectedPersonModal?.isUnknown || false}
          thumbnail={detectedPersonModal?.thumbnail}
          confidenceScore={detectedPersonModal?.confidenceScore}
          onClose={handleCloseDetectedPersonModal}
          onRegisterNow={handleRegisterUnknownPersonNow}
          onLoginUser={() => {
            if (detectedPersonModal && !detectedPersonModal.isUnknown) {
              const matched = dbService.getPersonByName(detectedPersonModal.personName);
              if (matched) {
                handleLoginUser(matched);
              }
            }
          }}
        />
      )}

      {/* Global Voice Command Modal HUD */}
      <GlobalVoiceModal
        isOpen={isOfflineBotModalOpen || globalVoiceStatus !== 'idle'}
        status={globalVoiceStatus}
        recognizedText={globalRecognizedText}
        executingCommand={globalExecutingCommand}
        volume={globalMicVolume}
        responseText={globalResponseText}
        isSpeaking={isGlobalSpeaking}
        spokenWordIndex={globalSpokenWordIndex}
        currentUser={currentUser}
        onNavigateToScanPage={handleScanFromGestureShortcut}
        onNavigateToDetectPage={handleDetectFromGestureShortcut}
        onNavigateToGesturePage={() => handleSectionChange('gesture')}
        onNavigateToTimeManagementPage={handleTimeManagementWithTab}
        onNavigateToCalendarPage={() => handleSectionChange('calendar')}
        onNavigateToProductivityPage={() => handleSectionChange('productivity')}
        onNavigateToMusicPage={() => handleSectionChange('music')}
        onNavigateToHomePage={handleGoHome}
        onNavigateToSettingsPage={() => setIsVoiceModalOpen(true)}
        onNavigateToVoiceAssistantPage={() => handleSectionChange('voice_assistant')}
        onAskAiOnline={handleAskAiOnline}
        onToggleListening={() => {
          if (toggleGlobalListeningRef.current) {
            toggleGlobalListeningRef.current();
          }
        }}
        onDismiss={handleDismissGlobalVoice}
        onStopSpeaking={() => {
          setIsGlobalSpeaking(false);
        }}
      />

    </div>
  );
}

