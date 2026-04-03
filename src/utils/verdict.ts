import { BWF, VERDICT, POSE_KEYPOINTS } from './constants';
import { angleBetween } from './angles';

interface Coord {
  x: number;
  y: number;
}

interface CalibrationPoints {
  netBase: Coord;  // bottom of net post (normalized 0-1)
  netTop: Coord;   // top of net post (normalized 0-1)
  ground: Coord;   // ground level at server position (normalized 0-1)
}

interface VerdictResult {
  verdict: string;
  shuttlecockHeightM: number;
  angles: { shoulder: number; elbow: number; wrist: number };
}

/**
 * Calculates BWF service fault verdict from calibration points and pose landmarks.
 *
 * Height math (normalized y, y increases downward):
 *   netPostNorm = netBase.y - netTop.y  → represents NET_POST_HEIGHT (1.55m)
 *   shuttlecockAboveGroundNorm = ground.y - shuttlecockPos.y
 *   shuttlecockHeightM = (shuttlecockAboveGroundNorm / netPostNorm) * NET_POST_HEIGHT
 */
export function calculateVerdict(
  calibration: CalibrationPoints,
  shuttlecockPos: Coord,
  landmarks: any[] | null
): VerdictResult {
  const angles = extractAngles(landmarks);

  // Can't calculate height without calibration
  const { netBase, netTop, ground } = calibration;
  const netPostNorm = netBase.y - netTop.y;

  if (netPostNorm <= 0) {
    // Net calibration skipped or invalid — can't determine height
    return { verdict: VERDICT.VAR_CHALLENGE, shuttlecockHeightM: 0, angles };
  }

  const shuttlecockAboveGroundNorm = ground.y - shuttlecockPos.y;
  const shuttlecockHeightM =
    (shuttlecockAboveGroundNorm / netPostNorm) * BWF.NET_POST_HEIGHT;

  let verdict: string;
  if (shuttlecockHeightM > BWF.FAULT_THRESHOLD) {
    verdict = VERDICT.FAULT;
  } else if (shuttlecockHeightM >= BWF.PERFECT_THRESHOLD) {
    verdict = VERDICT.VAR_CHALLENGE;
  } else {
    verdict = VERDICT.PERFECT;
  }

  return { verdict, shuttlecockHeightM, angles };
}

function extractAngles(landmarks: any[] | null): {
  shoulder: number;
  elbow: number;
  wrist: number;
} {
  const zero = { shoulder: 0, elbow: 0, wrist: 0 };
  if (!landmarks || landmarks.length < 28) return zero;

  const lm = (i: number) => landmarks[i];

  try {
    const shoulder = angleBetween(
      lm(POSE_KEYPOINTS.LEFT_HIP),
      lm(POSE_KEYPOINTS.LEFT_SHOULDER),
      lm(POSE_KEYPOINTS.LEFT_ELBOW)
    );
    const elbow = angleBetween(
      lm(POSE_KEYPOINTS.LEFT_SHOULDER),
      lm(POSE_KEYPOINTS.LEFT_ELBOW),
      lm(POSE_KEYPOINTS.LEFT_WRIST)
    );
    // Simplified wrist: elbow→wrist direction angle (no distal reference in lite model)
    const wrist = angleBetween(
      lm(POSE_KEYPOINTS.LEFT_ELBOW),
      lm(POSE_KEYPOINTS.LEFT_WRIST),
      { x: lm(POSE_KEYPOINTS.LEFT_WRIST).x + 0.1, y: lm(POSE_KEYPOINTS.LEFT_WRIST).y }
    );
    return { shoulder, elbow, wrist };
  } catch {
    return zero;
  }
}
