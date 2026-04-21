"use client";

type ListeningOverlayProps = {
  elapsed: string;
  isPlaying: boolean;
  onBack: () => void;
  onTogglePlay: () => void;
};

const chromeLabel =
  "font-sans text-[15px] font-semibold uppercase tracking-[0.08em] text-black select-none";

export default function ListeningOverlay({
  elapsed,
  isPlaying,
  onBack,
  onTogglePlay,
}: ListeningOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <button
        type="button"
        onClick={onBack}
        className={`${chromeLabel} pointer-events-auto absolute left-5 top-5 cursor-pointer leading-none`}
        aria-label="Back to browse"
      >
        ← Back
      </button>

      <span
        className={`${chromeLabel} absolute left-1/2 top-5 -translate-x-1/2 leading-none`}
      >
        Now listening
      </span>

      <span
        className={`${chromeLabel} absolute left-5 bottom-5 tabular-nums leading-none`}
      >
        {elapsed}
      </span>

      <button
        type="button"
        onClick={onTogglePlay}
        className={`${chromeLabel} pointer-events-auto absolute right-5 bottom-5 cursor-pointer leading-none`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}
