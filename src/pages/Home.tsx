import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { useStore, AppState } from '../store/useStore';
import { Check, Copy, Mail, Smartphone, Clock, UserRound, Camera, X } from 'lucide-react';

const CONTACT_EMAIL = 'roumsne@gmail.com';
const AMA_LOUNGE_URL = 'https://amalounge.com';
const SHIN_BAEKCHEOL_URL = 'https://amalounge.com/shin-baekcheol';
const KO_SUNGHYUN_URL = 'https://amalounge.com/ko-sunghyun';

const Home = () => {
  const navigate = useNavigate();
  const language = useStore((state: AppState) => state.language);
  const isDarkMode = useStore((state: AppState) => state.isDarkMode);
  const tripAdRef = useRef<HTMLDivElement>(null);
  const [tripAdScale, setTripAdScale] = useState(1);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [hasCopiedEmail, setHasCopiedEmail] = useState(false);

  const cardBg = 'var(--panel-bg)';
  const cardBorder = '1px solid var(--card-border)';

  useEffect(() => {
    const updateTripAdScale = () => {
      const width = tripAdRef.current?.clientWidth ?? 468;
      setTripAdScale(Math.max(0.1, Math.min(1, width / 468)));
    };

    updateTripAdScale();

    if (!tripAdRef.current || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateTripAdScale);
      return () => window.removeEventListener('resize', updateTripAdScale);
    }

    const observer = new ResizeObserver(updateTripAdScale);
    observer.observe(tripAdRef.current);
    return () => observer.disconnect();
  }, []);

  const openContactDialog = useCallback(() => {
    setHasCopiedEmail(false);
    setIsContactOpen(true);
  }, []);

  const closeContactDialog = useCallback(() => {
    setIsContactOpen(false);
    setHasCopiedEmail(false);
  }, []);

  useEffect(() => {
    if (!isContactOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContactDialog();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeContactDialog, isContactOpen]);

  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setHasCopiedEmail(true);
      return;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = CONTACT_EMAIL;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const didCopy = document.execCommand('copy');
      document.body.removeChild(textarea);
      setHasCopiedEmail(didCopy);
    }
  };

  const actionCardStyle: CSSProperties = {
    width: '100%',
    padding: '20px',
    background: cardBg,
    border: cardBorder,
    borderRadius: '18px',
    color: 'var(--text-main)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxSizing: 'border-box',
    boxShadow: '0 4px 12px rgba(255, 159, 180, 0.15)',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
  };

  const actionIconStyle: CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(255, 159, 180, 0.15)',
    border: '1px solid var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '28px 0 18px' }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.4, margin: '0 0 12px', color: 'var(--text-main)' }}>
          {language === 'ko' ? (
            <>{'망설임 없는 서브, '}<br/><span style={{ color: 'var(--accent-color)' }}>당신을 더욱 빛나게.</span></>
          ) : (
            <>{'Serve with confidence, '}<br/><span style={{ color: 'var(--accent-color)' }}>shine brighter.</span></>
          )}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', margin: '0 0 6px' }}>
          BWF 1.15m {language === 'ko' ? '서비스 규정 기준 AI 판정 시스템' : 'Service Rule AI Judgment System'}
        </p>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.75rem', margin: 0 }}>
          ({language === 'ko' ? '정확하지 않을 수 있습니다.' : 'May not be accurate.'})
        </p>
      </div>

      {/* Action: Live Recording */}
      <button
        type="button"
        aria-label={language === 'ko' ? '서브 촬영 시작' : 'Start service recording'}
        onClick={() => navigate(ROUTES.CAMERA)}
        style={{
          ...actionCardStyle,
          marginBottom: '14px',
          minHeight: '104px',
          border: '2px solid var(--accent-color)',
          boxShadow: '0 10px 28px rgba(255, 159, 180, 0.22)',
        }}
      >
        <span style={{ ...actionIconStyle, width: 56, height: 56 }}><Camera size={26} color="var(--accent-color)" /></span>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '1.18rem', fontWeight: 900, display: 'block', marginBottom: '4px', color: 'var(--accent-color)' }}>
            {language === 'ko' ? '서브 촬영 시작' : 'Start Recording'}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-sub)', lineHeight: 1.45 }}>
            {language === 'ko' ? '기준 자세와 타구 순간을 골라 셔틀콕을 지정합니다' : 'Pick the reference pose and impact frame, then mark the shuttle'}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/history')}
        style={{
          width: '100%',
          minHeight: '44px',
          marginBottom: '16px',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          background: 'rgba(255, 159, 180, 0.08)',
          color: 'var(--text-sub)',
          fontSize: '0.84rem',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {language === 'ko' ? '내 서브 기록 보기' : 'View My Serve History'}
      </button>

      {/* Tips Card */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 6px 14px rgba(255, 159, 180, 0.08)',
        backdropFilter: 'blur(10px)',
      }}>
        <p style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
          <span style={{ fontSize: '1.05rem' }}>💡</span> {language === 'ko' ? '촬영 전 5가지만 확인' : 'Check 5 things before recording'}
        </p>
        {([
          { icon: <Clock size={15} color="var(--accent-color)"/>, ko: '선수 옆 90도 위치에서 찍기', en: 'Record from the side, about 90°' },
          { icon: <Smartphone size={15} color="var(--accent-color)"/>, ko: '머리부터 발까지 전신 보이게 하기', en: 'Keep the full body in frame' },
          { icon: <UserRound size={15} color="var(--accent-color)"/>, ko: '서비스 전 1초간 똑바로 서기', en: 'Stand upright for 1 second before serving' },
          { icon: <Check size={15} color="var(--accent-color)"/>, ko: '뒤에 지나가는 사람과 겹치지 않게 하기', en: 'Avoid overlap with bystanders' },
          { icon: <Camera size={15} color="var(--accent-color)"/>, ko: '폰은 최대한 흔들리지 않게 고정', en: 'Keep the phone as steady as possible' },
        ] as const).map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 4 ? '10px' : 0 }}>
            <span style={{ flexShrink: 0, marginTop: '1px', background: 'rgba(255, 159, 180, 0.1)', padding: '5px', borderRadius: '8px', display: 'flex' }}>{tip.icon}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>{language === 'ko' ? tip.ko : tip.en}</span>
          </div>
        ))}
      </div>

      {/* Affiliate Ad Banner (Trip.com) */}
      <div
        ref={tripAdRef}
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderRadius: '8px',
          height: `${tripAdScale * 60}px`,
          marginBottom: '22px',
          background: cardBg,
        }}
      >
        <iframe
          src="https://kr.trip.com/partners/ad/SB13686962?Allianceid=7822879&SID=297886051&trip_sub1="
          style={{
            width: '468px',
            height: '60px',
            border: 'none',
            display: 'block',
            transformOrigin: 'left top',
            transform: `scale(${tripAdScale})`,
          }}
          scrolling="no"
          id="SB13686962"
          title="제휴 광고"
          loading="lazy"
          allow="geolocation 'none'; camera 'none'; microphone 'none'; payment 'none'"
          aria-hidden="true"
          tabIndex={-1}
        />
        <a
          href="https://kr.trip.com/partners/ad/SB13686962?Allianceid=7822879&SID=297886051&trip_sub1="
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={language === 'ko' ? 'Trip.com 제휴 링크 새 창에서 열기' : 'Open the Trip.com affiliate link in a new window'}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        />
      </div>

      {/* Footer: AMA Logo + Contact */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <a
          href={AMA_LOUNGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="AMA Lounge"
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <img
            src={isDarkMode ? '/images/amafulllogowhite2tone-BitFIM0A.png' : '/images/ama_full_logo_navy_skyblue_2tone-0oR0cdhq.jpg'}
            alt="AMA - Athlete Meets Artisans"
            style={{ height: '28px', objectFit: 'contain' }}
          />
        </a>

        <button
          type="button"
          onClick={openContactDialog}
          style={{
            padding: '4px 12px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
            borderRadius: '24px',
            background: 'transparent',
            color: 'var(--text-sub)',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {language === 'ko' ? '광고 문의' : 'Contact'}
        </button>
      </div>

      {isContactOpen && (
        <div
          role="presentation"
          onClick={closeContactDialog}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 360px)',
              background: isDarkMode ? '#24161a' : '#fff',
              border: cardBorder,
              borderRadius: '20px',
              boxShadow: '0 20px 48px rgba(0,0,0,0.28)',
              padding: '20px',
              color: 'var(--text-main)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ ...actionIconStyle, width: '40px', height: '40px' }}>
                  <Mail size={20} color="var(--accent-color)" />
                </span>
                <h2 id="contact-dialog-title" style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {language === 'ko' ? '광고 문의' : 'Contact'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeContactDialog}
                aria-label={language === 'ko' ? '닫기' : 'Close'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--card-border)',
                  background: 'transparent',
                  color: 'var(--text-sub)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--card-border)',
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255, 159, 180, 0.08)',
                fontWeight: 800,
                fontSize: '1rem',
                textAlign: 'center',
                wordBreak: 'break-all',
                marginBottom: '14px',
              }}
            >
              {CONTACT_EMAIL}
            </div>

            <button
              type="button"
              onClick={copyEmailToClipboard}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: 'none',
                background: 'var(--accent-color)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {hasCopiedEmail ? <Check size={18} /> : <Copy size={18} />}
              {hasCopiedEmail
                ? (language === 'ko' ? '복사됨' : 'Copied')
                : (language === 'ko' ? '복사하기' : 'Copy')}
            </button>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <a
          href={SHIN_BAEKCHEOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={language === 'ko' ? '신백철 AMA Lounge로 이동' : 'Open Shin Baekcheol AMA Lounge'}
          style={{ borderRadius: '12px', overflow: 'hidden', background: isDarkMode ? '#1a1f26' : '#eee', display: 'block' }}
        >
          <img
            src="/images/smasher-JjlpivUW.png"
            alt={language === 'ko' ? '배드민턴 서브' : 'Badminton Serve'}
            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
          />
        </a>
        <a
          href={KO_SUNGHYUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={language === 'ko' ? '고성현 AMA Lounge로 이동' : 'Open Ko Sunghyun AMA Lounge'}
          style={{ borderRadius: '12px', overflow: 'hidden', background: isDarkMode ? '#1a1f26' : '#eee', display: 'block' }}
        >
          <img
            src="/images/goko-CBDMPcev.jpg"
            alt={language === 'ko' ? '선수 사진' : 'Player Photo'}
            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
          />
        </a>
      </div>
      {/* Copyright */}
      <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-sub)', fontSize: '0.6rem', lineHeight: '1.4' }}>
        v{__APP_VERSION__}<br/>
        ROUM S & E Co., Ltd.<br/>
        #117, 201 Hyangdong-ro, Deogyang-gu, Goyang-si, Gyeonggi-do, Rep. of Korea<br/>
        Copyright © 2026 ROUM S & E. All rights reserved.
      </div>
    </div>
  );
};

export default Home;
