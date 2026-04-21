"use client";

type ChromeFrameProps = {
  isPlaying: boolean;
  elapsed: string;
  onTogglePlay: () => void;
};

const chromeLabel =
  "font-sans text-[15px] font-semibold uppercase tracking-[0.04em] text-black select-none";

export default function ChromeFrame({
  isPlaying,
  elapsed,
  onTogglePlay,
}: ChromeFrameProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <span className={`${chromeLabel} absolute left-5 top-5 text-[22px] leading-none`}>
        [
      </span>
      <span
        className={`${chromeLabel} absolute left-1/2 top-5 -translate-x-1/2 leading-none`}
      >
        Click and press to listen
      </span>
      <span
        className={`${chromeLabel} absolute right-5 top-5 text-[22px] leading-none`}
      >
        ]
      </span>

      <span
        className={`${chromeLabel} absolute left-5 top-1/2 -translate-y-1/2 tabular-nums`}
      >
        {elapsed}
      </span>
      <button
        type="button"
        onClick={onTogglePlay}
        className={`${chromeLabel} pointer-events-auto absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      <span
        className={`${chromeLabel} absolute left-5 bottom-5 text-[18px] leading-none`}
        aria-hidden
      >
        ▶
      </span>
      <span
        className={`${chromeLabel} absolute left-1/2 bottom-5 -translate-x-1/2 leading-none`}
      >
        Scroll to change
      </span>
      <span
        className={`${chromeLabel} absolute right-5 bottom-5 text-[18px] leading-none`}
        aria-hidden
      >
        ■
      </span>
    </div>
  );
}
