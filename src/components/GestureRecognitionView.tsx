import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Hand,
  Camera,
  CameraOff,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { HandGestureType, GestureDetectionResult } from '../types';
import { gestureRecognitionService } from '../services/gestureRecognitionService';
import { voiceService } from '../services/voiceService';

interface GestureRecognitionViewProps {
  onExit: () => void;
  onNavigateToOfflineChatbot: () => void;
  onNavigateToVoiceAssistant: () => void;
  onNavigateToSummarise: () => void;
  onNavigateToTimeManagement: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToProductivity: () => void;
  onNavigateToMusic: () => void;
  onNavigateToEmailAssistant: () => void;
}

export const GestureRecognitionView: React.FC<GestureRecognitionViewProps> = ({
  onExit,
  onNavigateToOfflineChatbot,
  onNavigateToVoiceAssistant,
  onNavigateToSummarise,
  onNavigateToTimeManagement,
  onNavigateToCalendar,
  onNavigateToProductivity,
  onNavigateToMusic,
  onNavigateToEmailAssistant,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isRecognitionStarted, setIsRecognitionStarted] = useState<boolean>(
    () => gestureRecognitionService.isRecognitionStarted
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  const [currentGestureResult, setCurrentGestureResult] = useState<GestureDetectionResult>({
    gesture: 'none',
    label: isRecognitionStarted
      ? 'Current Gesture: Position hand in front of camera...'
      : 'Current Gesture: Recognition OFF',
    confidence: 0,
  });

  // Hold timer state for 3-second gesture shortcuts
  const [shortcutHoldProgress, setShortcutHoldProgress] = useState<number>(0); // 0 to 100%
  const [shortcutHoldRemainingSec, setShortcutHoldRemainingSec] = useState<string>('3.0');
  const [activeShortcutGesture, setActiveShortcutGesture] = useState<HandGestureType>('none');
  const holdStartTimeRef = useRef<number | null>(null);
  const lastAnnouncedGestureRef = useRef<HandGestureType>('none');

  // Stability buffer refs
  const candidateGestureRef = useRef<HandGestureType>('none');
  const candidateStartTimeRef = useRef<number>(0);

  // Bind active background stream to video element
  const bindStreamToVideo = useCallback(async () => {
    try {
      setCameraError(null);
      let stream = gestureRecognitionService.activeStream;

      if (!stream) {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setCameraError(
            'Webcam API is unavailable. Browsers require a Secure Context (http://localhost:3000 or HTTPS) for camera access.'
          );
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        gestureRecognitionService.activeStream = stream;
      }

      if (videoRef.current && isRecognitionStarted) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Gesture video play notice:', playErr);
        }
      }
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setCameraError('Unable to access webcam. Please check browser camera permissions.');
    }
  }, [isRecognitionStarted]);

  // Sync isRecognitionStarted state from service
  useEffect(() => {
    const unsub = gestureRecognitionService.subscribeRecognitionStarted((started) => {
      setIsRecognitionStarted(started);
      if (!started) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setCurrentGestureResult({
          gesture: 'none',
          label: 'Current Gesture: Recognition OFF',
          confidence: 0,
        });
      } else {
        bindStreamToVideo();
      }
    });
    return unsub;
  }, [bindStreamToVideo]);

  // Initialize MediaPipe Hands instance when component mounts
  useEffect(() => {
    let isMounted = true;

    const initMediaPipeHands = async () => {
      try {
        setIsLoadingModels(true);

        // Wait for window.Hands script from index.html if needed
        let attempts = 0;
        while (!(window as any).Hands && attempts < 25) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }

        if (!(window as any).Hands) {
          throw new Error('MediaPipe Hands script unavailable.');
        }

        const hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        hands.onResults((results: any) => {
          if (!isMounted) return;

          const canvas = canvasRef.current;
          const video = videoRef.current;

          if (canvas && video && video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }

            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];

                if (!gestureRecognitionService.isRecognitionStarted) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  candidateGestureRef.current = 'none';
                  setCurrentGestureResult({
                    gesture: 'none',
                    label: 'Current Gesture: Recognition OFF',
                    confidence: 0,
                  });
                  return;
                }

                const rawAnalysis = gestureRecognitionService.analyzeGesture(landmarks);
                const now = Date.now();

                // Stability Filter: gesture candidate must be held consistently for at least 250ms
                if (rawAnalysis.gesture === candidateGestureRef.current) {
                  if (now - candidateStartTimeRef.current >= 250) {
                    setCurrentGestureResult((prev) => {
                      if (prev.gesture === rawAnalysis.gesture && prev.label === rawAnalysis.label) {
                        return prev;
                      }
                      return rawAnalysis;
                    });
                  }
                } else {
                  candidateGestureRef.current = rawAnalysis.gesture;
                  candidateStartTimeRef.current = now;
                  if (rawAnalysis.gesture === 'none') {
                    setCurrentGestureResult(rawAnalysis);
                  }
                }

                // Draw overlay skeleton using current gesture
                gestureRecognitionService.drawHandOverlay(
                  ctx,
                  landmarks,
                  canvas.width,
                  canvas.height,
                  rawAnalysis.gesture
                );
              } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                candidateGestureRef.current = 'none';
                candidateStartTimeRef.current = Date.now();
                if (gestureRecognitionService.isRecognitionStarted) {
                  setCurrentGestureResult({
                    gesture: 'none',
                    label: 'Current Gesture: No Hand Detected',
                    confidence: 0,
                  });
                }
              }
            }
          }
        });

        handsInstanceRef.current = hands;
        if (isMounted) {
          setIsLoadingModels(false);
          bindStreamToVideo();
        }
      } catch (err) {
        console.warn('MediaPipe Hands initialization notice:', err);
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    initMediaPipeHands();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bindStreamToVideo]);

  // Frame processing loop
  useEffect(() => {
    if (!isRecognitionStarted || isLoadingModels) return;

    let isRunning = true;

    const processFrame = async () => {
      if (!isRunning) return;

      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        handsInstanceRef.current
      ) {
        try {
          await handsInstanceRef.current.send({ image: videoRef.current });
        } catch (e) {
          // Ignore transient send errors
        }
      }

      if (isRunning) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    processFrame();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecognitionStarted, isLoadingModels]);

  // Handle Start Gesture Recognition click
  const handleStartGestureClick = async () => {
    gestureRecognitionService.setRecognitionStarted(true);
    setIsRecognitionStarted(true);
    voiceService.speak('Gesture Recognition started.');
    await bindStreamToVideo();
  };

  // Handle Stop Gesture Recognition click
  const handleStopGestureClick = () => {
    gestureRecognitionService.setRecognitionStarted(false);
    setIsRecognitionStarted(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    voiceService.speak('Gesture Recognition stopped.');
    setShortcutHoldProgress(0);
    setShortcutHoldRemainingSec('3.0');
    setActiveShortcutGesture('none');
    holdStartTimeRef.current = null;
  };

  // Voice announcements on gesture change
  useEffect(() => {
    if (!isRecognitionStarted) return;
    const gesture = currentGestureResult.gesture;
    if (gesture !== 'none') {
      if (gesture !== lastAnnouncedGestureRef.current) {
        lastAnnouncedGestureRef.current = gesture;
        if (gesture === 'open_palm') {
          voiceService.speak('Open Palm detected. Hold for 3 seconds for Offline Chatbot.');
        } else if (gesture === 'victory_sign') {
          voiceService.speak('Victory Sign detected. Hold for 3 seconds for Chatbot.');
        } else if (gesture === 'closed_fist') {
          voiceService.speak('Closed Fist detected. Hold for 3 seconds for Summarise.');
        } else if (gesture === 'point_up') {
          voiceService.speak('Point Up gesture detected. Hold for 3 seconds for Time Management.');
        } else if (gesture === 'point_down') {
          voiceService.speak('Point Down gesture detected. Hold for 3 seconds for Calendar.');
        } else if (gesture === 'thumbs_up') {
          voiceService.speak('Thumbs Up gesture detected. Hold for 3 seconds for Music Player.');
        } else if (gesture === 'thumbs_down') {
          voiceService.speak('Thumbs Down gesture detected. Hold for 3 seconds for Productivity.');
        } else if (gesture === 'horns_sign' || gesture === 'ok_sign' || gesture === 'love_you') {
          voiceService.speak('Rock On gesture detected. Hold for 3 seconds for Email Assistant.');
        }
      }
    } else {
      lastAnnouncedGestureRef.current = 'none';
    }
  }, [currentGestureResult.gesture, isRecognitionStarted]);

  // 3-second hold shortcut timer logic
  useEffect(() => {
    if (!isRecognitionStarted) {
      holdStartTimeRef.current = null;
      setShortcutHoldProgress(0);
      setShortcutHoldRemainingSec('3.0');
      setActiveShortcutGesture('none');
      return;
    }

    const gesture = currentGestureResult.gesture;

    if (gesture === 'none') {
      holdStartTimeRef.current = null;
      setShortcutHoldProgress(0);
      setShortcutHoldRemainingSec('3.0');
      setActiveShortcutGesture('none');
      return;
    }

    holdStartTimeRef.current = Date.now();
    setActiveShortcutGesture(gesture);
    setShortcutHoldProgress(0);
    setShortcutHoldRemainingSec('3.0');

    const timer = setInterval(() => {
      if (!holdStartTimeRef.current) return;
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
      const remaining = Math.max(0, (3000 - elapsed) / 1000).toFixed(1);

      setShortcutHoldProgress(progress);
      setShortcutHoldRemainingSec(remaining);

      if (elapsed >= 3000) {
        clearInterval(timer);
        holdStartTimeRef.current = null;
        setShortcutHoldProgress(0);
        setShortcutHoldRemainingSec('3.0');
        setActiveShortcutGesture('none');

        if (gesture === 'open_palm') {
          voiceService.speak('Navigating to Offline Chatbot.');
          onNavigateToOfflineChatbot();
        } else if (gesture === 'victory_sign') {
          voiceService.speak('Navigating to Chatbot.');
          onNavigateToVoiceAssistant();
        } else if (gesture === 'closed_fist') {
          voiceService.speak('Navigating to Summarise.');
          onNavigateToSummarise();
        } else if (gesture === 'point_up') {
          voiceService.speak('Navigating to Time Management.');
          onNavigateToTimeManagement();
        } else if (gesture === 'point_down') {
          voiceService.speak('Navigating to Calendar.');
          onNavigateToCalendar();
        } else if (gesture === 'thumbs_up') {
          voiceService.speak('Navigating to Music Player.');
          onNavigateToMusic();
        } else if (gesture === 'thumbs_down') {
          voiceService.speak('Navigating to Productivity.');
          onNavigateToProductivity();
        } else if (gesture === 'horns_sign' || gesture === 'ok_sign' || gesture === 'love_you') {
          voiceService.speak('Navigating to Email Assistant.');
          onNavigateToEmailAssistant();
        }
      }
    }, 50);

    return () => {
      clearInterval(timer);
    };
  }, [
    currentGestureResult.gesture,
    isRecognitionStarted,
    onNavigateToOfflineChatbot,
    onNavigateToVoiceAssistant,
    onNavigateToSummarise,
    onNavigateToTimeManagement,
    onNavigateToCalendar,
    onNavigateToProductivity,
    onNavigateToMusic,
    onNavigateToEmailAssistant,
  ]);

  // Label formatting helper for Current Gesture display
  const renderCurrentGestureDisplayLabel = () => {
    if (!isRecognitionStarted) {
      return 'Gesture Recognition OFF — Click "Start Gesture Recognition" to enable shortcuts';
    }

    if (currentGestureResult.gesture === 'none') {
      return currentGestureResult.label || 'Current Gesture: No Hand Detected';
    }

    const remainingNum = parseFloat(shortcutHoldRemainingSec);
    if (remainingNum <= 0.1) {
      if (currentGestureResult.gesture === 'open_palm') return 'Opening Offline Chatbot...';
      if (currentGestureResult.gesture === 'victory_sign') return 'Opening Chatbot...';
      if (currentGestureResult.gesture === 'closed_fist') return 'Opening Summarise...';
      if (currentGestureResult.gesture === 'point_up') return 'Opening Time Management...';
      if (currentGestureResult.gesture === 'point_down') return 'Opening Calendar...';
      if (currentGestureResult.gesture === 'thumbs_up') return 'Opening Music Player...';
      if (currentGestureResult.gesture === 'thumbs_down') return 'Opening Productivity...';
      if (currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign') return 'Opening Email Assistant...';
    }

    if (currentGestureResult.gesture === 'open_palm') return `Open Palm ✋ — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'victory_sign') return `Victory Sign ✌️ — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'closed_fist') return `Closed Fist ✊ — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'point_up') return `Point Up 👆 — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'point_down') return `Point Down 👇 — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'thumbs_up') return `Thumbs Up 👍 — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'thumbs_down') return `Thumbs Down 👎 — Hold for ${shortcutHoldRemainingSec}s`;
    if (currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign') return `Rock On / Horns Sign 🤘 — Hold for ${shortcutHoldRemainingSec}s`;

    return currentGestureResult.label;
  };

  return (
    <div className="w-full space-y-6 pb-2">
      {/* View Header & Action Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Hand className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gesture Mode</h1>
            <p className="text-xs text-slate-400">Detect hand gestures and trigger section navigation.</p>
          </div>
        </div>

        {/* Action Button on the right */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {!isRecognitionStarted ? (
            <button
              onClick={handleStartGestureClick}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20 whitespace-nowrap active:scale-[0.98]"
            >
              <Camera className="w-4 h-4" />
              <span>Start Gesture Recognition</span>
            </button>
          ) : (
            <button
              onClick={handleStopGestureClick}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Gesture Recognition</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout matching Facial Recognition layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 9 cols: Camera preview */}
        <div className="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
          <div className="relative aspect-[16/10] sm:aspect-video min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] max-h-[640px] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Camera Preview OFF Placeholder */}
            {!isRecognitionStarted ? (
              <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-slate-200">Camera Preview is HIDDEN</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click <span className="text-indigo-400 font-bold">Start Gesture Recognition</span> above to make the camera preview visible and enable hand gesture shortcuts.
                  </p>
                </div>
              </div>
            ) : cameraError ? (
              <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                  <CameraOff className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{cameraError}</h4>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left my-3 space-y-1 w-full">
                  <p className="font-bold text-slate-200">💡 How to grant permission in browser:</p>
                  <p>1. Click the lock 🔒 icon next to URL bar.</p>
                  <p>2. Set <strong>Camera</strong> to <strong>Allow</strong>.</p>
                  <p>3. Click <strong>Start Gesture Recognition</strong> again.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Streamed Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Canvas Overlay for Hand Skeleton */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10"
                />
              </>
            )}

            {/* Loading overlay */}
            {isLoadingModels && isRecognitionStarted && (
              <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  Initializing Hand Gesture AI Model...
                </h4>
                <p className="text-xs text-slate-400">
                  Loading MediaPipe hand landmark detectors
                </p>
              </div>
            )}

            {/* Gesture Shortcut Progress Overlay */}
            {shortcutHoldProgress > 0 && activeShortcutGesture !== 'none' && isRecognitionStarted && (
              <div
                className={`absolute top-4 left-4 z-20 backdrop-blur-md rounded-xl px-4 py-2.5 flex items-center space-x-3 shadow-2xl border animate-fade-in ${
                  activeShortcutGesture === 'open_palm'
                    ? 'bg-amber-950/90 border-amber-500/50'
                    : activeShortcutGesture === 'victory_sign'
                    ? 'bg-emerald-950/90 border-emerald-500/50'
                    : activeShortcutGesture === 'closed_fist'
                    ? 'bg-purple-950/90 border-purple-500/50'
                    : activeShortcutGesture === 'point_up'
                    ? 'bg-cyan-950/90 border-cyan-500/50'
                    : activeShortcutGesture === 'point_down'
                    ? 'bg-blue-950/90 border-blue-500/50'
                    : activeShortcutGesture === 'thumbs_up'
                    ? 'bg-indigo-950/90 border-indigo-500/50'
                    : activeShortcutGesture === 'thumbs_down'
                    ? 'bg-fuchsia-950/90 border-fuchsia-500/50'
                    : 'bg-rose-950/90 border-rose-500/50'
                }`}
              >
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="currentColor"
                      strokeWidth="3"
                      className={
                        activeShortcutGesture === 'open_palm'
                          ? 'text-amber-950'
                          : activeShortcutGesture === 'victory_sign'
                          ? 'text-emerald-950'
                          : activeShortcutGesture === 'closed_fist'
                          ? 'text-purple-950'
                          : activeShortcutGesture === 'point_up'
                          ? 'text-cyan-950'
                          : activeShortcutGesture === 'point_down'
                          ? 'text-blue-950'
                          : activeShortcutGesture === 'thumbs_up'
                          ? 'text-indigo-950'
                          : activeShortcutGesture === 'thumbs_down'
                          ? 'text-fuchsia-950'
                          : 'text-rose-950'
                      }
                      fill="transparent"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="currentColor"
                      strokeWidth="3"
                      className={`transition-all duration-100 ${
                        activeShortcutGesture === 'open_palm'
                          ? 'text-amber-400'
                          : activeShortcutGesture === 'victory_sign'
                          ? 'text-emerald-400'
                          : activeShortcutGesture === 'closed_fist'
                          ? 'text-purple-400'
                          : activeShortcutGesture === 'point_up'
                          ? 'text-cyan-400'
                          : activeShortcutGesture === 'point_down'
                          ? 'text-blue-400'
                          : activeShortcutGesture === 'thumbs_up'
                          ? 'text-indigo-400'
                          : activeShortcutGesture === 'thumbs_down'
                          ? 'text-fuchsia-400'
                          : 'text-rose-400'
                      }`}
                      fill="transparent"
                      strokeDasharray={75}
                      strokeDashoffset={75 - (75 * shortcutHoldProgress) / 100}
                    />
                  </svg>
                  <span className="text-sm absolute">
                    {activeShortcutGesture === 'open_palm' && '✋'}
                    {activeShortcutGesture === 'victory_sign' && '✌️'}
                    {activeShortcutGesture === 'closed_fist' && '✊'}
                    {activeShortcutGesture === 'point_up' && '👆'}
                    {activeShortcutGesture === 'point_down' && '👇'}
                    {activeShortcutGesture === 'thumbs_up' && '👍'}
                    {activeShortcutGesture === 'thumbs_down' && '👎'}
                    {(activeShortcutGesture === 'horns_sign' || activeShortcutGesture === 'ok_sign' || activeShortcutGesture === 'love_you') && '🤘'}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      activeShortcutGesture === 'open_palm'
                        ? 'text-amber-400'
                        : activeShortcutGesture === 'victory_sign'
                        ? 'text-emerald-400'
                        : activeShortcutGesture === 'closed_fist'
                        ? 'text-purple-400'
                        : activeShortcutGesture === 'point_up'
                        ? 'text-cyan-400'
                        : activeShortcutGesture === 'point_down'
                        ? 'text-blue-400'
                        : activeShortcutGesture === 'thumbs_up'
                        ? 'text-indigo-400'
                        : activeShortcutGesture === 'thumbs_down'
                        ? 'text-fuchsia-400'
                        : 'text-rose-400'
                    }`}
                  >
                    Hold 3s ({shortcutHoldRemainingSec}s left)
                  </span>
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                    {activeShortcutGesture === 'open_palm' && 'Opening Offline Chatbot...'}
                    {activeShortcutGesture === 'victory_sign' && 'Opening Chatbot...'}
                    {activeShortcutGesture === 'closed_fist' && 'Opening Summarise...'}
                    {activeShortcutGesture === 'point_up' && 'Opening Time Management...'}
                    {activeShortcutGesture === 'point_down' && 'Opening Calendar...'}
                    {activeShortcutGesture === 'thumbs_up' && 'Opening Music Player...'}
                    {activeShortcutGesture === 'thumbs_down' && 'Opening Productivity...'}
                    {(activeShortcutGesture === 'horns_sign' || activeShortcutGesture === 'ok_sign' || activeShortcutGesture === 'love_you') && 'Opening Email Assistant...'}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-200" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 3 cols: Live Status & Gesture Guide Side Panel */}
        <div className="lg:col-span-3 h-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col h-full">
            {/* Live Status Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <Hand className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Live Status</h3>
                </div>
              </div>
              <div className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                isRecognitionStarted
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isRecognitionStarted ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 max-h-[520px]">
              {/* Current detected gesture status block */}
              <div className="flex items-center space-x-2.5 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 transition-transform ${
                    isRecognitionStarted && currentGestureResult.gesture === 'open_palm'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'victory_sign'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'closed_fist'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'point_up'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'point_down'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'thumbs_up'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 scale-105'
                      : isRecognitionStarted && currentGestureResult.gesture === 'thumbs_down'
                      ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 scale-105'
                      : isRecognitionStarted && (currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign' || currentGestureResult.gesture === 'love_you')
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 scale-105'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {!isRecognitionStarted ? (
                    <Hand className="w-5 h-5 text-slate-500" />
                  ) : (
                    <>
                      {currentGestureResult.gesture === 'open_palm' && '✋'}
                      {currentGestureResult.gesture === 'victory_sign' && '✌️'}
                      {currentGestureResult.gesture === 'closed_fist' && '✊'}
                      {currentGestureResult.gesture === 'point_up' && '👆'}
                      {currentGestureResult.gesture === 'point_down' && '👇'}
                      {currentGestureResult.gesture === 'thumbs_up' && '👍'}
                      {currentGestureResult.gesture === 'thumbs_down' && '👎'}
                      {(currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign' || currentGestureResult.gesture === 'love_you') && '🤘'}
                      {currentGestureResult.gesture === 'none' && <Hand className="w-5 h-5 text-slate-500" />}
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Current Gesture
                  </span>
                  <h3
                    className={`text-xs font-extrabold truncate transition-colors ${
                      !isRecognitionStarted
                        ? 'text-slate-500 font-medium'
                        : currentGestureResult.gesture === 'open_palm'
                        ? 'text-amber-400'
                        : currentGestureResult.gesture === 'victory_sign'
                        ? 'text-emerald-400'
                        : currentGestureResult.gesture === 'closed_fist'
                        ? 'text-purple-400'
                        : currentGestureResult.gesture === 'point_up'
                        ? 'text-cyan-400'
                        : currentGestureResult.gesture === 'point_down'
                        ? 'text-blue-400'
                        : currentGestureResult.gesture === 'thumbs_up'
                        ? 'text-indigo-400'
                        : currentGestureResult.gesture === 'thumbs_down'
                        ? 'text-fuchsia-400'
                        : currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign' || currentGestureResult.gesture === 'love_you'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {renderCurrentGestureDisplayLabel()}
                  </h3>
                </div>
              </div>

              {/* Gesture Guide list */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gesture Guide</div>
                <div className="space-y-1.5">
                  {/* 1. Open Palm */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'open_palm'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✋</span>
                      <span className="font-semibold text-slate-200">Open Palm</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium">Hold 3s: Offline Chatbot</span>
                  </div>

                  {/* 2. Victory Sign */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'victory_sign'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✌️</span>
                      <span className="font-semibold text-slate-200">Victory Sign</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Hold 3s: Chatbot</span>
                  </div>

                  {/* 3. Closed Fist */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'closed_fist'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✊</span>
                      <span className="font-semibold text-slate-200">Closed Fist</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-medium">Hold 3s: Summarise</span>
                  </div>

                  {/* 4. Point Up */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'point_up'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👆</span>
                      <span className="font-semibold text-slate-200">Point Up</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-medium">Hold 3s: Time Management</span>
                  </div>

                  {/* 5. Point Down */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'point_down'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👇</span>
                      <span className="font-semibold text-slate-200">Point Down</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-medium">Hold 3s: Calendar</span>
                  </div>

                  {/* 6. Thumbs Up */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'thumbs_up'
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👍</span>
                      <span className="font-semibold text-slate-200">Thumbs Up</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-medium">Hold 3s: Music Player</span>
                  </div>

                  {/* 7. Thumbs Down */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && currentGestureResult.gesture === 'thumbs_down'
                        ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👎</span>
                      <span className="font-semibold text-slate-200">Thumbs Down</span>
                    </div>
                    <span className="text-[10px] text-fuchsia-400 font-medium">Hold 3s: Productivity</span>
                  </div>

                  {/* 8. Rock On / Horns Sign */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isRecognitionStarted && (currentGestureResult.gesture === 'horns_sign' || currentGestureResult.gesture === 'ok_sign' || currentGestureResult.gesture === 'love_you')
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🤘</span>
                      <span className="font-semibold text-slate-200">Rock On / Horns</span>
                    </div>
                    <span className="text-[10px] text-rose-400 font-medium">Hold 3s: Email Assistant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
