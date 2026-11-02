import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { gestureRecognitionService } from '../services/gestureRecognitionService';
import { Sparkles } from 'lucide-react';

interface GlobalGestureNavigationProps {
  currentSection: string;
  isCameraNeededElsewhere: boolean;
  isAuthenticated?: boolean;
  onNavigateSection: (section: any) => void;
  onOpenOfflineChatbot?: () => void;
  onActiveChange: (active: boolean) => void;
}

const AUTH_NAVIGATION_ORDER: string[] = [
  'gesture',
  'voice_assistant',
  'summarise',
  'time_management',
  'calendar',
  'productivity',
  'music',
  'email_assistant',
];

const PAGE_DISPLAY_NAMES: Record<string, string> = {
  facial: 'Facial Recognition',
  gesture: 'Gesture Mode',
  voice_assistant: 'Chatbot',
  summarise: 'Summarise',
  time_management: 'Time Management',
  calendar: 'Calendar',
  productivity: 'Productivity',
  music: 'Music Player',
  email_assistant: 'Email Assistant',
};

export const GlobalGestureNavigation: React.FC<GlobalGestureNavigationProps> = ({
  currentSection,
  isCameraNeededElsewhere,
  isAuthenticated = false,
  onNavigateSection,
  onOpenOfflineChatbot,
  onActiveChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackingHistoryRef = useRef<{ x: number; timestamp: number }[]>([]);
  const lastSwipeTimeRef = useRef<number>(0);
  const currentSectionRef = useRef<string>(currentSection);
  const gestureHoldRef = useRef<{ gesture: string; startTime: number } | null>(null);
  const lastGestureTriggerTimeRef = useRef<number>(0);

  // Sync currentSection with the ref to prevent stale closures
  useEffect(() => {
    currentSectionRef.current = currentSection;
  }, [currentSection]);
  
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [toast, setToast] = useState<{ id: number; message: string; pageName: string } | null>(null);

  const prevIsTrackingRef = useRef<boolean>(isTracking);

  // Sync isTracking status with parent Header indicator
  useEffect(() => {
    if (prevIsTrackingRef.current !== isTracking) {
      prevIsTrackingRef.current = isTracking;
      onActiveChange(isTracking);
    }
  }, [isTracking, onActiveChange]);

  // Main Background Camera & Gesture Recognition Loop
  useEffect(() => {
    if (!permissionGranted || isCameraNeededElsewhere) {
      setIsTracking(false);
      return;
    }

    let isRunning = true;
    let activeStream: MediaStream | null = null;
    let handsInstance: any = null;
    let animFrameId: number | null = null;

    const startBackgroundTracking = async () => {
      try {
        // Wait for MediaPipe script to be loaded by index.html
        let attempts = 0;
        while (!(window as any).Hands && attempts < 25) {
          if (!isRunning) return;
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }

        if (!(window as any).Hands) {
          console.warn('Global gesture: MediaPipe Hands script not available.');
          return;
        }

        // Initialize Hands analyzer
        handsInstance = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        handsInstance.onResults((results: any) => {
          if (!isRunning) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            handleHandResults(landmarks);
          } else {
            // No hands, clear tracking history to prevent stale points from connecting
            trackingHistoryRef.current = [];
          }
        });

        // Start background webcam capture (lower resolution for high performance)
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
            audio: false,
          });
        } catch (permErr) {
          console.info('Global camera tracking waiting for user camera permission.');
          setIsTracking(false);
          return;
        }

        activeStream = stream;
        gestureRecognitionService.activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Global gesture background play notice:', playErr);
          }
        }

        setIsTracking(true);

        // Frame processing loops
        const processFrame = async () => {
          if (!isRunning) return;
          if (videoRef.current && videoRef.current.readyState === 4 && handsInstance) {
            try {
              await handsInstance.send({ image: videoRef.current });
            } catch (e) {
              // Ignore temporary frame processing errors
            }
          }
          if (isRunning) {
            animFrameId = requestAnimationFrame(processFrame);
          }
        };

        processFrame();
      } catch (err) {
        console.warn('Global background camera tracking setup note:', err);
        setIsTracking(false);
      }
    };

    startBackgroundTracking();

    return () => {
      isRunning = false;
      setIsTracking(false);
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      gestureRecognitionService.activeStream = null;
    };
  }, [permissionGranted, isCameraNeededElsewhere]);

  const handleHandResults = (landmarks: any[]) => {
    if (landmarks && landmarks.length > 0) {
      // Calculate average X of all 21 hand joints for super stable centroids
      const sumX = landmarks.reduce((acc: number, lm: any) => acc + lm.x, 0);
      const currentX = sumX / landmarks.length;
      const timestamp = Date.now();

      trackingHistoryRef.current.push({ x: currentX, timestamp });

      // Clean track history window (600ms)
      const cutoff = timestamp - 600;
      trackingHistoryRef.current = trackingHistoryRef.current.filter((pt) => pt.timestamp >= cutoff);

      // Evaluate track points for swipe detection
      detectHorizontalSwipe();

      // Evaluate 3-second hold gesture shortcuts globally
      detectHoldGesture(landmarks);
    } else {
      // No hands, clear tracking history to prevent stale points from connecting
      trackingHistoryRef.current = [];
      gestureHoldRef.current = null;
    }
  };

  const detectHoldGesture = (landmarks: any[]) => {
    if (!isAuthenticated) return;
    if (!gestureRecognitionService.isRecognitionStarted) {
      gestureHoldRef.current = null;
      return;
    }
    const now = Date.now();
    if (now - lastGestureTriggerTimeRef.current < 2500) {
      return;
    }

    const res = gestureRecognitionService.analyzeGesture(landmarks);
    if (res.gesture && res.gesture !== 'none') {
      if (gestureHoldRef.current?.gesture === res.gesture) {
        const elapsed = now - gestureHoldRef.current.startTime;
        if (elapsed >= 3000) {
          lastGestureTriggerTimeRef.current = now;
          const triggeredGesture = res.gesture;
          gestureHoldRef.current = null;
          executeGestureShortcut(triggeredGesture);
        }
      } else {
        gestureHoldRef.current = { gesture: res.gesture, startTime: now };
      }
    } else {
      gestureHoldRef.current = null;
    }
  };

  const executeGestureShortcut = (gesture: string) => {
    if (gesture === 'open_palm') {
      if (onOpenOfflineChatbot) onOpenOfflineChatbot();
      setToast({ id: Date.now(), message: 'Gesture Triggered (✋)', pageName: 'Offline Chatbot' });
    } else if (gesture === 'victory_sign') {
      onNavigateSection('voice_assistant');
      setToast({ id: Date.now(), message: 'Gesture Triggered (✌️)', pageName: 'Chatbot' });
    } else if (gesture === 'closed_fist') {
      onNavigateSection('summarise');
      setToast({ id: Date.now(), message: 'Gesture Triggered (✊)', pageName: 'Summarise' });
    } else if (gesture === 'point_up') {
      onNavigateSection('time_management');
      setToast({ id: Date.now(), message: 'Gesture Triggered (👆)', pageName: 'Time Management' });
    } else if (gesture === 'point_down') {
      onNavigateSection('calendar');
      setToast({ id: Date.now(), message: 'Gesture Triggered (👇)', pageName: 'Calendar' });
    } else if (gesture === 'thumbs_up') {
      onNavigateSection('music');
      setToast({ id: Date.now(), message: 'Gesture Triggered (👍)', pageName: 'Music Player' });
    } else if (gesture === 'thumbs_down') {
      onNavigateSection('productivity');
      setToast({ id: Date.now(), message: 'Gesture Triggered (👎)', pageName: 'Productivity' });
    } else if (gesture === 'horns_sign' || gesture === 'ok_sign' || gesture === 'love_you') {
      onNavigateSection('email_assistant');
      setToast({ id: Date.now(), message: 'Gesture Triggered (🤘)', pageName: 'Email Assistant' });
    }
  };

  const detectHorizontalSwipe = () => {
    const history = trackingHistoryRef.current;
    if (history.length < 4) return;

    const now = Date.now();
    // 1.2 second cooldown between navigations to avoid multiple fires from a single swipe motion
    if (now - lastSwipeTimeRef.current < 1200) {
      return;
    }

    const latest = history[history.length - 1];

    // Find if any starting point from 100ms to 500ms ago meets the horizontal delta threshold
    for (let i = 0; i < history.length - 1; i++) {
      const start = history[i];
      const dt = latest.timestamp - start.timestamp;

      if (dt >= 100 && dt <= 500) {
        const dx = latest.x - start.x;
        const absDx = Math.abs(dx);

        // 0.18 threshold (moves 18% across camera frame)
        if (absDx >= 0.18) {
          lastSwipeTimeRef.current = now;
          trackingHistoryRef.current = []; // Reset history immediately to consume the gesture

          const swipeDir = dx < 0 ? 'move_right' : 'move_left';
          executeNavigation(swipeDir);
          break;
        }
      }
    }
  };

  const executeNavigation = (direction: 'move_right' | 'move_left') => {
    if (!isAuthenticated) return;
    const currentSec = currentSectionRef.current;

    // Handle 'home' section gracefully
    if (currentSec === 'home') {
      const nextSection = direction === 'move_right' ? 'gesture' : 'email_assistant';
      onNavigateSection(nextSection);
      setToast({
        id: Date.now(),
        message: 'Gesture Detected',
        pageName: PAGE_DISPLAY_NAMES[nextSection] || nextSection,
      });
      return;
    }

    const currentIndex = AUTH_NAVIGATION_ORDER.indexOf(currentSec);
    if (currentIndex === -1) {
      onNavigateSection('gesture');
      return;
    }

    let nextIndex = currentIndex;
    if (direction === 'move_right') {
      // Hand moved RIGHT -> Navigate to NEXT section
      nextIndex = (currentIndex + 1) % AUTH_NAVIGATION_ORDER.length;
    } else {
      // Hand moved LEFT -> Navigate to PREVIOUS section
      nextIndex = (currentIndex - 1 + AUTH_NAVIGATION_ORDER.length) % AUTH_NAVIGATION_ORDER.length;
    }

    const nextSection = AUTH_NAVIGATION_ORDER[nextIndex];
    onNavigateSection(nextSection);

    // Show non-obtrusive toast feedback
    const pageName = PAGE_DISPLAY_NAMES[nextSection] || nextSection;
    setToast({
      id: Date.now(),
      message: 'Gesture Detected',
      pageName,
    });
  };

  // Toast auto-dismissal
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {/* Silent Background Video for streaming frames */}
      <video
        ref={videoRef}
        className="hidden"
        style={{ display: 'none' }}
        muted
        playsInline
      />

      {/* Modern, Elegant Swipe Navigation Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 border border-cyan-500/30 text-slate-100 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center space-x-3 max-w-sm w-full animate-fadeIn"
          >
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl shadow-inner flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                {toast.message}
              </p>
              <p className="text-sm font-bold text-slate-100">
                Opening <span className="text-cyan-300 font-extrabold">{toast.pageName}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
