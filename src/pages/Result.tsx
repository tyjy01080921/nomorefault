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
  timestamp: string;
}

const VERDICT_DISPLAY = {
  [VERDICT.NORMAL]: { label: '정상', color: '#30D158', sub: '기준선 이하로 감지되었습니다' },
  [VERDICT.CHECK_REQUIRED]: { label: '확인 필요', color: '#FF9F0A', sub: '기준선 초과 10cm 이내입니다' },
  [VERDICT.FAULT]: { label: '폴트', color: '#FF453A', sub: '기준선을 10cm 초과했습니다' },
  [VERDICT.PERFECT]: { label: '정상', color: '#30D158', sub: '기준선 이하로 감지되었습니다' },
  [VERDICT.VAR_CHALLENGE]: { label: '확인 필요', color: '#FF9F0A', sub: '기준점 오차 확인이 필요합니다' },
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
      gap: '24px',
      alignItems: 'center',
    }}>
      <h3 style={{ color: 'var(--accent-color)', fontWeight: 800, margin: '20px 0 0', fontSize: '1.2rem' }}>
        {language === 'ko' ? '분석 결과' : 'Analysis Result'}
      </h3>

      {/* Main Verdict Card */}
      <div style={{
        background: 'var(--panel-bg)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '380px',
        padding: '32px 24px',
        textAlign: 'center',
        border: `1px solid var(--card-border)`,
        boxShadow: '0 12px 32px rgba(255, 159, 180, 0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 900,
          color: display.color,
          marginBottom: '8px',
          textShadow: `0 2px 8px ${display.color}22`,
        }}>
          {display.label}
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-sub)', fontWeight: 600, marginBottom: '24px' }}>
          {display.sub}
        </div>

        {/* Judgement Criteria */}
        <div style={{
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
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
              label: language === 'ko' ? '확인 필요 구간' : 'Review zone',
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
              ? `기준선은 네트 기둥과 지면 기준점으로 계산한 ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m 추정선입니다. 촬영 각도와 기준점 오차를 고려해 기준선 초과 ${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm 이내는 확인 필요로 표시합니다.`
              : `The guide is an estimated ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m line from the net post and ground points. To account for camera and point-selection error, up to ${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm above the guide is marked as review needed.`}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '380px', marginTop: 'auto', paddingBottom: '32px' }}>
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
