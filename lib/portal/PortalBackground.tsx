"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { PortalShaderControls } from "@/lib/useVinylControls";

import { PORTAL_FRAGMENT, PORTAL_VERTEX } from "./portalShader";

type PortalBackgroundProps = {
  progressRef: MutableRefObject<number>;
  baseColor: string;
  targetColor: string;
  seed: number;
  quality: number;
  shader: PortalShaderControls;
};

export default function PortalBackground({
  progressRef,
  baseColor,
  targetColor,
  seed,
  quality,
  shader,
}: PortalBackgroundProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const baseColorObj = useMemo(() => new THREE.Color(baseColor), [baseColor]);
  const targetColorObj = useMemo(
    () => new THREE.Color(targetColor),
    [targetColor],
  );
  const maskCenterVec = useMemo(() => new THREE.Vector2(), []);

  const [uniforms] = useState(
    () =>
      ({
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: seed },
        uQuality: { value: quality },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uBaseColor: { value: baseColorObj.clone() },
        uTargetColor: { value: targetColorObj.clone() },
        uMaskCenter: { value: maskCenterVec },
        uRadiusScale: { value: shader.mask.radiusScale },
        uEdgeWide: { value: shader.mask.edgeWide },
        uEdgeNarrow: { value: shader.mask.edgeNarrow },
        uEdgeSettle0: { value: shader.mask.settleStart },
        uEdgeSettle1: { value: shader.mask.settleEnd },
        uMaskContrast: { value: shader.mask.contrast },
        uWarpStrength: { value: shader.warp.strength },
        uWarpScale: { value: shader.warp.scale },
        uWarpTime: { value: shader.warp.timeScale },
        uFlowAngle: { value: shader.flow.angle },
        uFlowSpeed: { value: shader.flow.speed },
        uInnerDisplace: { value: shader.flow.innerDisplace },
        uGrainScale: { value: shader.grain.scale },
        uGrainIntensity: { value: shader.grain.intensity },
        uGrainSpeed: { value: shader.grain.speed },
        uChromaPx: { value: shader.chroma.px },
        uChromaAngle: { value: shader.chroma.angle },
        uChromaEdge: { value: shader.chroma.edgeWeight },
        uChromaNoisePx: { value: shader.chroma.noisePx },
        uWaveAmp: { value: shader.wave.amp },
        uWaveFreq: { value: shader.wave.freq },
        uRimSharp: { value: shader.rim.sharp },
        uRimSoft: { value: shader.rim.soft },
        uRimIntensity: { value: shader.rim.intensity },
        uInteriorGrad: { value: shader.interior.gradient },
        uInteriorGradScale: { value: shader.interior.gradientScale },
        uLiquify: { value: shader.edgeShape.liquify },
        uLiquifyScale: { value: shader.edgeShape.liquifyScale },
        uLiquifyTime: { value: shader.edgeShape.liquifyTime },
        uStarPoints: { value: shader.edgeShape.starPoints },
        uStarDepth: { value: shader.edgeShape.starDepth },
        uStarTwist: { value: shader.edgeShape.starTwist },
      }) satisfies Record<string, THREE.IUniform>,
  );

  const { size } = useThree();

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    const u = m.uniforms;
    u.uProgress.value = progressRef.current;
    u.uTime.value = state.clock.elapsedTime;
    u.uSeed.value = seed;
    u.uQuality.value = quality;
    u.uResolution.value.set(size.width, size.height);
    u.uBaseColor.value.copy(baseColorObj);
    u.uTargetColor.value.copy(targetColorObj);

    u.uMaskCenter.value.set(shader.mask.center.x, shader.mask.center.y);
    u.uRadiusScale.value = shader.mask.radiusScale;
    u.uEdgeWide.value = shader.mask.edgeWide;
    u.uEdgeNarrow.value = shader.mask.edgeNarrow;
    u.uEdgeSettle0.value = shader.mask.settleStart;
    u.uEdgeSettle1.value = shader.mask.settleEnd;
    u.uMaskContrast.value = shader.mask.contrast;
    u.uWarpStrength.value = shader.warp.strength;
    u.uWarpScale.value = shader.warp.scale;
    u.uWarpTime.value = shader.warp.timeScale;
    u.uFlowAngle.value = shader.flow.angle;
    u.uFlowSpeed.value = shader.flow.speed;
    u.uInnerDisplace.value = shader.flow.innerDisplace;
    u.uGrainScale.value = shader.grain.scale;
    u.uGrainIntensity.value = shader.grain.intensity;
    u.uGrainSpeed.value = shader.grain.speed;
    u.uChromaPx.value = shader.chroma.px;
    u.uChromaAngle.value = shader.chroma.angle;
    u.uChromaEdge.value = shader.chroma.edgeWeight;
    u.uChromaNoisePx.value = shader.chroma.noisePx;
    u.uWaveAmp.value = shader.wave.amp;
    u.uWaveFreq.value = shader.wave.freq;
    u.uRimSharp.value = shader.rim.sharp;
    u.uRimSoft.value = shader.rim.soft;
    u.uRimIntensity.value = shader.rim.intensity;
    u.uInteriorGrad.value = shader.interior.gradient;
    u.uInteriorGradScale.value = shader.interior.gradientScale;
    u.uLiquify.value = shader.edgeShape.liquify;
    u.uLiquifyScale.value = shader.edgeShape.liquifyScale;
    u.uLiquifyTime.value = shader.edgeShape.liquifyTime;
    u.uStarPoints.value = shader.edgeShape.starPoints;
    u.uStarDepth.value = shader.edgeShape.starDepth;
    u.uStarTwist.value = shader.edgeShape.starTwist;
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={PORTAL_VERTEX}
        fragmentShader={PORTAL_FRAGMENT}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
}
