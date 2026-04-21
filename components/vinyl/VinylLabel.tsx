"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type VinylLabelProps = {
  color: string;
  lowPower: boolean;
  labelR: number;
  holeR: number;
};

const LABEL_HEIGHT = 0.006;
const CHAMFER = 0.0015;

const SEGMENTS_HIGH = 96;
const SEGMENTS_LOW = 48;

function buildLabelProfile(
  innerR: number,
  outerR: number,
): THREE.Vector2[] {
  return [
    new THREE.Vector2(innerR, 0),
    new THREE.Vector2(outerR - CHAMFER, 0),
    new THREE.Vector2(outerR, CHAMFER),
    new THREE.Vector2(outerR, LABEL_HEIGHT - CHAMFER),
    new THREE.Vector2(outerR - CHAMFER, LABEL_HEIGHT),
    new THREE.Vector2(innerR, LABEL_HEIGHT),
  ];
}

export default function VinylLabel({
  color,
  lowPower,
  labelR,
  holeR,
}: VinylLabelProps) {
  const segments = lowPower ? SEGMENTS_LOW : SEGMENTS_HIGH;
  const paper = useTexture("/textures/texture-vinyl-art.jpg");

  const geometry = useMemo(() => {
    const geom = new THREE.LatheGeometry(
      buildLabelProfile(holeR, labelR),
      segments,
    );
    geom.computeVertexNormals();
    return geom;
  }, [segments, holeR, labelR]);

  const texture = useMemo(() => {
    const t = paper.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [paper]);

  return (
    <mesh geometry={geometry}>
      {lowPower ? (
        <meshStandardMaterial
          color={color}
          map={texture}
          roughness={0.78}
          metalness={0.02}
        />
      ) : (
        <meshPhysicalMaterial
          color={color}
          map={texture}
          roughness={0.72}
          metalness={0.02}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
          sheen={0.3}
          sheenRoughness={0.8}
          sheenColor="#ffffff"
        />
      )}
    </mesh>
  );
}
