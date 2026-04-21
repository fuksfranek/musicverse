"use client";

import { useEffect, useRef } from "react";

type Direction = 1 | -1;

export type PullInputOptions = {
  onPull: (deltaPx: number) => void;
  onRelease: () => void;
  onInstant: (dir: Direction) => void;
  isBlocked: () => boolean;
  releaseDelayMs?: number;
};

const DEFAULT_RELEASE_DELAY = 160;

/** Wheel/touch targets under this subtree keep native scrolling (see portal debug panel). */
const SCROLL_ISLAND = "[data-scroll-island]";

function targetInsideScrollIsland(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(SCROLL_ISLAND) !== null;
}

export function usePullInput(options: PullInputOptions) {
  const optsRef = useRef(options);

  useEffect(() => {
    optsRef.current = options;
  });

  const releaseTimerRef = useRef<number | null>(null);
  const touchLastRef = useRef<number | null>(null);

  useEffect(() => {
    const getOpts = () => optsRef.current;

    const scheduleRelease = () => {
      const delay = getOpts().releaseDelayMs ?? DEFAULT_RELEASE_DELAY;
      if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = window.setTimeout(() => {
        releaseTimerRef.current = null;
        getOpts().onRelease();
      }, delay);
    };

    const cancelRelease = () => {
      if (releaseTimerRef.current) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (targetInsideScrollIsland(e.target)) return;
      e.preventDefault();
      const { isBlocked, onPull } = getOpts();
      if (isBlocked()) return;
      onPull(e.deltaY);
      scheduleRelease();
    };

    const handleKey = (e: KeyboardEvent) => {
      const { isBlocked, onInstant } = getOpts();
      if (isBlocked()) return;
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowRight" ||
        e.key === " " ||
        e.key === "PageDown"
      ) {
        e.preventDefault();
        onInstant(1);
      } else if (
        e.key === "ArrowUp" ||
        e.key === "ArrowLeft" ||
        e.key === "PageUp"
      ) {
        e.preventDefault();
        onInstant(-1);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (targetInsideScrollIsland(e.target)) {
        touchLastRef.current = null;
        return;
      }
      const y = e.touches[0]?.clientY;
      if (y === undefined) return;
      touchLastRef.current = y;
      cancelRelease();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (targetInsideScrollIsland(e.target)) return;
      const { isBlocked, onPull } = getOpts();
      if (isBlocked()) return;
      const y = e.touches[0]?.clientY;
      const last = touchLastRef.current;
      if (y === undefined || last === null) return;
      const delta = last - y;
      touchLastRef.current = y;
      if (delta !== 0) onPull(delta);
    };

    const handleTouchEnd = () => {
      touchLastRef.current = null;
      getOpts().onRelease();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKey);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      if (releaseTimerRef.current) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);
}
