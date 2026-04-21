"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createGrooveTextures } from "@/lib/grooveTexture";
import type { VinylControls } from "@/lib/useVinylControls";

type VinylDiscProps = {
  lowPower: boolean;
  disc: VinylControls["disc"];
  grooves: VinylControls["grooves"];
  listeningDisc: VinylControls["portal"]["listeningDisc"];
  /** 0 = classic black groove look, 1 = iridescent chrome (listening). */
  metalBlendRef: MutableRefObject<number>;
};

const SEGMENTS_HIGH = 128;
const SEGMENTS_LOW = 64;
const RING_SEGMENTS_HIGH = 128;
const RING_SEGMENTS_LOW = 64;

const baseFace = new THREE.Color();
const targetFace = new THREE.Color();
const baseRim = new THREE.Color();
const targetRim = new THREE.Color();

export default function VinylDisc({
  lowPower,
  disc,
  grooves,
  listeningDisc,
  metalBlendRef,
}: VinylDiscProps) {
  const segments = lowPower ? SEGMENTS_LOW : SEGMENTS_HIGH;
  const ringSegments = lowPower ? RING_SEGMENTS_LOW : RING_SEGMENTS_HIGH;

  const faceMatRef = useRef<
    THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial | null
  >(null);
  const faceBackMatRef = useRef<
    THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial | null
  >(null);
  const rimMatRef = useRef<
    THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial | null
  >(null);

  const halfThickness = disc.thickness / 2;

  /** Flat silver diffuse so dark groove map does not tint the listening look. */
  const listeningDiffuseMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = listeningDisc.faceColor;
    ctx.fillRect(0, 0, 4, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [listeningDisc.faceColor]);

  useEffect(() => {
    return () => listeningDiffuseMap.dispose();
  }, [listeningDiffuseMap]);

  const { color: grooveColor, roughness: grooveRoughness } = useMemo(
    () =>
      createGrooveTextures({
        size: lowPower ? 512 : 1024,
        ringCount: Math.round(lowPower ? grooves.ringCount * 0.7 : grooves.ringCount),
        labelR: disc.labelR / disc.outerR + 0.005,
        grooveStart: grooves.grooveStart,
        grooveEnd: grooves.grooveEnd,
        contrast: grooves.contrast,
      }),
    [
      lowPower,
      grooves.ringCount,
      grooves.contrast,
      grooves.grooveStart,
      grooves.grooveEnd,
      disc.labelR,
      disc.outerR,
    ],
  );

  const faceGeometry = useMemo(
    () => new THREE.RingGeometry(disc.holeR, disc.outerR, ringSegments, 1),
    [ringSegments, disc.holeR, disc.outerR],
  );

  const rimGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        disc.outerR,
        disc.outerR,
        disc.thickness,
        segments,
        1,
        true,
      ),
    [segments, disc.outerR, disc.thickness],
  );

  const holeGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        disc.holeR,
        disc.holeR,
        disc.thickness,
        Math.max(32, Math.floor(segments / 2)),
        1,
        true,
      ),
    [segments, disc.holeR, disc.thickness],
  );

  useFrame(() => {
    const b = THREE.MathUtils.clamp(metalBlendRef.current, 0, 1);
    baseFace.set(disc.baseColor);
    targetFace.set(listeningDisc.faceColor);
    baseRim.set(disc.rimColor);
    targetRim.set(listeningDisc.rimColor);

    const applyFace = (
      m: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
    ) => {
      /* Dark groove color map × albedo reads black on metal; use neutral map when metallic. */
      const listeningLook = b > 0.12;
      m.map = listeningLook ? listeningDiffuseMap : grooveColor;
      /* Groove roughness modulation fights a clean silver read; use uniform roughness while listening. */
      m.roughnessMap = listeningLook ? null : grooveRoughness;
      m.color.copy(baseFace).lerp(targetFace, b);
      m.metalness = THREE.MathUtils.lerp(
        disc.faceMetalness,
        listeningDisc.faceMetalness,
        b,
      );
      m.roughness = THREE.MathUtils.lerp(
        disc.faceRoughness,
        listeningDisc.faceRoughness,
        b,
      );
      if (m instanceof THREE.MeshPhysicalMaterial) {
        m.clearcoat = THREE.MathUtils.lerp(
          disc.clearcoat,
          listeningDisc.clearcoat,
          b,
        );
        m.clearcoatRoughness = THREE.MathUtils.lerp(
          disc.clearcoatRoughness,
          listeningDisc.clearcoatRoughness,
          b,
        );
        if (!lowPower) {
          const ir = THREE.MathUtils.lerp(0, listeningDisc.iridescence, b);
          m.iridescence = ir;
          m.iridescenceIOR = THREE.MathUtils.lerp(
            1.0,
            listeningDisc.iridescenceIOR,
            b,
          );
          if (ir > 0.001) {
            m.iridescenceThicknessRange = [
              THREE.MathUtils.lerp(100, 120, b),
              THREE.MathUtils.lerp(400, 480, b),
            ];
          }
          m.anisotropy = THREE.MathUtils.lerp(0, listeningDisc.anisotropy, b);
          m.anisotropyRotation = THREE.MathUtils.lerp(
            0,
            listeningDisc.anisotropyRotation,
            b,
          );
        }
        m.envMapIntensity = THREE.MathUtils.lerp(
          1,
          listeningDisc.envMapIntensity,
          b,
        );
      }
    };

    const applyRim = (
      m: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
    ) => {
      m.color.copy(baseRim).lerp(targetRim, b);
      m.metalness = THREE.MathUtils.lerp(0.15, listeningDisc.rimMetalness, b);
      m.roughness = THREE.MathUtils.lerp(0.3, listeningDisc.rimRoughness, b);
      if (m instanceof THREE.MeshPhysicalMaterial) {
        m.clearcoat = THREE.MathUtils.lerp(1, 1, b);
        m.clearcoatRoughness = THREE.MathUtils.lerp(0.15, 0.12, b);
        m.envMapIntensity = THREE.MathUtils.lerp(1, listeningDisc.envMapIntensity, b);
      }
    };

    if (faceMatRef.current) applyFace(faceMatRef.current);
    if (faceBackMatRef.current) applyFace(faceBackMatRef.current);
    if (rimMatRef.current) applyRim(rimMatRef.current);
  });

  return (
    <group>
      <mesh
        geometry={faceGeometry}
        position={[0, halfThickness, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        {lowPower ? (
          <meshStandardMaterial
            ref={faceMatRef}
            map={grooveColor}
            roughnessMap={grooveRoughness}
            roughness={disc.faceRoughness + 0.05}
            metalness={disc.faceMetalness}
            color={disc.baseColor}
          />
        ) : (
          <meshPhysicalMaterial
            ref={faceMatRef}
            map={grooveColor}
            roughnessMap={grooveRoughness}
            roughness={disc.faceRoughness}
            metalness={disc.faceMetalness}
            clearcoat={disc.clearcoat}
            clearcoatRoughness={disc.clearcoatRoughness}
            color={disc.baseColor}
          />
        )}
      </mesh>
      <mesh
        geometry={faceGeometry}
        position={[0, -halfThickness, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        {lowPower ? (
          <meshStandardMaterial
            ref={faceBackMatRef}
            map={grooveColor}
            roughnessMap={grooveRoughness}
            roughness={disc.faceRoughness + 0.05}
            metalness={disc.faceMetalness}
            color={disc.baseColor}
          />
        ) : (
          <meshPhysicalMaterial
            ref={faceBackMatRef}
            map={grooveColor}
            roughnessMap={grooveRoughness}
            roughness={disc.faceRoughness}
            metalness={disc.faceMetalness}
            clearcoat={disc.clearcoat}
            clearcoatRoughness={disc.clearcoatRoughness}
            color={disc.baseColor}
          />
        )}
      </mesh>
      <mesh geometry={rimGeometry} castShadow>
        {lowPower ? (
          <meshStandardMaterial
            ref={rimMatRef}
            color={disc.rimColor}
            roughness={0.35}
            metalness={0.15}
          />
        ) : (
          <meshPhysicalMaterial
            ref={rimMatRef}
            color={disc.rimColor}
            roughness={0.3}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        )}
      </mesh>
      <mesh geometry={holeGeometry}>
        <meshStandardMaterial
          color="#6a6e74"
          roughness={0.75}
          metalness={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
