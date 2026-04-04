import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Square } from 'lucide-react';

const Camera = () => {
  const navigate = useNavigate();
  const { setVideoFile } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [pitchDeg, setPitchDeg] = useState(0); // For the AR line vertical offset
  const [rollDeg, setRollDeg] = useState(0);   // For the leveler dot
  const [showARLine, setShowARLine] = useState(true);

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
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
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

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // beta: front to back tilt [-180, 180] (90 is straight up vertical)
      // gamma: left to right tilt [-90, 90]
      if (e.beta !== null && e.gamma !== null) {
        const tilt = e.beta - 90; 
        setPitchDeg(tilt * 4); 
        
        let roll = e.gamma; 
        // Clamp the roll for the UI bubble
        if (roll > 45) roll = 45;
        if (roll < -45) roll = -45;
        // Map -45..45 to -40..40 pixels for UI translation
        setRollDeg((roll / 45) * 40); 
      }
    };
    
    if (window.DeviceOrientationEvent) {
      // For iOS 13+ devices, requesting permission might be needed but we try default binding first.
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (videoRef.current && videoRef.current.srcObject && !isRecording) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="camera-container" style={{ background: '#000', height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* Top action bar over video */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
        <button 
          onClick={() => setShowARLine(!showARLine)}
          style={{
            background: showARLine ? 'var(--accent-color)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: showARLine ? 'none' : '1px solid rgba(255,255,255,0.4)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer'
          }}
        >
          {showARLine ? '1.15m 라인 숨기기' : '1.15m 라인 표시'}
        </button>
      </div>

      <div className="video-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        
        {/* AR Level Line Container */}
        {showARLine && (
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', borderTop: '2px dashed rgba(57, 255, 20, 0.8)', pointerEvents: 'none', transform: `translateY(${pitchDeg}px)`, transition: 'transform 0.1s ease-out' }}>
            <span style={{ position: 'absolute', right: 10, top: -20, color: '#39FF14', fontWeight: 'bold', textShadow: '1px 1px 2px black', fontSize: '0.85rem' }}>◀ 1.15m</span>
          </div>
        )}

        {/* Leveler Sensor UI */}
        <div style={{ position: 'absolute', bottom: '140px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 20 }}>
          <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, position: 'relative' }}>
            {/* The bubble (green dot) */}
            <div style={{ position: 'absolute', top: -3, left: '50%', width: 10, height: 10, background: '#39FF14', borderRadius: '50%', transform: `translateX(calc(-50% - ${rollDeg}px))`, transition: 'transform 0.1s ease-out', boxShadow: '0 0 4px #39FF14' }} />
          </div>
          <span style={{ color: '#39FF14', fontSize: '11px', fontWeight: 'bold' }}>수평</span>
        </div>
      </div>

      {/* Floating Record Button Overlay */}
      <div style={{ position: 'absolute', bottom: '3rem', left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        {!isRecording ? (
          <button 
            className="record-btn"
            onClick={toggleRecording}
            style={{ width: 72, height: 72, background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div className="record-circle" style={{ width: 54, height: 54, background: '#ff3b3b', borderRadius: '50%', transition: 'all 0.2s' }} />
          </button>
        ) : (
          <button 
            className="record-btn recording"
            onClick={toggleRecording}
            style={{ width: 72, height: 72, background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div className="record-circle" style={{ width: 32, height: 32, background: '#ff3b3b', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Square fill="white" stroke="white" size={16} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default Camera;
