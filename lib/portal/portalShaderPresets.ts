import type { PortalShaderControls } from "@/lib/useVinylControls";

/**
 * Portal shader — final tuned preset (from editor panel, committed to repo).
 */
export const PORTAL_SHADER_VERSION_4: PortalShaderControls = {
  mask: {
    center: { x: 0, y: 0 },
    radiusScale: 0.55,
    edgeWide: 0.08,
    edgeNarrow: 0.015,
    settleStart: 0.1,
    settleEnd: 0.84,
    contrast: 1,
  },
  warp: {
    strength: 0.22,
    scale: 6,
    timeScale: 0.45,
  },
  flow: {
    angle: 0,
    speed: 0,
    innerDisplace: 0.162,
  },
  grain: {
    scale: 0.48,
    intensity: 0.11,
    speed: 62,
  },
  chroma: {
    px: 14.5,
    angle: 0,
    edgeWeight: 0.72,
    noisePx: 11.85,
  },
  wave: {
    amp: 0.055,
    freq: 20,
  },
  rim: {
    sharp: 75,
    soft: 14,
    intensity: 1,
  },
  interior: {
    gradient: 0,
    gradientScale: 4,
  },
  edgeShape: {
    liquify: 0.028,
    liquifyScale: 10.5,
    liquifyTime: 0.4,
    starPoints: 0,
    starDepth: 0.055,
    starTwist: 0.25,
  },
};
