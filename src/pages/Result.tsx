import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, VERDICT } from '../utils/constants';
import { useStore } from '../store/useStore';
import { saveHistory } from '../utils/history';
import { generateShareCard, shareCard } from '../utils/shareCard';

interface ResultState {
  verdict: string;
  angles: { shoulder: number; elbow: number; wrist: number };
  frameSnapshot?: string;
  timestamp: string;
}

const VERDICT_DISPLAY = {
  [VERDICT.PERFECT]: { label: '통과 ✓', color: '#30D158', sub: 'BWF 서비스 기준 통과' },
  [VERDICT.FAULT]:   { label: 'FAULT ✕', color: '#FF453A', sub: 'BWF 서비스 폴트' },
  [VERDICT.VAR_CHALLENGE]: { label: 'VAR ❓', color: '#FFD60A', sub: '재검토 필요' },
};

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const language = useStore((s) => s.language);

  const state = location.state as ResultState | null;
  const [sharing, setSharing] = useState(false);

  const verdict = state?.verdict ?? VERDICT.VAR_CHALLENGE;
  const angles = state?.angles ?? { shoulder: 0, elbow: 0, wrist: 0 };
  const timestamp = state?.timestamp ?? new Date().toISOString();

  const display = VERDICT_DISPLAY[verdict] ?? VERDICT_DISPLAY[VERDICT.VAR_CHALLENGE];

  // Auto-save to history on mount
  useEffect(() => {
    saveHistory({ date: timestamp, verdict, angles, note: '' });
  }, []); // run once

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareCard({ verdict, angles, frameSnapshot: state?.frameSnapshot });
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

        {/* Angle Metrics */}
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
            { label: language === 'ko' ? '어깨 각도' : 'Shoulder', value: angles.shoulder },
            { label: language === 'ko' ? '팔꿈치 각도' : 'Elbow', value: angles.elbow },
            { label: language === 'ko' ? '손목 각도' : 'Wrist', value: angles.wrist },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
              <span style={{ color: display.color, fontWeight: 800, fontSize: '1.1rem' }}>{value.toFixed(1)}°</span>
            </div>
          ))}
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
