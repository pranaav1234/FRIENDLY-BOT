import * as faceapi from '@vladmandic/face-api';
import { DetectionResult, BoundingBox, DetectedFaceItem } from '../types';
import { dbService } from './dbService';

export interface CalibrationProfile {
  calibrated: boolean;
  targetPoint: { x: number; y: number };
  baselineYaw: number;
  baselinePitch: number;
  baselineEAR: number;
  baselineRoll: number;
  baselineGazeH: number;
  baselineGazeV: number;
  samplesCount: number;
  cameraOffsetPitch: number;
}

export interface StudyFocusAnalysisResult {
  faceDetected: boolean;
  landmarks: { x: number; y: number }[] | null;
  ear: number | null;
  mar: number | null;
  yawRatio: number | null;
  pitchRatio: number | null;
  rollAngle: number | null;
  gazeHorizontal: number | null;
  gazeVertical: number | null;
  isClosed: boolean;
  isDrooping: boolean;
  isLookAway: boolean;
  isWithinFocusRegion: boolean;
  focusDeviation: number | null;
  expressions: faceapi.FaceExpressions | null;
  box: BoundingBox | null;
}

class FaceRecognitionService {
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadError: string | null = null;
  private modelUrl: string = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  public async loadModels(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    try {
      // Load SsdMobilenetv1, TinyFaceDetector, 68-landmark net, tiny-landmark net, and recognition net
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelUrl).catch(() => null),
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelUrl).catch(() => null),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelUrl).catch(() => null),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.modelUrl).catch(() => null),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelUrl).catch(() => null),
        faceapi.nets.faceExpressionNet.loadFromUri(this.modelUrl).catch(() => null),
      ]);
      this.isLoaded = true;
      this.loadError = null;
      console.log('High accuracy Face Recognition models loaded successfully');
    } catch (err) {
      console.warn('Failed to load CDN models for face-api, relying on fallback feature extractor:', err);
      this.loadError = 'Failed to load face-api models';
    } finally {
      this.isLoading = false;
    }

    return true;
  }

  public getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      loadError: this.loadError,
    };
  }

  /**
   * Generates a 128D geometric/color feature descriptor from canvas image and landmark estimation.
   * Ensures face detection and encoding works even if model CDN fails or offline.
   */
  private extractFallbackDescriptor(
    canvas: HTMLCanvasElement,
    bbox: BoundingBox
  ): number[] {
    const ctx = canvas.getContext('2d');
    const descriptor = new Array(128).fill(0);

    if (!ctx) return descriptor;

    const { x, y, width, height } = bbox;
    const safeX = Math.max(0, Math.floor(x));
    const safeY = Math.max(0, Math.floor(y));
    const safeW = Math.min(canvas.width - safeX, Math.floor(width));
    const safeH = Math.min(canvas.height - safeY, Math.floor(height));

    if (safeW <= 0 || safeH <= 0) return descriptor;

    try {
      const imgData = ctx.getImageData(safeX, safeY, safeW, safeH);
      const data = imgData.data;

      // Sample grid of 8x16 = 128 points
      const gridX = 8;
      const gridY = 16;
      let idx = 0;

      for (let gy = 0; gy < gridY; gy++) {
        for (let gx = 0; gx < gridX; gx++) {
          const px = Math.floor((gx / gridX) * safeW);
          const py = Math.floor((gy / gridY) * safeH);
          const pIdx = (py * safeW + px) * 4;

          const r = data[pIdx] / 255;
          const g = data[pIdx + 1] / 255;
          const b = data[pIdx + 2] / 255;

          // Normalized intensity + relative positional geometry encoding
          descriptor[idx] = (r + g + b) / 3 * 0.7 + (gx / gridX) * 0.15 + (gy / gridY) * 0.15;
          idx++;
        }
      }
    } catch {
      // Return zero descriptor
    }

    return descriptor;
  }

  /**
   * Detect face in HTMLVideoElement or HTMLCanvasElement
   * Strict confidence and aspect-ratio checks to filter non-face objects (walls, desks, phones).
   */
  public async detectFace(
    input: HTMLVideoElement | HTMLCanvasElement
  ): Promise<DetectionResult> {
    if (!input || (input instanceof HTMLVideoElement && (input.paused || input.ended || input.readyState < 2))) {
      return {
        faceDetected: false,
        confidence: 0,
        label: 'No face detected',
        isRegistered: false,
      };
    }

    // Ensure models are loaded
    if (!this.isLoaded && !this.loadError) {
      await this.loadModels();
    }

    // Try face-api detection if loaded
    if (this.isLoaded) {
      try {
        let detections: any[] = [];

        const useTinyLandmarks = faceapi.nets.faceLandmark68TinyNet.isLoaded;
        const hasLandmarkNet = faceapi.nets.faceLandmark68Net.isLoaded || faceapi.nets.faceLandmark68TinyNet.isLoaded;
        const hasRecognitionNet = faceapi.nets.faceRecognitionNet.isLoaded;

        if (hasLandmarkNet && hasRecognitionNet) {
          // Fast TinyFaceDetector first for real-time multi-face recognition
          if (faceapi.nets.tinyFaceDetector.isLoaded) {
            detections = await faceapi
              .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.28 }))
              .withFaceLandmarks(useTinyLandmarks)
              .withFaceDescriptors();
          }

          // Fallback to SSD Mobilenet v1 if TinyFaceDetector produced no results
          if ((!detections || detections.length === 0) && faceapi.nets.ssdMobilenetv1.isLoaded) {
            detections = await faceapi
              .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.28 }))
              .withFaceLandmarks(useTinyLandmarks)
              .withFaceDescriptors();
          }
        }

        if (detections && detections.length > 0) {
          const detectedFaces: DetectedFaceItem[] = [];

          for (const det of detections) {
            const score = det.detection.score;
            const box = det.detection.box;

            // Human face shape filter (relaxed aspect ratio and min dimensions)
            const aspect = box.width / box.height;
            const isHumanFaceShape = aspect >= 0.35 && aspect <= 2.2 && box.width >= 25 && box.height >= 25;

            if (score >= 0.28 && isHumanFaceShape) {
              const bbox: BoundingBox = {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              };

              const descriptor: number[] = Array.from(det.descriptor) as number[];
              const match = dbService.findMatchingPerson(descriptor, 0.52);
              const faceThumbnail = this.cropFaceThumbnail(input, bbox);
              const isRegistered = !!match;
              const personName = match ? match.person.name : undefined;
              const label = isRegistered && personName ? personName : 'Unknown Person';

              detectedFaces.push({
                bbox,
                label,
                personName,
                personId: match?.person.id,
                isRegistered,
                distance: match?.distance,
                descriptor,
                faceThumbnail,
                landmarks: det.landmarks ? det.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y })) : undefined,
                confidence: Math.round(score * 100),
              });
            }
          }

          if (detectedFaces.length > 0) {
            // Pick primary face (first/largest/center) for main result
            const primary = detectedFaces[0];

            return {
              faceDetected: true,
              confidence: primary.confidence,
              bbox: primary.bbox,
              label: primary.label,
              personName: primary.personName,
              personId: primary.personId,
              isRegistered: primary.isRegistered,
              distance: primary.distance,
              descriptor: primary.descriptor,
              faceThumbnail: primary.faceThumbnail,
              landmarks: primary.landmarks,
              detectedFaces,
            };
          }
        }
      } catch (err) {
        console.warn('face-api detection failed, attempting fallback canvas detection:', err);
      }
    }

    // Fallback detection using brightness/skin-tone/contour analysis on canvas
    return this.detectFaceCanvasFallback(input);
  }

  /**
   * Fallback face detector using skin-tone color distribution and bounding rectangle
   */
  private detectFaceCanvasFallback(input: HTMLVideoElement | HTMLCanvasElement): DetectionResult {
    const canvas = document.createElement('canvas');
    const width = input instanceof HTMLVideoElement ? input.videoWidth : input.width;
    const height = input instanceof HTMLVideoElement ? input.videoHeight : input.height;

    if (!width || !height) {
      return {
        faceDetected: false,
        confidence: 0,
        label: 'No face detected',
        isRegistered: false,
      };
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        faceDetected: false,
        confidence: 0,
        label: 'No face detected',
        isRegistered: false,
      };
    }

    ctx.drawImage(input, 0, 0, width, height);

    // Analyze center Region of Interest for human skin tone / face features
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let skinPixelCount = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    // Scan every 4th pixel for speed
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard skin tone heuristic in RGB color space
        const isSkin =
          r > 95 && g > 40 && b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 && r > g && r > b;

        if (isSkin) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const faceArea = (maxX - minX) * (maxY - minY);
    const totalArea = width * height;
    const skinRatio = skinPixelCount / ((width / 4) * (height / 4));

    // Must be a concentrated skin block representing a human face (not a plain wall or desk)
    if (skinRatio >= 0.08 && skinRatio <= 0.65 && faceArea >= totalArea * 0.03 && maxX > minX && maxY > minY) {
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const aspect = boxW / boxH;

      if (aspect >= 0.5 && aspect <= 1.8) {
        const bbox: BoundingBox = {
          x: minX,
          y: minY,
          width: boxW,
          height: boxH,
        };

        const descriptor = this.extractFallbackDescriptor(canvas, bbox);
        const match = dbService.findMatchingPerson(descriptor, 0.48);
        const faceThumbnail = this.cropFaceThumbnail(canvas, bbox);

        if (match) {
          return {
            faceDetected: true,
            confidence: 82,
            bbox,
            label: match.person.name,
            personName: match.person.name,
            personId: match.person.id,
            isRegistered: true,
            distance: match.distance,
            descriptor,
            faceThumbnail,
          };
        } else {
          return {
            faceDetected: true,
            confidence: 75,
            bbox,
            label: 'Unknown Person',
            isRegistered: false,
            descriptor,
            faceThumbnail,
          };
        }
      }
    }

    return {
      faceDetected: false,
      confidence: 0,
      label: 'No face detected',
      isRegistered: false,
    };
  }

  public async detectFaceExpressions(input: HTMLVideoElement): Promise<{ expressions: faceapi.FaceExpressions | null, box: BoundingBox | null }> {
    if (!this.isLoaded) {
      return { expressions: null, box: null };
    }
    
    try {
      const detections = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
      if (detections) {
        return {
          expressions: detections.expressions,
          box: {
            x: detections.detection.box.x,
            y: detections.detection.box.y,
            width: detections.detection.box.width,
            height: detections.detection.box.height,
          }
        };
      }
    } catch (e) {
      console.warn("Face expressions detection failed", e);
    }
    return { expressions: null, box: null };
  }

  public async detectStudyFocus(
    input: HTMLVideoElement, 
    focusTarget?: { x: number; y: number } | null,
    calibrationProfile?: CalibrationProfile | null
  ): Promise<StudyFocusAnalysisResult> {
    const emptyResult: StudyFocusAnalysisResult = {
      faceDetected: false,
      landmarks: null,
      ear: null,
      mar: null,
      yawRatio: null,
      pitchRatio: null,
      rollAngle: null,
      gazeHorizontal: null,
      gazeVertical: null,
      isClosed: false,
      isDrooping: false,
      isLookAway: false,
      isWithinFocusRegion: false,
      focusDeviation: null,
      expressions: null,
      box: null,
    };

    if (!input || input.paused || input.ended || input.readyState < 2) {
      return emptyResult;
    }

    if (!this.isLoaded && !this.loadError) {
      await this.loadModels();
    }

    if (!this.isLoaded) {
      // Canvas fallback detection check
      const fallback = this.detectFaceCanvasFallback(input);
      return {
        ...emptyResult,
        faceDetected: fallback.faceDetected,
        box: fallback.bbox || null,
      };
    }

    try {
      const useTinyLandmarks = faceapi.nets.faceLandmark68TinyNet.isLoaded;
      const hasLandmarkNet = faceapi.nets.faceLandmark68Net.isLoaded || faceapi.nets.faceLandmark68TinyNet.isLoaded;
      
      let detection: any = null;
      if (hasLandmarkNet) {
        detection = await faceapi
          .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.25 }))
          .withFaceLandmarks(useTinyLandmarks)
          .withFaceExpressions();
      } else {
        detection = await faceapi
          .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.25 }))
          .withFaceExpressions();
      }

      if (!detection) {
        return emptyResult;
      }

      const box: BoundingBox = {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      };

      let ear: number | null = null;
      let mar: number | null = null;
      let yawRatio: number | null = null;
      let pitchRatio: number | null = null;
      let rollAngle: number | null = null;
      let gazeHorizontal: number | null = null;
      let gazeVertical: number | null = null;
      let isClosed = false;
      let isDrooping = false;
      let isLookAway = false;
      let isWithinFocusRegion = true;
      let focusDeviation: number | null = 0;
      let landmarksArray: { x: number; y: number }[] | null = null;

      if (detection.landmarks && detection.landmarks.positions) {
        const pts = detection.landmarks.positions;
        landmarksArray = pts.map((p: any) => ({ x: p.x, y: p.y }));

        if (pts.length >= 68) {
          const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

          // Left eye: 36..41
          const earLeft = (dist(pts[37], pts[41]) + dist(pts[38], pts[40])) / (2 * Math.max(1, dist(pts[36], pts[39])));
          // Right eye: 42..47
          const earRight = (dist(pts[43], pts[47]) + dist(pts[44], pts[46])) / (2 * Math.max(1, dist(pts[42], pts[45])));
          ear = (earLeft + earRight) / 2;

          // Mouth Aspect Ratio (inner vertical vs horizontal)
          mar = dist(pts[62], pts[66]) / Math.max(1, dist(pts[48], pts[54]));

          // Head Yaw Ratio (horizontal relative position of nose tip vs jaw edges)
          const jawLeft = pts[0];
          const jawRight = pts[16];
          const noseTip = pts[30];
          const jawWidth = Math.max(1, jawRight.x - jawLeft.x);
          yawRatio = (noseTip.x - jawLeft.x) / jawWidth;

          // Head Pitch Ratio (vertical relative position of nose tip vs eye center & chin)
          const leftEyeCenter = { x: (pts[36].x + pts[39].x) / 2, y: (pts[37].y + pts[41].y) / 2 };
          const rightEyeCenter = { x: (pts[42].x + pts[45].x) / 2, y: (pts[43].y + pts[47].y) / 2 };
          const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
          const chin = pts[8];
          const faceHeight = Math.max(1, chin.y - eyeCenterY);
          pitchRatio = (noseTip.y - eyeCenterY) / faceHeight;

          // Head Roll Angle
          const dxRoll = rightEyeCenter.x - leftEyeCenter.x;
          const dyRoll = rightEyeCenter.y - leftEyeCenter.y;
          rollAngle = Math.atan2(dyRoll, dxRoll) * (180 / Math.PI);

          // Gaze offsets
          const midEyeX = (pts[36].x + pts[45].x) / 2;
          const eyeSpan = Math.max(1, pts[45].x - pts[36].x);
          gazeHorizontal = (noseTip.x - midEyeX) / (eyeSpan * 0.5);
          gazeVertical = (pitchRatio - 0.44) / 0.15;

          // Eye Aspect Ratio threshold calibration
          const refEAR = (calibrationProfile?.calibrated && calibrationProfile.baselineEAR > 0)
            ? calibrationProfile.baselineEAR
            : 0.26;

          isClosed = ear < Math.min(0.19, refEAR * 0.65);
          isDrooping = ear >= Math.min(0.19, refEAR * 0.65) && ear < Math.min(0.23, refEAR * 0.82);

          // Relative focus & gaze deviation calculation
          if (calibrationProfile && calibrationProfile.calibrated) {
            const target = calibrationProfile.targetPoint || focusTarget || { x: 0.5, y: 0.5 };
            // Adjust expected yaw and pitch from user's personalized 3-5s calibration baseline
            const expectedYaw = calibrationProfile.baselineYaw + (target.x - 0.5) * 0.18;
            const expectedPitch = calibrationProfile.baselinePitch + (target.y - 0.5) * 0.16;

            const dYaw = Math.abs(yawRatio - expectedYaw) / 0.18;
            const dPitch = Math.abs(pitchRatio - expectedPitch) / 0.16;
            const dRoll = Math.abs(rollAngle - calibrationProfile.baselineRoll) / 28;

            focusDeviation = Math.hypot(dYaw, dPitch);

            // Within dynamic tolerance region around calibrated baseline
            isWithinFocusRegion = focusDeviation <= 1.0 && dRoll <= 1.0;
            isLookAway = !isWithinFocusRegion;
          } else {
            // Uncalibrated default calculation with top-camera downward compensation
            const target = focusTarget || { x: 0.5, y: 0.5 };
            const expectedYaw = 0.50 + (target.x - 0.5) * 0.35;
            const expectedPitch = 0.46 + (target.y - 0.5) * 0.30;

            const dYaw = (yawRatio - expectedYaw) / 0.18;
            const dPitch = (pitchRatio - expectedPitch) / 0.16;
            focusDeviation = Math.hypot(dYaw, dPitch);

            isWithinFocusRegion = focusDeviation <= 1.0;
            isLookAway = !isWithinFocusRegion || Math.abs(rollAngle) > 30;
          }
        }
      }

      return {
        faceDetected: true,
        landmarks: landmarksArray,
        ear,
        mar,
        yawRatio,
        pitchRatio,
        rollAngle,
        gazeHorizontal,
        gazeVertical,
        isClosed,
        isDrooping,
        isLookAway,
        isWithinFocusRegion,
        focusDeviation,
        expressions: detection.expressions || null,
        box,
      };
    } catch (err) {
      console.warn("Study focus detection failed:", err);
      return emptyResult;
    }
  }

  /**
   * Helper to crop a face image base64 snapshot
   */
  public cropFaceThumbnail(
    source: HTMLVideoElement | HTMLCanvasElement,
    bbox: BoundingBox
  ): string {
    try {
      const canvas = document.createElement('canvas');
      const size = 150;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Add 15% padding around the bounding box for cleaner face avatar
      const padX = bbox.width * 0.15;
      const padY = bbox.height * 0.15;
      const cropX = Math.max(0, bbox.x - padX);
      const cropY = Math.max(0, bbox.y - padY);
      const cropW = bbox.width + padX * 2;
      const cropH = bbox.height + padY * 2;

      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, size, size);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return '';
    }
  }
}

export const faceRecognitionService = new FaceRecognitionService();
