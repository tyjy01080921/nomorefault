import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import AnalysisWizard from '../components/AnalysisWizard';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';

const Camera = () => {
  const navigate = useNavigate();
  const { videoFile, setVideoFile, wizardStep, setWizardStep, setNetBase, setNetTop, setGround, shuttlecockPos, setShuttlecockPos } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [pitchDeg, setPitchDeg] = useState(0);

  const toggleRecording = () => {
    if (!isRecording) {
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          mediaRecorderRef.current = recorder;
          recordedChunks.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
            const file = new File([blob], `nomorefault_record_${Date.now()}.webm`, { type: 'video/webm' });
            setVideoFile(file);
            navigate(ROUTES.ANALYSIS);
          };
          recorder.start();
          setIsRecording(true);
        } catch (e) {
          console.error("Recording failed", e);
        }
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    // Start Camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
    }
    
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

    return () => {
      cancelAnimationFrame(animationFrameId);
      setWizardStep(0);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
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

  return (
    <div className="camera-container" style={{ background: 'var(--bg-color)', height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <div className="video-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <canvas 
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: wizardStep > 0 ? 'auto' : 'none', zIndex: 10, cursor: wizardStep > 0 ? 'crosshair' : 'default' }}
        />
        <AnalysisWizard />
        
        {/* AR Level Line Container */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', borderTop: '2px dashed rgba(57, 255, 20, 0.7)', pointerEvents: 'none', transform: `translateY(${pitchDeg}px)` }}>
          <span style={{ position: 'absolute', right: 10, top: -20, color: '#39FF14', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>◀ 1.15m</span>
        </div>

        {/* Leveler Sensor UI */}
        <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -3, left: '50%', width: 12, height: 12, background: '#39FF14', borderRadius: '50%', transform: 'translateX(-50%)' }} />
          </div>
          <span style={{ color: '#39FF14', fontSize: '12px', fontWeight: 'bold' }}>수평</span>
        </div>
      </div>

      <div className="camera-controls" style={{ height: '100px', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button 
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          style={{ width: 72, height: 72, background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div className="record-circle" style={{ width: isRecording ? 32 : 54, height: isRecording ? 32 : 54, background: 'var(--danger-color)', borderRadius: isRecording ? '8px' : '50%', transition: 'all 0.2s' }} />
        </button>
      </div>
    </div>
  );
};

export default Camera;
