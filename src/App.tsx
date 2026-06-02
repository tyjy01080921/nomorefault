import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import Home from './pages/Home';
import Camera from './pages/Camera';
import AnalysisSetup from './pages/AnalysisSetup';
import Result from './pages/Result';
import History from './pages/History';
import { useStore } from './store/useStore';
import { Sun, Moon, Globe, AlertTriangle, Link, RefreshCw } from 'lucide-react';

const App = () => {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const setIsDarkMode = useStore((state) => state.setIsDarkMode);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const needRefresh = useStore((state) => state.needRefresh);
  const updateServiceWorker = useStore((state) => state.updateServiceWorker);
  const [isUpdating, setIsUpdating] = useState(false);

  // CSS 변수 적용 — 3월 22일 소프트 핑크 테마 기반
  useEffect(() => {
    console.log(`App Version: ${__APP_VERSION__} Loaded`);
    const root = document.documentElement;
    if (isDarkMode) {
      // 다크 모드도 핑크 계열 유지
      root.style.setProperty('--bg-color', '#1a0f12');
      root.style.setProperty('--panel-bg', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--card-border', 'rgba(255,159,180,0.15)');
      root.style.setProperty('--text-main', '#f5e6ea');
      root.style.setProperty('--text-sub', '#b09098');
      root.style.setProperty('--accent-color', '#ff9fb4');
    } else {
      // 라이트 모드 — 소프트 핑크 테마 (index.html 기본값과 동일)
      root.style.setProperty('--bg-color', 'linear-gradient(160deg, #fff5f7 0%, #fce8ed 50%, #f0f4ff 100%)');
      root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.82)');
      root.style.setProperty('--card-border', 'rgba(255, 159, 180, 0.25)');
      root.style.setProperty('--text-main', '#2d1c22');
      root.style.setProperty('--text-sub', '#8c6b74');
      root.style.setProperty('--accent-color', '#ff9fb4');
    }
  }, [isDarkMode]);

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert(language === 'ko' ? 'URL이 복사되었습니다' : 'URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleUpdateClick = async () => {
    if (isUpdating) return;

    const currentPath = window.location.pathname;
    const shouldConfirmUpdate = [
      ROUTES.CAMERA,
      ROUTES.ANALYSIS,
      ROUTES.RESULT,
    ].includes(currentPath);

    if (shouldConfirmUpdate) {
      const confirmed = window.confirm(
        language === 'ko'
          ? '업데이트하면 현재 작업이 새로고침됩니다. 계속할까요?'
          : 'Updating will reload your current work. Continue?'
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);
    window.setTimeout(() => {
      window.location.reload();
    }, 8000);

    try {
      if (updateServiceWorker) {
        await updateServiceWorker();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to update service worker:', err);
      window.location.reload();
    }
  };

  const headerRoundButtonStyle: CSSProperties = {
    background: 'rgba(255, 159, 180, 0.08)',
    border: '1px solid var(--card-border)',
    borderRadius: '50%',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
  };

  const headerPillButtonStyle: CSSProperties = {
    background: 'rgba(255, 159, 180, 0.08)',
    border: '1px solid var(--card-border)',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    padding: '0 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    gap: '4px',
    minWidth: '40px'
  };

  return (
    <Router>
      <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', paddingBottom: needRefresh ? '88px' : 0, transition: 'background-color 0.3s, color 0.3s' }}>
        {/* Global Header */}
        <header
          style={{
            width: '100%',
            height: '56px',
            background: 'var(--panel-bg)',
            display: 'grid', // Use grid to ensure center alignment and no overlap
            gridTemplateColumns: 'min-content 1fr min-content',
            alignItems: 'center',
            padding: '0 16px',
            boxSizing: 'border-box',
            zIndex: 50,
            position: 'sticky',
            top: 0,
            borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            gap: '8px'
          }}
        >
          {/* Left: Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={headerRoundButtonStyle}
            title={language === 'ko' ? '다크모드 토글' : 'Toggle dark mode'}
          >
            {isDarkMode ? <Sun size={16} color="var(--accent-color)" /> : <Moon size={16} color="var(--accent-color)" />}
          </button>

          {/* Center: Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minWidth: 0, // Allow title to truncate if very narrow
            }}
          >
            <AlertTriangle size={18} color="var(--accent-color)" />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'var(--accent-color)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              No More Fault
            </span>
          </div>

          {/* Right: Actions (Share + Language) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
               onClick={copyUrlToClipboard}
               style={headerRoundButtonStyle}
               title={language === 'ko' ? '공유하기' : 'Share'}
             >
               <Link size={14} />
             </button>

            <button
              onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
              style={headerPillButtonStyle}
            >
              <Globe size={14} />
              {language === 'ko' ? 'EN' : 'KO'}
            </button>
          </div>
        </header>

        {needRefresh && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              background: 'var(--panel-bg)',
              borderTop: '1px solid var(--card-border)',
              backdropFilter: 'blur(12px)',
              boxSizing: 'border-box',
              padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
            }}
          >
            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>
                  {language === 'ko' ? '새 버전이 있습니다' : 'New version available'}
                </div>
                <div style={{ color: 'var(--text-sub)', fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                  {language === 'ko' ? '업데이트하면 최신 앱으로 다시 열립니다.' : 'Update to reload with the latest app.'}
                </div>
              </div>
              <button
                onClick={handleUpdateClick}
                disabled={isUpdating}
                style={{
                  background: isUpdating ? 'rgba(255, 159, 180, 0.45)' : 'var(--accent-color)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: isUpdating ? 'default' : 'pointer',
                  minWidth: '104px',
                  height: '38px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={15} />
                {isUpdating
                  ? (language === 'ko' ? '진행 중' : 'Updating')
                  : (language === 'ko' ? '업데이트' : 'Update')}
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <Routes>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.CAMERA} element={<Camera />} />
          <Route path={ROUTES.ANALYSIS} element={<AnalysisSetup />} />
          <Route path={ROUTES.RESULT} element={<Result />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
