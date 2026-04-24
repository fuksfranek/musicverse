"use client";

type ChromeFrameProps = {
  isPlaying: boolean;
  elapsed: string;
  onTogglePlay: () => void;
};

const chromeLabel =
  "font-sans text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.12em] text-black/72 select-none";

const chromeTextButton =
  "pointer-events-auto cursor-pointer leading-none transition-colors duration-150 hover:text-black";

export default function ChromeFrame({
  isPlaying,
  elapsed,
  onTogglePlay,
}: ChromeFrameProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <span className={`${chromeLabel} absolute left-4 top-4 sm:left-6 sm:top-6 text-[20px] leading-none text-black/82`}>
        [
      </span>
      <span
        className={`${chromeLabel} absolute left-1/2 top-4 max-w-[54vw] -translate-x-1/2 text-center leading-[1.25] sm:top-6`}
      >
        Click and hold to listen
      </span>
      <span
        className={`${chromeLabel} absolute right-4 top-4 sm:right-6 sm:top-6 text-[20px] leading-none text-black/82`}
      >
        ]
      </span>

      <span
        className={`${chromeLabel} absolute left-4 top-1/2 -translate-y-1/2 tabular-nums sm:left-6`}
      >
        {elapsed}
      </span>
      <button
        type="button"
        onClick={onTogglePlay}
        className={`${chromeLabel} ${chromeTextButton} absolute right-4 top-1/2 -translate-y-1/2 sm:right-6`}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      <span
        className={`${chromeLabel} absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-[16px] leading-none text-black/76`}
        aria-hidden
      >
        ▶
      </span>
      <span
        className={`${chromeLabel} absolute left-1/2 bottom-4 max-w-[54vw] -translate-x-1/2 text-center leading-[1.25] sm:bottom-6`}
      >
        Scroll to change
      </span>
      <span
        className={`${chromeLabel} absolute right-4 bottom-4 sm:right-6 sm:bottom-6 text-[16px] leading-none text-black/76`}
        aria-hidden
      >
        ■
      </span>
    </div>
  );
}
