import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BWF, ROUTES, VERDICT } from '../utils/constants';
import { useStore } from '../store/useStore';
import { saveHistory } from '../utils/history';
import { generateShareCard, shareCard } from '../utils/shareCard';

interface ResultState {
  verdict: string;
  shuttlecockHeightM?: number;
  heightDeltaM?: number;
  frameSnapshot?: string;
  serviceLineY?: number | null;
  playerServiceLineY?: number | null;
  poseServiceLineY?: number | null;
  poseGuideGapCm?: number | null;
  poseGuideNeedsReview?: boolean;
  guideConfidencePercent?: number | null;
  shuttlecockPos?: NormalizedPoint | null;
  timestamp: string;
}

interface NormalizedPoint {
  x: number;
  y: number;
}

type VerdictDisplayCopy = {
  koLabel: string;
  enLabel: string;
  color: string;
  koSub: string;
  enSub: string;
};

const VERDICT_DISPLAY: Record<string, VerdictDisplayCopy> = {
  [VERDICT.NORMAL]: {
    koLabel: '좋아요!',
    enLabel: 'Good',
    color: '#30D158',
    koSub: '기준선 아래로 감지되었습니다',
    enSub: 'Below the guide',
  },
  [VERDICT.CHECK_REQUIRED]: {
    koLabel: '이정도는 OK?!',
    enLabel: 'Tricky',
    color: '#FFB020',
    koSub: '기준선 초과 10cm 이내입니다',
    enSub: 'Within the +10cm zone',
  },
  [VERDICT.FAULT]: {
    koLabel: '이건 선을 넘었다..😅',
    enLabel: 'Fault',
    color: '#FF453A',
    koSub: '기준선을 10cm 초과했습니다',
    enSub: 'Over the +10cm zone',
  },
  [VERDICT.PERFECT]: {
    koLabel: '좋아요!',
    enLabel: 'Good',
    color: '#30D158',
    koSub: '기준선 아래로 감지되었습니다',
    enSub: 'Below the guide',
  },
  [VERDICT.VAR_CHALLENGE]: {
    koLabel: '이정도는 OK?!',
    enLabel: 'Tricky',
    color: '#FFB020',
    koSub: '기준점 오차 확인이 필요합니다',
    enSub: 'Check the reference points',
  },
};

const formatMeters = (value?: number) => (
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2)}m`
    : '-'
);

const formatDeltaCm = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const cm = Math.round(value * 100);
  if (cm === 0) return '기준선과 동일';
  return cm > 0 ? `+${cm}cm 초과` : `${Math.abs(cm)}cm 낮음`;
};

const toPercent = (value: number) => `${Math.max(0, Math.min(1, value)) * 100}%`;

const getCalibrationLabel = (language: 'ko' | 'en') => (
  language === 'ko' ? '기준 자세 + 선수 키' : 'Reference pose + height'
);

const getVerdictDisplay = (verdict: string, language: 'ko' | 'en') => {
  const display = VERDICT_DISPLAY[verdict] ?? VERDICT_DISPLAY[VERDICT.CHECK_REQUIRED];

  return {
    label: language === 'ko' ? display.koLabel : display.enLabel,
    sub: language === 'ko' ? display.koSub : display.enSub,
    color: display.color,
  };
};

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const language = useStore((s) => s.language);

  const state = location.state as ResultState | null;
  const [sharing, setSharing] = useState(false);
  const savedRef = useRef(false);

  const verdict = state?.verdict ?? VERDICT.CHECK_REQUIRED;
  const shuttlecockHeightM = state?.shuttlecockHeightM;
  const heightDeltaM = state?.heightDeltaM;
  const serviceLineY = state?.serviceLineY;
  const playerServiceLineY = state?.playerServiceLineY;
  const poseServiceLineY = state?.poseServiceLineY;
  const poseGuideGapCm = state?.poseGuideGapCm;
  const poseGuideNeedsReview = state?.poseGuideNeedsReview;
  const guideConfidencePercent = state?.guideConfidencePercent;
  const shuttlecockPos = state?.shuttlecockPos;
  const timestamp = state?.timestamp ?? new Date().toISOString();

  const display = getVerdictDisplay(verdict, language);
  const confidenceColor = typeof guideConfidencePercent === 'number'
    ? guideConfidencePercent >= 80
      ? '#30D158'
      : guideConfidencePercent >= 60
        ? '#FFB020'
        : '#FF453A'
    : 'var(--text-sub)';
  const confidenceBarWidth = typeof guideConfidencePercent === 'number'
    ? `${Math.max(0, Math.min(100, guideConfidencePercent))}%`
    : '0%';

  // Auto-save to history on mount
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    saveHistory({ date: timestamp, verdict, shuttlecockHeightM, heightDeltaM, note: '' });
  }, [heightDeltaM, shuttlecockHeightM, timestamp, verdict]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareCard({
        verdict,
        shuttlecockHeightM,
        heightDeltaM,
        frameSnapshot: state?.frameSnapshot,
        serviceLineY,
        shuttlecockPos,
        language,
      });
      await shareCard(blob);
    } catch (e) {
      console.warn('[share]', e);
    } finally {
      setSharing(false);
    }
  };

  const displayedServiceLineY = typeof serviceLineY === 'number' && Number.isFinite(serviceLineY)
    ? serviceLineY
    : playerServiceLineY;
  const resultLineMarkers = typeof displayedServiceLineY === 'number' && Number.isFinite(displayedServiceLineY)
    ? [{
      key: 'player',
      y: displayedServiceLineY,
      label: language === 'ko' ? '고정 1.15m' : 'Fixed 1.15m',
      color: 'rgba(50, 173, 230, 0.95)',
    }]
    : [];
  if (typeof poseServiceLineY === 'number' && Number.isFinite(poseServiceLineY)) {
    resultLineMarkers.push({
      key: 'pose',
      y: poseServiceLineY,
      label: language === 'ko' ? '포즈 보조선' : 'Pose guide',
      color: 'rgba(255, 176, 32, 0.95)',
    });
  }
  const detailItems = [
    {
      label: language === 'ko' ? '판정 기준' : 'Calibration',
      value: getCalibrationLabel(language),
    },
    {
      label: language === 'ko' ? '감지 높이' : 'Detected height',
      value: formatMeters(shuttlecockHeightM),
    },
    {
      label: language === 'ko' ? '기준선 대비' : 'Against limit',
      value: formatDeltaCm(heightDeltaM),
    },
    {
      label: language === 'ko' ? '판정 신뢰도' : 'Confidence',
      value: typeof guideConfidencePercent === 'number'
        ? `${guideConfidencePercent}%`
        : '-',
    },
    {
      label: language === 'ko' ? 'OK?! 구간' : 'Tricky zone',
      value: language === 'ko' ? '초과 10cm 이내' : 'within +10cm',
    },
    ...(typeof poseGuideGapCm === 'number'
      ? [{
        label: language === 'ko' ? '보조선 차이' : 'Guide gap',
        value: poseGuideNeedsReview
          ? (language === 'ko' ? `${poseGuideGapCm}cm · 재확인` : `${poseGuideGapCm}cm · review`)
          : `${poseGuideGapCm}cm`,
      }]
      : []),
  ];
  const resultExplanation = language === 'ko'
    ? `파란 기준선은 서비스 전 똑바로 선 장면의 머리/발 기준점과 입력한 선수 키로 만든 고정 ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m 추정선입니다. 판정 신뢰도는 파란 기준선과 주황 포즈 보조선의 차이가 작을수록 높게 계산됩니다.`
    : `The blue guide is a fixed estimated ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m line from the upright reference pose and entered player height. Confidence is higher when the blue guide and orange pose guide are closer together.`;

  return (
    <div style={{
      background: 'var(--bg-color)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: '16px',
      alignItems: 'center',
    }}>
      <h3 style={{ color: 'var(--accent-color)', fontWeight: 800, margin: '12px 0 0', fontSize: '1.05rem' }}>
        {language === 'ko' ? '분석 결과' : 'Analysis Result'}
      </h3>

      {state?.frameSnapshot && (
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            background: '#050507',
            borderRadius: '22px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 18px 38px rgba(0,0,0,0.22)',
          }}>
            <img
              src={state.frameSnapshot}
              alt=""
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />

            {resultLineMarkers.map((marker) => (
              <div key={marker.key} style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: toPercent(marker.y),
                borderTop: `2px dashed ${marker.color}`,
                transform: 'translateY(-1px)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.65))',
              }}>
                <span style={{
                  position: 'absolute',
                  right: 10,
                  top: -25,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.56)',
                  border: `1px solid ${marker.color}`,
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                }}>{marker.label}</span>
              </div>
            ))}

            {shuttlecockPos && (
              <div style={{
                position: 'absolute',
                left: toPercent(shuttlecockPos.x),
                top: toPercent(shuttlecockPos.y),
                transform: 'translate(-50%, -50%)',
                display: 'grid',
                placeItems: 'center',
              }}>
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  boxShadow: `0 0 0 5px ${display.color}, 0 8px 18px rgba(0,0,0,0.55)`,
                  background: 'rgba(255,255,255,0.18)',
                }} />
              </div>
            )}

            <div style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(10,10,12,0.72)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: '8px 12px',
              backdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: display.color, boxShadow: `0 0 12px ${display.color}` }} />
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem' }}>{display.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Verdict Card */}
      <div style={{
        background: 'var(--panel-bg)',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '420px',
        padding: '18px',
        textAlign: 'left',
        border: `1px solid var(--card-border)`,
        boxShadow: '0 12px 32px rgba(255, 159, 180, 0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', fontWeight: 800, marginBottom: '4px' }}>
              {language === 'ko' ? '판정' : 'Verdict'}
            </div>
            <div style={{ fontSize: language === 'ko' ? '1.74rem' : '2rem', lineHeight: 1.1, fontWeight: 950, color: display.color, textShadow: `0 2px 8px ${display.color}22` }}>
              {display.label}
            </div>
          </div>
          <div style={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.82rem', textAlign: 'right', lineHeight: 1.4 }}>
            {display.sub}
          </div>
        </div>

        {/* Judgement Criteria */}
        <div style={{
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          border: '1px solid rgba(0,0,0,0.03)',
        }}>
          {detailItems.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
              <span style={{ color: label === (language === 'ko' ? '판정 신뢰도' : 'Confidence') ? confidenceColor : display.color, fontWeight: 800, fontSize: '1rem', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'grid', gap: '6px', marginTop: '2px' }}>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ width: confidenceBarWidth, height: '100%', borderRadius: 999, background: confidenceColor, transition: 'width 0.2s ease-out' }} />
            </div>
            <div style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.4 }}>
              {language === 'ko'
                ? '고정 기준선과 포즈 보조선이 가까울수록 신뢰도가 높습니다.'
                : 'Confidence rises when the fixed guide and pose guide are closer.'}
            </div>
          </div>
          <div style={{ marginTop: '4px', color: 'var(--text-sub)', fontSize: '0.76rem', lineHeight: 1.5, textAlign: 'left' }}>
            {resultExplanation}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '420px', marginTop: 'auto', paddingBottom: '32px' }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            background: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            padding: '18px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: sharing ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(255, 159, 180, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {sharing ? (language === 'ko' ? '생성 중...' : 'Processing...') : (language === 'ko' ? '결과 이미지 공유하기' : 'Share Result')}
        </button>

        <button
          onClick={() => navigate(ROUTES.CAMERA)}
          style={{
            background: '#fff',
            color: 'var(--accent-color)',
            border: '2px solid var(--accent-color)',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {language === 'ko' ? '다시 측정하기' : 'Try Again'}
        </button>

        <button
          onClick={() => navigate('/history')}
          style={{
            background: 'transparent',
            color: 'var(--text-sub)',
            border: 'none',
            padding: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          {language === 'ko' ? '내 서비스 기록 보기' : 'View History'}
        </button>
      </div>
    </div>
  );
};

export default Result;
