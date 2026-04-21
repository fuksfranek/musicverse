"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

import { useIsLowPower } from "@/lib/useIsLowPower";
import type { VinylControls } from "@/lib/useVinylControls";

type SpotlightProps = {
  active: boolean;
  spot: VinylControls["portal"]["listeningSpotlight"];
  /** Listening UI: beam tracks pointer; otherwise eases back to center. */
  followPointer: boolean;
  /** Same lerp factor as `CameraRig` parallax (smooth follow). */
  parallaxLerp: number;
};

function VinylSpotlight({
  active,
  spot,
  followPointer,
  parallaxLerp,
}: SpotlightProps) {
  const lightRef = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    const L = lightRef.current;
    if (!L || !active) return;

    const px = followPointer ? state.pointer.x : 0;
    const py = followPointer ? state.pointer.y : 0;

    const aimX = px * spot.cursorAim.x;
    const aimY = py * spot.cursorAim.y;
    const swingX = px * spot.cursorSwing.x;
    const swingY = py * spot.cursorSwing.y;
    const swingZ = py * spot.cursorSwing.z;

    const tx = spot.position.x + swingX;
    const ty = spot.position.y + swingY;
    const tz = spot.position.z + swingZ;

    L.position.x = THREE.MathUtils.lerp(L.position.x, tx, parallaxLerp);
    L.position.y = THREE.MathUtils.lerp(L.position.y, ty, parallaxLerp);
    L.position.z = THREE.MathUtils.lerp(L.position.z, tz, parallaxLerp);

    L.target.position.x = THREE.MathUtils.lerp(
      L.target.position.x,
      aimX,
      parallaxLerp,
    );
    L.target.position.y = THREE.MathUtils.lerp(
      L.target.position.y,
      aimY,
      parallaxLerp,
    );
    L.target.position.z = THREE.MathUtils.lerp(
      L.target.position.z,
      0,
      parallaxLerp,
    );
    L.target.updateMatrixWorld();
  });

  if (!active) return null;

  return (
    <spotLight
      ref={lightRef}
      position={[spot.position.x, spot.position.y, spot.position.z]}
      intensity={spot.intensity}
      angle={spot.angle}
      penumbra={spot.penumbra}
      distance={spot.distance}
      color={spot.color}
      decay={2}
      castShadow={false}
    >
      <object3D attach="target" position={[0, 0, 0]} />
    </spotLight>
  );
}

type CameraRigProps = {
  fov: number;
  distance: number;
  parallax: number;
  parallaxLerp: number;
};

function CameraRig({ fov, distance, parallax, parallaxLerp }: CameraRigProps) {
  /* eslint-disable react-hooks/immutability -- R3F's useThree camera is a live Three.js object */
  const { camera } = useThree();
  const baseZ = useRef(distance);

  useEffect(() => {
    baseZ.current = distance;
  }, [distance]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, fov]);

  useFrame((state) => {
    const targetX = state.pointer.x * parallax;
    const targetY = state.pointer.y * parallax;
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetX,
      parallaxLerp,
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetY,
      parallaxLerp,
    );
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      baseZ.current,
      parallaxLerp,
    );
    camera.lookAt(0, 0, 0);
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

type VinylCanvasProps = {
  children: ReactNode;
  controls: VinylControls;
  /** Softer camera / reflection motion while in listening UI. */
  listening?: boolean;
  /** Wide bloom on the disc; omit to follow `listening`. */
  halation?: boolean;
};

export default function VinylCanvas({
  children,
  controls,
  listening = false,
  halation: halationProp,
}: VinylCanvasProps) {
  const lowPower = useIsLowPower();
  const { lighting, camera, portal } = controls;
  const halationControls = portal.listeningHalation;
  const spotlight = portal.listeningSpotlight;
  const halationActive = halationProp ?? listening;
  const parallaxLerp = listening
    ? camera.listeningParallaxLerp
    : camera.parallaxLerp;

  return (
    <Canvas
      dpr={[1, lowPower ? 1.5 : 2]}
      camera={{ position: [0, 0, camera.distance], fov: camera.fov }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <CameraRig
        fov={camera.fov}
        distance={camera.distance}
        parallax={camera.parallax}
        parallaxLerp={parallaxLerp}
      />

      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        position={[lighting.keyX, lighting.keyY, lighting.keyZ]}
        intensity={lighting.keyIntensity}
        color={lighting.keyColor}
      />
      <directionalLight
        position={[-2.0, 0.3, 1.5]}
        intensity={lighting.fillIntensity}
        color={lighting.fillColor}
      />
      <directionalLight
        position={[0, 1.6, -2.2]}
        intensity={lighting.rimIntensity}
        color="#ffffff"
      />

      <VinylSpotlight
        active={halationActive}
        spot={spotlight}
        followPointer={listening}
        parallaxLerp={parallaxLerp}
      />

      {!lowPower && lighting.envEnabled && (
        <Suspense fallback={null}>
          <Environment
            files="/hdri/studio_small_09_1k.hdr"
            environmentIntensity={lighting.envIntensity}
            background={false}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>{children}</Suspense>

      {halationActive && !lowPower && (
        <EffectComposer multisampling={halationControls.multisampling}>
          <Bloom
            blendFunction={BlendFunction.SCREEN}
            opacity={halationControls.blendOpacity}
            intensity={halationControls.intensity}
            luminanceThreshold={halationControls.luminanceThreshold}
            luminanceSmoothing={halationControls.luminanceSmoothing}
            mipmapBlur
            radius={halationControls.radius}
            levels={halationControls.mipmapLevels}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}
