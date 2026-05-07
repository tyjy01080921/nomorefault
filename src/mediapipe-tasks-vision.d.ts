declare module '@mediapipe/tasks-vision' {
  import type { PoseLandmark } from './utils/pose';

  interface WasmFileset {
    wasmLoaderPath?: string;
    wasmBinaryPath?: string;
    assetLoaderPath?: string;
    assetBinaryPath?: string;
  }

  interface PoseLandmarkerOptions {
    baseOptions?: {
      modelAssetPath?: string;
      modelAssetBuffer?: Uint8Array | ReadableStreamDefaultReader;
      delegate?: 'CPU' | 'GPU';
    };
    runningMode?: 'IMAGE' | 'VIDEO';
    numPoses?: number;
  }

  interface PoseLandmarkerResult {
    landmarks: PoseLandmark[][];
  }

  export class FilesetResolver {
    static forVisionTasks(wasmFilesetPath: string): Promise<WasmFileset>;
  }

  export class PoseLandmarker {
    static createFromOptions(
      wasmFileset: WasmFileset,
      poseLandmarkerOptions: PoseLandmarkerOptions,
    ): Promise<PoseLandmarker>;

    detectForVideo(
      videoFrame: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
      timestamp: number,
    ): PoseLandmarkerResult;
  }
}
