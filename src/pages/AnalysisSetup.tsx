import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';
import { calculateServiceLineY, calculateVerdict } from '../utils/verdict';

type AnnotationStep = 'impact' | 'netBase' | 'netTop' | 'ground' | 'shuttlecock' | 'ready';

interface Point {
  x: number;
  y: number;
}

interface OverlayLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const AnalysisSetup = () => {
  const navigate = useNavigate();
  const {
    videoFile,
    shuttlecockPos,
    netBase,
    netTop,
    ground,
    poseLandmarks,
    setPoseLandmarks,
    setNetBase,
    setNetTop,
    setGround,
    setShuttlecockPos,
    resetAnalysisInputs,
    language,
  } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [annotationStep, setAnnotationStep] = useState<AnnotationStep>('impact');
  const [overlayLayout, setOverlayLayout] = useState<OverlayLayout>({
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  });

  const videoUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : ''),
    [videoFile]
  );

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    if (!videoFile) {
      navigate(ROUTES.CAMERA, { replace: true });
    }
  }, [navigate, videoFile]);

  useEffect(() => {
    setAnnotationStep('impact');
  }, [videoUrl]);

  const updateOverlayLayout = useCallback(() => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video) return;

    const playerRect = player.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    if (playerRect.width <= 0 || playerRect.height <= 0 || videoRect.width <= 0 || videoRect.height <= 0) return;

    const next = {
      left: (videoRect.left - playerRect.left) / playerRect.width,
      top: (videoRect.top - playerRect.top) / playerRect.height,
      width: videoRect.width / playerRect.width,
      height: videoRect.height / playerRect.height,
    };

    setOverlayLayout((prev) => (
      Math.abs(prev.left - next.left) < 0.001
      && Math.abs(prev.top - next.top) < 0.001
      && Math.abs(prev.width - next.width) < 0.001
      && Math.abs(prev.height - next.height) < 0.001
        ? prev
        : next
    ));
  }, []);

  useEffect(() => {
    updateOverlayLayout();
    window.addEventListener('resize', updateOverlayLayout);
    return () => window.removeEventListener('resize', updateOverlayLayout);
  }, [updateOverlayLayout]);

  const seekTo = useCallback((time: number) => {
    const nextTime = Math.max(0, Math.min(duration || 0, time));
    setCurrentTime(nextTime);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
  }, [duration]);

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const captureFrameSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return undefined;

    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = video.videoWidth;
    snapshotCanvas.height = video.videoHeight;
    const ctx = snapshotCanvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    return snapshotCanvas.toDataURL('image/png');
  }, []);

  const handleLoadedMetadata = () => {
    const nextDuration = videoRef.current?.duration || 1;
    const nextTime = Math.min(currentTime, nextDuration);
    setDuration(nextDuration);
    setCurrentTime(nextTime);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
    requestAnimationFrame(updateOverlayLayout);
  };

  useEffect(() => {
    if (!videoUrl) return;
    let isProcessing = false;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || isProcessing) return;
      isProcessing = true;

      try {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

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
        console.warn('[analysis] frame processing failed', e);
      } finally {
        isProcessing = false;
      }
    };

    const interval = setInterval(processFrame, 100);
    return () => clearInterval(interval);
  }, [setPoseLandmarks, videoUrl]);

  const handleConfirmImpactFrame = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      setCurrentTime(video.currentTime);
    }
    setAnnotationStep('netBase');
    requestAnimationFrame(updateOverlayLayout);
  };

  const handleRestartAnnotation = () => {
    resetAnalysisInputs();
    setAnnotationStep('impact');
  };

  const handlePlayerPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (annotationStep === 'impact' || annotationStep === 'ready' || isAnalyzing) return;

    const video = videoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    if (
      e.clientX < rect.left
      || e.clientX > rect.right
      || e.clientY < rect.top
      || e.clientY > rect.bottom
    ) {
      return;
    }

    e.preventDefault();
    const point = {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };

    if (annotationStep === 'netBase') {
      setNetBase(point.y, point.x);
      setAnnotationStep('netTop');
    } else if (annotationStep === 'netTop') {
      setNetTop(point.y, point.x);
      setAnnotationStep('ground');
    } else if (annotationStep === 'ground') {
      setGround(point.y, point.x);
      setAnnotationStep('shuttlecock');
    } else if (annotationStep === 'shuttlecock') {
      setShuttlecockPos(point);
      setAnnotationStep('ready');
    }
  };

  const projectVideoPoint = useCallback((point: Point) => ({
    x: overlayLayout.left + point.x * overlayLayout.width,
    y: overlayLayout.top + point.y * overlayLayout.height,
  }), [overlayLayout]);

  const calibration = netBase && netTop && ground
    ? { netBase, netTop, ground }
    : null;
  const serviceLineY = calibration ? calculateServiceLineY(calibration) : null;
  const projectedServiceLine = serviceLineY !== null
    ? projectVideoPoint({ x: 0.5, y: serviceLineY })
    : null;
  const canAnalyze = annotationStep === 'ready' && calibration !== null && shuttlecockPos !== null;

  const handleStartAnalysis = () => {
    if (!canAnalyze || !calibration || !shuttlecockPos) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      const { verdict, angles } = calculateVerdict(calibration, shuttlecockPos, poseLandmarks);

      navigate(ROUTES.RESULT, {
        state: {
          verdict,
          angles,
          frameSnapshot: captureFrameSnapshot(),
          timestamp: new Date().toISOString(),
        },
      });
    }, 1500);
  };

  const stepCopy: Record<AnnotationStep, { title: string; body: string }> = {
    impact: {
      title: language === 'ko' ? '타구 순간 선택' : 'Choose Impact Frame',
      body: language === 'ko'
        ? '셔틀콕을 치는 순간으로 영상을 맞춘 뒤 프레임을 저장하세요.'
        : 'Scrub to the shuttle contact moment, then save the frame.',
    },
    netBase: {
      title: language === 'ko' ? '네트 기둥 하단' : 'Net Post Base',
      body: language === 'ko'
        ? '영상 속 네트 기둥이 바닥과 만나는 지점을 누르세요.'
        : 'Tap where the net post meets the floor.',
    },
    netTop: {
      title: language === 'ko' ? '네트 기둥 상단' : 'Net Post Top',
      body: language === 'ko'
        ? '같은 기둥의 상단 지점을 누르세요.'
        : 'Tap the top of the same net post.',
    },
    ground: {
      title: language === 'ko' ? '서버 지면' : 'Server Ground',
      body: language === 'ko'
        ? '서비스하는 선수의 발 근처 바닥 높이를 누르세요.'
        : 'Tap the floor level near the server.',
    },
    shuttlecock: {
      title: language === 'ko' ? '셔틀콕 위치' : 'Shuttle Position',
      body: language === 'ko'
        ? '타구 순간의 셔틀콕 중심을 누르세요.'
        : 'Tap the shuttle center at impact.',
    },
    ready: {
      title: language === 'ko' ? '분석 준비 완료' : 'Ready to Analyze',
      body: language === 'ko'
        ? '1.15m 기준선을 확인한 뒤 분석을 시작하세요.'
        : 'Check the 1.15m reference line, then start analysis.',
    },
  };

  const progressItems = [
    { key: 'impact', label: language === 'ko' ? '프레임' : 'Frame', done: annotationStep !== 'impact' },
    { key: 'netBase', label: language === 'ko' ? '기둥 하단' : 'Base', done: Boolean(netBase) },
    { key: 'netTop', label: language === 'ko' ? '기둥 상단' : 'Top', done: Boolean(netTop) },
    { key: 'ground', label: language === 'ko' ? '지면' : 'Ground', done: Boolean(ground) },
    { key: 'shuttlecock', label: language === 'ko' ? '셔틀콕' : 'Shuttle', done: Boolean(shuttlecockPos) },
  ];

  const annotationPoints = [
    { key: 'netBase', point: netBase, color: '#FF453A', label: language === 'ko' ? '하단' : 'Base' },
    { key: 'netTop', point: netTop, color: '#32ADE6', label: language === 'ko' ? '상단' : 'Top' },
    { key: 'ground', point: ground, color: '#30D158', label: language === 'ko' ? '지면' : 'Ground' },
    { key: 'shuttlecock', point: shuttlecockPos, color: 'var(--accent-color)', label: language === 'ko' ? '셔틀콕' : 'Shuttle' },
  ];

  const isPickingPoint = annotationStep !== 'impact' && annotationStep !== 'ready';

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: '18px 16px 12px', display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.CAMERA)}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--card-border)', background: 'var(--panel-bg)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={language === 'ko' ? '촬영 화면으로' : 'Back to camera'}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <h3 style={{ color: 'var(--accent-color)', fontWeight: 800, margin: '0 0 6px', fontSize: '1.15rem' }}>
            {stepCopy[annotationStep].title}
          </h3>
          <p style={{ color: 'var(--text-main)', fontSize: '0.82rem', margin: 0, opacity: 0.8, lineHeight: 1.35 }}>
            {stepCopy[annotationStep].body}
          </p>
        </div>
        <span />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 16px 18px' }}>
        <div
          ref={playerRef}
          onPointerDown={handlePlayerPointer}
          style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', cursor: isPickingPoint ? 'crosshair' : 'default', touchAction: isPickingPoint ? 'none' : 'auto' }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={updateOverlayLayout}
            onSeeked={() => {
              setCurrentTime(videoRef.current?.currentTime || currentTime);
              updateOverlayLayout();
            }}
            style={{ width: '100%', maxHeight: '50vh', display: 'block' }}
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: `${overlayLayout.top * 100}%`, left: `${overlayLayout.left * 100}%`, width: `${overlayLayout.width * 100}%`, height: `${overlayLayout.height * 100}%`, pointerEvents: 'none', zIndex: 10 }}
          />

          {projectedServiceLine && (
            <div style={{ position: 'absolute', left: `${overlayLayout.left * 100}%`, top: `${projectedServiceLine.y * 100}%`, width: `${overlayLayout.width * 100}%`, borderTop: '2px dashed var(--accent-color)', transform: 'translateY(-1px)', zIndex: 18, pointerEvents: 'none' }}>
              <span style={{ position: 'absolute', right: 8, top: -21, color: 'var(--accent-color)', fontSize: '0.76rem', fontWeight: 900, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>1.15m</span>
            </div>
          )}

          {annotationPoints.map(({ key, point, color, label }) => {
            if (!point) return null;
            const projected = projectVideoPoint(point);

            return (
              <div key={key} style={{ position: 'absolute', top: `${projected.y * 100}%`, left: `${projected.x * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 22, pointerEvents: 'none', display: 'grid', justifyItems: 'center', gap: '4px' }}>
                <div style={{ width: key === 'shuttlecock' ? 18 : 14, height: key === 'shuttlecock' ? 18 : 14, borderRadius: '50%', background: key === 'shuttlecock' ? 'rgba(255,255,255,0.3)' : color, border: `3px solid ${key === 'shuttlecock' ? color : '#fff'}`, boxShadow: '0 2px 10px rgba(0,0,0,0.45)' }} />
                <span style={{ color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{label}</span>
              </div>
            );
          })}

          {isPickingPoint && (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 24, padding: '10px 12px', borderRadius: '14px', background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              {stepCopy[annotationStep].body}
            </div>
          )}

          {isAnalyzing && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,159,180,0.4)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #fff', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#fff', fontWeight: 800, marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {language === 'ko' ? 'AI가 판독 중입니다...' : 'Analyzing...'}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px' }}>
          {progressItems.map((item) => (
            <div key={item.key} style={{ minHeight: 42, borderRadius: '10px', border: '1px solid var(--card-border)', background: item.done ? 'rgba(48,209,88,0.16)' : 'var(--panel-bg)', color: item.done ? '#30D158' : 'var(--text-sub)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.66rem', fontWeight: 800, textAlign: 'center', padding: '4px' }}>
              {item.done ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid currentColor' }} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--panel-bg)', padding: '16px', borderRadius: '18px', border: '1px solid var(--card-border)', boxShadow: '0 8px 16px rgba(255, 159, 180, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', width: '44px' }}>{currentTime.toFixed(2)}s</span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleTimeChange}
              disabled={annotationStep !== 'impact' || isAnalyzing}
              style={{ flex: 1, accentColor: 'var(--accent-color)', height: '20px', opacity: annotationStep === 'impact' ? 1 : 0.45 }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', width: '44px', textAlign: 'right' }}>{duration.toFixed(2)}s</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: annotationStep === 'impact' ? '1fr 1fr 1.2fr' : '1fr', gap: '8px' }}>
            {annotationStep === 'impact' ? (
              <>
                <button onClick={() => seekTo(currentTime - 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 800 }}>- 1프레임</button>
                <button onClick={() => seekTo(currentTime + 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 800 }}>+ 1프레임</button>
                <button onClick={handleConfirmImpactFrame} style={{ padding: '10px 8px', borderRadius: '10px', background: 'var(--accent-color)', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 900 }}>
                  {language === 'ko' ? '프레임 저장' : 'Save Frame'}
                </button>
              </>
            ) : (
              <button onClick={handleRestartAnnotation} style={{ padding: '11px 12px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RotateCcw size={15} />
                {language === 'ko' ? '프레임과 기준점 다시 지정' : 'Restart Frame and Points'}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleStartAnalysis}
          disabled={!canAnalyze || isAnalyzing}
          style={{
            padding: '18px',
            borderRadius: '16px',
            background: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            fontWeight: 800,
            fontSize: '1rem',
            marginTop: 'auto',
            boxShadow: '0 4px 12px rgba(255, 159, 180, 0.3)',
            opacity: canAnalyze && !isAnalyzing ? 1 : 0.48,
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
