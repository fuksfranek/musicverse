"use client";

type ListeningOverlayProps = {
  elapsed: string;
  isPlaying: boolean;
  onBack: () => void;
  onTogglePlay: () => void;
};

const chromeLabel =
  "font-sans text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.12em] text-black/72 select-none";

const chromeTextButton =
  "pointer-events-auto cursor-pointer leading-none transition-colors duration-150 hover:text-black";

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
        className={`${chromeLabel} ${chromeTextButton} absolute left-4 top-4 sm:left-6 sm:top-6`}
        aria-label="Back to browse"
        title="Back to browse"
      >
        Back
      </button>

      <span
        className={`${chromeLabel} absolute left-1/2 top-4 -translate-x-1/2 leading-none sm:top-6`}
      >
        Now listening
      </span>

      <span
        className={`${chromeLabel} absolute left-4 bottom-4 tabular-nums leading-none sm:left-6 sm:bottom-6`}
      >
        {elapsed}
      </span>

      <button
        type="button"
        onClick={onTogglePlay}
        className={`${chromeLabel} ${chromeTextButton} absolute right-4 bottom-4 sm:right-6 sm:bottom-6`}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}
