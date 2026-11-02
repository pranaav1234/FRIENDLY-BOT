import { HandGestureType, GestureDetectionResult } from '../types';

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Palm base
];

class GestureRecognitionService {
  public activeStream: MediaStream | null = null;
  public isRecognitionStarted: boolean = false;
  private listeners: Array<(started: boolean) => void> = [];

  public setRecognitionStarted(started: boolean) {
    this.isRecognitionStarted = started;
    this.listeners.forEach((cb) => cb(started));
  }

  public stopStream() {
    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Error stopping active stream:', err);
      }
      this.activeStream = null;
    }
  }

  public subscribeRecognitionStarted(cb: (started: boolean) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /**
   * Analyze 21 hand 3D landmarks from MediaPipe Hands
   */
  public analyzeGesture(landmarks: { x: number; y: number; z: number }[]): GestureDetectionResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        gesture: 'none',
        label: 'Current Gesture: No Hand Detected',
        confidence: 0,
      };
    }

    const wrist = landmarks[0];

    const thumbCmc = landmarks[1];
    const thumbMcp = landmarks[2];
    const thumbIp = landmarks[3];
    const thumbTip = landmarks[4];

    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexDip = landmarks[7];
    const indexTip = landmarks[8];

    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleDip = landmarks[11];
    const middleTip = landmarks[12];

    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringDip = landmarks[15];
    const ringTip = landmarks[16];

    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyDip = landmarks[19];
    const pinkyTip = landmarks[20];

    // Distance helper
    const dist2D = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
      Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // Reference scale: distance from wrist (0) to middle MCP (9)
    const handScale = dist2D(wrist, middleMcp) || 0.1;

    // Helper: check if a finger is extended (tip is extended out from PIP & MCP away from wrist)
    const isFingerExtended = (
      tip: { x: number; y: number },
      pip: { x: number; y: number },
      mcp: { x: number; y: number }
    ) => {
      const dTipWrist = dist2D(tip, wrist);
      const dPipWrist = dist2D(pip, wrist);
      const dTipMcp = dist2D(tip, mcp);
      return dTipWrist > dPipWrist * 1.05 && dTipMcp > handScale * 0.65;
    };

    // Helper: check if a finger is folded (tip is curled in towards MCP/wrist)
    const isFingerFolded = (
      tip: { x: number; y: number },
      pip: { x: number; y: number },
      mcp: { x: number; y: number }
    ) => {
      const dTipWrist = dist2D(tip, wrist);
      const dPipWrist = dist2D(pip, wrist);
      const dTipMcp = dist2D(tip, mcp);
      return dTipWrist < dPipWrist * 1.15 || dTipMcp < handScale * 0.55;
    };

    // Finger status calculations
    const isIndexExtended = isFingerExtended(indexTip, indexPip, indexMcp);
    const isMiddleExtended = isFingerExtended(middleTip, middlePip, middleMcp);
    const isRingExtended = isFingerExtended(ringTip, ringPip, ringMcp);
    const isPinkyExtended = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

    const isIndexFolded = isFingerFolded(indexTip, indexPip, indexMcp);
    const isMiddleFolded = isFingerFolded(middleTip, middlePip, middleMcp);
    const isRingFolded = isFingerFolded(ringTip, ringPip, ringMcp);
    const isPinkyFolded = isFingerFolded(pinkyTip, pinkyPip, pinkyMcp);

    // Thumb extended if thumb tip is extended away from wrist and CMC
    const isThumbExtended =
      dist2D(thumbTip, wrist) > dist2D(thumbCmc, wrist) * 1.15 &&
      dist2D(thumbTip, indexMcp) > handScale * 0.5;

    const isThumbFolded =
      dist2D(thumbTip, indexMcp) < handScale * 0.6 ||
      dist2D(thumbTip, middleMcp) < handScale * 0.6;

    // 1. ROCK ON / HORNS SIGN 🤘 (Index & Pinky extended, Middle & Ring folded) -> Email Assistant
    if (isIndexExtended && isPinkyExtended && isMiddleFolded && isRingFolded) {
      return {
        gesture: 'horns_sign',
        label: 'Current Gesture: Rock On / Horns Sign 🤘',
        confidence: 0.98,
        landmarks,
      };
    }

    // 2. VICTORY SIGN ✌️ (Index & Middle extended, Ring & Pinky folded) -> Chatbot
    if (isIndexExtended && isMiddleExtended && isRingFolded && isPinkyFolded) {
      return {
        gesture: 'victory_sign',
        label: 'Current Gesture: Victory Sign ✌️',
        confidence: 0.98,
        landmarks,
      };
    }

    // 3. OPEN PALM ✋ (All 4 fingers extended + Thumb extended) -> Offline Chatbot
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
      return {
        gesture: 'open_palm',
        label: 'Current Gesture: Open Palm ✋',
        confidence: 0.98,
        landmarks,
      };
    }

    // 4. CLOSED FIST ✊ (All 4 fingers folded + Thumb folded/in) -> Summarise
    if (isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded && isThumbFolded) {
      return {
        gesture: 'closed_fist',
        label: 'Current Gesture: Closed Fist ✊',
        confidence: 0.98,
        landmarks,
      };
    }

    // 5. THUMBS UP 👍 (4 fingers folded, Thumb extended up) -> Music Player
    // 6. THUMBS DOWN 👎 (4 fingers folded, Thumb extended down) -> Productivity
    if (isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded && isThumbExtended) {
      if (thumbTip.y < thumbMcp.y) {
        return {
          gesture: 'thumbs_up',
          label: 'Current Gesture: Thumbs Up 👍',
          confidence: 0.98,
          landmarks,
        };
      } else {
        return {
          gesture: 'thumbs_down',
          label: 'Current Gesture: Thumbs Down 👎',
          confidence: 0.98,
          landmarks,
        };
      }
    }

    // 7. POINT UP 👆 (Index extended UP, Middle/Ring/Pinky folded) -> Time Management
    // 8. POINT DOWN 👇 (Index extended DOWN, Middle/Ring/Pinky folded) -> Calendar
    if (isIndexExtended && isMiddleFolded && isRingFolded && isPinkyFolded) {
      const dy = indexTip.y - indexMcp.y;
      if (dy < 0) {
        return {
          gesture: 'point_up',
          label: 'Current Gesture: Point Up 👆',
          confidence: 0.98,
          landmarks,
        };
      } else {
        return {
          gesture: 'point_down',
          label: 'Current Gesture: Point Down 👇',
          confidence: 0.98,
          landmarks,
        };
      }
    }

    // Default: Hand in frame but pose not matched to any gesture
    return {
      gesture: 'none',
      label: 'Current Gesture: Searching for hand gestures...',
      confidence: 0.5,
      landmarks,
    };
  }

  /**
   * Draw hand skeleton on canvas context
   */
  public drawHandOverlay(
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number; z: number }[],
    width: number,
    height: number,
    gesture: HandGestureType
  ) {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 21) return;

    // Color theme based on detected gesture
    let strokeColor = '#3b82f6'; // Blue default
    let jointColor = '#60a5fa';

    if (gesture === 'victory_sign') {
      strokeColor = '#10b981'; // Emerald Green
      jointColor = '#34d399';
    } else if (gesture === 'closed_fist') {
      strokeColor = '#8b5cf6'; // Purple
      jointColor = '#a78bfa';
    } else if (gesture === 'open_palm') {
      strokeColor = '#f59e0b'; // Amber Gold
      jointColor = '#fbbf24';
    } else if (gesture === 'point_up') {
      strokeColor = '#06b6d4'; // Cyan
      jointColor = '#22d3ee';
    } else if (gesture === 'point_down') {
      strokeColor = '#3b82f6'; // Blue
      jointColor = '#60a5fa';
    } else if (gesture === 'thumbs_up') {
      strokeColor = '#6366f1'; // Indigo
      jointColor = '#818cf8';
    } else if (gesture === 'thumbs_down') {
      strokeColor = '#d946ef'; // Fuchsia
      jointColor = '#e879f9';
    } else if (gesture === 'horns_sign' || gesture === 'ok_sign' || gesture === 'love_you') {
      strokeColor = '#f43f5e'; // Rose
      jointColor = '#fb7185';
    }

    // Draw connection lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Draw landmark joints
    landmarks.forEach((p, index) => {
      const x = p.x * width;
      const y = p.y * height;

      ctx.beginPath();
      ctx.arc(x, y, index === 4 || index === 8 || index === 12 || index === 16 || index === 20 ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = jointColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    });
  }
}

export const gestureRecognitionService = new GestureRecognitionService();
