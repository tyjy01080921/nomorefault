import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// ─── 버전 관리 ───────────────────────────────────────────────
// 배포할 때마다 이 값을 바꾸면, 구형 캐시를 가진 브라우저가
// 자동으로 새 버전을 감지하고 리로드합니다.
const APP_VERSION = '1.2.3';

// ─── 1) 구형 좀비 SW 강제 해제 (1회성) ──────────────────────
// 이전에 루트에 수동 배치된 sw.js 가 캐시에 남아 있을 수 있으므로
// 모든 기존 서비스 워커를 해제하고, Vite PWA가 새로 등록하게 합니다.
(async function cleanupLegacySW() {
  if (!('serviceWorker' in navigator)) return;

  const cleanupDone = localStorage.getItem('sw-cleanup-v2');
  if (cleanupDone) return; // 이미 정리 완료

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
      console.log('[SW Cleanup] 구형 서비스 워커 해제:', reg.scope);
    }
    // 캐시 스토리지 전체 삭제 — 좀비 SW가 저장한 옛 에셋 제거
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
      console.log('[SW Cleanup] 캐시 삭제:', name);
    }
    localStorage.setItem('sw-cleanup-v2', 'true');
    // 정리 후 한 번 새로고침하여 깨끗한 상태에서 시작
    window.location.reload();
  } catch (e) {
    console.warn('[SW Cleanup] 실패:', e);
  }
})();

// ─── 2) PWA 수동 업데이트 등록 ───────────────────────────────
// 사용자의 데이터를 아끼기 위해 PWA 플러그인에 의해 브라우저가
// 스스로 24시간이나 네비게이션 시점에 새 버전 유무를 확인하도록 맡깁니다.
// 발견되면 UI에서 업데이트 배지를 표시할 수 있도록 store에 등록합니다.
import { registerSW } from 'virtual:pwa-register';
import { useStore } from './store/useStore';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] 새 버전 감지 — 사용자 컨펌 대기 중...');
    useStore.getState().setNeedRefresh(true);
    useStore.getState().setUpdateServiceWorker(() => {
      updateSW(true); // 호출 시 서비스 워커 교체 및 리로드 수행
    });
  },
  onOfflineReady() {
    console.log('[PWA] 오프라인 사용 준비 완료');
  },
  // 서버 폴링(setInterval) 삭제: 데이터/배터리 절약
});

// ─── 3) 버전 변경 시 강제 리로드 (SW 없는 환경 대비) ─────────
// localStorage에 저장된 버전과 코드의 버전이 다르면 캐시를 비우고 리로드합니다.
const storedVersion = localStorage.getItem('app-version');
if (storedVersion && storedVersion !== APP_VERSION) {
  console.log(`[Version] ${storedVersion} → ${APP_VERSION} 업데이트 감지`);
  localStorage.setItem('app-version', APP_VERSION);
  // 캐시 삭제 후 리로드
  caches.keys().then(names => {
    Promise.all(names.map(n => caches.delete(n))).then(() => {
      window.location.reload();
    });
  });
} else {
  localStorage.setItem('app-version', APP_VERSION);
}

// ─── React 앱 마운트 ─────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
