import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const APP_VERSION = __APP_VERSION__;

// PWA를 잠시 끈 상태라 기존 휴대폰에 남은 서비스워커와 캐시만 한 번 정리합니다.
(async function cleanupDisabledPWA() {
  const cleanupKey = `pwa-disabled-cleanup-${APP_VERSION}`;
  if (localStorage.getItem(cleanupKey)) return;

  try {
    let cleaned = false;

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
        cleaned = true;
        console.log('[PWA Disabled] 서비스워커 해제:', reg.scope);
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        cleaned = true;
        console.log('[PWA Disabled] 캐시 삭제:', name);
      }
    }

    localStorage.setItem(cleanupKey, 'true');
    localStorage.setItem('app-version', APP_VERSION);

    if (cleaned) {
      window.location.reload();
    }
  } catch (e) {
    console.warn('[PWA Disabled] 정리 실패:', e);
  }
})();

// ─── React 앱 마운트 ─────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
