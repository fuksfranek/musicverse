"use client";

import { PORTAL_SHADER_VERSION_4 } from "@/lib/portal/portalShaderPresets";

export type VinylControls = {
  disc: {
    thickness: number;
    outerR: number;
    holeR: number;
    labelR: number;
    baseColor: string;
    rimColor: string;
    faceRoughness: number;
    faceMetalness: number;
    clearcoat: number;
    clearcoatRoughness: number;
  };
  grooves: {
    ringCount: number;
    contrast: number;
    grooveStart: number;
    grooveEnd: number;
  };
  motion: {
    tiltMaxX: number;
    tiltMaxY: number;
    pullTiltX: number;
    pullTiltZ: number;
    pullTiltScale: number;
    spinBase: number;
    spinScrub: number;
    discFraction: number;
  };
  lighting: {
    ambient: number;
    keyIntensity: number;
    keyX: number;
    keyY: number;
    keyZ: number;
    keyColor: string;
    fillIntensity: number;
    fillColor: string;
    rimIntensity: number;
    envIntensity: number;
    envEnabled: boolean;
  };
  camera: {
    fov: number;
    distance: number;
    parallax: number;
    /** Camera XY follow smoothing (browse / non-listening). */
    parallaxLerp: number;
    /** Slower follow while listening — gentler motion of highlights on metal. */
    listeningParallaxLerp: number;
  };
  portal: {
    holdMs: number;
    /** Hold to commit exit from listening (typically shorter than holdMs). */
    exitHoldMs: number;
    diveDuration: number;
    /** Portal + overall close duration when leaving listening (quicker than diveDuration). */
    exitDiveDuration: number;
    /** Flip + metal reverse during dive-out (often longer / softer than commit for a gentle return). */
    exitFlipDuration: number;
    /** Easing for dive-out flip (e.g. power3.out — soft landing vs commitFlip ease). */
    exitFlipEase: string;
    diveEaseIn: string;
    diveEaseOut: string;
    pressScale: number;
    modeSwapProgress: number;
    modeSwapProgressOut: number;
    listeningSpin: number;
    /** Spin speed lerp in listening (lower = gentler ramp & slowdown). */
    listeningSpinLerp: number;
    /** Pointer tilt lerp in listening / exit-charging (lower = slower follow). */
    listeningTiltLerp: number;
    chargingSpinPeak: number;
    listeningTiltX: number;
    listeningTiltY: number;
    baseColor: string;
    /** Piecewise hold→portal curve (see mapHoldToPortalProgress). */
    holdEasing: {
      t1: number;
      t2: number;
      u1: number;
      u2: number;
      blendLinear: number;
    };
    /** End-of-hold flip + metallic disc (listening mode). */
    commitFlip: {
      duration: number;
      /** Full 360° flips (each adds 2π rad to local X). */
      turns: number;
      ease: string;
    };
    listeningDisc: {
      faceMetalness: number;
      faceRoughness: number;
      clearcoat: number;
      clearcoatRoughness: number;
      iridescence: number;
      iridescenceIOR: number;
      /** Face albedo at full metal (neutral silver; env/spec dominates). */
      faceColor: string;
      rimMetalness: number;
      rimRoughness: number;
      /** Rim tint at full metal. */
      rimColor: string;
      envMapIntensity: number;
      /** Brushed-metal stretched highlights (0–1). */
      anisotropy: number;
      /** Radians; aligns anisotropy with groove direction on the disc. */
      anisotropyRotation: number;
    };
    /**
     * Soft, wide bloom on the vinyl (listening only). Mipmap blur reads as halation.
     */
    listeningHalation: {
      intensity: number;
      luminanceThreshold: number;
      /**
       * Width of the luminance knee (higher = no hard ring between bloom / non-bloom).
       * Keep high (0.9+) for a fully diffused halation.
       */
      luminanceSmoothing: number;
      /** Mipmap blur radius (wider = softer veil). */
      radius: number;
      mipmapLevels: number;
      /** Blend opacity of the bloom pass (lower = gentler composite). */
      blendOpacity: number;
      /**
       * MSAA samples on the composer buffer (0 = off). A few samples reduce
       * stair-steps that bloom can read as harsh glow rings.
       */
      multisampling: number;
    };
    /** Tight pool on the disc (same active window as halation). */
    listeningSpotlight: {
      position: { x: number; y: number; z: number };
      intensity: number;
      /** Cone half-angle (radians). */
      angle: number;
      /** Edge softness 0–1. */
      penumbra: number;
      /** Falloff distance (0 = no cutoff). */
      distance: number;
      color: string;
      /**
       * Where the beam hits the disc (multiplies pointer −1…1 in listening view).
       */
      cursorAim: { x: number; y: number };
      /** Fixture offset in world units (multiplies pointer −1…1). */
      cursorSwing: { x: number; y: number; z: number };
    };
    /**
     * Fullscreen portal shader tuning (grain, mask edge, flow, RGB split, etc.).
     * All values are safe defaults matching the original look unless noted.
     */
    shader: PortalShaderControls;
  };
};

/** Tunables for `lib/portal/portalShader.ts` — edit in `VINYL_CONTROLS.portal.shader`. */
export type PortalShaderControls = {
  mask: {
    /** UV-space offset of the reveal center (x,y subtracted after vUv - 0.5). */
    center: { x: number; y: number };
    /** Multiplier on max reveal radius (was 0.55). */
    radiusScale: number;
    /** Soft edge thickness when the portal is opening (was ~0.08). */
    edgeWide: number;
    /** Soft edge thickness when nearly settled (was ~0.015). */
    edgeNarrow: number;
    /** Progress range where edge width lerps wide → narrow (smoothstep). */
    settleStart: number;
    settleEnd: number;
    /** >1 sharpens the color step; <1 softens (pow on mask). */
    contrast: number;
  };
  warp: {
    /** How much fbm pushes the radial boundary (was 0.22). */
    strength: number;
    /** UV scale on boundary noise (was 6). */
    scale: number;
    /** Time multiplier on noise drift (was 0.45). */
    timeScale: number;
  };
  flow: {
    /** Direction of flowing noise / drift (radians). */
    angle: number;
    /** UV drift speed (multiplies time; 0 = off). */
    speed: number;
    /** Extra UV warp from noise during transition (liquid displace). */
    innerDisplace: number;
  };
  grain: {
    /** Pixel density of film grain (higher = finer grain; was ~0.35 factor). */
    scale: number;
    /** Grain strength (was ~0.05). */
    intensity: number;
    /** Time multiplier on grain animation. */
    speed: number;
  };
  chroma: {
    /** RGB split in pixels (0 = off; try 2–12). */
    px: number;
    /** Separation direction (radians). */
    angle: number;
    /** 0 = chroma everywhere in transition; 1 = strongest on the rim only. */
    edgeWeight: number;
    /** Per-channel UV jitter in px (hash + fbm) for noisy RGB displacement. */
    noisePx: number;
  };
  wave: {
    /** Radial sine ripple on mask radius during transition. */
    amp: number;
    /** Spatial frequency of ripple. */
    freq: number;
  };
  rim: {
    /** Tight glow falloff at boundary (was 75). */
    sharp: number;
    /** Soft bloom falloff (was 14). */
    soft: number;
    /** Overall rim brightness multiplier. */
    intensity: number;
  };
  interior: {
    /** Subtle fbm color wash inside the revealed area (0 = off). */
    gradient: number;
    /** UV scale of that wash. */
    gradientScale: number;
  };
  /**
   * Liquify-style turbulent mask + optional star/cog silhouette on the boundary.
   */
  edgeShape: {
    /** Domain-warp strength on the mask (0 = off). */
    liquify: number;
    /** UV scale of the liquify noise field. */
    liquifyScale: number;
    /** Time drift of liquify noise. */
    liquifyTime: number;
    /** Number of radial points (0–1 ≈ off; try 4–14 for star / flower). */
    starPoints: number;
    /** How far points push the edge (in same units as radius). */
    starDepth: number;
    /** Rotate the star pattern (radians). */
    starTwist: number;
  };
};

const VINYL_CONTROLS: VinylControls = {
  disc: {
    thickness: 0.01,
    outerR: 1.0,
    holeR: 0.04,
    labelR: 0.36,
    baseColor: "#ffffff",
    rimColor: "#1a1a1a",
    faceRoughness: 0.5,
    faceMetalness: 0.12,
    clearcoat: 0.95,
    clearcoatRoughness: 0.62,
  },
  grooves: {
    ringCount: 53,
    contrast: 1.45,
    grooveStart: 0.39,
    grooveEnd: 0.97,
  },
  motion: {
    tiltMaxX: 0.33,
    tiltMaxY: 0.38,
    pullTiltX: 1.03,
    pullTiltZ: 0.28,
    pullTiltScale: 320,
    spinBase: 2.05,
    spinScrub: 5.2,
    discFraction: 0.19,
  },
  lighting: {
    ambient: 0.12,
    keyIntensity: 1.0,
    keyX: 0.1,
    keyY: -3.5,
    keyZ: -0.6,
    keyColor: "#ffffff",
    fillIntensity: 2.45,
    fillColor: "#ffffff",
    rimIntensity: 1.25,
    envIntensity: 0.48,
    envEnabled: true,
  },
  camera: {
    fov: 38,
    distance: 3.2,
    parallax: 0.11,
    parallaxLerp: 0.05,
    listeningParallaxLerp: 0.014,
  },
  portal: {
    holdMs: 1600,
    exitHoldMs: 1000,
    diveDuration: 1.3,
    exitDiveDuration: 0.95,
    exitFlipDuration: 0.88,
    exitFlipEase: "power3.out",
    diveEaseIn: "power3.in",
    diveEaseOut: "power3.out",
    pressScale: 0.9,
    modeSwapProgress: 0.88,
    modeSwapProgressOut: 0.12,
    listeningSpin: 0.52,
    listeningSpinLerp: 0.038,
    listeningTiltLerp: 0.016,
    chargingSpinPeak: 1.2,
    listeningTiltX: -0.42,
    listeningTiltY: 0.22,
    baseColor: "#ffffff",
    holdEasing: {
      t1: 0.29,
      t2: 0.71,
      u1: 0.31,
      u2: 0.69,
      blendLinear: 0.32,
    },
    commitFlip: {
      duration: 0.58,
      turns: 1,
      ease: "power2.inOut",
    },
    listeningDisc: {
      /* Low metalness so albedo reads as silver; full metal + weak reflections looked black. */
      faceMetalness: 0.22,
      faceRoughness: 0.42,
      clearcoat: 0.22,
      clearcoatRoughness: 0.18,
      iridescence: 0,
      iridescenceIOR: 1.5,
      faceColor: "#d4d9e2",
      rimMetalness: 0.35,
      rimRoughness: 0.38,
      rimColor: "#c8ced8",
      envMapIntensity: 0.95,
      anisotropy: 0,
      anisotropyRotation: 0,
    },
    listeningHalation: {
      intensity: 0.32,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.96,
      radius: 1.58,
      mipmapLevels: 12,
      blendOpacity: 0.84,
      multisampling: 4,
    },
    listeningSpotlight: {
      position: { x: 0.28, y: 2.05, z: 2.35 },
      intensity: 8.25,
      angle: 0.44,
      penumbra: 0.96,
      distance: 20,
      color: "#fff7eb",
      cursorAim: { x: 0.38, y: 0.38 },
      cursorSwing: { x: 0.62, y: 0.48, z: 0.15 },
    },
    shader: PORTAL_SHADER_VERSION_4,
  },
};

export function useVinylControls(): VinylControls {
  return VINYL_CONTROLS;
}
