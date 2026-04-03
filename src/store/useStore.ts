import { create } from 'zustand';

export interface AppState {
  // Video file
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;

  // Wizard step
  wizardStep: number;
  setWizardStep: (step: number) => void;

  // Net coordinates
  netBase: { y: number; x: number } | null;
  setNetBase: (y: number, x: number) => void;

  netTop: { y: number; x: number } | null;
  setNetTop: (y: number, x: number) => void;

  ground: { y: number; x: number } | null;
  setGround: (y: number, x: number) => void;

  // Shuttlecock position
  shuttlecockPos: { x: number; y: number } | null;
  setShuttlecockPos: (pos: { x: number; y: number }) => void;

  // UI Theme
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;

  // Language
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // MediaPipe pose landmarks (set by animation loop, read by verdict calculation)
  poseLandmarks: any[] | null;
  setPoseLandmarks: (landmarks: any[] | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Video file
  videoFile: null,
  setVideoFile: (file) => set({ videoFile: file }),

  // Wizard step
  wizardStep: 0,
  setWizardStep: (step) => set({ wizardStep: step }),

  // Net coordinates
  netBase: null,
  setNetBase: (y, x) => set({ netBase: { y, x } }),

  netTop: null,
  setNetTop: (y, x) => set({ netTop: { y, x } }),

  ground: null,
  setGround: (y, x) => set({ ground: { y, x } }),

  // Shuttlecock position
  shuttlecockPos: null,
  setShuttlecockPos: (pos) => set({ shuttlecockPos: pos }),

  // UI Theme
  isDarkMode: false,
  setIsDarkMode: (dark) => set({ isDarkMode: dark }),

  // Language
  language: 'ko',
  setLanguage: (lang) => set({ language: lang }),

  // MediaPipe pose landmarks
  poseLandmarks: null,
  setPoseLandmarks: (landmarks) => set({ poseLandmarks: landmarks }),
}));
