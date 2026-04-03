import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import AnalysisWizard from '../components/AnalysisWizard';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';
import { calculateVerdict } from '../utils/verdict';

const AnalysisSetup = () => {
  const navigate = useNavigate();
  const { videoFile, wizardStep, setWizardStep, setNetBase, setNetTop, setGround, shuttlecockPos, setShuttlecockPos, netBase, netTop, ground, poseLandmarks, setPoseLandmarks } = useStore((state: AppState) => state);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);

  // Stable object URL — avoids creating a new blob URL on every render
  const videoUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : ''),
    [videoFile]
  );
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      try {
        const poseLandmarker = await getPoseLandmarker();
        const results = poseLandmarker.detectForVideo(video, performance.now());
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (results.landmarks && results.landmarks.length > 0) {
            drawSkeleton(ctx, results.landmarks[0], canvas.width, canvas.height);
            setPoseLandmarks(results.landmarks[0]);
          } else {
            setPoseLandmarks(null);
          }
        }
      } catch (e) {
        if (e instanceof Error && !e.message.includes('not initialized')) {
          console.warn('[MediaPipe frame]', e.message);
        }
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };
    
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (wizardStep === 0 || wizardStep === 1 || wizardStep === 5) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    if (wizardStep === 2) setNetBase(y, x);
    else if (wizardStep === 3) setNetTop(y, x);
    else if (wizardStep === 4) setGround(y, x);
    else if (wizardStep === 6) setShuttlecockPos({ x, y });
  };

  useEffect(() => {
    // Reset wizard when unmounting
    return () => setWizardStep(0);
  }, []);

  return (
    <div className="camera-container" style={{ background: 'var(--bg-color)', height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '16px' }}>
        <h3 style={{ textAlign: 'center', color: 'var(--accent-color)', margin: 0 }}>타구 순간 선택</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem', margin: 0 }}>
          셔틀콕을 치는 순간을 찾아 선택해주세요
        </p>

        <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden', minHeight: '30vh' }}>
          <video 
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 1)}
            style={{ width: '100%', maxHeight: '45vh', objectFit: 'contain' }}
          />
          <canvas 
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: wizardStep > 0 ? 'auto' : 'none', zIndex: 10, cursor: wizardStep > 0 ? 'crosshair' : 'default' }}
          />
          <AnalysisWizard />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="range" 
              min={0} 
              max={duration || 1} 
              step={0.01} 
              value={currentTime} 
              onChange={handleTimeChange}
              disabled={wizardStep > 0}
              style={{ flex: 1, accentColor: 'var(--accent-color)' }}
            />
            <button 
              className={`calibration-btn ${wizardStep > 0 ? 'active' : ''}`}
              onClick={() => {
                if (wizardStep === 0) setWizardStep(5);
              }}
              style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '0.8rem' }}
            >
              관절 수동 조정 
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            <span>{currentTime.toFixed(2)}s</span>
            <span>{duration.toFixed(2)}s</span>
          </div>
        </div>

        <button 
          className="primary-btn" 
          onClick={() => {
            if (wizardStep === 0) setWizardStep(1);
            else if (wizardStep === 6 && shuttlecockPos) {
            const calibration = netBase && netTop && ground
              ? { netBase, netTop, ground }
              : null;
            const { verdict, angles } = calibration
              ? calculateVerdict(calibration, shuttlecockPos, poseLandmarks)
              : { verdict: 'VAR_CHALLENGE', angles: { shoulder: 0, elbow: 0, wrist: 0 } };
            navigate(ROUTES.RESULT, {
              state: {
                verdict,
                angles,
                timestamp: new Date().toISOString(),
              },
            });
          }
          }}
          disabled={wizardStep !== 0 && (wizardStep !== 6 || !shuttlecockPos)}
          style={{ padding: '0.75rem', marginTop: 'auto' }}
        >
          {wizardStep === 6 && shuttlecockPos ? '분석 시작' : '이 프레임 선택 (타구 순간)'}
        </button>
      </div>
    </div>
  );
};

export default AnalysisSetup;
