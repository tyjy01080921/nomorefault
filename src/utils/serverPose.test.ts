import { describe, expect, it } from 'vitest';
import { selectServerPose, type Point, type ServerPoseTrackingState } from './serverPose';
import type { PoseLandmark } from './pose';

const headIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const upperIndexes = [11, 12, 13, 14, 15, 16];
const lowerIndexes = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const footIndexes = [27, 28, 29, 30, 31, 32];

function makePoint(point: Point): PoseLandmark {
  return { ...point, visibility: 0.95 };
}

function makePose(id: number, centerX: number, lowerY: number, upperY: number): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.05 }));

  headIndexes.forEach((index, offset) => {
    landmarks[index] = makePoint({ x: centerX + offset * 0.001, y: upperY - 0.16 });
  });
  upperIndexes.forEach((index, offset) => {
    landmarks[index] = makePoint({ x: centerX + offset * 0.002, y: upperY });
  });
  lowerIndexes.forEach((index, offset) => {
    landmarks[index] = makePoint({ x: centerX + offset * 0.001, y: lowerY - 0.08 });
  });
  footIndexes.forEach((index, offset) => {
    landmarks[index] = makePoint({ x: centerX + offset * 0.001, y: lowerY });
  });

  landmarks[0] = { ...landmarks[0], z: id };
  return landmarks;
}

describe('selectServerPose', () => {
  it('keeps the pose whose lower body stays near the tracked anchor', () => {
    const server = makePose(1, 0.32, 0.82, 0.52);
    const passerBy = makePose(2, 0.68, 0.78, 0.44);
    const previous: ServerPoseTrackingState = {
      lowerAnchor: { x: 0.325, y: 0.77 },
      upperCenter: { x: 0.325, y: 0.56 },
      bodyCenter: { x: 0.325, y: 0.66 },
    };

    const selected = selectServerPose([passerBy, server], previous);

    expect(selected.landmarks?.[0].z).toBe(1);
  });

  it('prefers the pose close to confirmed head and foot points', () => {
    const targetServer = makePose(1, 0.28, 0.84, 0.55);
    const largerBystander = makePose(2, 0.58, 0.78, 0.38);

    const selected = selectServerPose([largerBystander, targetServer], null, {
      playerHeadTop: { x: 0.28, y: 0.39 },
      playerFootBase: { x: 0.28, y: 0.84 },
    });

    expect(selected.landmarks?.[0].z).toBe(1);
  });
});
