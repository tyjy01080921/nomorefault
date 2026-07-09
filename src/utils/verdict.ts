import { BWF, VERDICT } from './constants';

export interface Coord {
  x: number;
  y: number;
}

export type CalibrationMode = 'playerHeight';

export interface PlayerHeightCalibrationPoints {
  playerHeightCm: number;
  playerHeadTop: Coord;
  playerFootBase: Coord;
}

export interface PlayerHeightCalibrationInput {
  mode: 'playerHeight';
  player: PlayerHeightCalibrationPoints;
}

export type CalibrationInput =
  | PlayerHeightCalibrationPoints
  | PlayerHeightCalibrationInput;

export interface VerdictResult {
  verdict: string;
  shuttlecockHeightM: number;
  heightDeltaM: number;
  calibrationMode: CalibrationMode;
  playerBasedHeightM?: number;
}

export function calculateGuideConfidencePercent(guideGapCm: number | null | undefined): number | null {
  if (typeof guideGapCm !== 'number' || !Number.isFinite(guideGapCm)) return null;

  const normalizedGapCm = Math.max(0, guideGapCm);
  return Math.max(0, Math.min(100, Math.round(100 - normalizedGapCm * 2)));
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

function invalidResult(): VerdictResult {
  return {
    verdict: VERDICT.CHECK_REQUIRED,
    shuttlecockHeightM: 0,
    heightDeltaM: 0,
    calibrationMode: 'playerHeight',
  };
}

function calculatePlayerHeightVerdict(
  calibration: PlayerHeightCalibrationPoints,
  shuttlecockPos: Coord
): VerdictResult {
  const playerHeightM = calibration.playerHeightCm / 100;
  const playerNorm = calibration.playerFootBase.y - calibration.playerHeadTop.y;

  if (playerHeightM <= 0 || playerNorm <= 0) return invalidResult();

  const shuttlecockAboveGroundNorm = calibration.playerFootBase.y - shuttlecockPos.y;
  const shuttlecockHeightM =
    (shuttlecockAboveGroundNorm / playerNorm) * playerHeightM;
  const heightDeltaM = shuttlecockHeightM - BWF.SERVICE_HEIGHT_LIMIT;

  return {
    verdict: getVerdictForHeight(shuttlecockHeightM),
    shuttlecockHeightM,
    heightDeltaM,
    calibrationMode: 'playerHeight',
    playerBasedHeightM: shuttlecockHeightM,
  };
}

/**
 * Calculates the service fault verdict from the server's height calibration.
 *
 * Height math (normalized y, y increases downward):
 *   playerNorm = standingFootBase.y - standingHeadTop.y -> entered player height
 *   shuttlecockAboveGroundNorm = standingFootBase.y - shuttlecockPos.y
 *   shuttlecockHeightM = (shuttlecockAboveGroundNorm / playerNorm) * playerHeightM
 */
export function calculateVerdict(
  calibration: CalibrationInput,
  shuttlecockPos: Coord
): VerdictResult {
  if ('mode' in calibration) {
    return calculatePlayerHeightVerdict(calibration.player, shuttlecockPos);
  }

  return calculatePlayerHeightVerdict(calibration, shuttlecockPos);
}
