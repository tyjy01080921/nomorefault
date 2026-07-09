import { create } from 'zustand';
import type { PoseLandmark } from '../utils/pose';

interface AnalysisPoint {
  x: number;
  y: number;
}

export interface AppState {
  // Video file
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;

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

}

export const useStore = create<AppState>((set) => ({
  // Video file
  videoFile: null,
  setVideoFile: (file) => set({ videoFile: file }),

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

}));
