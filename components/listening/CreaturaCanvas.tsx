"use client";

import { useEffect, useRef, type RefObject } from "react";

import {
  getListeningAnalyser,
  getListeningAudioContext,
} from "@/lib/sound/musicversumSfx";
import { createCreaturaGL, type CreaturaGL } from "./creaturaGL";

const FRAME_RATE = 24;
const FRAME_DURATION = 1000 / FRAME_RATE;
const WASM_URL = "/wasm/creatura.wasm";
// The wasm canvas is rendered at the viewport's aspect ratio (capped to this
// max dim) so its NDC space maps directly to the visible frame — audio
// reactivity covers the whole canvas at the right ratio with no stretching.
const WASM_MAX_DIM = 720;
const MAX_DPR = 2;

function pickWasmDims(displayW: number, displayH: number) {
  const w = Math.max(1, displayW);
  const h = Math.max(1, displayH);
  const scale = WASM_MAX_DIM / Math.max(w, h);
  return {
    w: Math.max(64, Math.round(w * scale)),
    h: Math.max(64, Math.round(h * scale)),
  };
}

type CreaturaExports = {
  memory: WebAssembly.Memory;
  init: (width: number, height: number) => void;
  /** `mouseX/Y` are kept for compatibility with the wasm signature, but JS now
   * passes audio-derived coordinates instead of pointer position. */
  go: (mouseX: number, mouseY: number) => number;
  setEnergy?: (low: number, mid: number, high: number) => void;
  setDensity?: (d: number) => void;
  setSpeedScale?: (s: number) => void;
  setIntensity?: (i: number) => void;
  deinit?: () => void;
};

type Props = {
  /** Whether the listening view is currently visible enough to animate. */
  active: boolean;
  /** 0..1 driver shared with the portal (fades the background in/out). */
  intensityRef: RefObject<number>;
  reducedMotion: boolean;
};

let cachedWasm: Promise<WebAssembly.Instance> | null = null;

function loadWasm(): Promise<WebAssembly.Instance> {
  if (cachedWasm) return cachedWasm;
  cachedWasm = (async () => {
    const response = await fetch(WASM_URL);
    if (!response.ok) {
      throw new Error(`Failed to load Creatura wasm: ${response.status}`);
    }
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        const { instance } = await WebAssembly.instantiateStreaming(response);
        return instance;
      } catch {
        // Fall through to ArrayBuffer path on Safari / file:// quirks.
      }
    }
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    return instance;
  })().catch((err) => {
    cachedWasm = null;
    throw err;
  });
  return cachedWasm;
}

export default function CreaturaCanvas({
  active,
  intensityRef,
  reducedMotion,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live state mirrored into refs so the RAF loop never restarts.
  const activeRef = useRef(active);
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // When activating, prime the AudioContext (it was suspended until a
  // user gesture; the portal hold counts as one).
  useEffect(() => {
    if (!active) return;
    const ctx = getListeningAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let gl: CreaturaGL | null = null;
    let wasmExports: CreaturaExports | null = null;
    let rafId = 0;
    let wasmW = WASM_MAX_DIM;
    let wasmH = WASM_MAX_DIM;

    const syncBackbufferToDisplay = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl?.resize(w, h);
    };

    // Soft radial reveal driven by the same 0..1 portal driver as the portal
    // shader. The wasm clears to white (setup A), so combined with the
    // canvas's `mix-blend-mode: multiply` the dark ink content darkens the
    // portal beneath while the white background passes through unchanged.
    let lastMaskKey = "";
    const applyPortalMask = (progress: number) => {
      const p = Math.min(1, Math.max(0, progress));
      // Below this threshold force the mask fully closed (both stops at 0%)
      // so no stray center pixel leaks through while we're back in browse.
      const innerNum = p < 0.005 ? 0 : p * 110;
      const outerNum = p < 0.005 ? 0 : innerNum + 6;
      const inner = innerNum.toFixed(1);
      const outer = outerNum.toFixed(1);
      const key = `${inner}|${outer}`;
      if (key === lastMaskKey) return;
      lastMaskKey = key;
      const mask = `radial-gradient(circle at 50% 50%, black ${inner}%, transparent ${outer}%)`;
      canvas.style.maskImage = mask;
      canvas.style.webkitMaskImage = mask;
    };

    const energy = { low: 0, mid: 0, high: 0 };
    let lowPeak = 0;
    let midPeak = 0;
    let highPeak = 0;
    let lastFrameTime = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);

      if (!gl || !wasmExports) return;

      const dt = now - lastFrameTime;
      if (dt < FRAME_DURATION) return;
      lastFrameTime = now - (dt % FRAME_DURATION);

      // Keep the mask in sync with the portal driver even while inactive so
      // the canvas closes back to fully transparent the moment we leave the
      // listening view, instead of freezing on the last frame's mask state.
      const portalIntensityForMask = Math.min(
        1,
        Math.max(0, intensityRef.current ?? 0),
      );
      applyPortalMask(portalIntensityForMask);

      if (!activeRef.current) return;

      const analyser = getListeningAnalyser();
      if (analyser) {
        const bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);

        const lowEnd = Math.min(40, bins.length);
        const midEnd = Math.min(100, bins.length);

        let lowSum = 0;
        for (let i = 0; i < lowEnd; i += 1) lowSum += bins[i];
        let midSum = 0;
        for (let i = lowEnd; i < midEnd; i += 1) midSum += bins[i];
        let highSum = 0;
        for (let i = midEnd; i < bins.length; i += 1) highSum += bins[i];

        const lowAvg = lowEnd > 0 ? lowSum / (lowEnd * 255) : 0;
        const midCount = midEnd - lowEnd;
        const midAvg = midCount > 0 ? midSum / (midCount * 255) : 0;
        const highCount = bins.length - midEnd;
        const highAvg = highCount > 0 ? highSum / (highCount * 255) : 0;

        energy.low = energy.low * 0.4 + lowAvg * 0.6;
        energy.mid = energy.mid * 0.4 + midAvg * 0.6;
        energy.high = energy.high * 0.4 + highAvg * 0.6;
      }

      // Fast attack / slow multiplicative release on each band. At 24 fps,
      // 0.85^24 ≈ 0.02 so an envelope clears ~1s after its last hit.
      const drive = (raw: number, peak: number) => {
        const driver = Math.min(1, raw * 2.5);
        return driver > peak ? peak * 0.3 + driver * 0.7 : peak * 0.85;
      };
      lowPeak = drive(energy.low, lowPeak);
      midPeak = drive(energy.mid, midPeak);
      highPeak = drive(energy.high, highPeak);

      // Audio-derived cursor proxy. Wasm consumes a single (x, y) per frame
      // and uses it as points[0] (setup A) or points[14] (B/C):
      //   X — bright music pushes right, bass-heavy pushes left
      //   Y — bass kicks push up, silence settles down
      //   plus a slow ~0.4 Hz breathing drift so it isn't static during
      //   sustained passages
      const breath = Math.sin(now * 0.0004) * 0.15;
      const brightSkew = (highPeak - lowPeak) * 1.5;
      const bassImpulse = lowPeak * 2 - 1;
      let audioX = Math.min(1, Math.max(-1, brightSkew + breath));
      let audioY = Math.min(1, Math.max(-1, bassImpulse * 0.85 - breath * 0.5));
      // Wasm guard: `if (mx != 0 and my != 0)` skips the update if either
      // axis is exactly zero. Floor with a tiny epsilon so the proxy keeps
      // tracking through silence.
      if (audioX === 0) audioX = 0.001;
      if (audioY === 0) audioY = 0.001;

      // Re-light the wasm's audio-reactive path. radiusPulse() reads
      // energy_low (bass pumps circle radii); intensityFactor() reads
      // energy_high (treble sparkles blur + chroma). Density gates the
      // outer orbit rings in setups B/C.
      wasmExports.setEnergy?.(lowPeak, midPeak, highPeak);
      wasmExports.setDensity?.(0.5 + midPeak * 1.5);
      wasmExports.setSpeedScale?.(1.0);
      wasmExports.setIntensity?.(portalIntensityForMask);

      const ptr = wasmExports.go(audioX, audioY);
      const pixels = new Uint8Array(
        wasmExports.memory.buffer,
        ptr,
        wasmW * wasmH * 4,
      );
      gl.uploadFrame(pixels);
      gl.draw();
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncBackbufferToDisplay())
        : null;
    resizeObserver?.observe(canvas);
    const onWindowResize = () => syncBackbufferToDisplay();
    window.addEventListener("resize", onWindowResize);

    void (async () => {
      try {
        const instance = await loadWasm();
        if (disposed) return;
        wasmExports = instance.exports as unknown as CreaturaExports;

        // Pick a wasm canvas that matches the viewport's aspect ratio so its
        // NDC space (which is where the audio drives all the points) maps
        // 1:1 to the visible frame. We sample the texture without any
        // cover-fit cropping, so the reactive content fills the whole canvas.
        const initialW =
          canvas.clientWidth || window.innerWidth || WASM_MAX_DIM;
        const initialH =
          canvas.clientHeight || window.innerHeight || WASM_MAX_DIM;
        const dims = pickWasmDims(initialW, initialH);
        wasmW = dims.w;
        wasmH = dims.h;
        wasmExports.init(wasmW, wasmH);

        canvas.width = canvas.clientWidth || wasmW;
        canvas.height = canvas.clientHeight || wasmH;
        gl = createCreaturaGL(canvas, wasmW, wasmH);
        if (!gl) {
          console.warn("Creatura: WebGL unavailable, skipping background");
          return;
        }
        syncBackbufferToDisplay();

        if (reducedMotionRef.current) {
          // One static frame, no RAF loop.
          const ptr = wasmExports.go(0.001, 0.001);
          const pixels = new Uint8Array(
            wasmExports.memory.buffer,
            ptr,
            wasmW * wasmH * 4,
          );
          gl.uploadFrame(pixels);
          gl.draw();
          applyPortalMask(intensityRef.current ?? 0);
          return;
        }

        lastFrameTime = performance.now();
        rafId = requestAnimationFrame(tick);
      } catch (err) {
        console.warn("Creatura init failed:", err);
      }
    })();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      gl?.dispose();
      // Intentionally do not call wasmExports.deinit(): the wasm instance
      // is cached across mounts so re-entering the listening view is fast.
    };
  }, [intensityRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        // Multiply blend lives on the parent wrapper (Player.tsx) so it can
        // composite against the portal. Here we just shape the reveal: a
        // soft radial mask whose radius tracks `portalProgressRef`, updated
        // per frame in applyPortalMask().
        WebkitMaskImage:
          "radial-gradient(circle at 50% 50%, black 0%, transparent 0%)",
        maskImage:
          "radial-gradient(circle at 50% 50%, black 0%, transparent 0%)",
      }}
    />
  );
}
