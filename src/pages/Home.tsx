import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Smartphone, Clock, Ruler, Camera, RefreshCw } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const language = useStore((state: AppState) => state.language);
  const isDarkMode = useStore((state: AppState) => state.isDarkMode);

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : '#f4f4f4';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
  const chipBg = isDarkMode ? 'rgba(255,255,255,0.06)' : '#e8e8e8';

  const tips = [
    { icon: <Smartphone size={13} color="var(--text-sub)" />, ko: '전신 촬영', en: 'Full body' },
    { icon: <Clock size={13} color="var(--text-sub)" />, ko: '측면 90도', en: 'Side 90°' },
    { icon: <Ruler size={13} color="var(--text-sub)" />, ko: '수평 유지', en: 'Keep level' },
    { icon: <Camera size={13} color="var(--text-sub)" />, ko: '고정 촬영', en: 'Steady cam' },
  ];

  return (
    <div style={{ padding: '0 16px 20px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Hero — compact */}
      <div style={{ textAlign: 'center', padding: '14px 0 10px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.4, margin: '0 0 6px' }}>
          {language === 'ko' ? (
            <>{'망설임 없는 서브, '}<span style={{ color: 'var(--accent-color)' }}>당신을 더욱 빛나게.</span></>
          ) : (
            <>{'Serve with confidence, '}<span style={{ color: 'var(--accent-color)' }}>shine brighter.</span></>
          )}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.76rem', margin: 0 }}>
          BWF 1.15m {language === 'ko' ? '규정 기반 AI 판정' : 'Rule-based AI Judgment'}
          <span style={{ opacity: 0.6 }}> ({language === 'ko' ? '참고용' : 'reference only'})</span>
        </p>
      </div>

      {/* Tips — horizontal wrap chips */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '12px',
        padding: '10px 12px',
        marginBottom: '10px',
      }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          💡 {language === 'ko' ? '사용 팁 (크롬 권장)' : 'Tips (Chrome recommended)'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tips.map((tip, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.72rem', color: 'var(--text-sub)',
                background: chipBg, padding: '4px 8px', borderRadius: '6px',
              }}
            >
              {tip.icon}
              <span>{language === 'ko' ? tip.ko : tip.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ad Banner */}
      <div style={{
        borderRadius: '8px',
        background: 'linear-gradient(90deg, #1d40dc, #0076f6)',
        padding: '8px 12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}>
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {language === 'ko' ? '시합 갈때 늘 쓰는 여행 어플' : 'Travel app for tournaments'}
          </div>
          <div style={{ fontSize: '0.6rem', opacity: 0.85 }}>
            {language === 'ko' ? '24시간 한국어 상담 · 리워드 혜택' : '24/7 support · rewards'}
          </div>
        </div>
        <div style={{ background: '#ffb900', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '3px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
          Trip.com
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => navigate(ROUTES.CAMERA)}
        style={{
          width: '100%', padding: '12px 16px', marginBottom: '8px',
          background: 'transparent',
          border: '1px solid var(--accent-color)',
          borderRadius: '12px', color: 'var(--accent-color)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        <Camera size={18} />
        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          {language === 'ko' ? '실시간 촬영' : 'Live Recording'}
        </span>
      </button>

      <button
        onClick={() => navigate(ROUTES.ANALYSIS)}
        style={{
          width: '100%', padding: '12px 16px', marginBottom: '14px',
          background: 'transparent',
          border: '1px solid rgba(255, 64, 129, 0.3)',
          borderRadius: '12px', color: 'var(--text-main)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        <RefreshCw size={18} color="var(--accent-color)" />
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block' }}>
            {language === 'ko' ? '서비스 비교 분석' : 'Service Comparison'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>
            {language === 'ko' ? '숏 / 롱 서비스 자세 비교' : 'Compare short / long service forms'}
          </span>
        </div>
      </button>

      {/* Gallery — compact */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <img
            src="/images/smasher-JjlpivUW.png"
            alt={language === 'ko' ? '배드민턴 서브' : 'Badminton Serve'}
            style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <img
            src="/images/goko-CBDMPcev.jpg"
            alt={language === 'ko' ? '선수 사진' : 'Player Photo'}
            style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>

      {/* Footer — single compact row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href="https://bwf-service-fault.web.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '3px 8px',
            border: '1px solid var(--accent-color)',
            borderRadius: '24px',
            color: 'var(--accent-color)',
            textDecoration: 'none',
            fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap',
          }}
        >
          BWF {language === 'ko' ? '시뮬레이터' : 'Sim.'}
        </a>

        <img
          src={isDarkMode
            ? '/images/amafulllogowhite2tone-BitFIM0A.png'
            : '/images/ama_full_logo_navy_skyblue_2tone-0oR0cdhq.jpg'
          }
          alt="AMA"
          style={{ height: '20px', objectFit: 'contain' }}
        />

        <a
          href="mailto:contact@nomorefault.com"
          style={{
            padding: '3px 8px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
            borderRadius: '24px',
            color: 'var(--text-sub)',
            textDecoration: 'none',
            fontSize: '0.65rem', whiteSpace: 'nowrap',
          }}
        >
          {language === 'ko' ? '문의' : 'Contact'}
        </a>
      </div>

      {/* Copyright */}
      <div style={{ textAlign: 'center', marginTop: '8px', color: 'var(--text-sub)', fontSize: '0.52rem', opacity: 0.6 }}>
        v1.2.0 · ROUM S &amp; E Co., Ltd. · Copyright © 2026
      </div>

    </div>
  );
};

export default Home;
