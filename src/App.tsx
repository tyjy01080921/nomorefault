import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import Camera from './pages/Camera';
import AnalysisSetup from './pages/AnalysisSetup';
import Result from './pages/Result';
import History from './pages/History';
import { useStore } from './store/useStore';

const App = () => {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const setIsDarkMode = useStore((state) => state.setIsDarkMode);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--bg-color', '#0a0e12');
      root.style.setProperty('--panel-bg', '#1a1f26');
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--text-sub', '#b0b8c1');
      root.style.setProperty('--accent-color', '#ff4081');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--panel-bg', '#f5f5f5');
      root.style.setProperty('--text-main', '#1a1a1a');
      root.style.setProperty('--text-sub', '#666666');
      root.style.setProperty('--accent-color', '#ff4081');
    }
  }, [isDarkMode]);

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // 토스트 메시지 표시 가능 (향후 추가)
      alert(language === 'ko' ? 'URL이 복사되었습니다' : 'URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Router>
      <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh' }}>
        {/* Global Header */}
        <header
          style={{
            width: '100%',
            height: '56px',
            background: 'var(--panel-bg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            boxSizing: 'border-box',
            zIndex: 50,
            position: 'sticky',
            top: 0,
          }}
        >
          {/* Left: Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              height: '40px',
            }}
            title={language === 'ko' ? '다크모드 토글' : 'Toggle dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Center: Title */}
          <span
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'var(--accent-color)',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'center',
              margin: '0 8px',
            }}
          >
            No More Fault
          </span>

          {/* Right: Share + Language */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {/* Share button */}
            <button
              onClick={copyUrlToClipboard}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                height: '40px',
              }}
              title={language === 'ko' ? 'URL 복사' : 'Copy URL'}
            >
              🌐
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
              style={{
                background: 'transparent',
                border: '1px solid var(--accent-color)',
                color: 'var(--accent-color)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold',
                minWidth: '40px',
              }}
            >
              {language === 'ko' ? 'EN' : '한'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <Routes>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.CAMERA} replace />} />
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
