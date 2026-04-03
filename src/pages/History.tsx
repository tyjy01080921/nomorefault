import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, VERDICT } from '../utils/constants';
import { useStore } from '../store/useStore';
import { loadHistory, deleteHistoryEntry, HistoryEntry } from '../utils/history';

const VERDICT_LABEL: Record<string, { short: string; color: string }> = {
  [VERDICT.PERFECT]:       { short: 'PASS',   color: '#30D158' },
  [VERDICT.FAULT]:         { short: 'FAULT',  color: '#FF453A' },
  [VERDICT.VAR_CHALLENGE]: { short: '재검토', color: '#FFD60A' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const BAR_MAX_HEIGHT = 60;

const History = () => {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory().reverse()); // newest first
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Build chart data: last 10 entries (chronological for chart)
  const chartEntries = [...entries].reverse().slice(-10);
  const showChart = chartEntries.length >= 3;

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: 'calc(100vh - 56px)', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px' }}>
          {language === 'ko' ? '내 서브 기록' : 'My Serve History'}
        </h2>
        <button
          onClick={() => navigate(ROUTES.CAMERA)}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
        >
          {language === 'ko' ? '분석하기' : 'Analyze'}
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏸</div>
          <div style={{ fontSize: '15px', marginBottom: '8px' }}>
            {language === 'ko' ? '아직 분석 기록이 없습니다.' : 'No analysis records yet.'}
          </div>
          <div style={{ fontSize: '13px' }}>
            {language === 'ko' ? '첫 서브를 분석해보세요!' : 'Analyze your first serve!'}
          </div>
        </div>
      )}

      {/* Bar chart */}
      {showChart && (
        <div style={{
          background: 'var(--panel-bg)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '12px' }}>
            {language === 'ko' ? '최근 분석 결과' : 'Recent results'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${BAR_MAX_HEIGHT + 20}px` }}>
            {chartEntries.map((e) => {
              const cfg = VERDICT_LABEL[e.verdict] ?? VERDICT_LABEL[VERDICT.VAR_CHALLENGE];
              return (
                <div key={e.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '100%',
                    height: `${BAR_MAX_HEIGHT}px`,
                    background: cfg.color,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.85,
                  }} />
                  <div style={{ fontSize: '9px', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
                    {cfg.short}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entry list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map((entry, idx) => {
          const cfg = VERDICT_LABEL[entry.verdict] ?? VERDICT_LABEL[VERDICT.VAR_CHALLENGE];
          return (
            <React.Fragment key={entry.id}>
              <div style={{
                background: 'var(--panel-bg)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {/* Verdict dot */}
                <div style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: cfg.color,
                  flexShrink: 0,
                }} />

                {/* Main info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: cfg.color, fontSize: '15px' }}>{cfg.short}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                    {formatDate(entry.date)} · 어깨 {entry.angles.shoulder}° 팔꿈치 {entry.angles.elbow}°
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(entry.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-sub)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px 8px',
                    flexShrink: 0,
                  }}
                  title={language === 'ko' ? '삭제' : 'Delete'}
                >
                  ×
                </button>
              </div>

              {/* Ad slot every 5 entries */}
              {(idx + 1) % 5 === 0 && idx < entries.length - 1 && (
                <div style={{
                  background: 'var(--panel-bg)',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'var(--text-sub)',
                  border: '1px dashed rgba(128,128,128,0.3)',
                }}>
                  {/* Ad banner placeholder — replace with AdSense/AdMob component */}
                  광고
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default History;
