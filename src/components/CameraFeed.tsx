import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, CameraOff, AlertCircle, RefreshCw, ShieldCheck, Sparkles, CheckCircle2, Scan, UserCheck, Activity, Eye, Search } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognitionService';
import { DetectionResult } from '../types';
import { calculateMatchConfidence } from '../utils/poseUtils';

interface CameraFeedProps {
  isCameraActive: boolean;
  onExitCamera: () => void;
  onDetectionUpdate: (result: DetectionResult, videoEl: HTMLVideoElement) => void;
  isScanning?: boolean;
  scanProgress?: number;
  scanInstruction?: string;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  isCameraActive,
  onExitCamera,
  onDetectionUpdate,
  isScanning = false,
  scanProgress = 0,
  scanInstruction = 'Position your face inside the frame.',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastDetection, setLastDetection] = useState<DetectionResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // Stop current camera stream immediately
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraReady(false);
    setLastDetection(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize laptop built-in webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera API (navigator.mediaDevices) is unavailable in this environment. Note: Browsers require a Secure Context (http://localhost:3000 or HTTPS) to access webcams. If running locally from a downloaded ZIP, run "npm run dev" and open http://localhost:3000.'
      );
      setIsCameraReady(false);
      return;
    }

    try {
      stopCamera();

      // Request laptop built-in webcam by default (facingMode: 'user')
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = newStream;
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        try {
          await videoRef.current.play();
          setIsCameraReady(true);
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError' && !playErr.message?.includes('interrupted')) {
            console.warn('Video play interrupted:', playErr);
          }
          setIsCameraReady(true);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
        return;
      }
      console.error('Webcam access error:', err);
      setCameraError(
        'Unable to access laptop webcam. Please grant camera permission in your browser.'
      );
      setIsCameraReady(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isCameraActive) {
      const tracks = streamRef.current?.getTracks();
      const isLive = tracks && tracks.length > 0 && tracks.every((t) => t.readyState === 'live');
      if (!isLive || !isCameraReady) {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraActive, isScanning, startCamera, stopCamera]);

  // Ensure video element stays playing when camera is active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCameraActive) return;

    const handlePause = () => {
      if (isCameraActive && video.paused && video.srcObject) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('pause', handlePause);
    };
  }, [isCameraActive]);

  // Continuous frame analysis loop when camera is active
  useEffect(() => {
    if (!isCameraActive) return;

    let animationFrameId: number;
    let isProcessing = false;

    const processLoop = async () => {
      if (videoRef.current && isCameraReady && videoRef.current.readyState >= 2 && !isProcessing) {
        isProcessing = true;
        try {
          const result = await faceRecognitionService.detectFace(videoRef.current);
          setLastDetection(result);
          onDetectionUpdate(result, videoRef.current);

          // Render canvas overlays
          renderOverlay(result);
        } catch (err) {
          console.warn('Frame processing error:', err);
        } finally {
          isProcessing = false;
        }
      }
      animationFrameId = requestAnimationFrame(processLoop);
    };

    animationFrameId = requestAnimationFrame(processLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, isCameraReady, onDetectionUpdate]);

  // Draw bounding boxes, un-mirrored labels, and landmarks on canvas
  const renderOverlay = (result: DetectionResult) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
  };


  return (
    <div className="relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl h-full">
      {/* Video Container with increased height for enhanced scanning & detection visibility */}
      <div className="relative aspect-[16/10] sm:aspect-video min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] max-h-[640px] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {!isCameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-md mx-auto z-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              <CameraOff className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Camera is Currently Off</h3>
            <p className="text-xs text-slate-400 mt-1">Click "Scan Face" to activate the camera.</p>
          </div>
        ) : cameraError ? (
          <div className="p-5 text-center max-w-md bg-slate-900/90 rounded-2xl border border-rose-500/30 m-4 shadow-xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Camera Access Issue</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">{cameraError}</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left mb-4 space-y-1">
              <p className="font-bold text-slate-200">💡 Running locally / ZIP export? How to fix:</p>
              <p>1. Click the lock icon 🔒 next to <code className="text-blue-300">localhost:3000</code> in your browser URL bar.</p>
              <p>2. Set <strong>Camera</strong> permission to <strong>Allow</strong>.</p>
              <p>3. Click the button below to retry.</p>
            </div>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 mx-auto shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Webcam Access</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mirror transformation for natural camera preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* Canvas overlay WITHOUT scale-x-100 transform so text is rendered left-to-right correctly */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* FACE SCANNING UI OVERLAY */}
            {isScanning ? (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-10 p-4">
                {/* Top Guidance Prompt Banner */}
                <div className="bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-cyan-200 tracking-wide drop-shadow">
                    {scanInstruction}
                  </span>
                </div>

                {/* Animated Facial Guide Frame in Center */}
                <div className="relative my-auto w-56 h-72 sm:w-64 sm:h-80 rounded-[48px] border-2 border-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.35)] animate-pulse-glow flex flex-col items-center justify-between p-4 overflow-hidden bg-slate-900/10 backdrop-blur-[1px]">
                  {/* Corner Reticle Brackets */}
                  <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

                  {/* Vertical Laser Scanning Line */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scan-laser pointer-events-none" />

                  {/* Center Crosshair Ticks */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-12 h-[1px] bg-cyan-400" />
                    <div className="h-12 w-[1px] bg-cyan-400 absolute" />
                  </div>

                  {/* Top Badge Inside Frame */}
                  <div className="bg-slate-950/80 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-cyan-300 tracking-wider uppercase">
                    [ FACIAL FRAME GUIDE ]
                  </div>

                  {/* Completion Animation OR Circular Percentage */}
                  {scanProgress >= 100 ? (
                    <div className="flex flex-col items-center justify-center animate-bounce my-auto">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <span className="text-xs font-bold text-emerald-300 mt-2">Scan Complete!</span>
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-black text-cyan-200 tracking-tight drop-shadow-[0_2px_10px_rgba(34,211,238,0.5)]">
                        {Math.round(scanProgress)}%
                      </span>
                    </div>
                  )}

                  {/* Bottom Status Tag */}
                  <div className="bg-slate-950/80 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-mono text-cyan-300">
                    BIOMETRIC MATRIX
                  </div>
                </div>

                {/* Bottom Simple 5-Second Scan Progress Card */}
                <div className="w-full bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl shadow-2xl z-20 max-w-lg mx-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span className="text-xs sm:text-sm font-extrabold text-slate-100">
                        {scanProgress >= 100
                          ? 'Face scan completed successfully.'
                          : 'Scanning your face...'}
                      </span>
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                      {scanProgress >= 100
                        ? 'Done'
                        : `${Math.max(1, Math.ceil(5 * (1 - scanProgress / 100)))}s left`}
                    </div>
                  </div>

                  {/* 5-Second Progress Bar */}
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700/80 relative">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-200 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                      style={{ width: `${Math.min(100, scanProgress)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium text-center italic">
                    {scanInstruction}
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <div className="w-64 h-64 border-2 border-dashed border-slate-400/50 rounded-full" />
              </div>
            )}

            {/* Live Camera Badge */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-slate-200 border border-slate-700/60 flex items-center gap-2 z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Webcam Live Feed</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

