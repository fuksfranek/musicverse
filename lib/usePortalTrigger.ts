"use client";

import { useCallback, useEffect, useRef } from "react";

export type PortalTriggerOptions = {
  /** Hold duration before committing the dive. */
  holdMs: number;
  /** Returning true cancels any in-progress charge and rejects new presses. */
  isBlocked?: () => boolean;
  /** Fires on pointerdown (charge started). */
  onChargeStart?: () => void;
  /**
   * Fires every rAF tick while charging with 0..1 representing elapsed/holdMs.
   * Used to ramp the shader's charge preview uniform.
   */
  onChargeTick?: (progress01: number) => void;
  /** Fires when the user releases before `holdMs` has elapsed. */
  onCancel?: () => void;
  /** Fires once when the full hold duration elapses. */
  onCommit?: () => void;
};

export type PortalTriggerHandlers = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
};

export type PortalTrigger = {
  handlers: PortalTriggerHandlers;
  /** Imperatively cancel any active charge (e.g. when leaving the scene). */
  cancel: () => void;
  /** Stop the RAF loop without firing `onCancel` (e.g. before starting dive-out). */
  stop: () => void;
};

export function usePortalTrigger(options: PortalTriggerOptions): PortalTrigger {
  const optsRef = useRef(options);

  useEffect(() => {
    optsRef.current = options;
  });

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    activeRef.current = false;
  }, []);

  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    stop();
    optsRef.current.onCancel?.();
  }, [stop]);

  const onPointerDown = useCallback(() => {
    const opts = optsRef.current;
    if (opts.isBlocked?.()) return;
    if (activeRef.current) return;
    activeRef.current = true;
    startRef.current = performance.now();
    opts.onChargeStart?.();
    opts.onChargeTick?.(0);

    const loop = () => {
      if (!activeRef.current) return;
      const { holdMs, onChargeTick, onCommit } = optsRef.current;
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / holdMs);
      onChargeTick?.(p);
      if (p >= 1) {
        stop();
        onCommit?.();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stop]);

  const onPointerUp = useCallback(() => cancel(), [cancel]);
  const onPointerLeave = useCallback(() => cancel(), [cancel]);
  const onPointerCancel = useCallback(() => cancel(), [cancel]);

  useEffect(() => () => stop(), [stop]);

  return {
    handlers: { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel },
    cancel,
    stop,
  };
}
