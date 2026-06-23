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
  shuttlecockPos?: NormalizedPoint | null;
  timestamp: string;
}

interface NormalizedPoint {
  x: number;
  y: number;
}

const VERDICT_DISPLAY = {
  [VERDICT.NORMAL]: { label: 'Good', color: '#30D158', sub: '기준선 이하로 감지되었습니다' },
  [VERDICT.CHECK_REQUIRED]: { label: 'Tricky', color: '#FFB020', sub: '기준선 초과 10cm 이내입니다' },
  [VERDICT.FAULT]: { label: 'Fault', color: '#FF453A', sub: '기준선을 10cm 초과했습니다' },
  [VERDICT.PERFECT]: { label: 'Good', color: '#30D158', sub: '기준선 이하로 감지되었습니다' },
  [VERDICT.VAR_CHALLENGE]: { label: 'Tricky', color: '#FFB020', sub: '기준점 오차 확인이 필요합니다' },
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
  const shuttlecockPos = state?.shuttlecockPos;
  const timestamp = state?.timestamp ?? new Date().toISOString();

  const display = VERDICT_DISPLAY[verdict] ?? VERDICT_DISPLAY[VERDICT.CHECK_REQUIRED];

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
      });
      await shareCard(blob);
    } catch (e) {
      console.warn('[share]', e);
    } finally {
      setSharing(false);
    }
  };

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

            {typeof serviceLineY === 'number' && Number.isFinite(serviceLineY) && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: toPercent(serviceLineY),
                borderTop: '2px dashed rgba(255, 176, 32, 0.95)',
                transform: 'translateY(-1px)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.65))',
              }}>
                <span style={{
                  position: 'absolute',
                  right: 10,
                  top: -25,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.56)',
                  border: '1px solid rgba(255,176,32,0.65)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                }}>1.15m</span>
              </div>
            )}

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
              Verdict
            </div>
            <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 950, color: display.color, textShadow: `0 2px 8px ${display.color}22` }}>
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
          {[
            {
              label: language === 'ko' ? '감지 높이' : 'Detected height',
              value: formatMeters(shuttlecockHeightM),
            },
            {
              label: language === 'ko' ? '기준선 대비' : 'Against limit',
              value: formatDeltaCm(heightDeltaM),
            },
            {
              label: language === 'ko' ? 'Tricky 구간' : 'Tricky zone',
              value: language === 'ko' ? '초과 10cm 이내' : 'within +10cm',
            },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
              <span style={{ color: display.color, fontWeight: 800, fontSize: '1rem', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: '4px', color: 'var(--text-sub)', fontSize: '0.76rem', lineHeight: 1.5, textAlign: 'left' }}>
            {language === 'ko'
              ? `기준선은 네트 기둥과 지면 기준점으로 계산한 ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m 추정선입니다. 촬영 각도와 기준점 오차를 고려해 기준선 초과 ${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm 이내는 Tricky로 표시합니다.`
              : `The guide is an estimated ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m line from the net post and ground points. To account for camera and point-selection error, up to ${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm above the guide is marked Tricky.`}
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
