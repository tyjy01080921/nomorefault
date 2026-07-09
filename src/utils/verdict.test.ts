import { describe, expect, it } from 'vitest';
import { VERDICT } from './constants';
import { calculateGuideConfidencePercent, calculatePlayerServiceLineY, calculateVerdict } from './verdict';

const playerCalibration = {
  playerHeightCm: 180,
  playerHeadTop: { x: 0.5, y: 0.2 },
  playerFootBase: { x: 0.5, y: 0.8 },
};

describe('calculatePlayerServiceLineY', () => {
  it('projects the 1.15m service line from player height points', () => {
    expect(calculatePlayerServiceLineY(playerCalibration)).toBeCloseTo(0.417, 3);
  });

  it('returns null for invalid player calibration', () => {
    expect(
      calculatePlayerServiceLineY({
        playerHeightCm: 180,
        playerHeadTop: { x: 0.5, y: 0.8 },
        playerFootBase: { x: 0.5, y: 0.2 },
      }),
    ).toBeNull();
  });
});

describe('calculateGuideConfidencePercent', () => {
  it('returns higher confidence when guide gap is smaller', () => {
    expect(calculateGuideConfidencePercent(0)).toBe(100);
    expect(calculateGuideConfidencePercent(10)).toBe(80);
    expect(calculateGuideConfidencePercent(20)).toBe(60);
  });

  it('clamps confidence between 0 and 100', () => {
    expect(calculateGuideConfidencePercent(-5)).toBe(100);
    expect(calculateGuideConfidencePercent(80)).toBe(0);
  });

  it('returns null when confidence cannot be calculated', () => {
    expect(calculateGuideConfidencePercent(null)).toBeNull();
    expect(calculateGuideConfidencePercent(Number.NaN)).toBeNull();
  });
});

describe('calculateVerdict', () => {
  it('returns NORMAL at or below the 1.15m service limit', () => {
    const result = calculateVerdict(
      { mode: 'playerHeight', player: playerCalibration },
      { x: 0.5, y: 0.42 },
    );

    expect(result.verdict).toBe(VERDICT.NORMAL);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.14, 2);
    expect(result.heightDeltaM).toBeCloseTo(-0.01, 2);
    expect(result.calibrationMode).toBe('playerHeight');
    expect(result.playerBasedHeightM).toBeCloseTo(1.14, 2);
  });

  it('returns CHECK_REQUIRED when exceeding the limit by 10cm or less', () => {
    const result = calculateVerdict(
      { mode: 'playerHeight', player: playerCalibration },
      { x: 0.5, y: 0.39 },
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.23, 2);
  });

  it('returns FAULT when exceeding the limit by more than 10cm', () => {
    const result = calculateVerdict(
      { mode: 'playerHeight', player: playerCalibration },
      { x: 0.5, y: 0.37 },
    );

    expect(result.verdict).toBe(VERDICT.FAULT);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.29, 2);
  });

  it('falls back to CHECK_REQUIRED for invalid player calibration', () => {
    const result = calculateVerdict(
      {
        mode: 'playerHeight',
        player: {
          playerHeightCm: 180,
          playerHeadTop: { x: 0.5, y: 0.8 },
          playerFootBase: { x: 0.5, y: 0.2 },
        },
      },
      { x: 0.5, y: 0.42 },
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.shuttlecockHeightM).toBe(0);
  });
});
