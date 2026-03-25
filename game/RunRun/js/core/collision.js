/* ==========================================================================
   collision.js  —  AABB segment test & simple box overlap
   ========================================================================== */

/**
 * AABB segment intersection (ported from Android IntersectionUtility).
 */
export function aabbSegment(p1x, p1y, p2x, p2y, rMinX, rMinY, rMaxX, rMaxY) {
  let minX = Math.min(p1x, p2x), maxX = Math.max(p1x, p2x);
  if (maxX > rMaxX) maxX = rMaxX;
  if (minX < rMinX) minX = rMinX;
  if (minX > maxX) return false;

  let minY = p1y, maxY = p2y;
  const dx = p2x - p1x;
  if (Math.abs(dx) > 1e-7) {
    const a = (p2y - p1y) / dx, b = p1y - a * p1x;
    minY = a * minX + b;
    maxY = a * maxX + b;
  }
  if (minY > maxY) { const t = maxY; maxY = minY; minY = t; }
  if (maxY > rMaxY) maxY = rMaxY;
  if (minY < rMinY) minY = rMinY;
  return minY <= maxY;
}

/** Simple axis-aligned bounding-box overlap check. */
export function boxOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
