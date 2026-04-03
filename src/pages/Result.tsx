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
      minHeight: 'calc(100vh - 56px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      gap: '24px',
    }}>

      {/* Verdict badge */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 'bold',
          color: display.color,
          lineHeight: 1.1,
          marginBottom: '8px',
        }}>
          {display.label}
        </div>
        <div style={{ fontSize: '16px', color: 'var(--text-sub)' }}>{display.sub}</div>
      </div>

      {/* Angle metrics */}
      <div style={{
        background: 'var(--panel-bg)',
        borderRadius: '16px',
        padding: '20px 24px',
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '4px', fontWeight: 'bold' }}>
          {language === 'ko' ? '관절 각도' : 'Joint Angles'}
        </div>
        {[
          { label: language === 'ko' ? '어깨' : 'Shoulder', value: angles.shoulder },
          { label: language === 'ko' ? '팔꿈치' : 'Elbow', value: angles.elbow },
          { label: language === 'ko' ? '손목' : 'Wrist', value: angles.wrist },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-main)', fontSize: '15px' }}>{label}</span>
            <span style={{ color: display.color, fontWeight: 'bold', fontSize: '18px' }}>{value}°</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px' }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            background: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: sharing ? 'default' : 'pointer',
            opacity: sharing ? 0.7 : 1,
          }}
        >
          {sharing
            ? (language === 'ko' ? '공유 카드 생성 중...' : 'Creating card...')
            : (language === 'ko' ? '결과 공유하기' : 'Share result')}
        </button>

        <button
          onClick={() => navigate(ROUTES.CAMERA)}
          style={{
            background: 'var(--panel-bg)',
            color: 'var(--text-main)',
            border: '1px solid var(--accent-color)',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          {language === 'ko' ? '다시 분석하기' : 'Analyze again'}
        </button>

        <button
          onClick={() => navigate('/history')}
          style={{
            background: 'transparent',
            color: 'var(--text-sub)',
            border: 'none',
            padding: '10px',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {language === 'ko' ? '내 서브 기록 보기' : 'View my serve history'}
        </button>
      </div>
    </div>
  );
};

export default Result;
