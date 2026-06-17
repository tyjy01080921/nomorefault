import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Square, ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';

type CameraError = 'unsupported' | 'permission' | 'general';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const Camera = () => {
  const navigate = useNavigate();
  const {
    setVideoFile,
    resetAnalysisInputs,
    language,
  } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);
  const previewUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [level, setLevel] = useState({ roll: 0, pitch: 0 });

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
    if (typeof MediaRecorder === 'undefined') return undefined;

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
      if (!videoRef.current?.srcObject || typeof MediaRecorder === 'undefined') {
        setCameraError('general');
        return;
      }

      try {
        resetAnalysisInputs();
        releasePreviewUrl();
        setVideoPreviewUrl(null);

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
        console.error('Recording failed', e);
        setCameraError('general');
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
    resetAnalysisInputs();
    startCamera();
  };

  const startCamera = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('unsupported');
      return;
    }

    setCameraError(null);
    stopCameraStream();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        setCameraError(null);
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error('Camera error:', err);
        setCameraError(err?.name === 'NotAllowedError' ? 'permission' : 'general');
      });
  }, [stopCameraStream]);

  const getCameraErrorMessage = () => {
    if (!cameraError) return '';

    if (cameraError === 'unsupported') {
      if (!window.isSecureContext) {
        return language === 'ko'
          ? '현재 주소는 보안 연결이 아니라 카메라와 업데이트 감지가 차단됩니다. Cloudflare HTTPS 주소에서 확인해주세요.'
          : 'This address is not secure, so camera access and update detection are blocked. Use the Cloudflare HTTPS URL.';
      }

      return language === 'ko'
        ? '이 브라우저는 카메라 촬영을 지원하지 않습니다.'
        : 'This browser does not support camera recording.';
    }

    if (cameraError === 'permission') {
      return language === 'ko'
        ? '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
        : 'Camera permission was denied. Allow camera access in your browser settings.';
    }

    return language === 'ko'
      ? '카메라를 시작할 수 없습니다. 권한과 브라우저 설정을 확인해주세요.'
      : 'Could not start the camera. Check permissions and browser settings.';
  };

  useEffect(() => {
    startCamera();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const roll = e.gamma === null ? 0 : clamp(e.gamma, -45, 45);
      const pitch = e.beta === null ? 0 : clamp(e.beta - 90, -45, 45);

      setLevel((prev) => (
        Math.abs(prev.roll - roll) < 0.2 && Math.abs(prev.pitch - pitch) < 0.2
          ? prev
          : { roll, pitch }
      ));
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      stopCameraStream();
      releasePreviewUrl();
    };
  }, [releasePreviewUrl, startCamera, stopCameraStream]);

  const horizontalOffset = clamp(level.roll / 15, -1, 1) * 34;
  const verticalOffset = clamp(level.pitch / 18, -1, 1) * 30;
  const isLevel = Math.abs(level.roll) <= 3 && Math.abs(level.pitch) <= 8;
  const levelText = language === 'ko'
    ? (isLevel ? '각도 좋음' : '수직·수평 맞추기')
    : (isLevel ? 'Aligned' : 'Level the shot');

  return (
    <div className="camera-container" style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 40, display: 'flex', gap: '12px' }}>
        <button onClick={() => navigate(ROUTES.HOME)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', display: 'flex' }}><ArrowLeft size={20} /></button>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 40 }}>
        <button
          onClick={() => setShowGuides(!showGuides)}
          style={{
            background: showGuides ? 'var(--accent-color)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
          }}
        >
          {showGuides
            ? (language === 'ko' ? '가이드 숨기기' : 'Hide Guides')
            : (language === 'ko' ? '가이드 표시' : 'Show Guides')}
        </button>
      </div>

      <div className="video-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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

        {showGuides && !videoPreviewUrl && (
          <>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px solid rgba(255,255,255,0.65)', transform: 'translateX(-0.5px)', pointerEvents: 'none', zIndex: 25 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid rgba(255,255,255,0.35)', transform: 'translateY(-0.5px)', pointerEvents: 'none', zIndex: 25 }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.82)', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 26 }} />

            <div style={{ position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: '#fff', background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '16px', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.35, textAlign: 'center', backdropFilter: 'blur(10px)', width: 'max-content', maxWidth: 'calc(100% - 96px)' }}>
              {language === 'ko' ? '네트 기둥을 세로선에 맞춰 촬영' : 'Align the net post to the vertical guide'}
            </div>

            <div style={{ position: 'absolute', bottom: 148, left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: '#fff', background: 'rgba(0,0,0,0.46)', border: `1px solid ${isLevel ? 'rgba(48,209,88,0.55)' : 'rgba(255,255,255,0.18)'}`, borderRadius: '18px', padding: '10px 14px', display: 'grid', gridTemplateColumns: 'auto auto', gap: '12px', alignItems: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>{language === 'ko' ? '수평' : 'Roll'}</span>
                  <div style={{ width: 82, height: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', top: -3, width: 12, height: 12, borderRadius: '50%', background: isLevel ? '#30D158' : 'var(--accent-color)', boxShadow: '0 0 8px rgba(255,255,255,0.35)', transform: `translateX(calc(-50% + ${horizontalOffset}px))`, transition: 'transform 0.12s ease-out, background-color 0.12s ease-out' }} />
                    <div style={{ position: 'absolute', left: '50%', top: -4, height: 14, borderLeft: '1px solid rgba(255,255,255,0.45)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>{language === 'ko' ? '수직' : 'Pitch'}</span>
                  <div style={{ width: 82, height: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', top: -3, width: 12, height: 12, borderRadius: '50%', background: isLevel ? '#30D158' : '#32ADE6', boxShadow: '0 0 8px rgba(255,255,255,0.35)', transform: `translateX(calc(-50% + ${verticalOffset}px))`, transition: 'transform 0.12s ease-out, background-color 0.12s ease-out' }} />
                    <div style={{ position: 'absolute', left: '50%', top: -4, height: 14, borderLeft: '1px solid rgba(255,255,255,0.45)' }} />
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 54, textAlign: 'center', color: isLevel ? '#30D158' : '#fff', fontSize: '0.76rem', fontWeight: 900 }}>
                {levelText}
              </div>
            </div>
          </>
        )}

        {isRecording && (
          <div style={{ position: 'absolute', top: 68, right: 16, zIndex: 34, display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 900, fontSize: '0.76rem', background: 'rgba(255,59,59,0.78)', borderRadius: 999, padding: '6px 10px', letterSpacing: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
            REC
          </div>
        )}

        {cameraError && !videoPreviewUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.56)' }}>
            <div style={{ width: '100%', maxWidth: '340px', borderRadius: '16px', background: 'rgba(20,20,20,0.88)', border: '1px solid rgba(255,255,255,0.18)', padding: '20px', color: '#fff', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
              <AlertTriangle size={28} color="var(--accent-color)" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 700, marginBottom: '14px' }}>
                {getCameraErrorMessage()}
              </div>
              <button
                type="button"
                onClick={startCamera}
                style={{ border: 'none', borderRadius: '10px', padding: '10px 16px', background: 'var(--accent-color)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                {language === 'ko' ? '다시 시도' : 'Try Again'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '2rem 1rem 4rem', display: 'flex', justifyContent: 'center', zIndex: 45, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
        {videoPreviewUrl ? (
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '320px' }}>
            <button
              onClick={handleRetry}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backdropFilter: 'blur(10px)' }}
            >
              <RotateCcw size={20} /> {language === 'ko' ? '다시 촬영' : 'Retake'}
            </button>
            <button
              onClick={handleUseVideo}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              {language === 'ko' ? '사용하기' : 'Use Video'}
            </button>
          </div>
        ) : (
          <button
            className="record-btn"
            onClick={toggleRecording}
            style={{ width: 72, height: 72, background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div className="record-circle" style={{ width: isRecording ? 32 : 54, height: isRecording ? 32 : 54, background: '#ff3b3b', borderRadius: isRecording ? '8px' : '50%', transition: 'all 0.2s' }}>
              {isRecording && <Square fill="white" stroke="white" size={16} style={{ margin: '8px' }} />}
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default Camera;
