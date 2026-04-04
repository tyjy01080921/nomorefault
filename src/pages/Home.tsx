import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Smartphone, Clock, Ruler, Camera, RefreshCw } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const language = useStore((state: AppState) => state.language);
  const isDarkMode = useStore((state: AppState) => state.isDarkMode);

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : '#f7f7f7';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

  const handleTripClick = () => {
    window.open('https://trip.tp.st/zZp8rL9H', '_blank');
  };

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.6, margin: '0 0 12px' }}>
          {language === 'ko' ? (
            <>{'망설임 없는 서브, '}<span style={{ color: 'var(--accent-color)' }}>당신을 더욱 빛나게.</span></>
          ) : (
            <>{'Serve with confidence, '}<span style={{ color: 'var(--accent-color)' }}>shine brighter.</span></>
          )}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', margin: '0 0 6px' }}>
          BWF 1.15m {language === 'ko' ? '서비스 규정 기준 AI 판정 시스템' : 'Service Rule AI Judgment System'}
        </p>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.75rem', margin: 0 }}>
          ({language === 'ko' ? '정확하지 않을 수 있습니다.' : 'May not be accurate.'})
        </p>
      </div>

      {/* Tips Card */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>💡</span> {language === 'ko' ? '사용 팁 (구글 크롬 브라우저에서 사용 권장)' : 'Tips (Google Chrome recommended)'}
        </p>
        {([
          { icon: <Smartphone size={16} color="var(--text-sub)"/>, ko: '선수의 전신이 화면에 모두 들어오게 촬영하세요', en: 'Capture the full body of the player' },
          { icon: <Clock size={16} color="var(--text-sub)"/>, ko: '측면 90도 각도에서 촬영할수록 정확도가 높습니다', en: 'Side angle (90°) gives the best accuracy' },
          { icon: <Ruler size={16} color="var(--text-sub)"/>, ko: '카메라를 최대한 수평으로 유지하세요 (기울기 자동 보정)', en: 'Keep the camera level (auto-correction available)' },
          { icon: <Camera size={16} color="var(--text-sub)"/>, ko: '카메라 화면이 고정될수록 정확도가 올라갑니다.', en: 'Steadier camera means better accuracy.' },
        ] as const).map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < 3 ? '14px' : 0 }}>
            <span style={{ flexShrink: 0, marginTop: '2px' }}>{tip.icon}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>{language === 'ko' ? tip.ko : tip.en}</span>
          </div>
        ))}
      </div>

      {/* Ad Banner (Trip.com) */}
      <div 
        onClick={handleTripClick}
        style={{
          width: '100%',
          borderRadius: '8px',
          background: 'linear-gradient(90deg, #1d40dc, #0076f6)',
          padding: '12px 16px',
          boxSizing: 'border-box',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}>
        <div style={{ color: '#fff', textAlign: 'left', zIndex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>{language === 'ko' ? '시합 갈때 늘 쓰는 여행 어플' : 'Travel app for tournaments'}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>{language === 'ko' ? '24시간 한국어 상담, 리워드 혜택, 젤리~ 예약 완료' : '24/7 support, rewards, quick booking'}</div>
        </div>
        <div style={{ 
          background: '#ffb900', 
          color: '#000', 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          padding: '4px 8px', 
          borderRadius: '4px', 
          whiteSpace: 'nowrap',
          zIndex: 1
        }}>
          Trip.com {language === 'ko' ? '더 알아보기' : 'Learn More'}
        </div>
        {/* Subtle Santorini-like background decoration */}
        <div style={{ position: 'absolute', right: -20, bottom: -10, opacity: 0.2, fontSize: '60px', pointerEvents: 'none' }}>🏙️</div>
      </div>

      {/* Action: Live Recording */}
      <button
        onClick={() => navigate(ROUTES.CAMERA)}
        style={{
          width: '100%',
          padding: '18px 20px',
          background: 'transparent',
          border: '1px solid rgba(255, 64, 129, 0.3)',
          borderRadius: '16px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(255, 64, 129, 0.1)',
          border: '1px solid var(--accent-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><Camera size={20} color="var(--accent-color)" /></span>
        <span style={{ fontSize: '1rem', fontWeight: 700 }}>
          {language === 'ko' ? '실시간 촬영' : 'Live Recording'}
        </span>
      </button>

      {/* Action: Service Comparison */}
      <button
        onClick={() => navigate(ROUTES.ANALYSIS)}
        style={{
          width: '100%',
          padding: '18px 20px',
          background: 'transparent',
          border: '1px solid rgba(255, 64, 129, 0.3)',
          borderRadius: '16px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '28px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(255, 64, 129, 0.1)',
          border: '1px solid var(--accent-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><RefreshCw size={20} color="var(--accent-color)" /></span>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
            {language === 'ko' ? '서비스 비교 분석' : 'Service Comparison'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            {language === 'ko' ? '숏 / 롱 서비스 자세를 비교합니다' : 'Compare short / long service forms'}
          </span>
        </div>
      </button>

      {/* Footer: BWF Simulator + AMA Logo + Contact */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <a
          href="https://bwf-service-fault.web.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '4px 12px',
            border: '1px solid var(--accent-color)',
            borderRadius: '24px',
            color: 'var(--accent-color)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          BWF {language === 'ko' ? '시뮬레이터' : 'Simulator'}
        </a>

        <img
          src={isDarkMode ? '/images/amafulllogowhite2tone-BitFIM0A.png' : '/images/ama_full_logo_navy_skyblue_2tone-0oR0cdhq.jpg'}
          alt="AMA - Athlete Meets Artisans"
          style={{ height: '28px', objectFit: 'contain' }}
        />

        <a
          href="mailto:contact@nomorefault.com"
          style={{
            padding: '4px 12px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
            borderRadius: '24px',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'ko' ? '문의' : 'Contact'}
        </a>
      </div>

      {/* Gallery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: isDarkMode ? '#1a1f26' : '#eee' }}>
          <img
            src="/images/smasher-JjlpivUW.png"
            alt={language === 'ko' ? '배드민턴 서브' : 'Badminton Serve'}
            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: isDarkMode ? '#1a1f26' : '#eee' }}>
          <img
            src="/images/goko-CBDMPcev.jpg"
            alt={language === 'ko' ? '선수 사진' : 'Player Photo'}
            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>
      {/* Copyright */}
      <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-sub)', fontSize: '0.6rem', lineHeight: '1.4' }}>
        v1.2.1<br/>
        ROUM S & E Co., Ltd.<br/>
        #117, 201 Hyangdong-ro, Deogyang-gu, Goyang-si, Gyeonggi-do, Rep. of Korea<br/>
        Copyright © 2026 ROUM S & E. All rights reserved.
      </div>
    </div>
  );
};

export default Home;
