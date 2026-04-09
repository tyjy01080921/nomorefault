import React from 'react';
import { useStore, AppState } from '../store/useStore';

const AnalysisWizard = () => {
  const {
    wizardStep,
    setWizardStep,
    netBase,
    netTop,
    ground,
    shuttlecockPos,
    language,
  } = useStore((state: AppState) => state);

  const [isAdjusting, setIsAdjusting] = React.useState(false);

  if (wizardStep === 0) return null;

  const handleNext = (nextStep: number) => {
    setWizardStep(nextStep);
  };

  const wizardCardStyle: React.CSSProperties = {
    background: 'var(--panel-bg)',
    padding: '24px',
    borderRadius: '24px',
    textAlign: 'center',
    width: '85%',
    maxWidth: '340px',
    boxShadow: '0 12px 40px rgba(255, 159, 180, 0.25)',
    pointerEvents: 'auto',
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(15px)',
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Dimmed Background for some steps */}
      {(wizardStep === 1 || wizardStep === 5) && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: -1 }} />
      )}

      {/* Point Overlays */}
      {netBase !== null && (wizardStep >= 2) && (
        <div style={{ position: 'absolute', top: `${netBase.y * 100}%`, left: `${netBase.x * 100}%`, width: 14, height: 14, background: '#FF453A', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.4)', zIndex: 50 }} />
      )}

      {netTop !== null && (wizardStep >= 3) && (
        <div style={{ position: 'absolute', top: `${netTop.y * 100}%`, left: `${netTop.x * 100}%`, width: 14, height: 14, background: '#32ADE6', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.4)', zIndex: 50 }} />
      )}

      {ground !== null && (wizardStep >= 4) && (
        <div style={{ position: 'absolute', top: `${ground.y * 100}%`, left: `${ground.x * 100}%`, width: 14, height: 14, background: '#30D158', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.4)', zIndex: 50 }} />
      )}

      {shuttlecockPos !== null && (wizardStep >= 6) && (
        <div style={{ position: 'absolute', top: `${shuttlecockPos.y * 100}%`, left: `${shuttlecockPos.x * 100}%`, width: 18, height: 18, background: 'rgba(255, 159, 180, 0.4)', borderRadius: '50%', border: '2px solid var(--accent-color)', transform: 'translate(-50%, -50%)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ width: 6, height: 6, background: 'var(--accent-color)', borderRadius: '50%' }} />
        </div>
      )}

      {/* Prompts */}
      {wizardStep === 1 && (
        <div style={wizardCardStyle}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📏</div>
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '8px', fontWeight: 800 }}>1.15m 가이드 설정</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '24px', lineHeight: 1.5 }}>
            {language === 'ko' ? '서비스 폴트 기준 높이(1.15m)를 화면에 표시하여 촬영하시겠습니까?' : 'Display 1.15m service fault baseline during recording?'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="primary-btn" onClick={() => handleNext(2)} style={{ padding: '14px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700 }}>{language === 'ko' ? '네트 기준 자동 생성' : 'Auto-generate (Net)'}</button>
            <button onClick={() => handleNext(0)} style={{ padding: '12px', background: 'transparent', color: 'var(--text-sub)', border: 'none', fontSize: '0.85rem' }}>{language === 'ko' ? '나중에 설정하기' : 'Skip for now'}</button>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#FFEB3B', padding: '12px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem', display: 'inline-block', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,235,59,0.3)' }}>
            {language === 'ko' ? '네트 기둥의 지면 바닥을 터치하세요 👇' : 'Touch the base of the net pole 👇'}
          </div>
          {netBase && (
            <div style={{ marginTop: '20px', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(3)} style={{ padding: '10px 24px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700 }}>
                {language === 'ko' ? '바닥 지점 저장' : 'Save Base Point'}
              </button>
            </div>
          )}
        </div>
      )}

      {wizardStep === 3 && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#32ADE6', padding: '12px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem', display: 'inline-block', backdropFilter: 'blur(4px)', border: '1px solid rgba(50,173,230,0.3)' }}>
            {language === 'ko' ? '네트 기둥 끝(상단)을 터치하세요 👆' : 'Touch the top of the net pole 👆'}
          </div>
          {netTop && (
            <div style={{ marginTop: '20px', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(4)} style={{ padding: '10px 24px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700 }}>
                {language === 'ko' ? '상단 지점 저장' : 'Save Top Point'}
              </button>
            </div>
          )}
        </div>
      )}

      {wizardStep === 4 && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#30D158', padding: '12px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem', display: 'inline-block', backdropFilter: 'blur(4px)', border: '1px solid rgba(48,209,88,0.3)' }}>
            {language === 'ko' ? '서버가 서 있는 지면을 터치하세요 👇' : 'Touch the ground where server stands 👇'}
          </div>
          {ground && (
            <div style={{ marginTop: '20px', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(6)} style={{ padding: '10px 24px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700 }}>
                {language === 'ko' ? '지면 저장 및 다음' : 'Save Ground and Next'}
              </button>
            </div>
          )}
        </div>
      )}

      {wizardStep === 6 && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255, 159, 180, 0.9)', color: '#fff', padding: '12px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem', display: 'inline-block', boxShadow: '0 4px 12px rgba(255, 159, 180, 0.4)' }}>
            {language === 'ko' ? '준비 자세에서 셔틀콕 위치를 터치하세요 🎯' : 'Touch the shuttlecock in ready position 🎯'}
          </div>
          {shuttlecockPos && (
            <div style={{ marginTop: '20px', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(0)} style={{ padding: '14px 32px', background: '#fff', color: 'var(--accent-color)', border: '2px solid var(--accent-color)', borderRadius: '16px', fontWeight: 800, fontSize: '1rem' }}>
                {language === 'ko' ? '설정 완료! 촬영 시작' : 'All Set! Start Recording'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisWizard;
