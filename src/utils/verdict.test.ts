import { describe, expect, it } from 'vitest';
import { VERDICT } from './constants';
import { calculateServiceLineY, calculateVerdict } from './verdict';

const calibration = {
  netBase: { x: 0.5, y: 0.9 },
  netTop: { x: 0.5, y: 0.4 },
  ground: { x: 0.5, y: 0.9 },
};

describe('calculateVerdict', () => {
  it('returns PERFECT below the 1.10m threshold', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.56 },
      null,
    );

    expect(result.verdict).toBe(VERDICT.PERFECT);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.054, 3);
  });

  it('returns VAR_CHALLENGE between 1.10m and 1.15m', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.54 },
      null,
    );

    expect(result.verdict).toBe(VERDICT.VAR_CHALLENGE);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.116, 3);
  });

  it('returns FAULT above the 1.15m threshold', () => {
    const result = calculateVerdict(
      calibration,
      { x: 0.5, y: 0.52 },
      null,
    );

    expect(result.verdict).toBe(VERDICT.FAULT);
    expect(result.shuttlecockHeightM).toBeCloseTo(1.178, 3);
  });

  it('falls back to VAR_CHALLENGE for invalid net calibration', () => {
    const result = calculateVerdict(
      {
        netBase: { x: 0.5, y: 0.4 },
        netTop: { x: 0.5, y: 0.9 },
        ground: { x: 0.5, y: 0.9 },
      },
      { x: 0.5, y: 0.52 },
      null,
    );

    expect(result.verdict).toBe(VERDICT.VAR_CHALLENGE);
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
