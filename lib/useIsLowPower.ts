"use client";

import { useSyncExternalStore } from "react";

function detect(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia("(max-width: 768px)").matches;
  const fewCores =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;
  return coarsePointer || narrowViewport || fewCores;
}

function subscribe(onChange: () => void) {
  const coarse = window.matchMedia("(pointer: coarse)");
  const narrow = window.matchMedia("(max-width: 768px)");
  coarse.addEventListener("change", onChange);
  narrow.addEventListener("change", onChange);
  return () => {
    coarse.removeEventListener("change", onChange);
    narrow.removeEventListener("change", onChange);
  };
}

export function useIsLowPower(): boolean {
  return useSyncExternalStore(subscribe, detect, () => false);
}
