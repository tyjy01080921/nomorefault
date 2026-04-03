import { VERDICT } from './constants';

interface ShareCardOptions {
  verdict: string;
  angles: { shoulder: number; elbow: number; wrist: number };
  frameSnapshot?: string; // base64 PNG (optional background)
}

const CARD_W = 1200;
const CARD_H = 630;

const VERDICT_CONFIG = {
  [VERDICT.PERFECT]: {
    label: '통과 ✓',
    color: '#30D158',
    bg: '#0a2e14',
    sub: 'BWF 서비스 기준 통과',
  },
  [VERDICT.FAULT]: {
    label: 'FAULT ✕',
    color: '#FF453A',
    bg: '#2e0a0a',
    sub: 'BWF 서비스 폴트',
  },
  [VERDICT.VAR_CHALLENGE]: {
    label: 'VAR ❓',
    color: '#FFD60A',
    bg: '#2e2a0a',
    sub: '재검토 필요',
  },
};

function getConfig(verdict: string) {
  return VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG[VERDICT.VAR_CHALLENGE];
}

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const { verdict, angles, frameSnapshot } = opts;
  const cfg = getConfig(verdict);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // Background
  if (frameSnapshot) {
    await drawBackground(ctx, frameSnapshot);
    // Dark overlay for readability
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  } else {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  // Verdict badge
  ctx.save();
  const badgeX = CARD_W / 2;
  const badgeY = CARD_H / 2 - 60;
  ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cfg.color;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.fillText(cfg.label, badgeX, badgeY);
  ctx.restore();

  // Sub label
  ctx.font = '40px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(cfg.sub, CARD_W / 2, CARD_H / 2 + 60);

  // Angle metrics row
  ctx.font = '32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const metricsY = CARD_H / 2 + 130;
  ctx.fillText(
    `어깨 ${angles.shoulder}°  |  팔꿈치 ${angles.elbow}°  |  손목 ${angles.wrist}°`,
    CARD_W / 2,
    metricsY
  );

  // Watermark / branding
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,64,129,0.9)';
  ctx.textAlign = 'right';
  ctx.fillText('🏸 No More Fault', CARD_W - 40, CARD_H - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/png'
    );
  });
}

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  base64: string
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Cover-fit the image
      const scale = Math.max(CARD_W / img.width, CARD_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h);
      resolve();
    };
    img.onerror = () => resolve(); // fall through to solid bg on error
    img.src = base64;
  });
}

/**
 * Web Share API with fallback chain:
 * 1. native share with PNG file (mobile share sheet)
 * 2. native share URL only (no file support)
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

  // Download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nomorefault-result.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
