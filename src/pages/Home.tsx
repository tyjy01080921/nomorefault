import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';

const Home = () => {
  const navigate = useNavigate();
  const language = useStore((state: AppState) => state.language);
  const isDarkMode = useStore((state: AppState) => state.isDarkMode);

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1.5, marginBottom: '8px' }}>
          {language === 'ko' ? (
            <>망설임 없는 서브, <span style={{ color: 'var(--accent-color)' }}>당신을 더욱 빛나게.</span></>
          ) : (
            <>Serve with confidence, <span style={{ color: 'var(--accent-color)' }}>shine brighter.</span></>
          )}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '4px' }}>
          BWF 1.15m {language === 'ko' ? '서비스 규정 기준 AI 판정 시스템' : 'Service Rule AI Judgment System'}
        </p>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>
          ({language === 'ko' ? '정확하지 않을 수 있습니다.' : 'May not be accurate.'})
        </p>
      </div>

      {/* Tips Card */}
      <div style={{
        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '16px' }}>
          {language === 'ko' ? '💡 사용 팁 (구글 크롬 브라우저에서 사용 권장)' : '💡 Tips (Google Chrome recommended)'}
        </h3>
        {[
          { icon: '📱', text: language === 'ko' ? '선수의 전신이 화면에 모두 들어오게 촬영하세요' : 'Capture the full body of the player' },
          { icon: '⏱', text: language === 'ko' ? '측면 90도 각도에서 촬영할수록 정확도가 높습니다' : 'Side angle (90°) gives the best accuracy' },
          { icon: '📐', text: language === 'ko' ? '카메라를 최대한 수평으로 유지하세요 (기울기 자동 보정)' : 'Keep the camera level (auto-correction available)' },
          { icon: '📷', text: language === 'ko' ? '카메라 화면이 고정될수록 정확도가 올라갑니다.' : 'Steadier camera means better accuracy.' },
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < 3 ? '12px' : 0 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{tip.icon}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>{tip.text}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => navigate(ROUTES.CAMERA)}
        style={{
          width: '100%',
          padding: '20px',
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '16px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '12px',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '2rem', background: 'var(--accent-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          {language === 'ko' ? '실시간 촬영' : 'Live Recording'}
        </span>
      </button>

      <button
        onClick={() => navigate(ROUTES.ANALYSIS)}
        style={{
          width: '100%',
          padding: '20px',
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '16px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '2rem', background: '#6C63FF', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</span>
        <div>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'block' }}>
            {language === 'ko' ? '서비스 비교 분석' : 'Service Comparison'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            {language === 'ko' ? '숏 / 롱 서비스 자세를 비교합니다' : 'Compare short / long service forms'}
          </span>
        </div>
      </button>

      {/* Footer Links */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
        <a
          href="https://bwf-service-fault.web.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            border: '1px solid var(--accent-color)',
            borderRadius: '20px',
            color: 'var(--accent-color)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 'bold',
          }}
        >
          BWF {language === 'ko' ? '시뮬레이터' : 'Simulator'}
        </a>

        <img
          src={isDarkMode ? '/images/amafulllogowhite2tone-BitFIM0A.png' : '/images/ama_full_logo_navy_skyblue_2tone-0oR0cdhq.jpg'}
          alt="AMA Logo"
          style={{ height: '32px', objectFit: 'contain' }}
        />

        <a
          href="mailto:contact@nomorefault.com"
          style={{
            padding: '8px 16px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
            borderRadius: '20px',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            fontSize: '0.8rem',
          }}
        >
          {language === 'ko' ? '문의' : 'Contact'}
        </a>
      </div>

      {/* Gallery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
          <img
            src="/images/smasher-JjlpivUW.png"
            alt={language === 'ko' ? '완벽한 서전' : 'Perfect Serve'}
            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
          <img
            src="/images/goko-CBDMPcev.jpg"
            alt={language === 'ko' ? '선수 사진' : 'Player Photo'}
            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
