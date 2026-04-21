"use client";

import { Canvas } from "@react-three/fiber";
import type { MutableRefObject } from "react";

import PortalBackground from "@/lib/portal/PortalBackground";
import type { PortalShaderControls } from "@/lib/useVinylControls";
import { useIsLowPower } from "@/lib/useIsLowPower";

type PortalCanvasProps = {
  portalProgressRef: MutableRefObject<number>;
  portalSeed: number;
  baseColor: string;
  targetColor: string;
  shader: PortalShaderControls;
};

/** Fullscreen portal shader only — stacks under title/artist HTML and the vinyl scene. */
export default function PortalCanvas({
  portalProgressRef,
  portalSeed,
  baseColor,
  targetColor,
  shader,
}: PortalCanvasProps) {
  const lowPower = useIsLowPower();

  return (
    <Canvas
      dpr={[1, lowPower ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <PortalBackground
        progressRef={portalProgressRef}
        baseColor={baseColor}
        targetColor={targetColor}
        seed={portalSeed}
        quality={lowPower ? 0 : 1}
        shader={shader}
      />
    </Canvas>
  );
}
