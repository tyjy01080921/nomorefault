import { VERDICT } from './constants';

// ─── 타입 정의 ───────────────────────────────────────────────

export interface ShareCardOptions {
  verdict: string;
  angles: { shoulder: number; elbow: number; wrist: number };
  frameSnapshot?: string; // base64 PNG (optional background)
}

export interface ComparisonCardOptions {
  labelA: string; // e.g. '숏 서비스'
  labelB: string; // e.g. '롱 서비스'
  resultA: ShareCardOptions;
  resultB: ShareCardOptions;
}

// ─── 카드 규격 ────────────────────────────────────────────────

const CARD_W = 1200;
const CARD_H = 630;

// ─── 판정별 설정 (소프트 핑크 테마) ─────────────────────────

const VERDICT_CONFIG: Record<string, { label: string; color: string; sub: string }> = {
  [VERDICT.PERFECT]: {
    label: '통과 ✓',
    color: '#30D158',
    sub: 'BWF 서비스 기준 통과',
  },
  [VERDICT.FAULT]: {
    label: 'FAULT ✕',
    color: '#FF453A',
    sub: 'BWF 서비스 폴트',
  },
  [VERDICT.VAR_CHALLENGE]: {
    label: 'VAR ❓',
    color: '#FF9F0A',
    sub: '재검토 필요',
  },
};

function getConfig(verdict: string) {
  return VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG[VERDICT.VAR_CHALLENGE];
}

// ─── 단일 결과 공유 카드 ─────────────────────────────────────

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const { verdict, angles, frameSnapshot } = opts;
  const cfg = getConfig(verdict);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // 배경
  if (frameSnapshot) {
    await drawBackground(ctx, frameSnapshot);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  } else {
    // 소프트 핑크 그라데이션 배경
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, '#fff5f7');
    grad.addColorStop(0.5, '#ffe8ed');
    grad.addColorStop(1, '#ffdce4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // 배경 장식 원 (대형)
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ff9fb4';
    ctx.beginPath();
    ctx.arc(CARD_W * 0.05, CARD_H * 0.1, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CARD_W * 0.92, CARD_H * 0.85, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 판정 뱃지 텍스트
  ctx.save();
  ctx.font = 'bold 130px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = frameSnapshot ? '#ffffff' : cfg.color;
  ctx.shadowColor = frameSnapshot ? 'rgba(0,0,0,0.6)' : 'rgba(255,159,180,0.4)';
  ctx.shadowBlur = 24;
  ctx.fillText(cfg.label, CARD_W / 2, CARD_H / 2 - 70);
  ctx.restore();

  // 판정 서브 텍스트
  ctx.font = '42px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = frameSnapshot ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.55)';
  ctx.fillText(cfg.sub, CARD_W / 2, CARD_H / 2 + 55);

  // 관절 각도
  ctx.font = '30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = frameSnapshot ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)';
  ctx.fillText(
    `어깨 ${angles.shoulder.toFixed(1)}°  |  팔꿈치 ${angles.elbow.toFixed(1)}°  |  손목 ${angles.wrist.toFixed(1)}°`,
    CARD_W / 2,
    CARD_H / 2 + 130
  );

  // 브랜드 워터마크
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 159, 180, 0.9)';
  ctx.textAlign = 'right';
  ctx.fillText('🏸 No More Fault', CARD_W - 40, CARD_H - 36);

  return blobFrom(canvas);
}

// ─── A+B 비교 공유 카드 ──────────────────────────────────────

/**
 * 두 분석 결과를 좌(A) / 우(B) 분할 레이아웃으로 생성합니다.
 * 규격: 1200×630, 중앙 VS 뱃지, 핑크 구분선 포함.
 */
export async function generateComparisonCard(opts: ComparisonCardOptions): Promise<Blob> {
  const { labelA, labelB, resultA, resultB } = opts;
  const cfgA = getConfig(resultA.verdict);
  const cfgB = getConfig(resultB.verdict);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  const half = CARD_W / 2;
  const pad = 40;

  // 왼쪽(A) 패널 ─ 소프트 핑크
  const gradA = ctx.createLinearGradient(0, 0, half, CARD_H);
  gradA.addColorStop(0, '#fff0f3');
  gradA.addColorStop(1, '#ffe0e8');
  ctx.fillStyle = gradA;
  ctx.fillRect(0, 0, half, CARD_H);

  // 오른쪽(B) 패널 ─ 소프트 블루
  const gradB = ctx.createLinearGradient(half, 0, CARD_W, CARD_H);
  gradB.addColorStop(0, '#f0f3ff');
  gradB.addColorStop(1, '#dde5ff');
  ctx.fillStyle = gradB;
  ctx.fillRect(half, 0, half, CARD_H);

  // 중앙 구분선
  ctx.strokeStyle = '#ff9fb4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(half, 20);
  ctx.lineTo(half, CARD_H - 20);
  ctx.stroke();

  // 패널 그리기 헬퍼
  const drawPanel = (
    cfg: ReturnType<typeof getConfig>,
    label: string,
    angles: ShareCardOptions['angles'],
    left: number,
    width: number
  ) => {
    const cx = left + width / 2;

    // 레이블 (탭 이름)
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillText(label, cx, pad + 18);

    // 판정 뱃지
    ctx.font = 'bold 100px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = cfg.color;
    ctx.shadowColor = `${cfg.color}55`;
    ctx.shadowBlur = 18;
    ctx.fillText(cfg.label, cx, CARD_H / 2 - 28);
    ctx.shadowBlur = 0;

    // 서브 텍스트
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillText(cfg.sub, cx, CARD_H / 2 + 64);

    // 각도 행
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillText(`어깨 ${angles.shoulder.toFixed(1)}°`, cx, CARD_H / 2 + 126);
    ctx.fillText(`팔꿈치 ${angles.elbow.toFixed(1)}°  손목 ${angles.wrist.toFixed(1)}°`, cx, CARD_H / 2 + 158);
  };

  drawPanel(cfgA, labelA, resultA.angles, 0, half);
  drawPanel(cfgB, labelB, resultB.angles, half, half);

  // 중앙 VS 뱃지
  ctx.save();
  ctx.beginPath();
  ctx.arc(half, CARD_H / 2, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9fb4';
  ctx.shadowColor = 'rgba(255,159,180,0.5)';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VS', half, CARD_H / 2);
  ctx.restore();

  // 하단 워터마크
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 159, 180, 0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('🏸 No More Fault — 서비스 비교', CARD_W / 2, CARD_H - 28);

  return blobFrom(canvas);
}

// ─── 유틸 헬퍼 ───────────────────────────────────────────────

async function drawBackground(ctx: CanvasRenderingContext2D, base64: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(CARD_W / img.width, CARD_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = base64;
  });
}

function blobFrom(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); },
      'image/png'
    );
  });
}

/**
 * Web Share API with fallback chain:
 * 1. native share with PNG file (mobile share sheet)
 * 2. native share URL only
 * 3. <a> download fallback
 */
export async function shareCard(blob: Blob, title = '서브 폴트 판정'): Promise<void> {
  const file = new File([blob], 'nomorefault-result.png', { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return;
  }

  if (navigator.share) {
    await navigator.share({ url: window.location.href, title });
    return;
  }

  // 다운로드 폴백
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nomorefault-result.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
