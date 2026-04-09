import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import AnalysisWizard from '../components/AnalysisWizard';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';
import { calculateVerdict } from '../utils/verdict';

const AnalysisSetup = () => {
  const navigate = useNavigate();
  const { videoFile, setVideoFile, wizardStep, setWizardStep, shuttlecockPos, setShuttlecockPos, netBase, netTop, ground, poseLandmarks, setPoseLandmarks, language } = useStore((state: AppState) => state);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

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
          }
        }
      } catch (e) {
        // Silent catch for frame processing
      }
    };
    
    const interval = setInterval(processFrame, 100);
    return () => clearInterval(interval);
  }, []);

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const calibration = netBase && netTop && ground
        ? { netBase, netTop, ground }
        : null;
      
      const { verdict, angles } = calibration && shuttlecockPos
        ? calculateVerdict(calibration, shuttlecockPos, poseLandmarks)
        : { verdict: 'VAR_CHALLENGE', angles: { shoulder: 0, elbow: 0, wrist: 0 } };

      navigate(ROUTES.RESULT, {
        state: {
          verdict,
          angles,
          timestamp: new Date().toISOString(),
        },
      });
    }, 1500);
  };

  return (
    <div style={{ background: 'var(--bg-color)', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      <div style={{ padding: '24px 16px 16px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-color)', fontWeight: 800, margin: '0 0 8px', fontSize: '1.2rem' }}>
          {language === 'ko' ? '타구 순간 분석' : 'Impact Analysis'}
        </h3>
        <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0, opacity: 0.8 }}>
          {language === 'ko' ? '영상을 슬라이드하여 셔틀콕을 치는 순간을 찾아주세요' : 'Slide to find the exact moment of impact'}
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
        
        {/* Video Player */}
        <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <video 
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 1)}
            style={{ width: '100%', maxHeight: '50vh', display: 'block' }}
          />
          <canvas 
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
          />
          
          {/* Analysis indicator overlay */}
          {isAnalyzing && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,159,180,0.4)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
               <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #fff', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
               <p style={{ color: '#fff', fontWeight: 800, marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>AI가 판독 중입니다...</p>
            </div>
          )}
        </div>

        {/* Frame Selection Controls */}
        <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '20px', border: '1px solid var(--card-border)', boxShadow: '0 8px 16px rgba(255, 159, 180, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', width: '40px' }}>{currentTime.toFixed(2)}s</span>
             <input 
                type="range" 
                min={0} 
                max={duration || 1} 
                step={0.01} 
                value={currentTime} 
                onChange={handleTimeChange}
                style={{ flex: 1, accentColor: 'var(--accent-color)', height: '20px' }}
              />
             <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', width: '40px', textAlign: 'right' }}>{duration.toFixed(2)}s</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button onClick={() => setCurrentTime(Math.max(0, currentTime - 0.03))} style={{ padding: '8px 16px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--text-main)', fontSize: '0.8rem' }}>- 1프레임</button>
            <button onClick={() => setCurrentTime(Math.min(duration, currentTime + 0.03))} style={{ padding: '8px 16px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--text-main)', fontSize: '0.8rem' }}>+ 1프레임</button>
          </div>
        </div>

        <button 
          onClick={handleStartAnalysis}
          disabled={isAnalyzing}
          style={{ 
            padding: '18px', 
            borderRadius: '16px', 
            background: 'var(--accent-color)', 
            color: '#fff', 
            border: 'none', 
            fontWeight: 800, 
            fontSize: '1rem', 
            marginTop: 'auto',
            marginBottom: '2rem',
            boxShadow: '0 4px 12px rgba(255, 159, 180, 0.3)',
            opacity: isAnalyzing ? 0.7 : 1
          }}
        >
          {language === 'ko' ? '분석 시작하기' : 'Analyze Now'}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AnalysisSetup;
