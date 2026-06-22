import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';
import { calculateServiceLineY, calculateVerdict } from '../utils/verdict';

type AnnotationStep = 'impact' | 'netBase' | 'netTop' | 'ground' | 'shuttlecock' | 'ready';
type PointStep = Exclude<AnnotationStep, 'impact' | 'ready'>;

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
const precisionZoom = 4;
const pointSteps: PointStep[] = ['netBase', 'netTop', 'ground', 'shuttlecock'];
const darkButtonText = '#2d1c22';

const isPointStep = (step: AnnotationStep): step is PointStep => (
  step === 'netBase'
  || step === 'netTop'
  || step === 'ground'
  || step === 'shuttlecock'
);

const AnalysisSetup = () => {
  const navigate = useNavigate();
  const {
    videoFile,
    shuttlecockPos,
    netBase,
    netTop,
    ground,
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
  const [draftPoint, setDraftPoint] = useState<Point | null>(null);
  const [isEditingPoint, setIsEditingPoint] = useState(false);
  const [framePreviewUrl, setFramePreviewUrl] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16 / 9');
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
    setDraftPoint(null);
    setIsEditingPoint(false);
    setFramePreviewUrl(null);
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
    const nextVideoWidth = videoRef.current?.videoWidth || 16;
    const nextVideoHeight = videoRef.current?.videoHeight || 9;
    const nextTime = Math.min(currentTime, nextDuration);
    setDuration(nextDuration);
    setCurrentTime(nextTime);
    setVideoAspectRatio(`${nextVideoWidth} / ${nextVideoHeight}`);
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
    setFramePreviewUrl(captureFrameSnapshot() ?? null);
    setDraftPoint(null);
    setIsEditingPoint(false);
    setAnnotationStep('netBase');
    requestAnimationFrame(updateOverlayLayout);
  };

  const handleRestartAnnotation = () => {
    resetAnalysisInputs();
    setDraftPoint(null);
    setFramePreviewUrl(null);
    setIsEditingPoint(false);
    setAnnotationStep('impact');
  };

  const getVideoPointFromClient = useCallback((clientX: number, clientY: number) => {
    const video = videoRef.current;
    if (!video) return null;

    const rect = video.getBoundingClientRect();
    if (
      clientX < rect.left
      || clientX > rect.right
      || clientY < rect.top
      || clientY > rect.bottom
    ) {
      return null;
    }

    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }, []);

  const handlePlayerPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!isPointStep(annotationStep) || isAnalyzing) return;

    const point = getVideoPointFromClient(e.clientX, e.clientY);
    if (!point) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!framePreviewUrl) {
      setFramePreviewUrl(captureFrameSnapshot() ?? null);
    }
    setDraftPoint(point);
  };

  const handlePlayerPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isPointStep(annotationStep) || isAnalyzing || !draftPoint) return;

    const point = getVideoPointFromClient(e.clientX, e.clientY);
    if (!point) return;

    e.preventDefault();
    setDraftPoint(point);
  };

  const applyAnnotationPoint = (step: PointStep, point: Point) => {
    if (step === 'netBase') {
      setNetBase(point.y, point.x);
    } else if (step === 'netTop') {
      setNetTop(point.y, point.x);
    } else if (step === 'ground') {
      setGround(point.y, point.x);
    } else if (step === 'shuttlecock') {
      setShuttlecockPos(point);
    }
  };

  const getNextStepAfterConfirm = (step: PointStep, point: Point): AnnotationStep => {
    const nextPoints: Record<PointStep, Point | null> = {
      netBase: step === 'netBase' ? point : netBase,
      netTop: step === 'netTop' ? point : netTop,
      ground: step === 'ground' ? point : ground,
      shuttlecock: step === 'shuttlecock' ? point : shuttlecockPos,
    };

    if (isEditingPoint && pointSteps.every((key) => nextPoints[key])) {
      return 'ready';
    }

    const startIndex = pointSteps.indexOf(step) + 1;
    const nextIncomplete = pointSteps.slice(startIndex).find((key) => !nextPoints[key]);
    return nextIncomplete ?? 'ready';
  };

  const handleConfirmDraftPoint = () => {
    if (!isPointStep(annotationStep) || !draftPoint) return;

    applyAnnotationPoint(annotationStep, draftPoint);
    const nextStep = getNextStepAfterConfirm(annotationStep, draftPoint);
    setDraftPoint(null);
    setIsEditingPoint(false);
    setAnnotationStep(nextStep);
  };

  const handleClearDraftPoint = () => {
    setDraftPoint(null);
  };

  const getStoredPoint = (step: PointStep): Point | null => {
    if (step === 'netBase') return netBase;
    if (step === 'netTop') return netTop;
    if (step === 'ground') return ground;
    return shuttlecockPos;
  };

  const handleEditPoint = (step: PointStep) => {
    if (isAnalyzing) return;

    setAnnotationStep(step);
    setDraftPoint(getStoredPoint(step));
    setIsEditingPoint(true);
    requestAnimationFrame(updateOverlayLayout);
  };

  const handlePrecisionPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!draftPoint || !isPointStep(annotationStep) || isAnalyzing) return;
    if (e.type === 'pointermove' && e.buttons === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = clamp01((e.clientX - rect.left) / rect.width);
    const localY = clamp01((e.clientY - rect.top) / rect.height);

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraftPoint({
      x: clamp01(draftPoint.x + (localX - 0.5) / precisionZoom),
      y: clamp01(draftPoint.y + (localY - 0.5) / precisionZoom),
    });
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
  const activePointStep = isPointStep(annotationStep) ? annotationStep : null;
  const projectedDraftPoint = draftPoint ? projectVideoPoint(draftPoint) : null;

  const handleStartAnalysis = () => {
    if (!canAnalyze || !calibration || !shuttlecockPos) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      const { verdict, shuttlecockHeightM, heightDeltaM } = calculateVerdict(calibration, shuttlecockPos);

      navigate(ROUTES.RESULT, {
        state: {
          verdict,
          shuttlecockHeightM,
          heightDeltaM,
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
  ] satisfies Array<{ key: PointStep; point: Point | null; color: string; label: string }>;

  const isPickingPoint = annotationStep !== 'impact' && annotationStep !== 'ready';
  const selectedPointItems = annotationPoints.filter(({ point }) => point);

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: 'calc(14px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left))', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) 40px', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.CAMERA)}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--card-border)', background: 'var(--panel-bg)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={language === 'ko' ? '촬영 화면으로' : 'Back to camera'}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <h3 style={{ color: 'var(--accent-color)', fontWeight: 900, margin: '0 0 4px', fontSize: '1rem', lineHeight: 1.25 }}>
            {stepCopy[annotationStep].title}
          </h3>
          <p style={{ color: 'var(--text-main)', fontSize: '0.78rem', margin: 0, opacity: 0.9, lineHeight: 1.4, overflowWrap: 'break-word' }}>
            {stepCopy[annotationStep].body}
          </p>
        </div>
        <span />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 max(16px, env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}>
        <div
          ref={playerRef}
          onPointerDown={handlePlayerPointer}
          onPointerMove={handlePlayerPointerMove}
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
            if (draftPoint && activePointStep === key) return null;
            const projected = projectVideoPoint(point);

            return (
              <div key={key} style={{ position: 'absolute', top: `${projected.y * 100}%`, left: `${projected.x * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 22, pointerEvents: 'none', display: 'grid', justifyItems: 'center', gap: '4px' }}>
                <div style={{ width: key === 'shuttlecock' ? 18 : 14, height: key === 'shuttlecock' ? 18 : 14, borderRadius: '50%', background: key === 'shuttlecock' ? 'rgba(255,255,255,0.3)' : color, border: `3px solid ${key === 'shuttlecock' ? color : '#fff'}`, boxShadow: '0 2px 10px rgba(0,0,0,0.45)' }} />
                <span style={{ color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{label}</span>
              </div>
            );
          })}

          {projectedDraftPoint && (
            <div style={{ position: 'absolute', top: `${projectedDraftPoint.y * 100}%`, left: `${projectedDraftPoint.x * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 25, pointerEvents: 'none', display: 'grid', justifyItems: 'center', gap: '5px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 3px var(--accent-color), 0 4px 12px rgba(0,0,0,0.55)', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '50%', top: -9, width: 2, height: 48, background: '#fff', transform: 'translateX(-50%)', boxShadow: '0 0 0 1px rgba(0,0,0,0.28)' }} />
                <span style={{ position: 'absolute', top: '50%', left: -9, height: 2, width: 48, background: '#fff', transform: 'translateY(-50%)', boxShadow: '0 0 0 1px rgba(0,0,0,0.28)' }} />
              </div>
              <span style={{ color: '#fff', background: 'rgba(255,159,180,0.92)', borderRadius: 999, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
                {language === 'ko' ? '후보점' : 'Draft'}
              </span>
            </div>
          )}

          {draftPoint && activePointStep && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{ position: 'absolute', left: 10, right: 10, top: 10, zIndex: 28, display: 'grid', justifyItems: 'center', gap: '8px', pointerEvents: 'auto' }}
            >
              <div style={{ width: 'min(74vw, 270px)', aspectRatio: videoAspectRatio, maxHeight: '176px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.92)', boxShadow: '0 8px 24px rgba(0,0,0,0.48)', background: '#111', position: 'relative', touchAction: 'none' }} onPointerDown={handlePrecisionPointer} onPointerMove={handlePrecisionPointer}>
                {framePreviewUrl ? (
                  <img
                    src={framePreviewUrl}
                    alt=""
                    style={{
                      position: 'absolute',
                      left: `${(0.5 - draftPoint.x * precisionZoom) * 100}%`,
                      top: `${(0.5 - draftPoint.y * precisionZoom) * 100}%`,
                      width: `${precisionZoom * 100}%`,
                      height: `${precisionZoom * 100}%`,
                      maxWidth: 'none',
                      objectFit: 'fill',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: 12, textAlign: 'center' }}>
                    {language === 'ko' ? '확대 미리보기를 준비 중입니다' : 'Preparing zoom preview'}
                  </div>
                )}
                <span style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', background: 'rgba(255,255,255,0.9)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', left: 0, top: '50%', width: '100%', height: 2, background: 'rgba(255,255,255,0.9)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', left: '50%', top: '50%', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent-color)', transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 2px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', right: 8, top: 8, borderRadius: 999, padding: '3px 7px', background: 'rgba(0,0,0,0.64)', color: '#fff', fontSize: '0.66rem', fontWeight: 900, pointerEvents: 'none' }}>
                  {language === 'ko' ? '4배 확대' : '4x zoom'}
                </span>
              </div>

              <div style={{ width: 'min(92vw, 320px)', display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleClearDraftPoint}
                  style={{ minHeight: 38, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.34)', background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: '0.76rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', backdropFilter: 'blur(8px)' }}
                >
                  <RotateCcw size={14} />
                  {language === 'ko' ? '다시 찍기' : 'Retap'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDraftPoint}
                  style={{ minHeight: 38, borderRadius: '10px', border: 'none', background: 'var(--accent-color)', color: darkButtonText, fontSize: '0.76rem', fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.28)' }}
                >
                  {language === 'ko' ? '이 지점으로 지정' : 'Use This Point'}
                </button>
              </div>
            </div>
          )}

          {isPickingPoint && (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 24, padding: '10px 12px', borderRadius: '14px', background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              {draftPoint
                ? (language === 'ko' ? '확대창에서 정확한 지점을 다시 누른 뒤 확정하세요.' : 'Tap the exact spot in the zoom view, then confirm.')
                : stepCopy[annotationStep].body}
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
            <div key={item.key} style={{ minHeight: 42, borderRadius: '10px', border: '1px solid var(--card-border)', background: item.done ? 'rgba(48,209,88,0.18)' : 'var(--panel-bg)', color: item.done ? '#30D158' : 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.66rem', fontWeight: 900, textAlign: 'center', padding: '4px' }}>
              {item.done ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid currentColor' }} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {selectedPointItems.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 900 }}>
              {language === 'ko' ? '지정한 지점' : 'Selected Points'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {selectedPointItems.map(({ key, color, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleEditPoint(key)}
                  disabled={isAnalyzing}
                  style={{ minHeight: 40, borderRadius: '10px', border: '1px solid var(--card-border)', background: activePointStep === key ? 'rgba(255,159,180,0.16)' : 'var(--panel-bg)', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: '7px', padding: '8px 9px', fontSize: '0.74rem', fontWeight: 900, opacity: isAnalyzing ? 0.64 : 1 }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-color)', fontSize: '0.68rem' }}>
                    <RotateCcw size={12} />
                    {language === 'ko' ? '다시 지정' : 'Edit'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'var(--panel-bg)', padding: '16px', borderRadius: '18px', border: '1px solid var(--card-border)', boxShadow: '0 8px 16px rgba(255, 159, 180, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', width: '44px' }}>{currentTime.toFixed(2)}s</span>
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
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', width: '44px', textAlign: 'right' }}>{duration.toFixed(2)}s</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: annotationStep === 'impact' ? '1fr 1fr 1.2fr' : '1fr', gap: '8px' }}>
            {annotationStep === 'impact' ? (
              <>
                <button onClick={() => seekTo(currentTime - 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>- 1프레임</button>
                <button onClick={() => seekTo(currentTime + 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>+ 1프레임</button>
                <button onClick={handleConfirmImpactFrame} style={{ padding: '10px 8px', borderRadius: '10px', background: 'var(--accent-color)', border: 'none', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>
                  {language === 'ko' ? '프레임 저장' : 'Save Frame'}
                </button>
              </>
            ) : (
              <button onClick={handleRestartAnnotation} style={{ padding: '11px 12px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.82rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
            background: canAnalyze && !isAnalyzing ? 'var(--accent-color)' : 'rgba(255,159,180,0.58)',
            color: canAnalyze && !isAnalyzing ? darkButtonText : 'rgba(45,28,34,0.82)',
            border: 'none',
            fontWeight: 800,
            fontSize: '1rem',
            marginTop: 'auto',
            boxShadow: '0 4px 12px rgba(255, 159, 180, 0.3)',
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
