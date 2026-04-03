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
  } = useStore((state: AppState) => state);

  const [isAdjusting, setIsAdjusting] = React.useState(false);

  if (wizardStep === 0) return null;

  const handleNext = (nextStep: number) => {
    setWizardStep(nextStep);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Dimmed Background for some steps */}
      {(wizardStep === 1 || wizardStep === 5) && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: -1 }} />
      )}

      {/* Point Overlays */}
      {netBase !== null && (wizardStep >= 2) && (
        <div style={{ position: 'absolute', top: `${netBase.y * 100}%`, left: `${netBase.x * 100}%`, width: 16, height: 16, background: '#FF453A', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 8px rgba(0,0,0,0.5)', zIndex: 50 }} />
      )}

      {netTop !== null && (wizardStep >= 3) && (
        <div style={{ position: 'absolute', top: `${netTop.y * 100}%`, left: `${netTop.x * 100}%`, width: 16, height: 16, background: '#32ADE6', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 8px rgba(0,0,0,0.5)', zIndex: 50 }} />
      )}

      {ground !== null && (wizardStep >= 4) && (
        <div style={{ position: 'absolute', top: `${ground.y * 100}%`, left: `${ground.x * 100}%`, width: 16, height: 16, background: '#30D158', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '3px solid white', boxShadow: '0 0 8px rgba(0,0,0,0.5)', zIndex: 50 }} />
      )}

      {shuttlecockPos !== null && (wizardStep >= 6) && (
        <div style={{ position: 'absolute', top: `${shuttlecockPos.y * 100}%`, left: `${shuttlecockPos.x * 100}%`, width: 16, height: 16, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', border: '2px solid red', transform: 'translate(-50%, -50%)', zIndex: 50 }} />
      )}

      {/* Prompts */}
      {wizardStep === 1 && (
        <div className="wizard-card" style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '16px', textAlign: 'center', width: '80%', maxWidth: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>1.15m 기준선 생성 여부</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)', marginBottom: '1.5rem' }}>서비스 폴트 기준 높이(1.15m)를 화면에 표시하시겠습니까?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="primary-btn" onClick={() => handleNext(2)}>예 (네트 기준 자동생성)</button>
            <button className="secondary-btn" onClick={() => handleNext(4)}>아니오 (건너뛰기)</button>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', color: '#FFEB3B', textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            네트 기둥의 지면 바닥을 터치하세요👇
          </div>
          {netBase !== null && (
            <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(3)}>지면 저장 및 다음 (1/2)</button>
            </div>
          )}
        </>
      )}

      {wizardStep === 3 && (
        <>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', color: '#FFEB3B', textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            네트 기둥 끝(상단)을 터치하세요👆
          </div>
          {netTop !== null && (
            <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(4)}>기둥 끝 지점 저장 및 다음 (2/2)</button>
            </div>
          )}
        </>
      )}

      {wizardStep === 4 && (
        <>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', color: '#FFEB3B', textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            서버가 서 있는 지면을 터치하세요👇
          </div>
          {ground !== null && (
            <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
              <button className="primary-btn" onClick={() => handleNext(5)}>지면 저장 및 다음</button>
            </div>
          )}
        </>
      )}

      {wizardStep === 5 && (
        <>
          {isAdjusting ? (
            <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
                포인트를 드래그하여 맞추세요
              </div>
              <button className="primary-btn" style={{ width: '100%', padding: '12px' }} onClick={() => setIsAdjusting(false)}>
                저장 및 조작 완료
              </button>
            </div>
          ) : (
            <div className="wizard-card" style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', width: '85%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'auto', marginTop: 'auto', marginBottom: '40vh' }}>
              <h3 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>관절 포인트 확인</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '1rem' }}>화면에 표시된 관절 포인트가 정확한지 확인하세요. 부정확할 경우 수동으로 조정할 수 있습니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="secondary-btn" onClick={() => setIsAdjusting(true)}>🛠 수동 관절 조정</button>
                <button className="primary-btn" onClick={() => handleNext(6)}>포인트 확인 완료</button>
              </div>
            </div>
          )}
        </>
      )}

      {wizardStep === 6 && (
        <>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', color: '#39FF14', textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.7)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            서비스 전 정지 상태의<br />셔틀콕 헤드를 터치하세요🎯
          </div>
          {/* Step 6: no confirm button here — AnalysisSetup's "분석 시작" button handles navigate */}
        </>
      )}
    </div>
  );
};

export default AnalysisWizard;
