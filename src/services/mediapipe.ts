import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarkerInstance: PoseLandmarker | null = null;
let isInitializing = false;
let initPromise: Promise<PoseLandmarker> | null = null;

export const getPoseLandmarker = async (): Promise<PoseLandmarker> => {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  initPromise = new Promise(async (resolve, reject) => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      resolve(poseLandmarkerInstance);
    } catch (e) {
      console.error('Failed to initialize PoseLandmarker', e);
      reject(e);
    } finally {
      isInitializing = false;
    }
  });

  return initPromise;
};

// Simple skeleton drawing utility
export const drawSkeleton = (
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  width: number,
  height: number,
  isAdjusting = false,
  activeTargetIndex: number | null = null
) => {
  if (!landmarks || landmarks.length === 0) return;

  const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
  ];

  ctx.save();

  // Draw connectors
  ctx.strokeStyle = isAdjusting ? '#FFD700' : '#00FF00';
  ctx.lineWidth = 4;
  POSE_CONNECTIONS.forEach(([start, end]) => {
    const s = landmarks[start];
    const e = landmarks[end];
    if (s && e) {
      ctx.beginPath();
      ctx.moveTo(s.x * width, s.y * height);
      ctx.lineTo(e.x * width, e.y * height);
      ctx.stroke();
    }
  });

  // Draw active landmarks
  const MAIN_LANDMARKS = [0, 9, 10, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  MAIN_LANDMARKS.forEach(i => {
    const lm = landmarks[i];
    if (!lm) return;
    const isHead = i === 0 || i === 9 || i === 10;
    const isActive = i === activeTargetIndex;
    
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, isActive ? 16 : (isHead ? 10 : 8), 0, 2 * Math.PI);
    
    if (isActive) {
      ctx.fillStyle = 'rgba(255, 69, 58, 0.5)';
      ctx.strokeStyle = '#FF453A';
      ctx.lineWidth = 4;
    } else {
      ctx.fillStyle = isHead ? 'rgba(255, 107, 157, 0.7)' : 'rgba(255, 255, 255, 0.6)';
      ctx.strokeStyle = isHead ? '#FF6B9D' : '#ffffff';
      ctx.lineWidth = 3;
    }
    
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
};
