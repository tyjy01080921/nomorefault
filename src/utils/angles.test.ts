import { describe, expect, it } from 'vitest';
import { angleBetween } from './angles';

describe('angleBetween', () => {
  it('returns 90 degrees for a right angle', () => {
    expect(
      angleBetween(
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ),
    ).toBe(90);
  });

  it('returns 0 for overlapping vectors', () => {
    expect(
      angleBetween(
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ),
    ).toBe(0);
  });
});
