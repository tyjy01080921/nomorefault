import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { getPoseLandmarker, drawSkeleton } from '../services/mediapipe';
import {
  calculateGuideConfidencePercent,
  calculatePlayerServiceLineY,
  calculateVerdict,
  type CalibrationInput,
} from '../utils/verdict';
import type { PoseLandmark } from '../utils/pose';
import { selectServerPose, type ServerPoseTrackingState } from '../utils/serverPose';
import {
  containerPointToVideoPoint,
  getFittedMediaRect,
  getPrecisionAdjustedPoint,
} from '../utils/videoCoordinates';

type AnnotationStep = 'referenceFrame' | 'playerHeight' | 'playerHeadTop' | 'playerFootBase' | 'impact' | 'shuttlecock' | 'ready';
type FrameStep = 'referenceFrame' | 'impact';
type PointStep = 'playerHeadTop' | 'playerFootBase' | 'shuttlecock';
type WorkflowStep = Exclude<AnnotationStep, 'ready'>;

interface Point {
  x: number;
  y: number;
}

interface PlayerBodyPoints {
  playerHeadTop: Point;
  playerFootBase: Point;
}

interface OverlayLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PrecisionGesture {
  pointerId: number;
  basePoint: Point;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const precisionZoom = 4;
const playerHeightMinCm = 120;
const playerHeightMaxCm = 230;
const darkButtonText = '#2d1c22';
const poseGuideReviewThresholdCm = 10;

const isPointStep = (step: AnnotationStep): step is PointStep => (
  step === 'playerHeadTop'
  || step === 'playerFootBase'
  || step === 'shuttlecock'
);

const isFrameStep = (step: AnnotationStep): step is FrameStep => (
  step === 'referenceFrame' || step === 'impact'
);

const workflowSteps: WorkflowStep[] = [
  'referenceFrame',
  'playerHeight',
  'playerHeadTop',
  'playerFootBase',
  'impact',
  'shuttlecock',
];

const getVisibleLandmark = (landmarks: PoseLandmark[] | null, index: number) => {
  const landmark = landmarks?.[index];
  if (!landmark) return null;
  if (typeof landmark.visibility === 'number' && landmark.visibility < 0.35) return null;
  return landmark;
};

const averageX = (points: PoseLandmark[]) => (
  points.reduce((sum, point) => sum + point.x, 0) / points.length
);

const estimatePlayerBodyPoints = (landmarks: PoseLandmark[] | null) => {
  const headIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const footIndexes = [27, 28, 29, 30, 31, 32];
  const headPoints = headIndexes
    .map((index) => getVisibleLandmark(landmarks, index))
    .filter((point): point is PoseLandmark => Boolean(point));
  const footPoints = footIndexes
    .map((index) => getVisibleLandmark(landmarks, index))
    .filter((point): point is PoseLandmark => Boolean(point));

  if (headPoints.length === 0 || footPoints.length === 0) return null;

  return {
    playerHeadTop: {
      x: clamp01(averageX(headPoints)),
      y: clamp01(Math.min(...headPoints.map((point) => point.y)) - 0.025),
    },
    playerFootBase: {
      x: clamp01(averageX(footPoints)),
      y: clamp01(Math.max(...footPoints.map((point) => point.y))),
    },
  };
};

const AnalysisSetup = () => {
  const navigate = useNavigate();
  const {
    videoFile,
    shuttlecockPos,
    playerHeightCm,
    playerHeadTop,
    playerFootBase,
    poseLandmarks,
    setPoseLandmarks,
    setPlayerHeightCm,
    setPlayerHeadTop,
    setPlayerFootBase,
    setShuttlecockPos,
    resetAnalysisInputs,
    language,
  } = useStore((state: AppState) => state);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const poseTrackingRef = useRef<ServerPoseTrackingState | null>(null);
  const precisionGestureRef = useRef<PrecisionGesture | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [annotationStep, setAnnotationStep] = useState<AnnotationStep>('referenceFrame');
  const [draftPoint, setDraftPoint] = useState<Point | null>(null);
  const [isEditingPoint, setIsEditingPoint] = useState(false);
  const [framePreviewUrl, setFramePreviewUrl] = useState<string | null>(null);
  const [referenceFrameUrl, setReferenceFrameUrl] = useState<string | null>(null);
  const [impactFrameUrl, setImpactFrameUrl] = useState<string | null>(null);
  const [referenceTime, setReferenceTime] = useState<number | null>(null);
  const [impactTime, setImpactTime] = useState<number | null>(null);
  const [impactPosePoints, setImpactPosePoints] = useState<PlayerBodyPoints | null>(null);
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
  const estimatedPlayerPoints = useMemo(
    () => estimatePlayerBodyPoints(poseLandmarks),
    [poseLandmarks]
  );
  const isPlayerHeightValid = (
    typeof playerHeightCm === 'number'
    && playerHeightCm >= playerHeightMinCm
    && playerHeightCm <= playerHeightMaxCm
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
    setAnnotationStep('referenceFrame');
    setDraftPoint(null);
    setIsEditingPoint(false);
    setFramePreviewUrl(null);
    setReferenceFrameUrl(null);
    setImpactFrameUrl(null);
    setReferenceTime(null);
    setImpactTime(null);
    setImpactPosePoints(null);
    poseTrackingRef.current = null;
  }, [videoUrl]);

  const updateOverlayLayout = useCallback(() => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video) return;

    const playerRect = player.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    if (
      playerRect.width <= 0
      || playerRect.height <= 0
      || videoRect.width <= 0
      || videoRect.height <= 0
      || video.videoWidth <= 0
      || video.videoHeight <= 0
    ) return;

    const fitted = getFittedMediaRect(
      videoRect.width,
      videoRect.height,
      video.videoWidth,
      video.videoHeight,
      'contain',
    );

    const next = {
      left: (videoRect.left - playerRect.left + fitted.x) / playerRect.width,
      top: (videoRect.top - playerRect.top + fitted.y) / playerRect.height,
      width: fitted.width / playerRect.width,
      height: fitted.height / playerRect.height,
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
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateOverlayLayout);

    if (playerRef.current) observer?.observe(playerRef.current);
    if (videoRef.current) observer?.observe(videoRef.current);

    return () => {
      window.removeEventListener('resize', updateOverlayLayout);
      observer?.disconnect();
    };
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
            const selected = selectServerPose(results.landmarks, poseTrackingRef.current, {
              playerHeadTop,
              playerFootBase,
            });
            poseTrackingRef.current = selected.nextState;

            if (selected.landmarks) {
              drawSkeleton(ctx, selected.landmarks, canvas.width, canvas.height);
              setPoseLandmarks(selected.landmarks);
            }
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
  }, [playerFootBase, playerHeadTop, setPoseLandmarks, videoUrl]);

  const getPointFrameSnapshot = useCallback((step: PointStep) => (
    step === 'shuttlecock' ? impactFrameUrl : referenceFrameUrl
  ), [impactFrameUrl, referenceFrameUrl]);

  const getPointFrameTime = useCallback((step: PointStep) => (
    step === 'shuttlecock' ? impactTime : referenceTime
  ), [impactTime, referenceTime]);

  const preparePointFrame = useCallback((step: PointStep) => {
    const targetTime = getPointFrameTime(step);
    if (typeof targetTime === 'number') {
      seekTo(targetTime);
    }
    setFramePreviewUrl(getPointFrameSnapshot(step));
  }, [getPointFrameSnapshot, getPointFrameTime, seekTo]);

  const handleConfirmFrame = () => {
    if (!isFrameStep(annotationStep)) return;

    const video = videoRef.current;
    const selectedTime = video?.currentTime ?? currentTime;
    const snapshot = captureFrameSnapshot();

    if (!snapshot) return;

    if (video) {
      video.pause();
    }
    setCurrentTime(selectedTime);
    setFramePreviewUrl(snapshot);
    setDraftPoint(null);
    setIsEditingPoint(false);

    if (annotationStep === 'referenceFrame') {
      setReferenceFrameUrl(snapshot);
      setReferenceTime(selectedTime);
      setAnnotationStep('playerHeight');
    } else {
      setImpactFrameUrl(snapshot);
      setImpactTime(selectedTime);
      setImpactPosePoints(estimatedPlayerPoints);
      setAnnotationStep('shuttlecock');
    }

    requestAnimationFrame(updateOverlayLayout);
  };

  const handleRestartAnnotation = () => {
    resetAnalysisInputs();
    setDraftPoint(null);
    setFramePreviewUrl(null);
    setReferenceFrameUrl(null);
    setImpactFrameUrl(null);
    setReferenceTime(null);
    setImpactTime(null);
    setImpactPosePoints(null);
    setIsEditingPoint(false);
    poseTrackingRef.current = null;
    setAnnotationStep('referenceFrame');
  };

  const getVideoPointFromClient = useCallback((clientX: number, clientY: number) => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const rect = video.getBoundingClientRect();
    const fitted = getFittedMediaRect(
      rect.width,
      rect.height,
      video.videoWidth,
      video.videoHeight,
      'contain',
    );
    const mediaLeft = rect.left + fitted.x;
    const mediaTop = rect.top + fitted.y;
    const mediaRight = mediaLeft + fitted.width;
    const mediaBottom = mediaTop + fitted.height;

    if (
      clientX < mediaLeft
      || clientX > mediaRight
      || clientY < mediaTop
      || clientY > mediaBottom
    ) {
      return null;
    }

    return containerPointToVideoPoint(
      { x: clientX, y: clientY },
      rect,
      video.videoWidth,
      video.videoHeight,
      'contain',
    );
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
    if (!isPointStep(annotationStep) || isAnalyzing || !draftPoint || e.buttons === 0) return;

    const point = getVideoPointFromClient(e.clientX, e.clientY);
    if (!point) return;

    e.preventDefault();
    setDraftPoint(point);
  };

  const applyAnnotationPoint = (step: PointStep, point: Point) => {
    if (step === 'playerHeadTop') {
      setPlayerHeadTop(point);
    } else if (step === 'playerFootBase') {
      setPlayerFootBase(point);
    } else if (step === 'shuttlecock') {
      setShuttlecockPos(point);
    }
  };

  const getStoredPoint = (step: PointStep): Point | null => {
    if (step === 'playerHeadTop') return playerHeadTop;
    if (step === 'playerFootBase') return playerFootBase;
    return shuttlecockPos;
  };

  const getSuggestedPoint = (step: PointStep): Point | null => {
    const storedPoint = getStoredPoint(step);
    if (storedPoint) return storedPoint;
    if (step === 'playerHeadTop') return estimatedPlayerPoints?.playerHeadTop ?? null;
    if (step === 'playerFootBase') return estimatedPlayerPoints?.playerFootBase ?? null;
    return null;
  };

  const getNextPoints = (step?: PointStep, point?: Point): Record<PointStep, Point | null> => ({
    playerHeadTop: step === 'playerHeadTop' ? point ?? null : playerHeadTop,
    playerFootBase: step === 'playerFootBase' ? point ?? null : playerFootBase,
    shuttlecock: step === 'shuttlecock' ? point ?? null : shuttlecockPos,
  });

  const isWorkflowStepComplete = (
    step: WorkflowStep,
    points: Record<PointStep, Point | null> = getNextPoints()
  ) => {
    if (step === 'referenceFrame') return Boolean(referenceFrameUrl);
    if (step === 'impact') return Boolean(impactFrameUrl);
    if (step === 'playerHeight') return isPlayerHeightValid;
    return Boolean(points[step]);
  };

  const getNextWorkflowStep = (
    currentStep: WorkflowStep,
    points: Record<PointStep, Point | null> = getNextPoints()
  ): AnnotationStep => {
    const startIndex = workflowSteps.indexOf(currentStep) + 1;
    const nextIncomplete = workflowSteps
      .slice(startIndex)
      .find((step) => !isWorkflowStepComplete(step, points));

    return nextIncomplete ?? 'ready';
  };

  const getNextStepAfterConfirm = (step: PointStep, point: Point): AnnotationStep => {
    const nextPoints = getNextPoints(step, point);

    if (isEditingPoint && workflowSteps.every((key) => isWorkflowStepComplete(key, nextPoints))) {
      return 'ready';
    }

    return getNextWorkflowStep(step, nextPoints);
  };

  const handlePlayerHeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setPlayerHeightCm(null);
      return;
    }

    setPlayerHeightCm(Number(value));
  };

  const handleConfirmPlayerHeight = () => {
    if (!isPlayerHeightValid) return;

    const nextStep = getNextWorkflowStep('playerHeight');
    if (isPointStep(nextStep)) {
      preparePointFrame(nextStep);
    }
    setDraftPoint(isPointStep(nextStep) ? getSuggestedPoint(nextStep) : null);
    setIsEditingPoint(false);
    setAnnotationStep(nextStep);
    requestAnimationFrame(updateOverlayLayout);
  };

  const handleConfirmDraftPoint = () => {
    if (!isPointStep(annotationStep) || !draftPoint) return;

    applyAnnotationPoint(annotationStep, draftPoint);
    if (annotationStep === 'playerHeadTop' || annotationStep === 'playerFootBase') {
      poseTrackingRef.current = null;
    }
    const nextStep = getNextStepAfterConfirm(annotationStep, draftPoint);
    const manualHeadCorrection = (
      annotationStep === 'playerHeadTop'
      && nextStep === 'playerFootBase'
      && estimatedPlayerPoints?.playerHeadTop
      && pointDistance(draftPoint, estimatedPlayerPoints.playerHeadTop) > 0.04
    );
    setDraftPoint(isPointStep(nextStep) && !manualHeadCorrection ? getSuggestedPoint(nextStep) : null);
    if (isPointStep(nextStep)) {
      preparePointFrame(nextStep);
    } else if (nextStep === 'impact') {
      setFramePreviewUrl(impactFrameUrl);
      if (typeof impactTime === 'number') {
        seekTo(impactTime);
      }
    } else if (nextStep === 'ready') {
      setFramePreviewUrl(impactFrameUrl);
      if (typeof impactTime === 'number') {
        seekTo(impactTime);
      }
    }
    setIsEditingPoint(false);
    setAnnotationStep(nextStep);
  };

  const handleClearDraftPoint = () => {
    setDraftPoint(null);
  };

  const handleEditPoint = (step: PointStep) => {
    if (isAnalyzing) return;

    setAnnotationStep(step);
    preparePointFrame(step);
    setDraftPoint(getStoredPoint(step));
    setIsEditingPoint(true);
    requestAnimationFrame(updateOverlayLayout);
  };

  const getPrecisionLocalPoint = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const handlePrecisionPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draftPoint || !isPointStep(annotationStep) || isAnalyzing) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    precisionGestureRef.current = {
      pointerId: e.pointerId,
      basePoint: draftPoint,
    };
    setDraftPoint(getPrecisionAdjustedPoint(
      draftPoint,
      getPrecisionLocalPoint(e),
      precisionZoom,
    ));
  };

  const handlePrecisionPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const gesture = precisionGestureRef.current;
    if (
      !gesture
      || gesture.pointerId !== e.pointerId
      || !isPointStep(annotationStep)
      || isAnalyzing
    ) return;

    e.preventDefault();
    e.stopPropagation();
    setDraftPoint(getPrecisionAdjustedPoint(
      gesture.basePoint,
      getPrecisionLocalPoint(e),
      precisionZoom,
    ));
  };

  const handlePrecisionPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (precisionGestureRef.current?.pointerId === e.pointerId) {
      precisionGestureRef.current = null;
    }
  };

  const projectVideoPoint = useCallback((point: Point) => ({
    x: overlayLayout.left + point.x * overlayLayout.width,
    y: overlayLayout.top + point.y * overlayLayout.height,
  }), [overlayLayout]);

  const playerCalibration = isPlayerHeightValid && typeof playerHeightCm === 'number' && playerHeadTop && playerFootBase
    ? {
      playerHeightCm,
      playerHeadTop,
      playerFootBase,
    }
    : null;
  const playerServiceLineY = playerCalibration ? calculatePlayerServiceLineY(playerCalibration) : null;

  const previewPosePoints = annotationStep === 'impact'
    ? estimatedPlayerPoints
    : impactPosePoints;
  const poseGuideCalibration = isPlayerHeightValid && typeof playerHeightCm === 'number' && previewPosePoints
    ? { playerHeightCm, ...previewPosePoints }
    : null;
  const poseServiceLineY = poseGuideCalibration
    ? calculatePlayerServiceLineY(poseGuideCalibration)
    : null;
  const referencePlayerNorm = playerHeadTop && playerFootBase
    ? playerFootBase.y - playerHeadTop.y
    : null;
  const poseGuideGapCm = (
    typeof playerHeightCm === 'number'
    && referencePlayerNorm !== null
    && referencePlayerNorm > 0
    && playerServiceLineY !== null
    && poseServiceLineY !== null
  )
    ? Math.round(Math.abs(poseServiceLineY - playerServiceLineY) / referencePlayerNorm * playerHeightCm)
    : null;
  const guideConfidencePercent = calculateGuideConfidencePercent(poseGuideGapCm);

  const analysisCalibration: CalibrationInput | null = playerCalibration
    ? { mode: 'playerHeight', player: playerCalibration }
    : null;

  const shouldShowServiceLine = (
    annotationStep === 'impact'
    || annotationStep === 'shuttlecock'
    || annotationStep === 'ready'
  );
  const serviceLineMarkers = [
    ...(shouldShowServiceLine && playerServiceLineY !== null
      ? [{ key: 'player', y: playerServiceLineY, color: '#32ADE6', label: language === 'ko' ? '고정 1.15m' : 'Fixed 1.15m' }]
      : []),
    ...(shouldShowServiceLine && poseServiceLineY !== null
      ? [{ key: 'pose', y: poseServiceLineY, color: '#FFB020', label: language === 'ko' ? '포즈 보조선' : 'Pose guide' }]
      : []),
  ];
  const canAnalyze = (
    annotationStep === 'ready'
    && analysisCalibration !== null
    && playerServiceLineY !== null
    && shuttlecockPos !== null
    && impactFrameUrl !== null
  );
  const isChoosingFrame = isFrameStep(annotationStep);
  const activePointStep = isPointStep(annotationStep) ? annotationStep : null;
  const projectedDraftPoint = draftPoint ? projectVideoPoint(draftPoint) : null;

  const handleStartAnalysis = () => {
    if (!canAnalyze || !analysisCalibration || !shuttlecockPos) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      const result = calculateVerdict(analysisCalibration, shuttlecockPos);

      navigate(ROUTES.RESULT, {
        state: {
          ...result,
          frameSnapshot: impactFrameUrl,
          serviceLineY: playerServiceLineY,
          playerServiceLineY,
          poseServiceLineY,
          poseGuideGapCm,
          poseGuideNeedsReview: typeof poseGuideGapCm === 'number' && poseGuideGapCm > poseGuideReviewThresholdCm,
          guideConfidencePercent,
          shuttlecockPos,
          timestamp: new Date().toISOString(),
        },
      });
    }, 1500);
  };

  const stepCopy: Record<AnnotationStep, { title: string; body: string }> = {
    referenceFrame: {
      title: language === 'ko' ? '기준 자세 고르기' : 'Choose Reference Pose',
      body: language === 'ko'
        ? '서비스 전 1초간 똑바로 선 장면으로 영상을 맞춘 뒤 선택하세요.'
        : 'Scrub to the moment where the server stands upright for 1 second, then save it.',
    },
    impact: {
      title: language === 'ko' ? '타구 순간 고르기' : 'Choose Impact Frame',
      body: language === 'ko'
        ? '셔틀콕을 치는 순간으로 영상을 맞춘 뒤 이 순간을 선택하세요.'
        : 'Scrub to the shuttle contact moment, then save the frame.',
    },
    playerHeight: {
      title: language === 'ko' ? '선수 키 입력' : 'Player Height',
      body: language === 'ko'
        ? '서비스하는 선수의 실제 키를 cm로 입력하세요. 신발 굽 차이는 10cm OK?! 구간 안에서 흡수됩니다.'
        : 'Enter the server height in centimeters.',
    },
    playerHeadTop: {
      title: language === 'ko' ? '머리 맨 위' : 'Head Top',
      body: language === 'ko'
        ? '기준 자세 캡처에서 실제 머리 맨 위로 맞추세요.'
        : 'Check the suggested point and adjust it to the top of the head.',
    },
    playerFootBase: {
      title: language === 'ko' ? '바닥에 닿은 발' : 'Foot Base',
      body: language === 'ko'
        ? '기준 자세 캡처에서 바닥에 닿은 발바닥 지점으로 맞추세요.'
        : 'Check the suggested point and adjust it to the foot on the floor.',
    },
    shuttlecock: {
      title: language === 'ko' ? '셔틀콕 헤드 끝' : 'Shuttle Head Tip',
      body: language === 'ko'
        ? '타구 순간의 셔틀콕 헤드 끝을 누르세요.'
        : 'Tap the shuttle head tip at impact.',
    },
    ready: {
      title: language === 'ko' ? '분석 준비 완료' : 'Ready to Analyze',
      body: language === 'ko'
        ? '기준 자세로 만든 고정 1.15m 선과 타구 순간 포즈 보조선을 비교해 확인하세요.'
        : 'Check the fixed 1.15m line from the reference pose against the impact pose guide.',
    },
  };

  const progressLabels: Record<WorkflowStep, string> = {
    referenceFrame: language === 'ko' ? '기준' : 'Ref',
    playerHeight: language === 'ko' ? '키' : 'Height',
    playerHeadTop: language === 'ko' ? '머리' : 'Head',
    playerFootBase: language === 'ko' ? '발' : 'Foot',
    impact: language === 'ko' ? '타구' : 'Impact',
    shuttlecock: language === 'ko' ? '콕 끝' : 'Shuttle',
  };
  const progressItems = workflowSteps.map((step) => ({
    key: step,
    label: progressLabels[step],
    done: isWorkflowStepComplete(step),
  }));

  const allAnnotationPoints: Array<{ key: PointStep; point: Point | null; color: string; label: string }> = [
    { key: 'playerHeadTop', point: playerHeadTop, color: '#BF5AF2', label: language === 'ko' ? '머리' : 'Head' },
    { key: 'playerFootBase', point: playerFootBase, color: '#64D2FF', label: language === 'ko' ? '발' : 'Foot' },
    { key: 'shuttlecock', point: shuttlecockPos, color: 'var(--accent-color)', label: language === 'ko' ? '콕 끝' : 'Shuttle' },
  ];
  const isReferenceContext = (
    annotationStep === 'referenceFrame'
    || annotationStep === 'playerHeight'
    || annotationStep === 'playerHeadTop'
    || annotationStep === 'playerFootBase'
  );
  const annotationPoints = allAnnotationPoints
    .filter(({ key, point }) => {
      if (!point) return false;
      if (key === 'shuttlecock') return !isReferenceContext;
      return isReferenceContext;
    });

  const isPickingPoint = isPointStep(annotationStep);
  const selectedPointItems = allAnnotationPoints.filter(({ point }) => point);

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: 'calc(14px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left))', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) 40px', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          aria-label={language === 'ko' ? '촬영 화면으로 돌아가기' : 'Back to camera'}
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
            style={{ width: '100%', maxHeight: '50vh', display: 'block', objectFit: 'contain' }}
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: `${overlayLayout.top * 100}%`, left: `${overlayLayout.left * 100}%`, width: `${overlayLayout.width * 100}%`, height: `${overlayLayout.height * 100}%`, pointerEvents: 'none', zIndex: 10 }}
          />

          {serviceLineMarkers.map((marker) => {
            const projected = projectVideoPoint({ x: 0.5, y: marker.y });

            return (
              <div key={marker.key} style={{ position: 'absolute', left: `${overlayLayout.left * 100}%`, top: `${projected.y * 100}%`, width: `${overlayLayout.width * 100}%`, borderTop: `2px dashed ${marker.color}`, transform: 'translateY(-1px)', zIndex: 18, pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', right: 8, top: -21, color: marker.color, fontSize: '0.76rem', fontWeight: 900, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{marker.label}</span>
              </div>
            );
          })}

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
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              style={{ position: 'absolute', left: 10, right: 10, top: 10, zIndex: 28, display: 'grid', justifyItems: 'center', gap: '8px', pointerEvents: 'auto' }}
            >
              <div
                style={{ width: 'min(74vw, 270px)', aspectRatio: videoAspectRatio, maxHeight: '176px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.92)', boxShadow: '0 8px 24px rgba(0,0,0,0.48)', background: '#111', position: 'relative', touchAction: 'none' }}
                onPointerDown={handlePrecisionPointerDown}
                onPointerMove={handlePrecisionPointerMove}
                onPointerUp={handlePrecisionPointerEnd}
                onPointerCancel={handlePrecisionPointerEnd}
              >
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
                  {language === 'ko' ? '다시 누르기' : 'Retap'}
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

        {annotationStep === 'playerHeight' && (
          <div style={{ background: 'var(--panel-bg)', padding: '16px', borderRadius: '14px', border: '1px solid var(--card-border)', display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '7px', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 900 }}>
              {language === 'ko' ? '선수 키' : 'Player height'}
              <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={playerHeightMinCm}
                  max={playerHeightMaxCm}
                  inputMode="decimal"
                  value={playerHeightCm ?? ''}
                  onChange={handlePlayerHeightChange}
                  placeholder={language === 'ko' ? '예: 175' : 'e.g. 175'}
                  style={{ minHeight: 44, borderRadius: '10px', border: `1px solid ${isPlayerHeightValid || playerHeightCm === null ? 'var(--card-border)' : '#FF453A'}`, background: '#fff', color: darkButtonText, padding: '0 12px', fontSize: '1rem', fontWeight: 900, outline: 'none' }}
                />
                <span style={{ color: 'var(--text-sub)', fontSize: '0.82rem', fontWeight: 900 }}>cm</span>
              </span>
            </label>
            <div style={{ color: isPlayerHeightValid || playerHeightCm === null ? 'var(--text-sub)' : '#FF453A', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.45 }}>
              {language === 'ko'
                ? `${playerHeightMinCm}-${playerHeightMaxCm}cm 사이로 입력하세요. 다음 단계에서 머리와 발 기준점을 확인합니다.`
                : `Enter ${playerHeightMinCm}-${playerHeightMaxCm}cm. You will confirm the head and foot points next.`}
            </div>
            <button
              type="button"
              onClick={handleConfirmPlayerHeight}
              disabled={!isPlayerHeightValid || isAnalyzing}
              style={{ minHeight: 44, borderRadius: '12px', border: 'none', background: isPlayerHeightValid && !isAnalyzing ? 'var(--accent-color)' : 'rgba(255,159,180,0.5)', color: darkButtonText, fontSize: '0.86rem', fontWeight: 900 }}
            >
              {language === 'ko' ? '기준점 확인하기' : 'Confirm Reference Points'}
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(58px, 1fr))', gap: '6px' }}>
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
              aria-label={language === 'ko'
                ? (annotationStep === 'referenceFrame' ? '기준 자세 선택 슬라이더' : '타구 순간 선택 슬라이더')
                : (annotationStep === 'referenceFrame' ? 'Reference frame slider' : 'Impact frame slider')}
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleTimeChange}
              disabled={!isChoosingFrame || isAnalyzing}
              style={{ flex: 1, accentColor: 'var(--accent-color)', height: '20px', opacity: isChoosingFrame ? 1 : 0.45 }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', width: '44px', textAlign: 'right' }}>{duration.toFixed(2)}s</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isChoosingFrame ? '1fr 1fr 1.2fr' : '1fr', gap: '8px' }}>
            {isChoosingFrame ? (
              <>
                <button type="button" onClick={() => seekTo(currentTime - 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>- 1프레임</button>
                <button type="button" onClick={() => seekTo(currentTime + 0.03)} style={{ padding: '10px 8px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>+ 1프레임</button>
                <button type="button" onClick={handleConfirmFrame} style={{ padding: '10px 8px', borderRadius: '10px', background: 'var(--accent-color)', border: 'none', color: darkButtonText, fontSize: '0.78rem', fontWeight: 900 }}>
                  {language === 'ko'
                    ? (annotationStep === 'referenceFrame' ? '기준 자세 선택' : '타구 순간 선택')
                    : (annotationStep === 'referenceFrame' ? 'Save Ref' : 'Save Impact')}
                </button>
              </>
            ) : (
              <button type="button" onClick={handleRestartAnnotation} style={{ padding: '11px 12px', borderRadius: '10px', background: '#fff', border: '1px solid var(--card-border)', color: darkButtonText, fontSize: '0.82rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RotateCcw size={15} />
                {language === 'ko' ? '프레임과 기준점 다시 지정' : 'Restart Frame and Points'}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
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
