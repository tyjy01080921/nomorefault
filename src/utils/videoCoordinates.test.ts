import { describe, expect, it } from 'vitest';
import {
  containerPointToVideoPoint,
  getFittedMediaRect,
  getPrecisionAdjustedPoint,
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

  it('excludes portrait-video pillarboxes from contain coordinates', () => {
    const fitted = getFittedMediaRect(200, 100, 50, 100, 'contain');

    expect(fitted).toEqual({ x: 75, y: 0, width: 50, height: 100 });
    expect(
      containerPointToVideoPoint(
        { x: 87.5, y: 50 },
        { ...rect, width: 200 } as DOMRect,
        50,
        100,
        'contain',
      ),
    ).toEqual({ x: 0.25, y: 0.5 });
  });

  it('projects source points into the portrait video instead of its pillarboxes', () => {
    const point = videoPointToContainerPoint(
      { x: 0.25, y: 0.5 },
      200,
      100,
      50,
      100,
      'contain',
    );

    expect(point.x).toBeCloseTo(0.4375);
    expect(point.y).toBeCloseTo(0.5);
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

  it('calculates precision movement from a stable gesture baseline', () => {
    const basePoint = { x: 0.4, y: 0.6 };
    const localPoint = { x: 0.7, y: 0.3 };
    const firstMove = getPrecisionAdjustedPoint(basePoint, localPoint, 4);
    const repeatedMove = getPrecisionAdjustedPoint(basePoint, localPoint, 4);

    expect(firstMove.x).toBeCloseTo(0.45);
    expect(firstMove.y).toBeCloseTo(0.55);
    expect(repeatedMove).toEqual(firstMove);
  });
});
