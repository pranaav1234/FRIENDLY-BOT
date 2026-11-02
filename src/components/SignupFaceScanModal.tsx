import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, CheckCircle2, Scan, AlertCircle, Sparkles } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognitionService';

interface SignupFaceScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFaceCaptured: (data: { thumbnail: string; descriptors: number[][] }) => void;
}

export const SignupFaceScanModal: React.FC<SignupFaceScanModalProps> = ({
  isOpen,
  onClose,
  onFaceCaptured,
}) => {
  if (!isOpen) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [instruction, setInstruction] = useState('Position your face inside the frame...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  const scanStartTimeRef = useRef<number | null>(null);
  const collectedDescriptorsRef = useRef<number[][]>([]);
  const capturedThumbnailRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function initCamera() {
      try {
        setCameraError(null);
        await faceRecognitionService.loadModels();

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!isActive) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        // Start scanning loop
        scanStartTimeRef.current = null;
        collectedDescriptorsRef.current = [];
        capturedThumbnailRef.current = '';

        const scanLoop = async () => {
          if (!isActive || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
            return;
          }

          try {
            const result = await faceRecognitionService.detectFace(videoRef.current);
            if (!isActive) return;

            if (result.faceDetected && result.descriptor) {
              setIsFaceDetected(true);
              if (!capturedThumbnailRef.current && result.faceThumbnail) {
                capturedThumbnailRef.current = result.faceThumbnail;
              }

              if (scanStartTimeRef.current === null) {
                scanStartTimeRef.current = Date.now();
                setInstruction('Face detected! Hold steady...');
              }

              const elapsed = Date.now() - scanStartTimeRef.current;
              const progress = Math.min(100, (elapsed / 3000) * 100);
              setScanProgress(progress);

              // Collect sample
              if (collectedDescriptorsRef.current.length < 15) {
                collectedDescriptorsRef.current.push(result.descriptor);
              }

              if (elapsed >= 3000) {
                // Done!
                const primaryThumbnail =
                  capturedThumbnailRef.current || result.faceThumbnail || '';
                onFaceCaptured({
                  thumbnail: primaryThumbnail,
                  descriptors:
                    collectedDescriptorsRef.current.length > 0
                      ? collectedDescriptorsRef.current
                      : [result.descriptor],
                });
                stopCamera();
                return;
              }
            } else {
              setIsFaceDetected(false);
              scanStartTimeRef.current = null;
              setScanProgress(0);
              setInstruction('Position your face in the camera frame');
            }
          } catch (err) {
            console.warn('Face detect loop warning:', err);
          }

          animationFrameRef.current = requestAnimationFrame(scanLoop);
        };

        animationFrameRef.current = requestAnimationFrame(scanLoop);
      } catch (err: any) {
        if (!isActive) return;
        console.error('Webcam init error:', err);
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access.'
            : 'Could not access webcam.'
        );
      }
    }

    initCamera();

    return () => {
      isActive = false;
      stopCamera();
    };
  }, [onFaceCaptured, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
            <Scan className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Scan Your Face
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hold steady while the camera registers your face
          </p>
        </div>

        {cameraError ? (
          <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex flex-col items-center gap-2 my-4">
            <AlertCircle className="w-6 h-6 text-rose-400" />
            <span>{cameraError}</span>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview with Circular/Rounded Focus Frame */}
            <div className="relative mx-auto w-64 h-64 rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Target Box */}
              <div
                className={`absolute inset-4 rounded-2xl border-2 transition-colors pointer-events-none ${
                  isFaceDetected
                    ? 'border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'border-cyan-400/60 border-dashed animate-pulse'
                }`}
              />

              {/* Status Badge */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md py-1 px-2 rounded-xl text-[11px] font-semibold text-slate-200">
                {instruction}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold px-1">
                <span>Scan Progress</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-150"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
