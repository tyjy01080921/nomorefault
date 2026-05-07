import { describe, expect, it } from 'vitest';
import {
  containerPointToVideoPoint,
  videoPointToContainerPoint,
} from './videoCoordinates';

const rect = {
  left: 0,
  top: 0,
  width: 100,
  height: 100,
} as DOMRect;

describe('videoCoordinates', () => {
  it('maps contain-fitted center points without shifting', () => {
    expect(
      containerPointToVideoPoint(
        { x: 50, y: 50 },
        rect,
        100,
        100,
        'contain',
      ),
    ).toEqual({ x: 0.5, y: 0.5 });
  });

  it('accounts for cover crop when converting from container to video space', () => {
    const point = containerPointToVideoPoint(
      { x: 50, y: 50 },
      rect,
      200,
      100,
      'cover',
    );

    expect(point.x).toBeCloseTo(0.5);
    expect(point.y).toBeCloseTo(0.5);
  });

  it('projects video points back into the rendered container', () => {
    const point = videoPointToContainerPoint(
      { x: 0.5, y: 0.5 },
      100,
      100,
      200,
      100,
      'cover',
    );

    expect(point.x).toBeCloseTo(0.5);
    expect(point.y).toBeCloseTo(0.5);
  });
});
