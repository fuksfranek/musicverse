const LISTENING_CLOSE_SOUND_SRC = "/sounds/vinyl-stop.mp3";
const LISTENING_CLOSE_VOLUME = 0.36;
const LISTENING_CLOSE_STOP_FADE_MS = 36;

const LISTENING_ENTRY_SCRATCH_SOUND_SRC = "/sounds/scratch-105-bpm.mp3";
const LISTENING_ENTRY_SCRATCH_VOLUME = 0.38;
const LISTENING_ENTRY_SCRATCH_STOP_FADE_MS = 36;

const LISTENING_MUSIC_SRC = "/sounds/slavic-spotify.mp3";
const LISTENING_MUSIC_VOLUME = 0.74;
const LISTENING_MUSIC_START_RATE = 0.08;
const LISTENING_MUSIC_STOP_FADE_MS = 260;

let listeningCloseAudio: HTMLAudioElement | null = null;
let listeningCloseFadeFrame: number | null = null;
let listeningCloseGeneration = 0;

let listeningEntryScratchAudio: HTMLAudioElement | null = null;
let listeningEntryScratchFadeFrame: number | null = null;
let listeningEntryScratchGeneration = 0;

let listeningMusicAudio: HTMLAudioElement | null = null;
let listeningMusicRampFrame: number | null = null;
let listeningMusicFadeFrame: number | null = null;
let listeningMusicActive = false;
let listeningMusicProgress = 0;

let sharedAudioContext: AudioContext | null = null;
let listeningMusicSource: MediaElementAudioSourceNode | null = null;
let listeningMusicAnalyser: AnalyserNode | null = null;
let listeningMusicAnalyserAttempted = false;

export type PressBoundSound = {
  stop: (fadeMs?: number) => void;
};

export type SfxGate = {
  reducedMotion: boolean;
};

function gated(gate: SfxGate): boolean {
  return gate.reducedMotion;
}

function getListeningCloseAudio() {
  if (typeof window === "undefined") return null;
  if (!listeningCloseAudio) {
    listeningCloseAudio = new Audio(LISTENING_CLOSE_SOUND_SRC);
    listeningCloseAudio.preload = "auto";
  }
  return listeningCloseAudio;
}

function getListeningEntryScratchAudio() {
  if (typeof window === "undefined") return null;
  if (!listeningEntryScratchAudio) {
    listeningEntryScratchAudio = new Audio(LISTENING_ENTRY_SCRATCH_SOUND_SRC);
    listeningEntryScratchAudio.preload = "auto";
  }
  return listeningEntryScratchAudio;
}

function setVinylPitchBehavior(audio: HTMLAudioElement) {
  const pitched = audio as HTMLAudioElement & {
    preservesPitch?: boolean;
    mozPreservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  pitched.preservesPitch = false;
  pitched.mozPreservesPitch = false;
  pitched.webkitPreservesPitch = false;
}

function getListeningMusicAudio() {
  if (typeof window === "undefined") return null;
  if (!listeningMusicAudio) {
    listeningMusicAudio = new Audio(LISTENING_MUSIC_SRC);
    listeningMusicAudio.preload = "auto";
    listeningMusicAudio.loop = true;
    listeningMusicAudio.crossOrigin = "anonymous";
    setVinylPitchBehavior(listeningMusicAudio);
  }
  return listeningMusicAudio;
}

function ensureListeningMusicAnalyser() {
  if (typeof window === "undefined") return;
  if (listeningMusicAnalyserAttempted) return;
  listeningMusicAnalyserAttempted = true;

  const audio = getListeningMusicAudio();
  if (!audio) return;

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    sharedAudioContext = sharedAudioContext ?? new Ctor();
    listeningMusicSource =
      listeningMusicSource ?? sharedAudioContext.createMediaElementSource(audio);
    listeningMusicAnalyser = sharedAudioContext.createAnalyser();
    listeningMusicAnalyser.fftSize = 512;
    listeningMusicAnalyser.smoothingTimeConstant = 0.7;
    listeningMusicSource.connect(listeningMusicAnalyser);
    listeningMusicAnalyser.connect(sharedAudioContext.destination);
  } catch {
    // Safari can throw INVALID_STATE_ERR if the element was already wired
    // up, or refuse the context until a user gesture. Reactivity is purely
    // cosmetic, so we silently fall back.
    listeningMusicAnalyser = null;
  }
}

export function getListeningAnalyser(): AnalyserNode | null {
  ensureListeningMusicAnalyser();
  return listeningMusicAnalyser;
}

export function getListeningAudioContext(): AudioContext | null {
  ensureListeningMusicAnalyser();
  return sharedAudioContext;
}

export function primeMusicversumAudio() {
  for (const audio of [
    getListeningCloseAudio(),
    getListeningEntryScratchAudio(),
    getListeningMusicAudio(),
  ]) {
    if (!audio) continue;
    if (!audio.paused || audio.readyState > 0) continue;
    audio.load();
  }
}

function cancelListeningCloseFade() {
  if (listeningCloseFadeFrame === null) return;
  cancelAnimationFrame(listeningCloseFadeFrame);
  listeningCloseFadeFrame = null;
}

function resetListeningCloseAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.volume = LISTENING_CLOSE_VOLUME;
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers can reject seeks while media metadata is still loading.
  }
}

function resetListeningEntryScratchAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.volume = LISTENING_ENTRY_SCRATCH_VOLUME;
  audio.playbackRate = 1;
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers can reject seeks while media metadata is still loading.
  }
}

function cancelListeningEntryScratchFade() {
  if (listeningEntryScratchFadeFrame === null) return;
  cancelAnimationFrame(listeningEntryScratchFadeFrame);
  listeningEntryScratchFadeFrame = null;
}

function stopListeningEntryScratchAudio(
  audio: HTMLAudioElement,
  generation: number,
  fadeMs: number,
) {
  if (generation !== listeningEntryScratchGeneration) return;

  cancelListeningEntryScratchFade();

  if (fadeMs <= 0 || audio.paused) {
    resetListeningEntryScratchAudio(audio);
    return;
  }

  const start = performance.now();
  const startVolume = audio.volume;

  const tick = (now: number) => {
    if (generation !== listeningEntryScratchGeneration) return;

    const p = Math.min(1, (now - start) / fadeMs);
    audio.volume = startVolume * (1 - p);

    if (p < 1) {
      listeningEntryScratchFadeFrame = requestAnimationFrame(tick);
      return;
    }

    listeningEntryScratchFadeFrame = null;
    resetListeningEntryScratchAudio(audio);
  };

  listeningEntryScratchFadeFrame = requestAnimationFrame(tick);
}

export function startListeningEntryScratchHoldSound(
  gate: SfxGate,
): PressBoundSound | null {
  if (gated(gate)) return null;

  const audio = getListeningEntryScratchAudio();
  if (!audio) return null;

  listeningEntryScratchGeneration += 1;
  const generation = listeningEntryScratchGeneration;

  cancelListeningEntryScratchFade();
  resetListeningEntryScratchAudio(audio);
  audio.volume = LISTENING_ENTRY_SCRATCH_VOLUME;

  void audio.play().catch(() => {
    if (generation === listeningEntryScratchGeneration) {
      resetListeningEntryScratchAudio(audio);
    }
  });

  return {
    stop(fadeMs = LISTENING_ENTRY_SCRATCH_STOP_FADE_MS) {
      stopListeningEntryScratchAudio(audio, generation, fadeMs);
    },
  };
}

function cancelListeningMusicRamp() {
  if (listeningMusicRampFrame === null) return;
  cancelAnimationFrame(listeningMusicRampFrame);
  listeningMusicRampFrame = null;
}

function cancelListeningMusicFade() {
  if (listeningMusicFadeFrame === null) return;
  cancelAnimationFrame(listeningMusicFadeFrame);
  listeningMusicFadeFrame = null;
}

function resetListeningMusicAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.volume = 0;
  audio.playbackRate = 1;
  listeningMusicProgress = 0;
  setVinylPitchBehavior(audio);
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers can reject seeks while media metadata is still loading.
  }
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function applyListeningMusicProgress(
  audio: HTMLAudioElement,
  progress01: number,
) {
  const progress = clamp01(progress01);
  const motor = easeInOutCubic(progress);
  const audible = Math.pow(progress, 0.55);

  listeningMusicProgress = progress;

  audio.playbackRate =
    progress >= 0.995
      ? 1
      : LISTENING_MUSIC_START_RATE + (1 - LISTENING_MUSIC_START_RATE) * motor;
  audio.volume =
    progress <= 0
      ? 0
      : LISTENING_MUSIC_VOLUME * (0.12 + 0.88 * audible);
}

export function setListeningMusicProgress(progress01: number) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  cancelListeningMusicRamp();
  applyListeningMusicProgress(audio, progress01);
}

export function animateListeningMusicProgress(
  targetProgress01: number,
  durationMs: number,
) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  cancelListeningMusicRamp();

  const from = listeningMusicProgress;
  const to = clamp01(targetProgress01);

  if (durationMs <= 0 || !listeningMusicActive) {
    applyListeningMusicProgress(audio, to);
    return;
  }

  const startedAt = performance.now();

  const tick = (now: number) => {
    if (!listeningMusicActive) {
      listeningMusicRampFrame = null;
      return;
    }

    const raw = Math.min(1, (now - startedAt) / durationMs);
    const p = easeInOutCubic(raw);

    applyListeningMusicProgress(audio, from + (to - from) * p);

    if (raw < 1) {
      listeningMusicRampFrame = requestAnimationFrame(tick);
      return;
    }

    applyListeningMusicProgress(audio, to);
    listeningMusicRampFrame = null;
  };

  listeningMusicRampFrame = requestAnimationFrame(tick);
}

export function startListeningMusic(playing = true) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  if (!listeningMusicActive) {
    listeningMusicActive = true;
    cancelListeningMusicFade();
    applyListeningMusicProgress(audio, listeningMusicProgress);
  }

  if (!playing) {
    audio.pause();
    return;
  }

  void audio.play().catch(() => {
    listeningMusicActive = false;
    resetListeningMusicAudio(audio);
  });
}

export function restartListeningMusicFromZero(
  playing = true,
  initialProgress = 0,
) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  listeningMusicActive = true;
  cancelListeningMusicRamp();
  cancelListeningMusicFade();
  resetListeningMusicAudio(audio);
  applyListeningMusicProgress(audio, initialProgress);

  if (!playing) return;

  void audio
    .play()
    .catch(() => {
      listeningMusicActive = false;
      resetListeningMusicAudio(audio);
    });
}

export function setListeningMusicPlaying(playing: boolean) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  if (playing) {
    if (!listeningMusicActive) {
      startListeningMusic();
      return;
    }

    void audio.play();
    return;
  }

  if (!listeningMusicActive) return;

  audio.pause();
}

export function stopListeningMusic(fadeMs = LISTENING_MUSIC_STOP_FADE_MS) {
  const audio = getListeningMusicAudio();
  if (!audio) return;

  if (!listeningMusicActive) {
    if (fadeMs <= 0) {
      cancelListeningMusicRamp();
      cancelListeningMusicFade();
      resetListeningMusicAudio(audio);
    }
    return;
  }

  listeningMusicActive = false;
  cancelListeningMusicRamp();
  cancelListeningMusicFade();

  if (fadeMs <= 0 || audio.paused) {
    resetListeningMusicAudio(audio);
    return;
  }

  const startedAt = performance.now();
  const startVolume = audio.volume;

  const tick = (now: number) => {
    const p = Math.min(1, (now - startedAt) / fadeMs);
    audio.volume = startVolume * (1 - p);

    if (p < 1) {
      listeningMusicFadeFrame = requestAnimationFrame(tick);
      return;
    }

    listeningMusicFadeFrame = null;
    resetListeningMusicAudio(audio);
  };

  listeningMusicFadeFrame = requestAnimationFrame(tick);
}

function stopListeningCloseAudio(
  audio: HTMLAudioElement,
  generation: number,
  fadeMs: number,
) {
  if (generation !== listeningCloseGeneration) return;

  cancelListeningCloseFade();

  if (fadeMs <= 0 || audio.paused) {
    resetListeningCloseAudio(audio);
    return;
  }

  const start = performance.now();
  const startVolume = audio.volume;

  const tick = (now: number) => {
    if (generation !== listeningCloseGeneration) return;

    const p = Math.min(1, (now - start) / fadeMs);
    audio.volume = startVolume * (1 - p);

    if (p < 1) {
      listeningCloseFadeFrame = requestAnimationFrame(tick);
      return;
    }

    listeningCloseFadeFrame = null;
    resetListeningCloseAudio(audio);
  };

  listeningCloseFadeFrame = requestAnimationFrame(tick);
}

export function startListeningCloseHoldSound(
  gate: SfxGate,
): PressBoundSound | null {
  if (gated(gate)) return null;

  const audio = getListeningCloseAudio();
  if (!audio) return null;

  listeningCloseGeneration += 1;
  const generation = listeningCloseGeneration;

  cancelListeningCloseFade();
  resetListeningCloseAudio(audio);
  audio.volume = LISTENING_CLOSE_VOLUME;
  audio.playbackRate = 1;

  const onEnded = () => {
    if (generation !== listeningCloseGeneration) return;
    audio.volume = LISTENING_CLOSE_VOLUME;
  };
  audio.addEventListener("ended", onEnded, { once: true });

  void audio.play().catch(() => {
    audio.removeEventListener("ended", onEnded);
    if (generation === listeningCloseGeneration) resetListeningCloseAudio(audio);
  });

  return {
    stop(fadeMs = LISTENING_CLOSE_STOP_FADE_MS) {
      audio.removeEventListener("ended", onEnded);
      stopListeningCloseAudio(audio, generation, fadeMs);
    },
  };
}
