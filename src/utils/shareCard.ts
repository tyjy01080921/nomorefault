import { BWF, VERDICT } from './constants';

// ─── 타입 정의 ───────────────────────────────────────────────

export interface ShareCardOptions {
  verdict: string;
  shuttlecockHeightM?: number;
  heightDeltaM?: number;
  frameSnapshot?: string; // base64 PNG (optional background)
  serviceLineY?: number | null;
  shuttlecockPos?: NormalizedPoint | null;
}

interface NormalizedPoint {
  x: number;
  y: number;
}

interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComparisonCardOptions {
  labelA: string; // e.g. '숏 서비스'
  labelB: string; // e.g. '롱 서비스'
  resultA: ShareCardOptions;
  resultB: ShareCardOptions;
}

// ─── 카드 규격 ────────────────────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1350;
const COMPARE_CARD_W = 1200;
const COMPARE_CARD_H = 630;

// ─── 판정별 설정 (소프트 핑크 테마) ─────────────────────────

const VERDICT_CONFIG: Record<string, { label: string; color: string; sub: string }> = {
  [VERDICT.NORMAL]: {
    label: 'Good',
    color: '#30D158',
    sub: 'Below the guide',
  },
  [VERDICT.FAULT]: {
    label: 'Fault',
    color: '#FF453A',
    sub: 'Over the +10cm zone',
  },
  [VERDICT.CHECK_REQUIRED]: {
    label: 'Tricky',
    color: '#FFB020',
    sub: 'Within the +10cm zone',
  },
  [VERDICT.PERFECT]: {
    label: 'Good',
    color: '#30D158',
    sub: 'Below the guide',
  },
  [VERDICT.VAR_CHALLENGE]: {
    label: 'Tricky',
    color: '#FFB020',
    sub: 'Check the reference points',
  },
};

function getConfig(verdict: string) {
  return VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG[VERDICT.CHECK_REQUIRED];
}

function formatHeightSummary(heightM?: number, deltaM?: number): string {
  if (typeof heightM !== 'number' || !Number.isFinite(heightM)) {
    return `${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m guide based verdict`;
  }

  if (typeof deltaM !== 'number' || !Number.isFinite(deltaM)) {
    return `Detected height ${heightM.toFixed(2)}m`;
  }

  const cm = Math.round(deltaM * 100);
  const deltaText = cm === 0
    ? 'same as guide'
    : cm > 0
      ? `guide +${cm}cm`
      : `guide -${Math.abs(cm)}cm`;

  return `Detected ${heightM.toFixed(2)}m · ${deltaText}`;
}

// ─── 단일 결과 공유 카드 ─────────────────────────────────────

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const { verdict, shuttlecockHeightM, heightDeltaM, frameSnapshot, serviceLineY, shuttlecockPos } = opts;
  const cfg = getConfig(verdict);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const frameImage = frameSnapshot ? await loadImage(frameSnapshot) : null;

  // 배경
  if (frameImage) {
    drawCoverImage(ctx, frameImage, 0, 0, CARD_W, CARD_H);
    ctx.filter = 'blur(26px)';
    drawCoverImage(ctx, frameImage, -40, -40, CARD_W + 80, CARD_H + 80);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(4, 6, 10, 0.58)';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, '#15131a');
    grad.addColorStop(0.52, '#251820');
    grad.addColorStop(1, '#10151a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText('No More Fault', 56, 64);
  ctx.textAlign = 'right';
  ctx.font = '600 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.54)';
  ctx.fillText('Service frame analysis', CARD_W - 56, 64);

  const frameRect = { x: 40, y: 118, width: CARD_W - 80, height: 960 };
  let bounds: ImageBounds = frameRect;
  drawRoundedPanel(ctx, frameRect.x, frameRect.y, frameRect.width, frameRect.height, 34, 'rgba(0,0,0,0.74)');

  if (frameImage) {
    bounds = drawContainImage(ctx, frameImage, frameRect.x, frameRect.y, frameRect.width, frameRect.height, 34);
  } else {
    ctx.save();
    roundedRect(ctx, frameRect.x, frameRect.y, frameRect.width, frameRect.height, 34);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.textAlign = 'center';
    ctx.font = '700 34px system-ui, -apple-system, sans-serif';
    ctx.fillText('Frame preview unavailable', CARD_W / 2, frameRect.y + frameRect.height / 2);
    ctx.restore();
  }

  drawFrameMarkers(ctx, bounds, cfg.color, serviceLineY, shuttlecockPos);

  const chipX = frameRect.x + 28;
  const chipY = frameRect.y + frameRect.height - 86;
  drawRoundedPanel(ctx, chipX, chipY, 232, 58, 29, 'rgba(8, 8, 10, 0.72)', 'rgba(255,255,255,0.22)');
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(chipX + 34, chipY + 29, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(cfg.label, chipX + 54, chipY + 30);

  const panelY = 1110;
  drawRoundedPanel(ctx, 40, panelY, CARD_W - 80, 178, 32, 'rgba(255,255,255,0.93)');
  ctx.textAlign = 'left';
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = cfg.color;
  ctx.fillText(cfg.label, 78, panelY + 58);
  ctx.font = '700 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(22,22,24,0.72)';
  ctx.fillText(cfg.sub, 78, panelY + 102);

  ctx.textAlign = 'right';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(22,22,24,0.86)';
  ctx.fillText(formatHeightSummary(shuttlecockHeightM, heightDeltaM), CARD_W - 78, panelY + 62);
  ctx.font = '600 23px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(22,22,24,0.58)';
  ctx.fillText(`Guide ${BWF.SERVICE_HEIGHT_LIMIT.toFixed(2)}m · Tricky zone +${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm`, CARD_W - 78, panelY + 108);

  ctx.textAlign = 'left';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.fillText('dashed line: service guide', 56, CARD_H - 40);
  ctx.textAlign = 'right';
  ctx.fillText('circle: shuttle position', CARD_W - 56, CARD_H - 40);

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
  canvas.width = COMPARE_CARD_W;
  canvas.height = COMPARE_CARD_H;
  const ctx = canvas.getContext('2d')!;

  const half = COMPARE_CARD_W / 2;
  const pad = 40;

  // 왼쪽(A) 패널 ─ 소프트 핑크
  const gradA = ctx.createLinearGradient(0, 0, half, COMPARE_CARD_H);
  gradA.addColorStop(0, '#fff0f3');
  gradA.addColorStop(1, '#ffe0e8');
  ctx.fillStyle = gradA;
  ctx.fillRect(0, 0, half, COMPARE_CARD_H);

  // 오른쪽(B) 패널 ─ 소프트 블루
  const gradB = ctx.createLinearGradient(half, 0, COMPARE_CARD_W, COMPARE_CARD_H);
  gradB.addColorStop(0, '#f0f3ff');
  gradB.addColorStop(1, '#dde5ff');
  ctx.fillStyle = gradB;
  ctx.fillRect(half, 0, half, COMPARE_CARD_H);

  // 중앙 구분선
  ctx.strokeStyle = '#ff9fb4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(half, 20);
  ctx.lineTo(half, COMPARE_CARD_H - 20);
  ctx.stroke();

  // 패널 그리기 헬퍼
  const drawPanel = (
    cfg: ReturnType<typeof getConfig>,
    label: string,
    result: ShareCardOptions,
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
    ctx.fillText(cfg.label, cx, COMPARE_CARD_H / 2 - 28);
    ctx.shadowBlur = 0;

    // 서브 텍스트
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillText(cfg.sub, cx, COMPARE_CARD_H / 2 + 64);

    // 기준 행
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillText(formatHeightSummary(result.shuttlecockHeightM, result.heightDeltaM), cx, COMPARE_CARD_H / 2 + 126);
    ctx.fillText(`Tricky zone: +${Math.round(BWF.CHECK_REQUIRED_MARGIN * 100)}cm`, cx, COMPARE_CARD_H / 2 + 158);
  };

  drawPanel(cfgA, labelA, resultA, 0, half);
  drawPanel(cfgB, labelB, resultB, half, half);

  // 중앙 VS 뱃지
  ctx.save();
  ctx.beginPath();
  ctx.arc(half, COMPARE_CARD_H / 2, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9fb4';
  ctx.shadowColor = 'rgba(255,159,180,0.5)';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VS', half, COMPARE_CARD_H / 2);
  ctx.restore();

  // 하단 워터마크
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 159, 180, 0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('No More Fault — service comparison', COMPARE_CARD_W / 2, COMPARE_CARD_H - 28);

  return blobFrom(canvas);
}

// ─── 유틸 헬퍼 ───────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): ImageBounds {
  const scale = Math.min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = x + (width - drawW) / 2;
  const drawY = y + (height - drawH) / 2;

  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(x, y, width, height);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  return { x: drawX, y: drawY, width: drawW, height: drawH };
}

function drawFrameMarkers(
  ctx: CanvasRenderingContext2D,
  bounds: ImageBounds,
  verdictColor: string,
  serviceLineY?: number | null,
  shuttlecockPos?: NormalizedPoint | null
) {
  if (typeof serviceLineY === 'number' && Number.isFinite(serviceLineY)) {
    const y = bounds.y + clamp01(serviceLineY) * bounds.height;
    ctx.save();
    ctx.strokeStyle = '#FFB020';
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 13]);
    ctx.shadowColor = 'rgba(0,0,0,0.72)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(bounds.x + 18, y);
    ctx.lineTo(bounds.x + bounds.width - 18, y);
    ctx.stroke();
    ctx.setLineDash([]);

    const label = '1.15m guide';
    ctx.font = '800 23px system-ui, -apple-system, sans-serif';
    const labelWidth = ctx.measureText(label).width + 26;
    const labelX = Math.min(bounds.x + bounds.width - labelWidth - 20, Math.max(bounds.x + 20, bounds.x + bounds.width - 184));
    const labelY = Math.max(bounds.y + 20, y - 44);
    drawRoundedPanel(ctx, labelX, labelY, labelWidth, 34, 17, 'rgba(0,0,0,0.68)', 'rgba(255,176,32,0.58)');
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX + labelWidth / 2, labelY + 18);
    ctx.restore();
  }

  if (shuttlecockPos) {
    const x = bounds.x + clamp01(shuttlecockPos.x) * bounds.width;
    const y = bounds.y + clamp01(shuttlecockPos.y) * bounds.height;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeStyle = verdictColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawRoundedPanel(ctx, x - 52, y + 38, 104, 34, 17, 'rgba(0,0,0,0.68)', 'rgba(255,255,255,0.22)');
    ctx.font = '800 21px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('shuttle', x, y + 56);
    ctx.restore();
  }
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string
) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
export async function shareCard(blob: Blob, title = 'No More Fault service verdict'): Promise<void> {
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
