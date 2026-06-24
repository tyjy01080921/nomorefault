import { describe, expect, it } from 'vitest';
import { VERDICT } from './constants';
import { calculatePlayerServiceLineY, calculateServiceLineY, calculateVerdict } from './verdict';

const calibration = {
  netBase: { x: 0.5, y: 0.9 },
  netTop: { x: 0.5, y: 0.4 },
  ground: { x: 0.5, y: 0.9 },
};

describe('calculateVerdict', () => {
  it('returns NORMAL at or below the 1.15m service limit', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.56 },
    );

    expect(result.verdict).toBe(VERDICT.NORMAL);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.054, 3);
    expect(result.heightDeltaM).toBeCloseTo(-0.096, 3);
  });

  it('returns CHECK_REQUIRED when exceeding the limit by 10cm or less', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.52 },
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.178, 3);
    expect(result.heightDeltaM).toBeCloseTo(0.028, 3);
  });

  it('returns FAULT when exceeding the limit by more than 10cm', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.49 },
    );

    expect(result.verdict).toBe(VERDICT.FAULT);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.271, 3);
    expect(result.heightDeltaM).toBeCloseTo(0.121, 3);
  });

  it('falls back to CHECK_REQUIRED for invalid net calibration', () => {
    const result = calculateVerdict(
      {
        netBase: { x: 0.5, y: 0.4 },
        netTop: { x: 0.5, y: 0.9 },
        ground: { x: 0.5, y: 0.9 },
      },
      { x: 0.5, y: 0.52 }
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.shuttlecockHeightM).toBe(0);
  });
});

describe('calculateServiceLineY', () => {
  it('projects the 1.15m service line from saved calibration points', () => {
    expect(calculateServiceLineY(calibration)).toBeCloseTo(0.529, 3);
  });

  it('returns null for invalid net calibration', () => {
    expect(
      calculateServiceLineY({
        netBase: { x: 0.5, y: 0.4 },
        netTop: { x: 0.5, y: 0.9 },
        ground: { x: 0.5, y: 0.9 },
      }),
    ).toBeNull();
  });
});

describe('player height calibration', () => {
  const playerCalibration = {
    playerHeightCm: 180,
    playerHeadTop: { x: 0.5, y: 0.2 },
    playerFootBase: { x: 0.5, y: 0.8 },
  };

  it('projects the 1.15m service line from player height points', () => {
    expect(calculatePlayerServiceLineY(playerCalibration)).toBeCloseTo(0.417, 3);
  });

  it('calculates verdict from the entered player height', () => {
    const result = calculateVerdict(
      { mode: 'playerHeight', player: playerCalibration },
      { x: 0.5, y: 0.42 },
    );

    expect(result.verdict).toBe(VERDICT.NORMAL);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.14, 2);
    expect(result.playerBasedHeightM).toBeCloseTo(1.14, 2);
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

describe('combined calibration', () => {
  const matchingPlayerCalibration = {
    playerHeightCm: 180,
    playerHeadTop: { x: 0.5, y: 0.3194 },
    playerFootBase: { x: 0.5, y: 0.9 },
  };

  it('returns high confidence when net and player calibration agree', () => {
    const result = calculateVerdict(
      { mode: 'combined', net: calibration, player: matchingPlayerCalibration },
      { x: 0.5, y: 0.52 },
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.confidence).toBe('high');
    expect(result.netBasedHeightM).toBeCloseTo(1.178, 3);
    expect(result.playerBasedHeightM).toBeCloseTo(1.178, 3);
    expect(result.heightDifferenceCm).toBe(0);
  });

  it('returns CHECK_REQUIRED with low confidence when the two calibrations disagree', () => {
    const result = calculateVerdict(
      {
        mode: 'combined',
        net: calibration,
        player: {
          playerHeightCm: 180,
          playerHeadTop: { x: 0.5, y: 0.4 },
          playerFootBase: { x: 0.5, y: 0.9 },
        },
      },
      { x: 0.5, y: 0.52 },
    );

    expect(result.verdict).toBe(VERDICT.CHECK_REQUIRED);
    expect(result.confidence).toBe('low');
    expect(result.heightDifferenceCm).toBeGreaterThan(7);
  });
});
