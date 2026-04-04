import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import Home from './pages/Home';
import Camera from './pages/Camera';
import AnalysisSetup from './pages/AnalysisSetup';
import Result from './pages/Result';
import History from './pages/History';
import { useStore } from './store/useStore';
import { Sun, Moon, Globe, AlertTriangle } from 'lucide-react';

const App = () => {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const setIsDarkMode = useStore((state) => state.setIsDarkMode);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--bg-color', '#121212');
      root.style.setProperty('--panel-bg', '#1e1e1e');
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--text-sub', '#a0a0a0');
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
      alert(language === 'ko' ? 'URL이 복사되었습니다' : 'URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Router>
      <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s' }}>
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
            borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {/* Left: Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: 'transparent',
              border: '1px solid var(--text-sub)',
              borderRadius: '50%',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
            }}
            title={language === 'ko' ? '다크모드 토글' : 'Toggle dark mode'}
          >
            {isDarkMode ? <Sun size={16} color="var(--text-main)" /> : <Moon size={16} color="var(--text-main)" />}
          </button>

          {/* Center: Title */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={18} color="var(--accent-color)" />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'var(--accent-color)',
                whiteSpace: 'nowrap',
              }}
            >
              No More Fault
            </span>
          </div>

          {/* Right: Language toggle */}
          <button
            onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
            style={{
              background: 'transparent',
              border: '1px solid var(--text-sub)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Globe size={14} />
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
        </header>

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
