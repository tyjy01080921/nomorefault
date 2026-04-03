/**
 * Calculates the interior angle at point B formed by vectors B→A and B→C.
 * Returns degrees (0-180).
 */
export function angleBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const cx = c.x - b.x;
  const cy = c.y - b.y;

  const dot = ax * cx + ay * cy;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magC = Math.sqrt(cx * cx + cy * cy);

  if (magA === 0 || magC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return Math.round(Math.acos(cosAngle) * (180 / Math.PI));
}
