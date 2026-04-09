import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, VERDICT } from '../utils/constants';
import { useStore } from '../store/useStore';
import { loadHistory, deleteHistoryEntry, HistoryEntry } from '../utils/history';
import { generateComparisonCard, shareCard } from '../utils/shareCard';

// ─── 상수 ────────────────────────────────────────────────────

const VERDICT_LABEL: Record<string, { short: string; color: string }> = {
  [VERDICT.PERFECT]:       { short: 'PASS',   color: '#30D158' },
  [VERDICT.FAULT]:         { short: 'FAULT',  color: '#FF453A' },
  [VERDICT.VAR_CHALLENGE]: { short: '재검토', color: '#FF9F0A' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const BAR_MAX_HEIGHT = 60;

// ─── 컴포넌트 ─────────────────────────────────────────────────

const History = () => {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // A+B 선택 상태: 최대 2개
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [shareMode, setShareMode] = useState(false); // 선택 모드 활성화 여부

  useEffect(() => {
    setEntries(loadHistory().reverse()); // 최신 순
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else if (s.size < 2) {
        s.add(id);
      }
      return s;
    });
  };

  // A+B 비교 카드 생성
  const handleCompare = async () => {
    const ids = Array.from(selected);
    if (ids.length !== 2) return;
    const entA = entries.find((e) => e.id === ids[0]);
    const entB = entries.find((e) => e.id === ids[1]);
    if (!entA || !entB) return;

    setSharing(true);
    try {
      const blob = await generateComparisonCard({
        labelA: `A: ${VERDICT_LABEL[entA.verdict]?.short ?? entA.verdict} (${formatDate(entA.date)})`,
        labelB: `B: ${VERDICT_LABEL[entB.verdict]?.short ?? entB.verdict} (${formatDate(entB.date)})`,
        resultA: { verdict: entA.verdict, angles: entA.angles },
        resultB: { verdict: entB.verdict, angles: entB.angles },
      });
      await shareCard(blob, 'No More Fault — A+B 서비스 비교');
    } catch (e) {
      console.warn('[compare share]', e);
    } finally {
      setSharing(false);
    }
  };

  // 차트용 마지막 10개 (시간순)
  const chartEntries = [...entries].reverse().slice(-10);
  const showChart = chartEntries.length >= 3;

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: 'calc(100vh - 56px)', padding: '16px' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>
          {language === 'ko' ? '내 서브 기록' : 'My Serve History'}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* A+B 비교 모드 토글 */}
          {entries.length >= 2 && (
            <button
              onClick={() => { setShareMode(!shareMode); setSelected(new Set()); }}
              style={{
                background: shareMode ? 'var(--accent-color)' : 'rgba(255,159,180,0.12)',
                color: shareMode ? '#fff' : 'var(--accent-color)',
                border: '1px solid var(--accent-color)',
                borderRadius: '14px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {shareMode ? '취소' : 'A+B 비교'}
            </button>
          )}
          <button
            onClick={() => navigate(ROUTES.CAMERA)}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {language === 'ko' ? '+ 분석' : '+ Analyze'}
          </button>
        </div>
      </div>

      {/* A+B 안내 배너 */}
      {shareMode && (
        <div style={{
          background: 'rgba(255,159,180,0.10)',
          border: '1px dashed var(--accent-color)',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--accent-color)', fontWeight: 600 }}>
            {selected.size === 0 && '비교할 기록 2개를 선택하세요'}
            {selected.size === 1 && '하나 더 선택하세요'}
            {selected.size === 2 && '준비 완료! 비교 카드를 공유하세요'}
          </span>
          <button
            onClick={handleCompare}
            disabled={selected.size !== 2 || sharing}
            style={{
              background: selected.size === 2 ? 'var(--accent-color)' : 'rgba(0,0,0,0.08)',
              color: selected.size === 2 ? '#fff' : 'rgba(0,0,0,0.3)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 18px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: selected.size === 2 ? 'pointer' : 'default',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {sharing ? '생성 중...' : '📤 공유'}
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏸</div>
          <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
            {language === 'ko' ? '아직 분석 기록이 없습니다.' : 'No records yet.'}
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            {language === 'ko' ? '첫 서브를 분석해 보세요!' : 'Analyze your first serve!'}
          </div>
        </div>
      )}

      {/* 막대 차트 (3개 이상 시) */}
      {showChart && (
        <div style={{
          background: 'var(--panel-bg)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid var(--card-border)',
          boxShadow: '0 4px 12px rgba(255,159,180,0.07)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '12px', fontWeight: 600 }}>
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
                    borderRadius: '6px 6px 0 0',
                    opacity: 0.8,
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

      {/* 기록 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map((entry, idx) => {
          const cfg = VERDICT_LABEL[entry.verdict] ?? VERDICT_LABEL[VERDICT.VAR_CHALLENGE];
          const isSelected = selected.has(entry.id);

          return (
            <React.Fragment key={entry.id}>
              <div
                onClick={() => shareMode && toggleSelect(entry.id)}
                style={{
                  background: isSelected
                    ? 'rgba(255,159,180,0.15)'
                    : 'var(--panel-bg)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: isSelected
                    ? '2px solid var(--accent-color)'
                    : '1px solid var(--card-border)',
                  cursor: shareMode ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 4px 12px rgba(255,159,180,0.2)' : 'none',
                }}
              >
                {/* 선택 체크박스 OR 판정 도트 */}
                {shareMode ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)'}`,
                    background: isSelected ? 'var(--accent-color)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800 }}>✓</span>}
                  </div>
                ) : (
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: cfg.color, flexShrink: 0,
                  }} />
                )}

                {/* 기록 정보 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: cfg.color, fontSize: '0.95rem' }}>{cfg.short}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                    {formatDate(entry.date)} · 어깨 {entry.angles.shoulder}° 팔꿈치 {entry.angles.elbow}°
                  </div>
                </div>

                {/* 삭제 버튼 */}
                {!shareMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--text-sub)', cursor: 'pointer',
                      fontSize: '18px', padding: '4px 8px', flexShrink: 0,
                    }}
                    title={language === 'ko' ? '삭제' : 'Delete'}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 광고 슬롯 (5개마다) */}
              {(idx + 1) % 5 === 0 && idx < entries.length - 1 && (
                <div style={{
                  background: 'var(--panel-bg)',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'var(--text-sub)',
                  border: '1px dashed rgba(255,159,180,0.3)',
                }}>
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
