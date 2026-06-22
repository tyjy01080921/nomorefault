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

export interface VerdictResult {
  verdict: string;
  shuttlecockHeightM: number;
  heightDeltaM: number;
}

export function calculateServiceLineY(calibration: CalibrationPoints): number | null {
  const { netBase, netTop, ground } = calibration;
  const netPostNorm = netBase.y - netTop.y;

  if (netPostNorm <= 0) return null;

  return ground.y - (BWF.SERVICE_HEIGHT_LIMIT / BWF.NET_POST_HEIGHT) * netPostNorm;
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
  calibration: CalibrationPoints,
  shuttlecockPos: Coord
): VerdictResult {
  // Can't calculate height without calibration
  const { netBase, netTop, ground } = calibration;
  const netPostNorm = netBase.y - netTop.y;

  if (netPostNorm <= 0) {
    // Net calibration skipped or invalid — can't determine height
    return { verdict: VERDICT.CHECK_REQUIRED, shuttlecockHeightM: 0, heightDeltaM: 0 };
  }

  const shuttlecockAboveGroundNorm = ground.y - shuttlecockPos.y;
  const shuttlecockHeightM =
    (shuttlecockAboveGroundNorm / netPostNorm) * BWF.NET_POST_HEIGHT;
  const heightDeltaM = shuttlecockHeightM - BWF.SERVICE_HEIGHT_LIMIT;

  let verdict: string;
  if (shuttlecockHeightM > BWF.FAULT_THRESHOLD) {
    verdict = VERDICT.FAULT;
  } else if (shuttlecockHeightM > BWF.SERVICE_HEIGHT_LIMIT) {
    verdict = VERDICT.CHECK_REQUIRED;
  } else {
    verdict = VERDICT.NORMAL;
  }

  return { verdict, shuttlecockHeightM, heightDeltaM };
}
