"use client";

import gsap from "gsap";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * GooeyText — track-change text transition based on
 * Codrops "Gooey Text Hover Effect", demo 3.
 *   https://github.com/codrops/GooeyTextHoverEffect
 *
 * Design:
 *   Two permanent slot elements stacked in one grid cell.
 *   A `shown` pointer marks which slot is currently fully
 *   visible. On a text change:
 *     1. Write the new text into the hidden slot (invisible
 *        because it's at opacity 0, so the DOM write is not
 *        seen).
 *     2. Cross-fade both slots while the wrapper's SVG
 *        filter pulses blur + alpha-threshold, merging the
 *        letters into goo blobs.
 *     3. Flip the `shown` pointer. No text swap at the end,
 *        so no way for stale text to flash.
 *
 * Performance:
 *   • stdDeviation updates are quantised to BLUR_STEP, so
 *     the filter chain is rebuilt only a handful of times
 *     per transition instead of every RAF tick.
 *   • filter: url() + will-change only during the
 *     transition; plain span at rest.
 *   • inline-grid so the wrapper always sizes to the wider
 *     of the two texts (no off-flow clipping on length
 *     differences). Overflow stays visible so italic
 *     descenders and the yPercent tween are not clipped.
 * ───────────────────────────────────────────────────────── */

type Slot = "A" | "B";
type Pending = { from: Slot; to: Slot };

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 18 -8";
const BLUR_STEP = 0.05;

type GooeyTextProps = {
  text: string;
  className?: string;
  duration?: number;
  peakBlur?: number;
  peakSoftBlur?: number;
};

export default function GooeyText({
  text,
  className,
  duration = 0.6,
  peakBlur = 1,
  peakSoftBlur = 0.8,
}: GooeyTextProps) {
  const rawId = useId();
  const filterId = `goo-${rawId.replace(/:/g, "")}`;

  const [textA, setTextA] = useState<string>(text);
  const [textB, setTextB] = useState<string>("");
  const [shown, setShown] = useState<Slot>("A");
  const [pending, setPending] = useState<Pending | null>(null);

  const lastTextRef = useRef<string>(text);
  const shownRef = useRef<Slot>("A");

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const slotARef = useRef<HTMLSpanElement>(null);
  const slotBRef = useRef<HTMLSpanElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Config read by the transition effect. Kept in refs so changing them
  // doesn't re-run the effect mid-transition and doesn't grow the dep array.
  const filterIdRef = useRef(filterId);
  const durationRef = useRef(duration);
  const peakBlurRef = useRef(peakBlur);
  const peakSoftBlurRef = useRef(peakSoftBlur);

  useLayoutEffect(() => {
    filterIdRef.current = filterId;
    durationRef.current = duration;
    peakBlurRef.current = peakBlur;
    peakSoftBlurRef.current = peakSoftBlur;
  }, [filterId, duration, peakBlur, peakSoftBlur]);

  useEffect(() => {
    if (text === lastTextRef.current) return;
    lastTextRef.current = text;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const from = shownRef.current;
      const to: Slot = from === "A" ? "B" : "A";
      if (to === "A") setTextA(text);
      else setTextB(text);
      shownRef.current = to;
      setShown(to);
      setPending(null);
      return;
    }

    if (tlRef.current) {
      tlRef.current.progress(1, false);
    }

    const from = shownRef.current;
    const to: Slot = from === "A" ? "B" : "A";
    if (to === "A") setTextA(text);
    else setTextB(text);
    setPending({ from, to });
  }, [text]);

  useLayoutEffect(() => {
    if (!pending) return;
    const { from, to } = pending;
    const fromEl = from === "A" ? slotARef.current : slotBRef.current;
    const toEl = to === "A" ? slotARef.current : slotBRef.current;
    const wrap = wrapperRef.current;
    if (!fromEl || !toEl || !wrap || !blurRef.current) return;

    const currentFilterId = filterIdRef.current;
    const currentDuration = durationRef.current;
    const currentPeakBlur = peakBlurRef.current;
    const currentPeakSoftBlur = peakSoftBlurRef.current;

    wrap.style.willChange = "filter";
    wrap.style.filter = `url(#${currentFilterId})`;

    gsap.set(fromEl, { opacity: 1, yPercent: 0 });
    gsap.set(toEl, { opacity: 0, yPercent: 6 });

    const blurState = { v: 0 };
    const half = currentDuration / 2;
    const softScale =
      currentPeakBlur > 0 ? currentPeakSoftBlur / currentPeakBlur : 0;
    let lastStep = -1;

    const tl = gsap.timeline({
      onUpdate: () => {
        const step = Math.round(blurState.v / BLUR_STEP);
        if (step === lastStep) return;
        lastStep = step;
        const goo = step * BLUR_STEP;
        blurRef.current?.setAttribute("stdDeviation", String(goo));
        if (wrap && softScale > 0) {
          const soft = (goo * softScale).toFixed(2);
          wrap.style.filter = `url(#${currentFilterId}) blur(${soft}px)`;
        }
      },
      onComplete: () => {
        blurRef.current?.setAttribute("stdDeviation", "0");
        if (wrap) {
          wrap.style.filter = "none";
          wrap.style.willChange = "auto";
        }
        shownRef.current = to;
        setShown(to);
        setPending(null);
        tlRef.current = null;
      },
    });

    // Blur rises quickly so the goo is visible right at the start of the
    // morph, then decays more gently through the second half.
    tl.to(
      blurState,
      { v: currentPeakBlur, duration: half, ease: "power2.out" },
      0,
    ).to(blurState, { v: 0, duration: half, ease: "power2.in" }, half)
      .to(
        fromEl,
        {
          opacity: 0,
          yPercent: -6,
          duration: currentDuration,
          ease: "power1.inOut",
        },
        0,
      )
      .to(
        toEl,
        {
          opacity: 1,
          yPercent: 0,
          duration: currentDuration,
          ease: "power1.inOut",
        },
        0,
      );

    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
      if (wrap) {
        wrap.style.filter = "none";
        wrap.style.willChange = "auto";
      }
    };
  }, [pending]);

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{
        display: "inline-grid",
        gridTemplateAreas: '"stack"',
        justifyItems: "center",
        alignItems: "center",
        whiteSpace: "nowrap",
        overflow: "visible",
      }}
      aria-label={text}
    >
      <svg
        width="0"
        height="0"
        aria-hidden
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter
            id={filterId}
            x="-4%"
            y="-20%"
            width="108%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              ref={blurRef}
              in="SourceGraphic"
              stdDeviation="0"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values={GOO_MATRIX}
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <span
        ref={slotARef}
        aria-hidden
        style={{
          gridArea: "stack",
          display: "inline-block",
          opacity: shown === "A" ? 1 : 0,
        }}
      >
        {textA}
      </span>
      <span
        ref={slotBRef}
        aria-hidden
        style={{
          gridArea: "stack",
          display: "inline-block",
          opacity: shown === "B" ? 1 : 0,
        }}
      >
        {textB}
      </span>
    </span>
  );
}
