import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Activity, Focus, Moon, AlertTriangle, ChevronLeft, 
  BarChart3, PieChart, Clock, History, Trash2, CameraOff, Target, 
  Crosshair, MousePointerClick, CheckCircle2, RotateCcw, Laptop, 
  Compass, Sparkles, Sliders, Volume2, VolumeX
} from 'lucide-react';
import { faceRecognitionService, CalibrationProfile } from '../services/faceRecognitionService';
import { voiceService } from '../services/voiceService';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { UserProfile } from '../types';
import { userDataService } from '../services/userDataService';

interface ProductivitySession {
  id: string;
  userId?: string;
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

interface ProductivityDashboardViewProps {
  currentUser?: UserProfile | null;
  onExit?: () => void;
}

const COLORS = {
  focused: '#3b82f6', // blue
  distracted: '#ef4444', // red
  tired: '#f59e0b', // amber
};

const normalizeEmotions = (emotions: Record<string, number>) => {
  const focused = (emotions.focused || 0) + (emotions.neutral || 0) + (emotions.happy || 0);
  const distracted = (emotions.distracted || 0) + (emotions.sad || 0);
  const tired = (emotions.tired || 0) + (emotions.sleepy || 0);
  return { focused, distracted, tired };
};

const getStateLabel = (stateKey: string) => {
  if (stateKey === 'focused') return 'Focused';
  if (stateKey === 'distracted') return 'Distracted';
  if (stateKey === 'tired' || stateKey === 'sleepy') return 'Tired / Sleepy';
  return stateKey;
};

export const ProductivityDashboardView: React.FC<ProductivityDashboardViewProps> = ({ currentUser, onExit }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessions, setSessions] = useState<ProductivitySession[]>(() => {
    const userId = currentUser?.id || 'guest';
    return userDataService.getProductivitySessions(userId);
  });

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    setSessions(userDataService.getProductivitySessions(userId));
    const savedCal = userDataService.getCalibrationProfile(userId);
    if (savedCal) {
      setCalibrationProfile(savedCal);
      calibrationProfileRef.current = savedCal;
    }
  }, [currentUser?.id]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);
  
  const [currentEmotion, setCurrentEmotion] = useState<string>('Focused');
  
  // Real-time analysis ref for temporal state smoothing & drowsiness tracking
  const stateAnalyzerRef = useRef<{
    noFaceDuration: number;
    lookAwayDuration: number;
    eyesClosedDuration: number;
    eyesDroopingDuration: number;
    lowEarDuration: number;
    headDroopDuration: number;
    yawnDuration: number;
    slowBlinks: number[];
    longBlinks: number[];
    recentRawStates: ('focused' | 'distracted' | 'tired')[];
    lastConfirmedState: 'focused' | 'distracted' | 'tired';
  }>({
    noFaceDuration: 0,
    lookAwayDuration: 0,
    eyesClosedDuration: 0,
    eyesDroopingDuration: 0,
    lowEarDuration: 0,
    headDroopDuration: 0,
    yawnDuration: 0,
    slowBlinks: [],
    longBlinks: [],
    recentRawStates: [],
    lastConfirmedState: 'focused',
  });

  // Real-time tracking during session
  const sessionDataRef = useRef<{
    startTime: number;
    emotions: { focused: number; distracted: number; tired: number };
    lastTick: number;
  }>({
    startTime: 0,
    emotions: { focused: 0, distracted: 0, tired: 0 },
    lastTick: 0
  });
  
  const [liveEmotions, setLiveEmotions] = useState<{ focused: number; distracted: number; tired: number }>({
    focused: 0, distracted: 0, tired: 0
  });
  const [liveDuration, setLiveDuration] = useState(0);
  
  // Personal Calibration state
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; uiX: number; uiY: number }>({
    x: 0.5,
    y: 0.5,
    uiX: 50,
    uiY: 50,
  });
  const focusPointRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isGazeInRegion, setIsGazeInRegion] = useState<boolean>(true);

  const [calibrationProfile, setCalibrationProfile] = useState<CalibrationProfile | null>(null);
  const calibrationProfileRef = useRef<CalibrationProfile | null>(null);

  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const isCalibratingRef = useRef<boolean>(false);
  const [isAwaitingCalibrationPrompt, setIsAwaitingCalibrationPrompt] = useState<boolean>(false);
  const [showCalibrationCompleteNotice, setShowCalibrationCompleteNotice] = useState<boolean>(false);
  const [calibrationCountdown, setCalibrationCountdown] = useState<number>(5);
  const [calibrationSampleCount, setCalibrationSampleCount] = useState<number>(0);
  const calibrationSamplesRef = useRef<{ yaw: number; pitch: number; ear: number; roll: number; gazeH: number; gazeV: number }[]>([]);

  const [viewingSession, setViewingSession] = useState<ProductivitySession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Voice Output setting state & state change announcement tracking
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => voiceService.getSettings().enabled);
  const lastAnnouncedStateRef = useRef<'focused' | 'distracted' | 'tired' | null>(null);
  const candidateStateRef = useRef<'focused' | 'distracted' | 'tired' | null>(null);
  const candidateStateSinceRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = voiceService.subscribe((settings) => {
      setVoiceEnabled(settings.enabled);
    });
    return () => unsubscribe();
  }, []);

  const handleClearAllSessions = () => {
    setSessions([]);
    const userId = currentUser?.id || 'guest';
    userDataService.saveProductivitySessions(userId, []);
    setViewingSession(null);
    setShowClearConfirm(false);
  };

  const startLiveCalibration = () => {
    setIsAwaitingCalibrationPrompt(false);
    setIsCalibrating(true);
    isCalibratingRef.current = true;
    setShowCalibrationCompleteNotice(false);
    setCalibrationCountdown(5);
    setCalibrationSampleCount(0);
    calibrationSamplesRef.current = [];

    const startTime = Date.now();
    const durationMs = 5200; // 5.2 seconds total

    const calInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.min(5, Math.max(1, Math.ceil((5000 - elapsed) / 1000)));
      setCalibrationCountdown(remainingSec);

      if (videoRef.current) {
        const res = await faceRecognitionService.detectStudyFocus(videoRef.current, focusPointRef.current, null);
        if (res.faceDetected && res.yawRatio !== null && res.pitchRatio !== null && res.ear !== null) {
          calibrationSamplesRef.current.push({
            yaw: res.yawRatio,
            pitch: res.pitchRatio,
            ear: res.ear,
            roll: res.rollAngle || 0,
            gazeH: res.gazeHorizontal || 0,
            gazeV: res.gazeVertical || 0,
          });
          setCalibrationSampleCount(calibrationSamplesRef.current.length);
        }
      }

      if (elapsed >= durationMs) {
        clearInterval(calInterval);
        finishCalibration();
      }
    }, 180);
  };

  const finishCalibration = () => {
    const samples = calibrationSamplesRef.current;

    let avgYaw = 0.50;
    let avgPitch = 0.46; // Account for laptop top-camera downward viewing angle
    let avgEAR = 0.26;
    let avgRoll = 0;
    let avgGazeH = 0;
    let avgGazeV = 0;

    if (samples.length > 0) {
      avgYaw = samples.reduce((s, x) => s + x.yaw, 0) / samples.length;
      avgPitch = samples.reduce((s, x) => s + x.pitch, 0) / samples.length;
      avgEAR = samples.reduce((s, x) => s + x.ear, 0) / samples.length;
      avgRoll = samples.reduce((s, x) => s + x.roll, 0) / samples.length;
      avgGazeH = samples.reduce((s, x) => s + x.gazeH, 0) / samples.length;
      avgGazeV = samples.reduce((s, x) => s + x.gazeV, 0) / samples.length;
    }

    const newProfile: CalibrationProfile = {
      calibrated: true,
      targetPoint: { x: focusPointRef.current.x, y: focusPointRef.current.y },
      baselineYaw: avgYaw,
      baselinePitch: avgPitch,
      baselineEAR: avgEAR,
      baselineRoll: avgRoll,
      baselineGazeH: avgGazeH,
      baselineGazeV: avgGazeV,
      samplesCount: samples.length,
      cameraOffsetPitch: Math.round((avgPitch - 0.44) * 100) / 10,
    };

    setCalibrationProfile(newProfile);
    calibrationProfileRef.current = newProfile;
    const userId = currentUser?.id || 'guest';
    userDataService.saveCalibrationProfile(userId, newProfile);
    isCalibratingRef.current = false;
    setIsCalibrating(false);

    // Show Calibration Complete notification banner
    setShowCalibrationCompleteNotice(true);
    setTimeout(() => {
      setShowCalibrationCompleteNotice(false);
    }, 2500);

    // Reset session timer ticks & state announcement tracking
    sessionDataRef.current.startTime = Date.now();
    sessionDataRef.current.lastTick = Date.now();
    lastAnnouncedStateRef.current = 'focused';
    candidateStateRef.current = null;
    candidateStateSinceRef.current = 0;
  };

  useEffect(() => {
    const userId = currentUser?.id || 'guest';
    userDataService.saveProductivitySessions(userId, sessions);
  }, [sessions, currentUser?.id]);

  const startAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      
      sessionDataRef.current = {
        startTime: Date.now(),
        emotions: { focused: 0, distracted: 0, tired: 0 },
        lastTick: Date.now()
      };

      stateAnalyzerRef.current = {
        noFaceDuration: 0,
        lookAwayDuration: 0,
        eyesClosedDuration: 0,
        eyesDroopingDuration: 0,
        lowEarDuration: 0,
        headDroopDuration: 0,
        yawnDuration: 0,
        slowBlinks: [],
        longBlinks: [],
        recentRawStates: [],
        lastConfirmedState: 'focused',
      };
      
      setLiveEmotions(sessionDataRef.current.emotions);
      setLiveDuration(0);
      setIsAnalyzing(true);
      setSessionActive(true);
      setCurrentEmotion('focused');
      
      // Wait for user to click "Start Calibration (5s)"
      setIsAwaitingCalibrationPrompt(true);
      
      analysisIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;

        // Strict Gate: Never run or accumulate productivity analysis before calibration finishes
        if (isAwaitingCalibrationPrompt || isCalibratingRef.current || !calibrationProfileRef.current?.calibrated) {
          sessionDataRef.current.lastTick = Date.now();
          return;
        }
        
        const res = await faceRecognitionService.detectStudyFocus(
          videoRef.current, 
          focusPointRef.current,
          calibrationProfileRef.current
        );
        setIsGazeInRegion(res.isWithinFocusRegion);

        const now = Date.now();
        const delta = Math.min(1.0, (now - sessionDataRef.current.lastTick) / 1000);
        sessionDataRef.current.lastTick = now;

        const analyzer = stateAnalyzerRef.current;
        const refEAR = calibrationProfileRef.current?.baselineEAR || 0.26;

        if (!res.faceDetected) {
          analyzer.noFaceDuration += delta;
          analyzer.lookAwayDuration = 0;
          analyzer.eyesClosedDuration = 0;
          analyzer.eyesDroopingDuration = 0;
          analyzer.lowEarDuration = 0;
          analyzer.headDroopDuration = 0;
          analyzer.yawnDuration = 0;
        } else {
          analyzer.noFaceDuration = 0;

          // 1. Distraction / Look-Away check
          const isLookingAway = res.isLookAway || !res.isWithinFocusRegion;

          if (isLookingAway) {
            analyzer.lookAwayDuration += delta;
          } else {
            analyzer.lookAwayDuration = Math.max(0, analyzer.lookAwayDuration - delta * 1.5);
          }

          // Dynamic thresholds relative to calibrated baseline EAR
          const closedEarThreshold = Math.min(0.19, refEAR * 0.68);
          const droopingEarThreshold = Math.min(0.23, refEAR * 0.82);
          const fatigueEarThreshold = Math.min(0.21, refEAR * 0.78);

          const isClosed = res.isClosed || (res.ear !== null && res.ear < closedEarThreshold);
          const isDrooping = res.isDrooping || (res.ear !== null && res.ear >= closedEarThreshold && res.ear < droopingEarThreshold);
          const isLowEar = res.ear !== null && res.ear < fatigueEarThreshold;

          // Rule 1: Closed eyes duration & slow/long blink tracking
          if (isClosed) {
            analyzer.eyesClosedDuration += delta;
          } else {
            if (analyzer.eyesClosedDuration >= 0.35 && analyzer.eyesClosedDuration < 0.75) {
              analyzer.slowBlinks.push(now);
            } else if (analyzer.eyesClosedDuration >= 0.75) {
              analyzer.longBlinks.push(now);
            }
            analyzer.eyesClosedDuration = 0;
          }

          // Rule 2: Droopy eyelids duration
          if (isDrooping) {
            analyzer.eyesDroopingDuration += delta;
          } else {
            analyzer.eyesDroopingDuration = Math.max(0, analyzer.eyesDroopingDuration - delta * 1.2);
          }

          // Rule 3: Eye Aspect Ratio (EAR) remains below fatigue threshold
          if (isLowEar) {
            analyzer.lowEarDuration += delta;
          } else {
            analyzer.lowEarDuration = Math.max(0, analyzer.lowEarDuration - delta * 1.2);
          }

          // Rule 6: Head nodding or drooping detection
          const baselinePitch = calibrationProfileRef.current?.baselinePitch || 0.46;
          const baselineRoll = calibrationProfileRef.current?.baselineRoll || 0;
          const isHeadDrooping = (res.pitchRatio !== null && (res.pitchRatio - baselinePitch > 0.08 || res.pitchRatio > 0.56)) ||
                                 (res.rollAngle !== null && Math.abs(res.rollAngle - baselineRoll) > 22);
          if (isHeadDrooping) {
            analyzer.headDroopDuration += delta;
          } else {
            analyzer.headDroopDuration = Math.max(0, analyzer.headDroopDuration - delta * 1.2);
          }

          // Yawning
          const isYawning = res.mar !== null && res.mar > 0.52;
          if (isYawning) {
            analyzer.yawnDuration += delta;
          } else {
            analyzer.yawnDuration = Math.max(0, analyzer.yawnDuration - delta * 1.5);
          }

          // Keep slow and long blinks in last 12s
          analyzer.slowBlinks = analyzer.slowBlinks.filter(t => now - t <= 12000);
          analyzer.longBlinks = analyzer.longBlinks.filter(t => now - t <= 12000);
        }

        // --- TIRED / SLEEPY DETECTION RULES (HIGHEST PRIORITY) ---
        const isTiredByRules =
          analyzer.eyesClosedDuration >= 1.5 ||             // Rule 1: Eyes completely closed > 1.5s
          analyzer.eyesDroopingDuration >= 1.5 ||           // Rule 2: Droopy eyelids for prolonged duration
          analyzer.lowEarDuration >= 1.5 ||                 // Rule 3: EAR below fatigue threshold
          analyzer.slowBlinks.length >= 2 ||                // Rule 4: Consecutive slow blinks
          analyzer.longBlinks.length >= 1 ||                // Rule 5: Frequent long blinks
          analyzer.headDroopDuration >= 0.8 ||              // Rule 6: Head nodding or drooping
          analyzer.yawnDuration >= 0.8;                      // Yawning / fatigue

        let rawState: 'focused' | 'distracted' | 'tired' = 'focused';

        if (isTiredByRules) {
          rawState = 'tired';
        } else if (analyzer.noFaceDuration >= 0.6 || analyzer.lookAwayDuration >= 0.6) {
          rawState = 'distracted';
        } else {
          rawState = 'focused';
        }

        // --- HIGHEST PRIORITY CLASSIFICATION & IMMEDIATE OVERRIDE ---
        // If eyes are closed, mostly closed, or tired rules are triggered,
        // classify as Tired / Sleepy immediately without smoothing delay,
        // regardless of whether previous state was Focused or Distracted.
        let confirmedState = analyzer.lastConfirmedState;

        if (rawState === 'tired') {
          confirmedState = 'tired';
          analyzer.recentRawStates = ['tired', 'tired', 'tired'];
        } else {
          analyzer.recentRawStates.push(rawState);
          if (analyzer.recentRawStates.length > 3) {
            analyzer.recentRawStates.shift();
          }

          const counts: Record<string, number> = { focused: 0, distracted: 0, tired: 0 };
          analyzer.recentRawStates.forEach(s => counts[s]++);

          if (counts[rawState] >= 2) {
            confirmedState = rawState;
          }
        }

        analyzer.lastConfirmedState = confirmedState;
        setCurrentEmotion(confirmedState);

        // --- VOICE ANNOUNCEMENT FOR STATE CHANGES ---
        if (confirmedState !== lastAnnouncedStateRef.current) {
          if (confirmedState !== candidateStateRef.current) {
            candidateStateRef.current = confirmedState;
            candidateStateSinceRef.current = now;
          } else if (now - candidateStateSinceRef.current >= 600) {
            // State has remained stable for >= 0.6s (debounce temporary noise)
            lastAnnouncedStateRef.current = confirmedState;
            candidateStateRef.current = null;
            candidateStateSinceRef.current = 0;

            let announceMsg = '';
            if (confirmedState === 'focused') {
              announceMsg = 'You are now focused.';
            } else if (confirmedState === 'distracted') {
              announceMsg = 'You are now distracted. Please refocus on your work.';
            } else if (confirmedState === 'tired') {
              announceMsg = 'You appear tired or sleepy. Consider taking a short break.';
            }

            if (announceMsg) {
              voiceService.speak(announceMsg);
            }
          }
        } else {
          candidateStateRef.current = null;
          candidateStateSinceRef.current = 0;
        }

        if (sessionDataRef.current.emotions[confirmedState] !== undefined) {
          sessionDataRef.current.emotions[confirmedState] += delta;
        }

        setLiveEmotions({ ...sessionDataRef.current.emotions });
        setLiveDuration(Math.floor((now - sessionDataRef.current.startTime) / 1000));
        
      }, 350); // Analyze every 350ms
      
    } catch (err) {
      console.error("Failed to start camera", err);
      alert("Failed to access camera for analysis.");
    }
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    setIsAwaitingCalibrationPrompt(false);
    setIsCalibrating(false);
    isCalibratingRef.current = false;
    lastAnnouncedStateRef.current = null;
    candidateStateRef.current = null;
    candidateStateSinceRef.current = 0;
    
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Save session
    const totalDuration = liveDuration;
    if (totalDuration > 5) { // Only save if > 5 seconds
      const e = sessionDataRef.current.emotions;
      const score = Math.min(100, Math.round(((e.focused + (e.tired * 0.3)) / Math.max(1, totalDuration)) * 100));
      
      const newSession: ProductivitySession = {
        id: 'sess_' + Date.now(),
        userId: currentUser?.id || 'guest',
        date: new Date().toISOString(),
        duration: totalDuration,
        emotions: {
          focused: Math.round(e.focused),
          distracted: Math.round(e.distracted),
          tired: Math.round(e.tired),
        },
        score
      };
      
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      const userId = currentUser?.id || 'guest';
      userDataService.saveProductivitySessions(userId, updatedSessions);
      setViewingSession(newSession);
    }
    setSessionActive(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };
  
  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };
  
  const getChartData = (session: ProductivitySession) => {
    const norm = normalizeEmotions(session.emotions);
    return [
      { name: 'Focused', value: Math.round(norm.focused), fill: COLORS.focused },
      { name: 'Distracted', value: Math.round(norm.distracted), fill: COLORS.distracted },
      { name: 'Tired / Sleepy', value: Math.round(norm.tired), fill: COLORS.tired },
    ];
  };

  const renderDashboard = (session: ProductivitySession) => {
    const data = getChartData(session);
    const norm = normalizeEmotions(session.emotions);
    const focusPct = Math.round((norm.focused / Math.max(1, session.duration)) * 100) || 0;
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Session Dashboard</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => deleteSession(e, session.id)}
              className="text-xs px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button 
              onClick={() => setViewingSession(null)}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to History</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-slate-400 text-xs mb-1">Duration</span>
            <span className="text-xl font-bold text-white">{formatDuration(session.duration)}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-slate-400 text-xs mb-1">Productivity Score</span>
            <span className={`text-xl font-bold ${session.score >= 70 ? 'text-emerald-400' : session.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
              {session.score}/100
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-slate-400 text-xs mb-1">Focus Time</span>
            <span className="text-xl font-bold text-blue-400">{focusPct}%</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-slate-400 text-xs mb-1">Distractions</span>
            <span className="text-xl font-bold text-rose-400">{formatDuration(norm.distracted)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              <span>Study Focus State Distribution</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${formatDuration(value)}`, 'Duration']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {data.map(d => (
                <div key={d.name} className="flex items-center space-x-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }}></div>
                  <span className="text-slate-300 font-medium">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>Time in State</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium italic">Hover state for total time</span>
              </div>
              
              {/* Interactive State Cards with Hover Tooltips */}
              <div className="space-y-3">
                {[
                  { key: 'focused', name: 'Focused', value: norm.focused, color: COLORS.focused },
                  { key: 'distracted', name: 'Distracted', value: norm.distracted, color: COLORS.distracted },
                  { key: 'tired', name: 'Tired / Sleepy', value: norm.tired, color: COLORS.tired },
                ].map((st) => {
                  const pct = Math.round((st.value / Math.max(1, session.duration)) * 100);
                  const formattedStr = `${st.name}: ${formatDuration(st.value)}`;
                  return (
                    <div 
                      key={st.key}
                      className="group relative bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 p-3 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      {/* Animated Hover Tooltip Popup */}
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 rounded-lg shadow-2xl text-xs font-bold font-mono flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: st.color }}></span>
                        <span>{formattedStr}</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                      </div>

                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="font-bold text-slate-200 flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: st.color }}></span>
                          <span>{st.name}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-400">{formatDuration(st.value)} ({pct}%)</span>
                      </div>

                      <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%`, backgroundColor: st.color }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-28 mt-4 pt-3 border-t border-slate-800/80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={95} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => [`${formatDuration(value)}`, `${name}`]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Productivity Dashboard</h1>
            <p className="text-xs text-slate-400">Real-time study attention, focus, and fatigue analytics</p>
          </div>
        </div>
        {!viewingSession && (
          <div className="flex items-center space-x-3">
            {!isAnalyzing ? (
              <button
                onClick={startAnalysis}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20 whitespace-nowrap active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Analysis</span>
              </button>
            ) : (
              <button
                onClick={stopAnalysis}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Analysis</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!viewingSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Area: Camera / Active Session */}
          <div className="lg:col-span-9 space-y-6">
            <div className="relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl h-full">
              <div 
                className="relative aspect-[16/10] sm:aspect-video min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] max-h-[640px] w-full bg-slate-950 flex items-center justify-center overflow-hidden cursor-default"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isAnalyzing ? 'opacity-0' : 'opacity-100 transform -scale-x-100'}`}
                />
                
                {!isAnalyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-md mx-auto z-20">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                      <CameraOff className="w-6 h-6 text-slate-500" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Camera is Currently Off</h3>
                    <p className="text-xs text-slate-400 mt-1">Click Start Analysis to begin tracking your study focus.</p>
                  </div>
                )}

                {/* Step 1: Pre-Calibration Prompt Overlay */}
                {isAnalyzing && isAwaitingCalibrationPrompt && !isCalibrating && (
                  <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-4 shadow-xl">
                      <Laptop className="w-7 h-7 text-purple-400" />
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white max-w-md">
                      Before analysis begins, please calibrate your gaze by looking naturally at your study area.
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md">
                      Compensating for the top-center laptop camera position, screen viewing angle, and head pose.
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startLiveCalibration();
                      }}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xl shadow-purple-600/30 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Start Calibration (5s)</span>
                    </button>
                  </div>
                )}

                {/* Step 2: 5-Second Calibration Countdown Overlay */}
                {isAnalyzing && isCalibrating && (
                  <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-400/80 flex items-center justify-center text-purple-300 mb-4 relative">
                      <span className="text-2xl font-black font-mono animate-pulse">{calibrationCountdown}s</span>
                      <div className="absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-30"></div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2 max-w-lg">
                      <Laptop className="w-5 h-5 text-purple-400 shrink-0" />
                      <span>Please look naturally at your study area for 5 seconds while calibration is performed.</span>
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md">
                      Compensating for the top-center laptop camera position, screen viewing angle, and head pose.
                    </p>

                    {/* Progress indicator & sample counter */}
                    <div className="w-full max-w-xs bg-slate-800/80 h-2 rounded-full mt-5 overflow-hidden border border-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(10, (calibrationSampleCount / 25) * 100))}%` }}
                      ></div>
                    </div>

                    <span className="text-[11px] font-mono font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      <span>Captured {calibrationSampleCount} facial & gaze samples</span>
                    </span>
                  </div>
                )}

                {/* Calibration Complete Confirmation Banner */}
                {isAnalyzing && !isCalibrating && showCalibrationCompleteNotice && (
                  <div className="absolute top-4 left-4 right-4 z-40 bg-emerald-950/95 backdrop-blur border border-emerald-500/60 p-3.5 rounded-xl shadow-2xl flex items-center justify-center space-x-2 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
                    <span className="text-xs sm:text-sm font-bold text-white">✅ Calibration Complete – Starting Productivity Analysis...</span>
                  </div>
                )}

                {/* Active Session Calibrated Header & Controls */}
                {isAnalyzing && !isCalibrating && !isAwaitingCalibrationPrompt && (
                  <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs text-slate-200">
                      <span className={`w-2.5 h-2.5 rounded-full ${isGazeInRegion ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
                      
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                        <Laptop className="w-3.5 h-3.5 text-purple-400" />
                        <span>Top Camera Calibrated:</span>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isGazeInRegion 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isGazeInRegion ? 'Gaze Inside Focus Area' : 'Gaze Outside Focus Area'}
                      </span>
                    </div>

                    <div className="pointer-events-auto flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          voiceService.saveSettings({ enabled: !voiceEnabled });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 cursor-pointer shadow-xl ${
                          voiceEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:bg-slate-800'
                        }`}
                        title={voiceEnabled ? 'Voice Announcements Enabled (Click to Mute)' : 'Voice Announcements Muted (Click to Enable)'}
                      >
                        {voiceEnabled ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>Voice ON</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                            <span>Voice Muted</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startLiveCalibration();
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 hover:from-purple-800 hover:to-indigo-800 text-purple-100 border border-purple-500/50 rounded-xl text-xs font-bold shadow-xl transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
                        <span>Recalibrate (5s)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Focus Target Marker & 30% Focus Region Ring */}
                {isAnalyzing && (
                  <div 
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 transition-all duration-300 ease-out"
                    style={{ left: `${focusPoint.uiX}%`, top: `${focusPoint.uiY}%` }}
                  >
                    {/* 30% Acceptable Focus Region Overlay Circle */}
                    <div 
                      className={`w-36 h-36 -translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 rounded-full border-2 transition-all duration-300 ${
                        isCalibrating
                          ? 'border-purple-400/80 bg-purple-500/15 animate-pulse'
                          : isGazeInRegion 
                            ? 'border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_25px_rgba(52,211,153,0.35)]' 
                            : 'border-rose-400/80 bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
                      }`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900/90 text-slate-200 border border-slate-700 whitespace-nowrap shadow-md">
                        30% Focus Region
                      </span>
                    </div>

                    {/* Target Reticle Icon */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-purple-300 bg-purple-600/40 flex items-center justify-center shadow-lg animate-ping absolute inset-0 opacity-50"></div>
                      <div className="w-9 h-9 rounded-full border-2 border-white bg-purple-600/70 flex items-center justify-center shadow-2xl relative z-10 backdrop-blur-sm">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur border border-slate-800/80 p-3.5 sm:p-4 rounded-xl flex flex-col z-20 shadow-2xl max-w-lg sm:max-w-none mx-auto animate-fade-in">
                    {/* Top Row: Current State & Total Duration */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                          currentEmotion === 'focused' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          currentEmotion === 'tired' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          currentEmotion === 'distracted' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {currentEmotion === 'focused' ? <Focus className="w-5 h-5 animate-pulse text-blue-400" /> :
                           currentEmotion === 'tired' ? <Moon className="w-5 h-5 text-amber-400" /> :
                           currentEmotion === 'distracted' ? <AlertTriangle className="w-5 h-5 animate-bounce text-rose-400" /> :
                           <Activity className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Current State</p>
                          <p className="text-sm font-bold text-slate-100">{getStateLabel(currentEmotion)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">{formatDuration(liveDuration)}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Real-time Stats Grid for 3 Study States */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {(['focused', 'distracted', 'tired'] as const).map((stKey) => {
                        const color = COLORS[stKey];
                        const duration = liveEmotions[stKey] || 0;
                        const label = getStateLabel(stKey);
                        const formattedStr = `${label}: ${formatDuration(duration)}`;
                        return (
                          <div 
                            key={stKey} 
                            className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer"
                          >
                            {/* Animated Hover Tooltip Popup */}
                            <div className="absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 rounded-lg shadow-2xl text-xs font-bold font-mono flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></span>
                              <span>{formattedStr}</span>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                            </div>

                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5 truncate max-w-full">
                              {label}
                            </span>
                            <span className="text-xs font-bold font-mono" style={{ color }}>
                              {formatDuration(duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* History Sidebar */}
          <div className="lg:col-span-3 h-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Session History</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {sessions.length}
                      </span>
                    </h3>
                  </div>
                </div>

                {sessions.length > 0 && (
                  showClearConfirm ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleClearAllSessions}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold transition-colors shadow cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors border border-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition-colors font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  )
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 max-h-[520px]">
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No previous study sessions found.</p>
                ) : (
                  sessions.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => setViewingSession(session)}
                      className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-purple-400 transition-colors">
                            {new Date(session.date).toLocaleDateString()}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatDuration(session.duration)}</span>
                            <span>•</span>
                            <span className={`${session.score >= 70 ? 'text-emerald-400' : session.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>Score: {session.score}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button 
                          onClick={(e) => deleteSession(e, session.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-transparent hover:border-rose-500/20 rounded-lg transition-all shrink-0 cursor-pointer"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronLeft className="w-4 h-4 text-slate-600 rotate-180" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        renderDashboard(viewingSession)
      )}

      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Delete Session?</h3>
            <p className="text-slate-400 text-sm mb-6">This action cannot be undone. Are you sure you want to permanently remove this session from your history?</p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updatedSessions = sessions.filter(s => s.id !== sessionToDelete);
                  setSessions(updatedSessions);
                  const userId = currentUser?.id || 'guest';
                  userDataService.saveProductivitySessions(userId, updatedSessions);
                  if (viewingSession && viewingSession.id === sessionToDelete) {
                    setViewingSession(null);
                  }
                  setSessionToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

