import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Square, ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';

type CameraError = 'unsupported' | 'permission' | 'general';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { min: 1280, ideal: 1920 },
      height: { min: 720, ideal: 1080 },
      frameRate: { ideal: 30, min: 24 },
    },
  },
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  },
  {
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  },
];

const getRecordingVideoBitrate = (stream: MediaStream) => {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  const width = settings?.width || 0;
  const height = settings?.height || 0;
  const longestSide = Math.max(width, height);

  if (longestSide >= 1920) return 8_000_000;
  if (longestSide >= 1280) return 5_000_000;
  return 2_500_000;
};

const openBestAvailableCamera = async () => {
  let lastError: unknown;

  for (const constraints of CAMERA_CONSTRAINTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
};

const logCameraSettings = (stream: MediaStream) => {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  if (!settings) return;

  console.info('[camera] active stream settings', {
    width: settings.width,
    height: settings.height,
    frameRate: settings.frameRate,
    facingMode: settings.facingMode,
  });
};

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
        const recorderOptions: MediaRecorderOptions = {
          videoBitsPerSecond: getRecordingVideoBitrate(stream),
          ...(mimeType ? { mimeType } : {}),
        };
        const recorder = new MediaRecorder(stream, recorderOptions);
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
    openBestAvailableCamera()
      .then(stream => {
        setCameraError(null);
        logCameraSettings(stream);
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

  const getCameraErrorHelp = () => {
    if (!cameraError) return [];

    if (cameraError === 'permission') {
      return language === 'ko'
        ? ['주소창의 자물쇠 또는 카메라 아이콘을 누르세요.', '카메라를 허용으로 바꾼 뒤 새로고침하세요.', '다시 시도를 눌러 촬영을 시작하세요.']
        : ['Tap the lock or camera icon in the address bar.', 'Allow camera access, then refresh the page.', 'Tap Try Again to start recording.'];
    }

    if (cameraError === 'unsupported' && !window.isSecureContext) {
      return language === 'ko'
        ? ['Cloudflare HTTPS 주소로 접속했는지 확인하세요.', '크롬 또는 사파리 최신 버전에서 다시 열어주세요.']
        : ['Open the Cloudflare HTTPS address.', 'Try again in the latest Chrome or Safari.'];
    }

    return language === 'ko'
      ? ['다른 앱에서 카메라를 사용 중이면 종료하세요.', '브라우저를 새로고침한 뒤 다시 시도하세요.']
      : ['Close other apps using the camera.', 'Refresh the browser and try again.'];
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

  const levelOffsetX = clamp(level.roll / 15, -1, 1) * 17;
  const levelOffsetY = clamp(level.pitch / 18, -1, 1) * 17;
  const isLevel = Math.abs(level.roll) <= 3 && Math.abs(level.pitch) <= 8;
  const levelText = language === 'ko'
    ? (isLevel ? '각도 좋음' : '기울기 맞추기')
    : (isLevel ? 'Aligned' : 'Level');
  const shootingChecklist = language === 'ko'
    ? ['옆 90도', '1초 정지', '서버 전신', '뒤 사람 피하기', '폰 고정']
    : ['Side 90°', 'Pause 1s', 'Server full body', 'Avoid bystanders', 'Phone steady'];
  const cameraErrorHelp = getCameraErrorHelp();

  return (
    <div className="camera-container" style={{ background: '#000', height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: 'calc(14px + env(safe-area-inset-left))', zIndex: 40, display: 'flex', gap: '12px' }}>
        <button
          type="button"
          aria-label={language === 'ko' ? '홈으로 돌아가기' : 'Back to home'}
          onClick={() => navigate(ROUTES.HOME)}
          style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', right: 'calc(14px + env(safe-area-inset-right))', zIndex: 40 }}>
        <button
          type="button"
          aria-label={showGuides
            ? (language === 'ko' ? '촬영 가이드 숨기기' : 'Hide recording guides')
            : (language === 'ko' ? '촬영 가이드 표시' : 'Show recording guides')}
          onClick={() => setShowGuides(!showGuides)}
          style={{
            background: showGuides ? 'var(--accent-color)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            padding: '0 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            height: 40,
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

            <div style={{ position: 'absolute', top: 'calc(68px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: '#fff', background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '16px', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.35, textAlign: 'center', backdropFilter: 'blur(10px)', width: 'max-content', maxWidth: 'calc(100% - 32px)', boxSizing: 'border-box' }}>
              {language === 'ko' ? '서비스 전 1초간 똑바로 선 뒤 시작' : 'Stand upright for 1 second before serving'}
            </div>

            {!cameraError && (
              <div style={{ position: 'absolute', top: 'calc(112px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '6px', color: '#fff', width: 'max-content', maxWidth: 'calc(100% - 32px)' }}>
                {shootingChecklist.map((item, index) => (
                  <span key={item} style={{ borderRadius: 999, background: 'rgba(0,0,0,0.46)', border: '1px solid rgba(255,255,255,0.16)', padding: '5px 8px', fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)' }}>
                    {index + 1}. {item}
                  </span>
                ))}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 'calc(118px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: '#fff', background: 'rgba(0,0,0,0.48)', border: `1px solid ${isLevel ? 'rgba(48,209,88,0.58)' : 'rgba(255,255,255,0.18)'}`, borderRadius: 999, padding: '8px 12px 8px 8px', display: 'flex', gap: '10px', alignItems: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${isLevel ? 'rgba(48,209,88,0.82)' : 'rgba(255,255,255,0.74)'}`, background: 'rgba(255,255,255,0.10)', position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', transform: 'translate(-50%, -50%)' }} />
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: 14, height: 14, borderRadius: '50%', background: isLevel ? '#30D158' : 'var(--accent-color)', boxShadow: isLevel ? '0 0 10px rgba(48,209,88,0.55)' : '0 0 10px rgba(255,159,180,0.42)', transform: `translate(calc(-50% + ${levelOffsetX}px), calc(-50% + ${levelOffsetY}px))`, transition: 'transform 0.12s ease-out, background-color 0.12s ease-out' }} />
              </div>

              <div style={{ minWidth: 58, textAlign: 'center', color: isLevel ? '#30D158' : '#fff', fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                {levelText}
              </div>
            </div>
          </>
        )}

        {isRecording && (
          <div style={{ position: 'absolute', top: 'calc(68px + env(safe-area-inset-top))', right: 'calc(16px + env(safe-area-inset-right))', zIndex: 34, display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 900, fontSize: '0.76rem', background: 'rgba(255,59,59,0.78)', borderRadius: 999, padding: '6px 10px', letterSpacing: 0 }}>
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
              {cameraErrorHelp.length > 0 && (
                <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 12px', marginBottom: '14px', display: 'grid', gap: '6px' }}>
                  {cameraErrorHelp.map((step, index) => (
                    <div key={step} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '8px', alignItems: 'start', fontSize: '0.76rem', lineHeight: 1.45, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.66rem', fontWeight: 900 }}>{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                aria-label={language === 'ko' ? '카메라 다시 시도' : 'Try camera again'}
                onClick={startCamera}
                style={{ border: 'none', borderRadius: '10px', padding: '10px 16px', background: 'var(--accent-color)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                {language === 'ko' ? '다시 시도' : 'Try Again'}
              </button>
            </div>
          </div>
        )}
      </div>

      {(!cameraError || videoPreviewUrl) && (
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', minHeight: 132, padding: '24px max(16px, env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 45, background: 'linear-gradient(transparent, rgba(0,0,0,0.64))', boxSizing: 'border-box' }}>
        {videoPreviewUrl ? (
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '320px' }}>
            <button
              type="button"
              aria-label={language === 'ko' ? '다시 촬영하기' : 'Retake video'}
              onClick={handleRetry}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backdropFilter: 'blur(10px)' }}
            >
              <RotateCcw size={20} /> {language === 'ko' ? '다시 촬영' : 'Retake'}
            </button>
            <button
              type="button"
              aria-label={language === 'ko' ? '이 영상 사용하기' : 'Use this video'}
              onClick={handleUseVideo}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              {language === 'ko' ? '사용하기' : 'Use Video'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={isRecording
              ? (language === 'ko' ? '녹화 정지' : 'Stop recording')
              : (language === 'ko' ? '녹화 시작' : 'Start recording')}
            className="record-btn"
            onClick={toggleRecording}
            style={{ width: 76, height: 76, flex: '0 0 auto', boxSizing: 'border-box', background: 'transparent', border: '4px solid white', borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, margin: 0, lineHeight: 0, appearance: 'none', WebkitAppearance: 'none' }}
          >
            <div className="record-circle" style={{ width: isRecording ? 32 : 56, height: isRecording ? 32 : 56, background: '#ff3b3b', borderRadius: isRecording ? '8px' : '50%', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
              {isRecording && <Square fill="white" stroke="white" size={16} />}
            </div>
          </button>
        )}
      </div>
      )}
    </div>
  );
};

export default Camera;
