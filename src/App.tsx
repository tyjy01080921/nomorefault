import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import Home from './pages/Home';
import Camera from './pages/Camera';
import AnalysisSetup from './pages/AnalysisSetup';
import Result from './pages/Result';
import History from './pages/History';
import { useStore } from './store/useStore';
import { Sun, Moon, Globe, AlertTriangle, Link } from 'lucide-react';

const App = () => {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const setIsDarkMode = useStore((state) => state.setIsDarkMode);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);

  // CSS 변수 적용 — 3월 22일 소프트 핑크 테마 기반
  useEffect(() => {
    console.log('App Version: 1.2.2 Loaded');
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

  return (
    <Router>
      <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s' }}>
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
            {useStore.getState().needRefresh && (
               <button
                 onClick={() => {
                   const updateFn = useStore.getState().updateServiceWorker;
                   if (updateFn) updateFn();
                 }}
                 style={{
                   background: 'var(--accent-color)',
                   border: 'none',
                   borderRadius: '16px',
                   color: '#fff',
                   cursor: 'pointer',
                   padding: '4px 8px',
                   fontSize: '11px',
                   fontWeight: 'bold',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   height: '24px',
                   gap: '4px'
                 }}
               >
                 <span>업데이트</span>
                 <div style={{ background: '#FF453A', color: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>N</div>
               </button>
            )}

            <button
               onClick={copyUrlToClipboard}
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
               title={language === 'ko' ? '공유하기' : 'Share'}
             >
               <Link size={14} />
             </button>

            <button
              onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
              style={{
                background: 'transparent',
                border: '1px solid var(--text-sub)',
                color: 'var(--text-main)',
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
              }}
            >
              <Globe size={14} />
              {language === 'ko' ? 'EN' : 'KO'}
            </button>
          </div>
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
