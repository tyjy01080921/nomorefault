import { create } from 'zustand';
import type { PoseLandmark } from '../utils/pose';
import type { CalibrationMode } from '../utils/verdict';

interface AnalysisPoint {
  x: number;
  y: number;
}

export interface AppState {
  // Video file
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;

  // Calibration mode
  calibrationMode: CalibrationMode;
  setCalibrationMode: (mode: CalibrationMode) => void;

  // Net coordinates
  netBase: AnalysisPoint | null;
  setNetBase: (y: number, x: number) => void;

  netTop: AnalysisPoint | null;
  setNetTop: (y: number, x: number) => void;

  ground: AnalysisPoint | null;
  setGround: (y: number, x: number) => void;

  // Player height calibration
  playerHeightCm: number | null;
  setPlayerHeightCm: (heightCm: number | null) => void;

  playerHeadTop: AnalysisPoint | null;
  setPlayerHeadTop: (point: AnalysisPoint | null) => void;

  playerFootBase: AnalysisPoint | null;
  setPlayerFootBase: (point: AnalysisPoint | null) => void;

  // Shuttlecock position
  shuttlecockPos: AnalysisPoint | null;
  setShuttlecockPos: (pos: AnalysisPoint) => void;

  // Clear per-video analysis inputs
  resetAnalysisInputs: () => void;

  // UI Theme
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;

  // Language
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // MediaPipe pose landmarks (set by animation loop, read by verdict calculation)
  poseLandmarks: PoseLandmark[] | null;
  setPoseLandmarks: (landmarks: PoseLandmark[] | null) => void;

  // PWA Manual Update
  needRefresh: boolean;
  setNeedRefresh: (val: boolean) => void;
  updateServiceWorker: (() => void | Promise<void>) | null;
  setUpdateServiceWorker: (fn: () => void | Promise<void>) => void;
}

export const useStore = create<AppState>((set) => ({
  // Video file
  videoFile: null,
  setVideoFile: (file) => set({ videoFile: file }),

  // Calibration mode
  calibrationMode: 'netPost',
  setCalibrationMode: (mode) => set({ calibrationMode: mode }),

  // Net coordinates
  netBase: null,
  setNetBase: (y, x) => set({ netBase: { y, x } }),

  netTop: null,
  setNetTop: (y, x) => set({ netTop: { y, x } }),

  ground: null,
  setGround: (y, x) => set({ ground: { y, x } }),

  // Player height calibration
  playerHeightCm: null,
  setPlayerHeightCm: (heightCm) => set({ playerHeightCm: heightCm }),

  playerHeadTop: null,
  setPlayerHeadTop: (point) => set({ playerHeadTop: point }),

  playerFootBase: null,
  setPlayerFootBase: (point) => set({ playerFootBase: point }),

  // Shuttlecock position
  shuttlecockPos: null,
  setShuttlecockPos: (pos) => set({ shuttlecockPos: pos }),

  // Clear per-video analysis inputs
  resetAnalysisInputs: () => set({
    calibrationMode: 'netPost',
    netBase: null,
    netTop: null,
    ground: null,
    playerHeightCm: null,
    playerHeadTop: null,
    playerFootBase: null,
    shuttlecockPos: null,
    poseLandmarks: null,
  }),

  // UI Theme
  isDarkMode: true,
  setIsDarkMode: (dark) => set({ isDarkMode: dark }),

  // Language
  language: 'ko',
  setLanguage: (lang) => set({ language: lang }),

  // MediaPipe pose landmarks
  poseLandmarks: null,
  setPoseLandmarks: (landmarks) => set({ poseLandmarks: landmarks }),

  // PWA Manual Update
  needRefresh: false,
  setNeedRefresh: (val) => set({ needRefresh: val }),
  updateServiceWorker: null,
  setUpdateServiceWorker: (fn) => set({ updateServiceWorker: fn }),
}));
