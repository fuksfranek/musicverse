"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

import { useIsLowPower } from "@/lib/useIsLowPower";
import type { VinylControls } from "@/lib/useVinylControls";
import type { PortalTriggerHandlers } from "@/lib/usePortalTrigger";
import VinylDisc from "./VinylDisc";
import VinylLabel from "./VinylLabel";

export type VinylHandle = {
  group: THREE.Group;
};

export type VinylMode =
  | "browse"
  | "charging"
  | "commit-flip"
  | "listening"
  | "exit-charging"
  | "diving-out";

type VinylProps = {
  labelColor: string;
  lockRef: MutableRefObject<boolean>;
  pullAccumRef: MutableRefObject<number>;
  controls: VinylControls;
  mode: VinylMode;
  chargeProgressRef: MutableRefObject<number>;
  portalHandlers: PortalTriggerHandlers;
  /** Hold-to-exit (same easing as opening) while in listening / exit-charging. */
  listeningExitHandlers: PortalTriggerHandlers;
  onCommitFlipComplete?: () => void;
  /** When true, skip flip animation (parent jumps straight to listening). */
  reducedMotion?: boolean;
};

const TILT_LERP = 0.08;
const PORTAL_TILT_LERP = 0.05;
const SPIN_LERP = 0.12;
const SCALE_LERP = 0.18;

const Vinyl = forwardRef<VinylHandle, VinylProps>(function Vinyl(
  {
    labelColor,
    lockRef,
    pullAccumRef,
    controls,
    mode,
    chargeProgressRef,
    portalHandlers,
    listeningExitHandlers,
    onCommitFlipComplete,
    reducedMotion = false,
  },
  ref,
) {
  const groupRef = useRef<THREE.Group>(null);
  const pressRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const flipGroupRef = useRef<THREE.Group>(null);
  const spinSpeedRef = useRef(controls.motion.spinBase);
  const metalBlendRef = useRef(0);
  const metalDriver = useRef({ v: 0 }).current;
  const modeRef = useRef(mode);

  const { viewport } = useThree();
  const scale =
    Math.min(viewport.width, viewport.height) * controls.motion.discFraction;
  const lowPower = useIsLowPower();

  const halfThickness = controls.disc.thickness / 2;
  const { portal } = controls;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return groupRef.current as THREE.Group;
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    if (mode !== "commit-flip") return;
    const flip = flipGroupRef.current;
    if (!flip) return;

    gsap.killTweensOf(flip.rotation);
    gsap.killTweensOf(metalDriver);
    flip.rotation.x = 0;
    metalDriver.v = 0;
    metalBlendRef.current = 0;

    const dur = portal.commitFlip.duration;
    const ease = portal.commitFlip.ease;
    const targetX = portal.commitFlip.turns * Math.PI * 2;

    let alive = true;
    const tl = gsap.timeline({
      onComplete: () => {
        if (!alive) return;
        metalBlendRef.current = 1;
        metalDriver.v = 1;
        onCommitFlipComplete?.();
      },
    });
    tl.to(flip.rotation, { x: targetX, duration: dur, ease }, 0);
    tl.to(
      metalDriver,
      {
        v: 1,
        duration: dur,
        ease,
        onUpdate: () => {
          metalBlendRef.current = metalDriver.v;
        },
      },
      0,
    );

    return () => {
      alive = false;
      tl.kill();
    };
  }, [mode, onCommitFlipComplete, portal.commitFlip, metalDriver]);

  useEffect(() => {
    if (!reducedMotion || mode !== "listening") return;
    metalBlendRef.current = 1;
    metalDriver.v = 1;
    const flip = flipGroupRef.current;
    if (flip) flip.rotation.x = portal.commitFlip.turns * Math.PI * 2;
  }, [mode, reducedMotion, metalDriver, portal.commitFlip.turns]);

  useLayoutEffect(() => {
    if (mode !== "diving-out") return;
    const flip = flipGroupRef.current;
    if (!flip) return;

    gsap.killTweensOf(flip.rotation);
    gsap.killTweensOf(metalDriver);
    metalDriver.v = metalBlendRef.current;

    const dur = portal.exitFlipDuration;
    const ease = portal.exitFlipEase;

    gsap.to(flip.rotation, { x: 0, duration: dur, ease });
    gsap.to(metalDriver, {
      v: 0,
      duration: dur,
      ease,
      onUpdate: () => {
        metalBlendRef.current = metalDriver.v;
      },
    });

    return () => {
      gsap.killTweensOf(flip.rotation);
      gsap.killTweensOf(metalDriver);
    };
  }, [mode, portal.exitFlipDuration, portal.exitFlipEase, metalDriver]);

  const pointerHandlers =
    mode === "listening" || mode === "exit-charging"
      ? listeningExitHandlers
      : portalHandlers;

  useFrame((state, delta) => {
    const g = groupRef.current;
    const press = pressRef.current;
    const s = spinRef.current;
    const { motion, portal } = controls;

    const charge = THREE.MathUtils.clamp(chargeProgressRef.current, 0, 1);

    /* ── spin speed ─────────────────────────────────────── */
    let targetSpeed = motion.spinBase;
    if (mode === "listening" || mode === "exit-charging") {
      targetSpeed = portal.listeningSpin;
    } else if (mode === "commit-flip" || mode === "diving-out") {
      /* Only the flipGroup X flip reads as "one flip" — no platter Y spin. */
      targetSpeed = 0;
    } else if (mode === "charging") {
      targetSpeed = THREE.MathUtils.lerp(
        motion.spinBase,
        portal.listeningSpin,
        charge,
      );
    } else {
      const pullBoost = THREE.MathUtils.clamp(
        Math.abs(pullAccumRef.current) / motion.pullTiltScale,
        0,
        1,
      );
      targetSpeed =
        motion.spinBase + pullBoost * (motion.spinScrub - motion.spinBase);
    }
    const useListeningSpinEase =
      mode === "listening" ||
      mode === "exit-charging" ||
      mode === "commit-flip" ||
      mode === "diving-out";
    const spinLerp = useListeningSpinEase
      ? portal.listeningSpinLerp
      : SPIN_LERP;
    spinSpeedRef.current = THREE.MathUtils.lerp(
      spinSpeedRef.current,
      targetSpeed,
      spinLerp,
    );
    if (s) s.rotation.y += spinSpeedRef.current * delta;

    /* ── press scale (push-back on hold) ────────────────── */
    if (press) {
      let targetScale = 1;
      if (mode === "charging" || mode === "exit-charging") {
        targetScale = THREE.MathUtils.lerp(1, portal.pressScale, charge);
      }
      const next = THREE.MathUtils.lerp(
        press.scale.x,
        targetScale,
        SCALE_LERP,
      );
      press.scale.setScalar(next);
    }

    if (!g) return;

    /* ── tilt ───────────────────────────────────────────── */
    if (mode === "listening" || mode === "exit-charging") {
      const lt = portal.listeningTiltLerp;
      const targetX = state.pointer.y * motion.tiltMaxX;
      const targetY = state.pointer.x * motion.tiltMaxY;
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, lt);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, lt);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, lt);
      return;
    }

    if (mode === "commit-flip") {
      g.rotation.x = THREE.MathUtils.lerp(
        g.rotation.x,
        portal.listeningTiltX,
        PORTAL_TILT_LERP,
      );
      g.rotation.y = THREE.MathUtils.lerp(
        g.rotation.y,
        portal.listeningTiltY,
        PORTAL_TILT_LERP,
      );
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, PORTAL_TILT_LERP);
      return;
    }

    if (mode === "charging") {
      const hoverX = state.pointer.y * motion.tiltMaxX;
      const hoverY = state.pointer.x * motion.tiltMaxY;
      const targetX = THREE.MathUtils.lerp(
        hoverX,
        portal.listeningTiltX,
        charge,
      );
      const targetY = THREE.MathUtils.lerp(
        hoverY,
        portal.listeningTiltY,
        charge,
      );
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, TILT_LERP);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, TILT_LERP);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, TILT_LERP);
      return;
    }

    if (mode === "diving-out") {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, PORTAL_TILT_LERP);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, PORTAL_TILT_LERP);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, PORTAL_TILT_LERP);
      return;
    }

    if (lockRef.current) return;

    const pullNorm = THREE.MathUtils.clamp(
      pullAccumRef.current / motion.pullTiltScale,
      -1,
      1,
    );

    const targetX =
      state.pointer.y * motion.tiltMaxX + pullNorm * motion.pullTiltX;
    const targetY = state.pointer.x * motion.tiltMaxY;
    const targetZ = pullNorm * motion.pullTiltZ;

    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, TILT_LERP);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, TILT_LERP);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, targetZ, TILT_LERP);
  });

  return (
    <group
      ref={groupRef}
      scale={scale}
      onPointerDown={pointerHandlers.onPointerDown}
      onPointerUp={pointerHandlers.onPointerUp}
      onPointerLeave={pointerHandlers.onPointerLeave}
      onPointerCancel={pointerHandlers.onPointerCancel}
    >
      <group ref={pressRef}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group ref={spinRef}>
            <group ref={flipGroupRef}>
              <VinylDisc
                lowPower={lowPower}
                disc={controls.disc}
                grooves={controls.grooves}
                listeningDisc={portal.listeningDisc}
                metalBlendRef={metalBlendRef}
              />
              <group position={[0, halfThickness, 0]}>
                <VinylLabel
                  color={labelColor}
                  lowPower={lowPower}
                  labelR={controls.disc.labelR}
                  holeR={controls.disc.holeR}
                />
              </group>
              <group
                position={[0, -halfThickness, 0]}
                rotation={[Math.PI, 0, 0]}
              >
                <VinylLabel
                  color={labelColor}
                  lowPower={lowPower}
                  labelR={controls.disc.labelR}
                  holeR={controls.disc.holeR}
                />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

export default Vinyl;
