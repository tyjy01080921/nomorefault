import type { PoseLandmark } from './pose';

export interface Point {
  x: number;
  y: number;
}

export interface ServerPoseTargets {
  playerHeadTop?: Point | null;
  playerFootBase?: Point | null;
}

export interface ServerPoseTrackingState {
  lowerAnchor: Point | null;
  upperCenter: Point | null;
  bodyCenter: Point | null;
}

interface PoseMetrics {
  landmarks: PoseLandmark[];
  lowerCenter: Point;
  upperCenter: Point;
  bodyCenter: Point;
  headTop: Point;
  footBase: Point;
  visibilityScore: number;
}

const headIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const upperIndexes = [0, 9, 10, 11, 12, 13, 14, 15, 16];
const lowerIndexes = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const footIndexes = [27, 28, 29, 30, 31, 32];
const bodyIndexes = [...upperIndexes, ...lowerIndexes];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function isVisible(landmark: PoseLandmark | undefined) {
  if (!landmark) return false;
  return typeof landmark.visibility !== 'number' || landmark.visibility >= 0.28;
}

function getVisiblePoints(landmarks: PoseLandmark[], indexes: number[]) {
  return indexes
    .map((index) => landmarks[index])
    .filter((landmark): landmark is PoseLandmark => isVisible(landmark));
}

function averagePoint(points: PoseLandmark[]): Point | null {
  if (points.length === 0) return null;

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function getPoseMetrics(landmarks: PoseLandmark[]): PoseMetrics | null {
  const upperPoints = getVisiblePoints(landmarks, upperIndexes);
  const lowerPoints = getVisiblePoints(landmarks, lowerIndexes);
  const bodyPoints = getVisiblePoints(landmarks, bodyIndexes);
  const headPoints = getVisiblePoints(landmarks, headIndexes);
  const footPoints = getVisiblePoints(landmarks, footIndexes);
  const upperCenter = averagePoint(upperPoints);
  const lowerCenter = averagePoint(lowerPoints);
  const bodyCenter = averagePoint(bodyPoints);

  if (!upperCenter || !lowerCenter || !bodyCenter || headPoints.length === 0 || footPoints.length === 0) {
    return null;
  }

  return {
    landmarks,
    upperCenter,
    lowerCenter,
    bodyCenter,
    headTop: {
      x: averagePoint(headPoints)?.x ?? bodyCenter.x,
      y: Math.min(...headPoints.map((point) => point.y)),
    },
    footBase: {
      x: averagePoint(footPoints)?.x ?? lowerCenter.x,
      y: Math.max(...footPoints.map((point) => point.y)),
    },
    visibilityScore: bodyPoints.length / bodyIndexes.length,
  };
}

function scorePose(metrics: PoseMetrics, previous: ServerPoseTrackingState | null, targets: ServerPoseTargets) {
  let score = metrics.visibilityScore * 0.45;

  if (targets.playerHeadTop) {
    score += clamp01(1 - distance(metrics.headTop, targets.playerHeadTop) * 5) * 1.25;
  }

  if (targets.playerFootBase) {
    score += clamp01(1 - distance(metrics.footBase, targets.playerFootBase) * 5) * 1.55;
  }

  if (previous?.lowerAnchor) {
    const lowerShift = distance(metrics.lowerCenter, previous.lowerAnchor);
    score += clamp01(1 - lowerShift * 7) * 1.8;

    if (previous.upperCenter) {
      const upperShift = distance(metrics.upperCenter, previous.upperCenter);
      score += clamp01((upperShift - lowerShift) * 10 + 0.45) * 0.55;
    }
  } else {
    score += clamp01(1 - Math.abs(metrics.bodyCenter.x - 0.5) * 1.4) * 0.18;
  }

  return score;
}

export function selectServerPose(
  candidates: PoseLandmark[][],
  previous: ServerPoseTrackingState | null,
  targets: ServerPoseTargets = {}
) {
  const metrics = candidates
    .map(getPoseMetrics)
    .filter((metric): metric is PoseMetrics => Boolean(metric));

  if (metrics.length === 0) {
    return { landmarks: null, nextState: previous };
  }

  const selected = metrics
    .map((metric) => ({ metric, score: scorePose(metric, previous, targets) }))
    .sort((a, b) => b.score - a.score)[0].metric;

  const nextState: ServerPoseTrackingState = {
    lowerAnchor: previous?.lowerAnchor
      ? lerpPoint(previous.lowerAnchor, selected.lowerCenter, 0.08)
      : selected.lowerCenter,
    upperCenter: selected.upperCenter,
    bodyCenter: selected.bodyCenter,
  };

  return { landmarks: selected.landmarks, nextState };
}
