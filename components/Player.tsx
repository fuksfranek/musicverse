"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

import { mapHoldToPortalProgress } from "@/lib/portal/portalHoldEasing";
import {
  animateListeningMusicProgress,
  primeMusicversumAudio,
  restartListeningMusicFromZero,
  setListeningMusicProgress,
  setListeningMusicPlaying,
  startListeningCloseHoldSound,
  startListeningEntryScratchHoldSound,
  stopListeningMusic,
  type PressBoundSound,
} from "@/lib/sound/musicversumSfx";
import { tracks } from "@/lib/tracks";
import { usePullInput } from "@/lib/usePullInput";
import { useVinylControls } from "@/lib/useVinylControls";
import { usePortalTrigger } from "@/lib/usePortalTrigger";
import ChromeFrame from "@/components/ui/ChromeFrame";
import GooeyText from "@/components/ui/GooeyText";
import ListeningOverlay from "@/components/ui/ListeningOverlay";
import CreaturaCanvas from "@/components/listening/CreaturaCanvas";
import VinylCanvas from "@/components/vinyl/VinylCanvas";
import PortalCanvas from "@/components/vinyl/PortalCanvas";
import Vinyl, {
  type VinylHandle,
  type VinylMode,
} from "@/components/vinyl/Vinyl";

/*
 * Pull: idle → pulling → releasing | flight — rubberband Y, then GSAP toss/flip + GooeyText swap.
 * Portal: fullscreen shader quad behind the vinyl; hold depth drives portal (no separate commit tween).
 * Modes: browse ⇄ charging → commit-flip → listening; exit-charging / diving-out return to browse.
 * prefers-reduced-motion: skip heavy shader / flip; short opacity crossfades instead.
 */

const PULL = {
  thresholdPx: 280,
  saturationPx: 300,
  worldScale: 0.0035,
  snapBackDuration: 0.32,
  snapBackEase: "power3.out",
};

const FLIGHT = {
  tossY: 0.55,
  tossDuration: 0.35,
  tossEase: "back.out(1.1)",
  flipTurns: Math.PI * 2,
  flipDuration: 0.6,
  flipEase: "power1.inOut",
  rollPeak: 0.32,
  yawPeak: 0.22,
  wobbleEase: "sine.inOut",
  settleStart: 0.35,
  settleDuration: 0.35,
  settleEase: "power2.in",
  cooldownMs: 150,
};

const TEXT_TRANSITION_DURATION = 0.6;
const LISTENING_MUSIC_ENTRY_START_PROGRESS = 0.09;
const LISTENING_MUSIC_ENTRY_HOLD_TARGET_PROGRESS = 0.68;

type PullState = "idle" | "pulling" | "releasing" | "flight";
type Mode =
  | "browse"
  | "charging"
  | "commit-flip"
  | "listening"
  | "exit-charging"
  | "diving-out";

function rubberband(rawPx: number) {
  const sign = Math.sign(rawPx);
  const abs = Math.abs(rawPx);
  const damped = abs / (1 + abs / PULL.saturationPx);
  return sign * damped * PULL.worldScale;
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Player() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<Mode>("browse");
  const [portalSeed, setPortalSeed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const indexRef = useRef(0);
  const stateRef = useRef<PullState>("idle");
  const pullAccumRef = useRef(0);
  const lockRef = useRef(false);
  const cooldownUntilRef = useRef(0);

  const modeRef = useRef<Mode>("browse");
  const portalProgressRef = useRef(0);
  const chargeProgressRef = useRef(0);
  const portalDriver = useRef({ v: 0 }).current;
  const exitStopRef = useRef<() => void>(() => {});
  const vinylRef = useRef<VinylHandle>(null);
  const browseChromeRef = useRef<HTMLDivElement>(null);
  const browseTextRef = useRef<HTMLDivElement>(null);

  const listeningCloseHoldSoundRef = useRef<PressBoundSound | null>(null);
  const listeningEntryScratchSoundRef = useRef<PressBoundSound | null>(null);

  const controls = useVinylControls();
  const { portal } = controls;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    void primeMusicversumAudio();
    const primeOnFirstPointer = () => void primeMusicversumAudio();
    document.addEventListener("pointerdown", primeOnFirstPointer, { once: true });
    return () =>
      document.removeEventListener("pointerdown", primeOnFirstPointer);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const runFlight = useCallback((dir: 1 | -1) => {
    const vinyl = vinylRef.current;
    if (!vinyl) return;

    const nextIdx =
      (indexRef.current + dir + tracks.length) % tracks.length;

    const prefersReduced = prefersReducedMotion();

    stateRef.current = "flight";
    lockRef.current = true;
    pullAccumRef.current = 0;
    gsap.killTweensOf(vinyl.group.position);

    setIndex(nextIdx);

    if (prefersReduced) {
      vinyl.group.position.y = 0;
      stateRef.current = "idle";
      lockRef.current = false;
      cooldownUntilRef.current = performance.now() + FLIGHT.cooldownMs;
      return;
    }

    const group = vinyl.group;

    const tl = gsap.timeline({
      onComplete: () => {
        group.rotation.x = 0;
        group.rotation.y = 0;
        group.rotation.z = 0;
        stateRef.current = "idle";
        lockRef.current = false;
        cooldownUntilRef.current = performance.now() + FLIGHT.cooldownMs;
      },
    });

    const halfFlight = FLIGHT.flipDuration / 2;

    tl.to(
      group.position,
      { y: FLIGHT.tossY, duration: FLIGHT.tossDuration, ease: FLIGHT.tossEase },
      0,
    )
      .to(
        group.rotation,
        {
          x: `+=${FLIGHT.flipTurns}`,
          duration: FLIGHT.flipDuration,
          ease: FLIGHT.flipEase,
        },
        0,
      )
      .to(
        group.rotation,
        {
          z: dir * FLIGHT.rollPeak,
          duration: halfFlight,
          ease: FLIGHT.wobbleEase,
        },
        0,
      )
      .to(
        group.rotation,
        { z: 0, duration: halfFlight, ease: FLIGHT.wobbleEase },
        halfFlight,
      )
      .to(
        group.rotation,
        {
          y: dir * FLIGHT.yawPeak,
          duration: halfFlight,
          ease: FLIGHT.wobbleEase,
        },
        0,
      )
      .to(
        group.rotation,
        { y: 0, duration: halfFlight, ease: FLIGHT.wobbleEase },
        halfFlight,
      )
      .to(
        group.position,
        {
          y: 0,
          duration: FLIGHT.settleDuration,
          ease: FLIGHT.settleEase,
        },
        FLIGHT.settleStart,
      );
  }, []);

  const snapBack = useCallback(() => {
    const vinyl = vinylRef.current;
    if (!vinyl) return;
    stateRef.current = "releasing";
    pullAccumRef.current = 0;
    gsap.killTweensOf(vinyl.group.position);
    gsap.to(vinyl.group.position, {
      y: 0,
      duration: PULL.snapBackDuration,
      ease: PULL.snapBackEase,
      onComplete: () => {
        if (stateRef.current === "releasing") stateRef.current = "idle";
      },
    });
  }, []);

  const handlePull = useCallback(
    (deltaPx: number) => {
      const vinyl = vinylRef.current;
      if (!vinyl) return;
      if (stateRef.current === "flight") return;
      if (performance.now() < cooldownUntilRef.current) return;
      if (modeRef.current !== "browse") return;

      if (stateRef.current === "releasing") {
        gsap.killTweensOf(vinyl.group.position);
      }
      stateRef.current = "pulling";

      pullAccumRef.current -= deltaPx;
      const accum = pullAccumRef.current;

      if (Math.abs(accum) >= PULL.thresholdPx) {
        runFlight(accum > 0 ? 1 : -1);
        return;
      }

      vinyl.group.position.y = -rubberband(accum);
    },
    [runFlight],
  );

  const handleRelease = useCallback(() => {
    if (stateRef.current === "pulling") snapBack();
  }, [snapBack]);

  const handleInstant = useCallback(
    (dir: 1 | -1) => {
      if (stateRef.current === "flight") return;
      if (performance.now() < cooldownUntilRef.current) return;
      if (modeRef.current !== "browse") return;
      runFlight(dir);
    },
    [runFlight],
  );

  usePullInput({
    onPull: handlePull,
    onRelease: handleRelease,
    onInstant: handleInstant,
    isBlocked: () =>
      stateRef.current === "flight" ||
      modeRef.current !== "browse" ||
      performance.now() < cooldownUntilRef.current,
  });

  const killPortalTweens = useCallback(() => {
    gsap.killTweensOf(portalDriver);
    gsap.killTweensOf(chargeProgressRef);
  }, [portalDriver]);

  const stopListeningCloseHoldSound = useCallback((fadeMs?: number) => {
    listeningCloseHoldSoundRef.current?.stop(fadeMs);
    listeningCloseHoldSoundRef.current = null;
  }, []);

  const stopListeningEntryScratchSound = useCallback((fadeMs?: number) => {
    listeningEntryScratchSoundRef.current?.stop(fadeMs);
    listeningEntryScratchSoundRef.current = null;
  }, []);

  const cancelCharge = useCallback(() => {
    killPortalTweens();
    const from = portalDriver.v;
    const duration = Math.max(0.25, from * 0.6);
    gsap.to(portalDriver, {
      v: 0,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        portalProgressRef.current = portalDriver.v;
        setListeningMusicProgress(
          portalDriver.v * LISTENING_MUSIC_ENTRY_HOLD_TARGET_PROGRESS,
        );
      },
      onComplete: () => {
        portalDriver.v = 0;
        portalProgressRef.current = 0;
        setListeningMusicProgress(0);
        stopListeningMusic(0);
        if (modeRef.current === "charging") setMode("browse");
      },
    });
    gsap.to(chargeProgressRef, {
      current: 0,
      duration,
      ease: "power3.out",
    });
  }, [killPortalTweens, portalDriver]);

  const cancelExitCharge = useCallback(() => {
    killPortalTweens();
    const from = portalDriver.v;
    const duration = Math.max(0.2, (1 - from) * 0.45);
    gsap.to(portalDriver, {
      v: 1,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        portalProgressRef.current = portalDriver.v;
        setListeningMusicProgress(portalDriver.v);
      },
      onComplete: () => {
        portalDriver.v = 1;
        portalProgressRef.current = 1;
        setListeningMusicProgress(1);
        if (modeRef.current === "exit-charging") setMode("listening");
      },
    });
    gsap.to(chargeProgressRef, {
      current: 0,
      duration,
      ease: "power3.out",
    });
  }, [killPortalTweens, portalDriver]);

  const commitToListening = useCallback(() => {
    killPortalTweens();
    portalDriver.v = 1;
    portalProgressRef.current = 1;
    chargeProgressRef.current = 0;
    animateListeningMusicProgress(
      1,
      reducedMotion ? 0 : portal.commitFlip.duration * 1000,
    );
    if (reducedMotion) {
      setMode("listening");
      lockRef.current = false;
      return;
    }
    lockRef.current = true;
    setMode("commit-flip");
  }, [killPortalTweens, portal.commitFlip.duration, portalDriver, reducedMotion]);

  const handleCommitFlipComplete = useCallback(() => {
    setListeningMusicProgress(1);
    setMode("listening");
    lockRef.current = false;
  }, []);

  const diveOut = useCallback(() => {
    exitStopRef.current();
    killPortalTweens();

    lockRef.current = true;
    setMode("diving-out");

    const reduced = prefersReducedMotion();

    if (reduced) {
      portalDriver.v = 0;
      portalProgressRef.current = 0;
      setListeningMusicProgress(0);
      stopListeningMusic(0);
      setMode("browse");
      lockRef.current = false;
      return;
    }

    gsap.to(portalDriver, {
      v: 0,
      duration: portal.exitDiveDuration,
      ease: portal.diveEaseOut,
      onUpdate: () => {
        portalProgressRef.current = portalDriver.v;
        setListeningMusicProgress(portalDriver.v);
      },
      onComplete: () => {
        portalDriver.v = 0;
        portalProgressRef.current = 0;
        setListeningMusicProgress(0);
        stopListeningMusic(0);
        lockRef.current = false;
        setMode("browse");
      },
    });
  }, [killPortalTweens, portal.exitDiveDuration, portal.diveEaseOut, portalDriver]);

  const exitTrigger = usePortalTrigger({
    holdMs: portal.exitHoldMs,
    isBlocked: () =>
      modeRef.current !== "listening" || stateRef.current === "flight",
    onChargeStart: () => {
      killPortalTweens();
      setListeningMusicProgress(1);
      stopListeningCloseHoldSound(0);
      listeningCloseHoldSoundRef.current = startListeningCloseHoldSound({
        reducedMotion,
      });
      setMode("exit-charging");
    },
    onChargeTick: (p01) => {
      const eased = mapHoldToPortalProgress(p01, portal.holdEasing);
      chargeProgressRef.current = eased;
      const v = 1 - eased;
      portalDriver.v = v;
      portalProgressRef.current = v;
      setListeningMusicProgress(v);
    },
    onCancel: () => {
      stopListeningCloseHoldSound();
      cancelExitCharge();
    },
    onCommit: () => {
      stopListeningCloseHoldSound();
      diveOut();
    },
  });

  useEffect(() => {
    exitStopRef.current = exitTrigger.stop;
  }, [exitTrigger.stop]);

  useLayoutEffect(() => {
    let id = 0;
    const A11Y_HIDE_BELOW = 0.05;

    const tick = () => {
      const p = Math.min(1, Math.max(0, portalProgressRef.current));
      const opacity = 1 - p;
      for (const el of [browseChromeRef.current, browseTextRef.current]) {
        if (!el) continue;
        el.style.opacity = String(opacity);
        el.setAttribute(
          "aria-hidden",
          opacity < A11Y_HIDE_BELOW ? "true" : "false",
        );
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const portalTrigger = usePortalTrigger({
    holdMs: portal.holdMs,
    isBlocked: () => modeRef.current !== "browse" || stateRef.current === "flight",
    onChargeStart: () => {
      stopListeningEntryScratchSound(0);
      listeningEntryScratchSoundRef.current = startListeningEntryScratchHoldSound({
        reducedMotion,
      });
      killPortalTweens();
      stopListeningMusic(0);
      restartListeningMusicFromZero(
        isPlaying,
        LISTENING_MUSIC_ENTRY_START_PROGRESS,
      );
      setPortalSeed((s) => s + 1);
      setMode("charging");
    },
    onChargeTick: (p01) => {
      const eased = mapHoldToPortalProgress(p01, portal.holdEasing);
      chargeProgressRef.current = eased;
      portalDriver.v = eased;
      portalProgressRef.current = eased;
      setListeningMusicProgress(
        LISTENING_MUSIC_ENTRY_START_PROGRESS +
          eased *
            (LISTENING_MUSIC_ENTRY_HOLD_TARGET_PROGRESS -
              LISTENING_MUSIC_ENTRY_START_PROGRESS),
      );
    },
    onCancel: () => {
      stopListeningEntryScratchSound();
      cancelCharge();
    },
    onCommit: () => {
      stopListeningEntryScratchSound();
      commitToListening();
    },
  });

  const handleBack = useCallback(() => {
    if (
      modeRef.current !== "listening" &&
      modeRef.current !== "exit-charging"
    ) {
      return;
    }
    stopListeningCloseHoldSound();
    diveOut();
  }, [diveOut, stopListeningCloseHoldSound]);

  useEffect(
    () => () => {
      stopListeningCloseHoldSound(0);
      stopListeningEntryScratchSound(0);
      stopListeningMusic(0);
    },
    [stopListeningCloseHoldSound, stopListeningEntryScratchSound],
  );

  useEffect(() => {
    if (mode !== "browse") {
      setListeningMusicPlaying(isPlaying);
    }
  }, [isPlaying, mode]);

  const onTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const track = tracks[index];
  const showListening = mode === "listening" || mode === "exit-charging";
  const vinylHalation =
    showListening || mode === "commit-flip" || mode === "diving-out";

  return (
    <main className="musicversum-stage relative h-dvh w-full overflow-hidden">
      <div ref={browseChromeRef} className="opacity-100">
        <ChromeFrame
          isPlaying={isPlaying}
          elapsed={formatElapsed(elapsed)}
          onTogglePlay={onTogglePlay}
        />
      </div>

      <div className="absolute inset-0 z-10">
        <PortalCanvas
          portalProgressRef={portalProgressRef}
          portalSeed={portalSeed}
          baseColor={portal.baseColor}
          targetColor={track.labelColor}
          shader={portal.shader}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[12]"
        style={{ mixBlendMode: "multiply" }}
      >
        <CreaturaCanvas
          active={
            mode === "listening" ||
            mode === "commit-flip" ||
            mode === "exit-charging" ||
            mode === "charging" ||
            mode === "diving-out"
          }
          intensityRef={portalProgressRef}
          reducedMotion={reducedMotion}
        />
      </div>

      <div
        ref={browseTextRef}
        className="pointer-events-none absolute inset-0 z-[16] flex flex-col items-center justify-center gap-3 px-5 opacity-100 sm:gap-4 sm:px-8"
      >
        <div
          className="max-w-[92vw] text-center font-display font-medium italic text-black"
          style={{
            fontSize: "clamp(44px, 7.4vw, 116px)",
            lineHeight: 0.94,
            letterSpacing: 0,
          }}
        >
          <GooeyText text={track.title} duration={TEXT_TRANSITION_DURATION} />
        </div>

        <div
          aria-hidden
          style={{
            width: "min(43vh, 39vw, 500px)",
            aspectRatio: "1 / 1",
          }}
        />

        <div
          className="max-w-[92vw] text-center font-display font-medium italic text-black"
          style={{
            fontSize: "clamp(40px, 6.8vw, 104px)",
            lineHeight: 0.96,
            letterSpacing: 0,
          }}
        >
          <GooeyText text={track.artist} duration={TEXT_TRANSITION_DURATION} />
        </div>
      </div>

      <div
        className="transition-opacity duration-200"
        style={{ opacity: showListening ? 1 : 0 }}
        aria-hidden={!showListening}
      >
        <ListeningOverlay
          elapsed={formatElapsed(elapsed)}
          isPlaying={isPlaying}
          onBack={handleBack}
          onTogglePlay={onTogglePlay}
        />
      </div>

      <div className="absolute inset-0 z-20">
        <VinylCanvas
          controls={controls}
          listening={showListening}
          halation={vinylHalation}
        >
          <Vinyl
            labelColor={track.labelColor}
            lockRef={lockRef}
            pullAccumRef={pullAccumRef}
            controls={controls}
            mode={mode as VinylMode}
            chargeProgressRef={chargeProgressRef}
            portalHandlers={portalTrigger.handlers}
            listeningExitHandlers={exitTrigger.handlers}
            onCommitFlipComplete={handleCommitFlipComplete}
            reducedMotion={reducedMotion}
            ref={vinylRef}
          />
        </VinylCanvas>
      </div>
    </main>
  );
}
