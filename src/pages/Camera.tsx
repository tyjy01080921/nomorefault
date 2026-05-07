import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import AnalysisWizard from '../components/AnalysisWizard';
import { Square, ArrowLeft, RotateCcw } from 'lucide-react';
import { containerPointToVideoPoint, videoPointToContainerPoint } from '../utils/videoCoordinates';

const Camera = () => {
  const navigate = useNavigate();
  const {
    setVideoFile,
    wizardStep,
    setWizardStep,
    setNetBase,
    setNetTop,
    setGround,
    setShuttlecockPos,
  } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);
  const previewUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [pitchDeg, setPitchDeg] = useState(0); 
  const [rollDeg, setRollDeg] = useState(0);   
  const [showARLine, setShowARLine] = useState(true);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const getRecordingMimeType = () => {
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const toggleRecording = () => {
	    if (!isRecording) {
	      if (videoRef.current && videoRef.current.srcObject) {
	        try {
	          const stream = videoRef.current.srcObject as MediaStream;
	          const mimeType = getRecordingMimeType();
	          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
	          mediaRecorderRef.current = recorder;
	          recordedChunks.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
          };
	          recorder.onstop = () => {
	            const type = recorder.mimeType || 'video/webm';
	            const blob = new Blob(recordedChunks.current, { type });
	            const url = URL.createObjectURL(blob);
	            releasePreviewUrl();
	            previewUrlRef.current = url;
	            setVideoPreviewUrl(url);
	            const extension = type.includes('mp4') ? 'mp4' : 'webm';
	            const file = new File([blob], `nomorefault_record_${Date.now()}.${extension}`, { type });
	            setVideoFile(file);
	            stopCameraStream();
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

  const handleUseVideo = () => {
    navigate(ROUTES.ANALYSIS);
  };

  const handleRetry = () => {
    releasePreviewUrl();
    setVideoPreviewUrl(null);
    setVideoFile(null);
    // Restart camera if stopped
    startCamera();
  };

  const startCamera = useCallback(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stopCameraStream();
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
    }
  }, [stopCameraStream]);

  useEffect(() => {
    startCamera();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        const tilt = e.beta - 90; 
        setPitchDeg(tilt * 4); 
        
        let roll = e.gamma; 
        if (roll > 45) roll = 45;
        if (roll < -45) roll = -45;
        setRollDeg((roll / 45) * 40); 
      }
    };
    
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    // Start wizard on entry
    setWizardStep(1);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      setWizardStep(0);
      stopCameraStream();
      releasePreviewUrl();
    };
  }, [releasePreviewUrl, setWizardStep, startCamera, stopCameraStream]);

  const handleCanvasTouch = (e: MouseEvent | TouchEvent) => {
    if (wizardStep === 0 || wizardStep === 1 || wizardStep === 5) return;

    // AnalysisWizard의 dot 포지셔닝은 video-viewport div 기준(100%×100%)이므로,
    // 터치 좌표도 반드시 동일한 컨테이너를 기준으로 계산해야 dot이 정확히 놓입니다.
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();

    const clientX = 'touches' in e
      ? e.touches[0].clientX
      : (e as MouseEvent).clientX;
    const clientY = 'touches' in e
      ? e.touches[0].clientY
      : (e as MouseEvent).clientY;

    // 0~1 사이 정규화 좌표 (컨테이너 기준)
    const video = videoRef.current;
    const point = video && video.videoWidth > 0 && video.videoHeight > 0
      ? containerPointToVideoPoint(
          { x: clientX, y: clientY },
          rect,
          video.videoWidth,
          video.videoHeight,
          'cover',
        )
      : {
          x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
        };

    if (wizardStep === 2) setNetBase(point.y, point.x);
    else if (wizardStep === 3) setNetTop(point.y, point.x);
    else if (wizardStep === 4) setGround(point.y, point.x);
    else if (wizardStep === 6) setShuttlecockPos(point);
  };

  const projectVideoPoint = useCallback((point: { x: number; y: number }) => {
    const viewport = viewportRef.current;
    const video = videoRef.current;
    if (!viewport || !video || video.videoWidth <= 0 || video.videoHeight <= 0) return point;

    const rect = viewport.getBoundingClientRect();
    return videoPointToContainerPoint(
      point,
      rect.width,
      rect.height,
      video.videoWidth,
      video.videoHeight,
      'cover',
    );
  }, []);

  return (
    <div className="camera-container" style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* Header Overlays */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 40, display: 'flex', gap: '12px' }}>
        <button onClick={() => navigate(ROUTES.HOME)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', display: 'flex' }}><ArrowLeft size={20} /></button>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 40 }}>
        <button 
          onClick={() => setShowARLine(!showARLine)}
          style={{
            background: showARLine ? 'var(--accent-color)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
          }}
        >
          {showARLine ? '가이드 숨기기' : '가이드 표시'}
        </button>
      </div>

		      <div className="video-viewport"
	           ref={viewportRef}
	           onClick={handleCanvasTouch}
           onTouchStart={handleCanvasTouch}
           style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {videoPreviewUrl ? (
          <video 
            src={videoPreviewUrl}
            autoPlay 
            loop
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        )}
        
        {/* Wizard UI */}
	        {!videoPreviewUrl && <AnalysisWizard projectPoint={projectVideoPoint} />}

        {/* AR Level Line */}
        {showARLine && !videoPreviewUrl && (
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', borderTop: '2px dashed var(--accent-color)', pointerEvents: 'none', transform: `translateY(${pitchDeg}px)`, transition: 'transform 0.1s ease-out', zIndex: 30 }}>
            <span style={{ position: 'absolute', right: 10, top: -20, color: 'var(--accent-color)', fontWeight: 'bold', textShadow: '1px 1px 2px black', fontSize: '0.85rem' }}>◀ 1.15m</span>
          </div>
        )}

        {/* Leveler dot */}
        {!videoPreviewUrl && (
           <div style={{ position: 'absolute', bottom: '160px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 30 }}>
              <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', top: -3, left: '50%', width: 10, height: 10, background: 'var(--accent-color)', borderRadius: '50%', transform: `translateX(calc(-50% - ${rollDeg}px))`, transition: 'transform 0.1s ease-out', boxShadow: '0 0 4px var(--accent-color)' }} />
              </div>
           </div>
        )}
      </div>

      {/* Camera Controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '2rem 1rem 4rem', display: 'flex', justifyContent: 'center', zIndex: 45, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
        {videoPreviewUrl ? (
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '320px' }}>
            <button 
              onClick={handleRetry}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backdropFilter: 'blur(10px)' }}
            >
              <RotateCcw size={20} /> 다시 촬영
            </button>
            <button 
              onClick={handleUseVideo}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              사용하기
            </button>
          </div>
        ) : (
          wizardStep === 0 && (
            <button 
              className="record-btn"
              onClick={toggleRecording}
              style={{ width: 72, height: 72, background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <div className="record-circle" style={{ width: isRecording ? 32 : 54, height: isRecording ? 32 : 54, background: '#ff3b3b', borderRadius: isRecording ? '8px' : '50%', transition: 'all 0.2s' }}>
                {isRecording && <Square fill="white" stroke="white" size={16} style={{ margin: '8px' }} />}
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default Camera;
