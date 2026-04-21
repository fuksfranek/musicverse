/**
 * Maps linear hold time (0..1) to portal progress (0..1).
 *
 * A mild **fast → slower → fast** shape (quad easing on the outer
 * segments, linear middle), then blended toward pure linear progress so
 * velocity does not swing as hard between start, middle, and end.
 */
export function mapHoldToPortalProgress(
  p: number,
  opts?: {
    /** End of the “fast start” segment (0..1). */
    t1?: number;
    /** Start of the “fast end” segment (0..1). */
    t2?: number;
    /** Progress reached at t1 (knot; keep near `t1` for a smoother ramp). */
    u1?: number;
    /** Progress reached at t2 (knot; keep near `t2` for a smoother ramp). */
    u2?: number;
    /**
     * How much uniform linear progress to mix in (0..1). Higher = smoother,
     * less contrast between segments. Typical 0.2–0.45.
     */
    blendLinear?: number;
  },
): number {
  const t1 = opts?.t1 ?? 0.29;
  const t2 = opts?.t2 ?? 0.71;
  const u1 = opts?.u1 ?? 0.31;
  const u2 = opts?.u2 ?? 0.69;
  const blendLinear = opts?.blendLinear ?? 0.32;

  const x = Math.min(1, Math.max(0, p));

  let shaped: number;

  if (x <= t1) {
    const s = t1 > 0 ? x / t1 : 1;
    // easeOutQuad — gentler than cubic
    const e = 1 - (1 - s) * (1 - s);
    shaped = u1 * e;
  } else if (x >= t2) {
    const s = 1 - t2 > 0 ? (x - t2) / (1 - t2) : 1;
    // easeInQuad
    const e = s * s;
    shaped = u2 + (1 - u2) * e;
  } else {
    const s = t2 > t1 ? (x - t1) / (t2 - t1) : 0;
    shaped = u1 + (u2 - u1) * s;
  }

  const linear = x;
  const b = Math.min(1, Math.max(0, blendLinear));
  return linear * b + shaped * (1 - b);
}
