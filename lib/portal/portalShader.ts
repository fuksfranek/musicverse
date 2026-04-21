/**
 * Portal background shader.
 *
 * Renders a fullscreen quad that morphs between two solid colors with a
 * noisy radial boundary + glowing rim. Lives BEHIND the vinyl, so the
 * vinyl itself never gets distorted.
 *
 * Driven by `uProgress ∈ [0, 1]` plus tunables in `PortalShaderControls`
 * (grain, mask edge, flow, chromatic split, radial wave, liquify + star edge, etc.).
 *
 * Vertex shader emits clip-space directly, so the plane geometry (2x2 at
 * ±1, ±1) covers the entire viewport regardless of camera.
 */
export const PORTAL_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const PORTAL_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uProgress;
uniform float uTime;
uniform float uSeed;
uniform float uQuality;
uniform vec2  uResolution;
uniform vec3  uBaseColor;
uniform vec3  uTargetColor;

// --- PortalShaderControls uniforms ---
uniform vec2  uMaskCenter;
uniform float uRadiusScale;
uniform float uEdgeWide;
uniform float uEdgeNarrow;
uniform float uEdgeSettle0;
uniform float uEdgeSettle1;
uniform float uMaskContrast;

uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uWarpTime;

uniform float uFlowAngle;
uniform float uFlowSpeed;
uniform float uInnerDisplace;

uniform float uGrainScale;
uniform float uGrainIntensity;
uniform float uGrainSpeed;

uniform float uChromaPx;
uniform float uChromaAngle;
uniform float uChromaEdge;
uniform float uChromaNoisePx;

uniform float uWaveAmp;
uniform float uWaveFreq;

uniform float uRimSharp;
uniform float uRimSoft;
uniform float uRimIntensity;

uniform float uInteriorGrad;
uniform float uInteriorGradScale;

uniform float uLiquify;
uniform float uLiquifyScale;
uniform float uLiquifyTime;
uniform float uStarPoints;
uniform float uStarDepth;
uniform float uStarTwist;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    if (i >= octaves) break;
    s += valueNoise(p) * a;
    p *= 2.07;
    a *= 0.5;
  }
  return s;
}

// Returns column 0: mask, ringDist, noisePrimary (for interior wash).
mat3 portalSample(vec2 uvIn) {
  float p = clamp(uProgress, 0.0, 1.0);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float warpEnv = smoothstep(0.02, 0.45, p) * smoothstep(1.0, 0.55, p);

  vec2 flow = vec2(cos(uFlowAngle), sin(uFlowAngle)) * uFlowSpeed * uTime * warpEnv;
  vec2 uvN = uvIn * uWarpScale + vec2(uSeed) + uTime * uWarpTime + flow;
  int octaves = uQuality > 0.5 ? 3 : 2;
  float n = fbm(uvN, octaves);
  float n2 = fbm(uvN + vec2(7.13, 2.91), octaves);
  vec2 disp = (vec2(n, n2) - 0.5) * uInnerDisplace * warpEnv;
  vec2 uvW = uvIn + disp;

  vec2 c0 = (uvW - 0.5 - uMaskCenter) * vec2(aspect, 1.0);
  float lenC0 = max(length(c0), 1e-5);
  vec2 lqCoord = uvW * uLiquifyScale + vec2(uSeed * 0.37) + uTime * uLiquifyTime;
  float lqA = fbm(lqCoord, octaves);
  float lqB = fbm(lqCoord + vec2(13.4, 2.07), octaves);
  float liqMag = uLiquify * warpEnv * lenC0 * 0.15;
  vec2 c = c0 + (vec2(lqA, lqB) - 0.5) * liqMag * 2.35;

  float r = length(c);
  r += uWaveAmp * sin(r * uWaveFreq - uTime * 2.0) * warpEnv;

  float maxR = length(vec2(aspect, 1.0)) * uRadiusScale;
  float ang = atan(c.y, c.x);
  float starBump = 0.0;
  if (uStarPoints > 0.5) {
    float kk = uStarPoints;
    float sa = sin(ang * kk + uStarTwist + uTime * 0.065);
    starBump = sign(sa) * pow(abs(sa), 0.58);
    starBump *= uStarDepth * maxR * warpEnv;
  }
  r += starBump;

  float revealR = p * maxR;
  float warp = (n - 0.5) * uWarpStrength * warpEnv;
  float dR = r + warp;
  float ringDist = abs(dR - revealR);

  float edgeWidth = mix(uEdgeWide, uEdgeNarrow, smoothstep(uEdgeSettle0, uEdgeSettle1, p));
  float mask = smoothstep(revealR + edgeWidth, revealR - edgeWidth, dR);
  mask = pow(clamp(mask, 0.0, 1.0), max(uMaskContrast, 0.001));

  return mat3(
    vec3(mask, ringDist, n),
    vec3(0.0),
    vec3(0.0)
  );
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);

  if (p < 0.002) {
    gl_FragColor = vec4(uBaseColor, 1.0);
    return;
  }
  if (p > 0.998) {
    gl_FragColor = vec4(uTargetColor, 1.0);
    return;
  }

  mat3 midM = portalSample(vUv);
  float maskG = midM[0].x;
  float ringDist = midM[0].y;

  vec2 chromaDir = vec2(cos(uChromaAngle), sin(uChromaAngle));
  float px = max(uResolution.x, 1.0);
  vec2 chromaUV = chromaDir * (uChromaPx / px);
  float rimForChroma = exp(-ringDist * 26.0);
  float chromaMix = mix(1.0, rimForChroma, clamp(uChromaEdge, 0.0, 1.0));

  int octCh = uQuality > 0.5 ? 2 : 1;
  vec2 nSlow = vec2(
    fbm(vUv * 9.0 + vec2(uSeed * 0.31) + uTime * 0.19, octCh),
    fbm(vUv * 9.0 + vec2(uSeed * 0.31 + 8.2) - uTime * 0.15, octCh)
  ) - 0.5;
  vec2 gCoord = vUv * uResolution * 0.62;
  float tGn = uTime * uGrainSpeed;
  vec2 hR = vec2(
    hash21(gCoord + vec2(uSeed * 1.1, 0.0) + tGn * 0.041),
    hash21(gCoord + vec2(52.0, 10.0) + uSeed + tGn * 0.038)
  ) - 0.5;
  vec2 hB = vec2(
    hash21(gCoord + vec2(101.0, 3.0) + uSeed * 0.9 + tGn * 0.044),
    hash21(gCoord + vec2(3.0, 88.0) + uSeed - tGn * 0.039)
  ) - 0.5;
  float nScale = (uChromaNoisePx / px) * chromaMix;
  vec2 jitterR = (nSlow * 1.2 + hR * 1.35) * nScale;
  vec2 jitterB = (nSlow * -1.1 + hB * 1.4) * nScale;
  vec2 offR = chromaUV * chromaMix + jitterR;
  vec2 offB = chromaUV * chromaMix + jitterB;

  float maskR = maskG;
  float maskB = maskG;
  if (abs(uChromaPx) > 0.001 || uChromaNoisePx > 0.001) {
    maskR = portalSample(vUv + offR)[0].x;
    maskB = portalSample(vUv - offB)[0].x;
  }

  vec3 col = vec3(
    mix(uBaseColor.r, uTargetColor.r, maskR),
    mix(uBaseColor.g, uTargetColor.g, maskG),
    mix(uBaseColor.b, uTargetColor.b, maskB)
  );

  float ringSharp = exp(-ringDist * uRimSharp);
  float ringSoft  = exp(-ringDist * uRimSoft);
  float ringEnv = smoothstep(0.03, 0.35, p) * smoothstep(1.0, 0.6, p);
  col += (vec3(1.0, 0.95, 1.08) * ringSharp + vec3(uTargetColor) * ringSoft * 0.35)
         * ringEnv * uRimIntensity;

  if (abs(uInteriorGrad) > 0.001) {
    int oct = uQuality > 0.5 ? 3 : 2;
    float g = fbm(vUv * uInteriorGradScale + vec2(uSeed * 0.1) + uTime * 0.12, oct);
    float wash = (g - 0.5) * uInteriorGrad * maskG;
    col += wash * (uTargetColor - uBaseColor);
  }

  vec2 gBase = vUv * uResolution * uGrainScale;
  float tG = uTime * uGrainSpeed;
  float g1 = hash21(gBase + tG * 0.19) - 0.5;
  float g2 = hash21(gBase * 1.92 + vec2(41.0, 12.0) + tG * 0.25) - 0.5;
  float g3 = hash21(gBase * 3.45 + vec2(3.0, 99.0) - tG * 0.33) - 0.5;
  int go = uQuality > 0.5 ? 2 : 1;
  float g4 = fbm(vUv * uResolution * uGrainScale * 0.065 + vec2(uSeed * 0.22) + tG * 0.075, go) - 0.5;
  float grainL = g1 * 0.5 + g2 * 0.34 + g3 * 0.24 + g4 * 0.34;
  vec3 grainCh = vec3(g1, g2, g3) * 0.26;
  float gEnv = smoothstep(0.04, 0.58, p) * smoothstep(0.98, 0.6, p);
  col += grainL * uGrainIntensity * gEnv;
  col += grainCh * uGrainIntensity * 0.85 * gEnv;

  gl_FragColor = vec4(col, 1.0);
}
`;
