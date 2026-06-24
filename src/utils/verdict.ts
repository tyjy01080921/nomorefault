import { BWF, VERDICT } from './constants';

export interface Coord {
  x: number;
  y: number;
}

export interface CalibrationPoints {
  netBase: Coord;  // bottom of net post (normalized 0-1)
  netTop: Coord;   // top of net post (normalized 0-1)
  ground: Coord;   // ground level at server position (normalized 0-1)
}

export type CalibrationMode = 'netPost' | 'playerHeight' | 'combined';
export type CalibrationConfidence = 'high' | 'medium' | 'low';

export interface PlayerHeightCalibrationPoints {
  playerHeightCm: number;
  playerHeadTop: Coord;
  playerFootBase: Coord;
}

export interface NetPostCalibrationInput {
  mode: 'netPost';
  net: CalibrationPoints;
}

export interface PlayerHeightCalibrationInput {
  mode: 'playerHeight';
  player: PlayerHeightCalibrationPoints;
}

export interface CombinedCalibrationInput {
  mode: 'combined';
  net: CalibrationPoints;
  player: PlayerHeightCalibrationPoints;
}

export type CalibrationInput =
  | CalibrationPoints
  | NetPostCalibrationInput
  | PlayerHeightCalibrationInput
  | CombinedCalibrationInput;

export interface VerdictResult {
  verdict: string;
  shuttlecockHeightM: number;
  heightDeltaM: number;
  calibrationMode?: CalibrationMode;
  netBasedHeightM?: number;
  playerBasedHeightM?: number;
  heightDifferenceCm?: number;
  confidence?: CalibrationConfidence;
}

export function calculateServiceLineY(calibration: CalibrationPoints): number | null {
  const { netBase, netTop, ground } = calibration;
  const netPostNorm = netBase.y - netTop.y;

  if (netPostNorm <= 0) return null;

  return ground.y - (BWF.SERVICE_HEIGHT_LIMIT / BWF.NET_POST_HEIGHT) * netPostNorm;
}

export function calculatePlayerServiceLineY(calibration: PlayerHeightCalibrationPoints): number | null {
  const playerHeightM = calibration.playerHeightCm / 100;
  const playerNorm = calibration.playerFootBase.y - calibration.playerHeadTop.y;

  if (playerHeightM <= 0 || playerNorm <= 0) return null;

  return calibration.playerFootBase.y - (BWF.SERVICE_HEIGHT_LIMIT / playerHeightM) * playerNorm;
}

function getVerdictForHeight(shuttlecockHeightM: number) {
  if (shuttlecockHeightM > BWF.FAULT_THRESHOLD) return VERDICT.FAULT;
  if (shuttlecockHeightM > BWF.SERVICE_HEIGHT_LIMIT) return VERDICT.CHECK_REQUIRED;
  return VERDICT.NORMAL;
}

function invalidResult(mode: CalibrationMode): VerdictResult {
  return {
    verdict: VERDICT.CHECK_REQUIRED,
    shuttlecockHeightM: 0,
    heightDeltaM: 0,
    calibrationMode: mode,
  };
}

function calculateNetPostVerdict(
  calibration: CalibrationPoints,
  shuttlecockPos: Coord,
  mode: CalibrationMode = 'netPost'
): VerdictResult {
  const { netBase, netTop, ground } = calibration;
  const netPostNorm = netBase.y - netTop.y;

  if (netPostNorm <= 0) return invalidResult(mode);

  const shuttlecockAboveGroundNorm = ground.y - shuttlecockPos.y;
  const shuttlecockHeightM =
    (shuttlecockAboveGroundNorm / netPostNorm) * BWF.NET_POST_HEIGHT;
  const heightDeltaM = shuttlecockHeightM - BWF.SERVICE_HEIGHT_LIMIT;

  return {
    verdict: getVerdictForHeight(shuttlecockHeightM),
    shuttlecockHeightM,
    heightDeltaM,
    calibrationMode: mode,
    netBasedHeightM: shuttlecockHeightM,
  };
}

function calculatePlayerHeightVerdict(
  calibration: PlayerHeightCalibrationPoints,
  shuttlecockPos: Coord,
  mode: CalibrationMode = 'playerHeight'
): VerdictResult {
  const playerHeightM = calibration.playerHeightCm / 100;
  const playerNorm = calibration.playerFootBase.y - calibration.playerHeadTop.y;

  if (playerHeightM <= 0 || playerNorm <= 0) return invalidResult(mode);

  const shuttlecockAboveGroundNorm = calibration.playerFootBase.y - shuttlecockPos.y;
  const shuttlecockHeightM =
    (shuttlecockAboveGroundNorm / playerNorm) * playerHeightM;
  const heightDeltaM = shuttlecockHeightM - BWF.SERVICE_HEIGHT_LIMIT;

  return {
    verdict: getVerdictForHeight(shuttlecockHeightM),
    shuttlecockHeightM,
    heightDeltaM,
    calibrationMode: mode,
    playerBasedHeightM: shuttlecockHeightM,
  };
}

function getConfidence(heightDifferenceM: number): CalibrationConfidence {
  if (heightDifferenceM <= 0.03) return 'high';
  if (heightDifferenceM <= 0.07) return 'medium';
  return 'low';
}

function calculateCombinedVerdict(
  net: CalibrationPoints,
  player: PlayerHeightCalibrationPoints,
  shuttlecockPos: Coord
): VerdictResult {
  const netResult = calculateNetPostVerdict(net, shuttlecockPos, 'combined');
  const playerResult = calculatePlayerHeightVerdict(player, shuttlecockPos, 'combined');

  if (netResult.shuttlecockHeightM <= 0 || playerResult.shuttlecockHeightM <= 0) {
    return invalidResult('combined');
  }

  const netHeight = netResult.shuttlecockHeightM;
  const playerHeight = playerResult.shuttlecockHeightM;
  const heightDifferenceM = Math.abs(netHeight - playerHeight);
  const confidence = getConfidence(heightDifferenceM);
  const shuttlecockHeightM = Math.max(netHeight, playerHeight);
  const heightDeltaM = shuttlecockHeightM - BWF.SERVICE_HEIGHT_LIMIT;

  let verdict = VERDICT.CHECK_REQUIRED;
  if (confidence !== 'low' && netResult.verdict === VERDICT.NORMAL && playerResult.verdict === VERDICT.NORMAL) {
    verdict = VERDICT.NORMAL;
  } else if (confidence !== 'low' && netResult.verdict === VERDICT.FAULT && playerResult.verdict === VERDICT.FAULT) {
    verdict = VERDICT.FAULT;
  }

  return {
    verdict,
    shuttlecockHeightM,
    heightDeltaM,
    calibrationMode: 'combined',
    netBasedHeightM: netHeight,
    playerBasedHeightM: playerHeight,
    heightDifferenceCm: Math.round(heightDifferenceM * 100),
    confidence,
  };
}

/**
 * Calculates BWF service fault verdict from calibration points.
 *
 * Height math (normalized y, y increases downward):
 *   netPostNorm = netBase.y - netTop.y  → represents NET_POST_HEIGHT (1.55m)
 *   shuttlecockAboveGroundNorm = ground.y - shuttlecockPos.y
 *   shuttlecockHeightM = (shuttlecockAboveGroundNorm / netPostNorm) * NET_POST_HEIGHT
 */
export function calculateVerdict(
  calibration: CalibrationInput,
  shuttlecockPos: Coord
): VerdictResult {
  if ('mode' in calibration) {
    if (calibration.mode === 'netPost') {
      return calculateNetPostVerdict(calibration.net, shuttlecockPos);
    }
    if (calibration.mode === 'playerHeight') {
      return calculatePlayerHeightVerdict(calibration.player, shuttlecockPos);
    }
    return calculateCombinedVerdict(calibration.net, calibration.player, shuttlecockPos);
  }

  return calculateNetPostVerdict(calibration, shuttlecockPos);
}
