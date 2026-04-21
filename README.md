# musicversum

An editorial vinyl-first music player. A 3D vinyl record centered on screen that flips and swaps tracks on scroll, with large serif title and artist that transition in sync.

Built as a sandbox for creative-coding techniques — React Three Fiber for the vinyl (real 3D, hover tilt, shader-ready), GSAP for the scroll-driven flip choreography, and Source Serif 4 for typography.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- React Three Fiber + drei + three
- GSAP + `@gsap/react`
- Lenis (installed, reserved for future smooth-scroll enhancements)
- Leva (installed, reserved for live-tuning animation constants)
- `next/font/local` for Source Serif 4, `next/font/google` for Inter

## Commands

```bash
npm run dev     # Turbopack dev server at http://localhost:3000
npm run build   # Production build
npm run start   # Run the production build
npm run lint    # ESLint
```

## Interactions

| Input | Action |
| --- | --- |
| Scroll wheel (down) | Next track |
| Scroll wheel (up) | Previous track |
| ArrowDown / ArrowRight / Space | Next track |
| ArrowUp / ArrowLeft | Previous track |
| Touch swipe (vertical) | Next / previous |
| Mouse hover over vinyl | Subtle 3D tilt |

The scroll handler debounces with a 60px delta threshold and a 120ms cooldown, and is locked for the full 820ms flip animation so one gesture equals one swap.

## Animation

All timings and easing curves live at the top of `components/Player.tsx` in the `TIMING` and `EASE` objects. The motion rationale follows Emil Kowalski's easing rules:

- Vinyl wind-up + settle: `ease-in` (gravity accelerations)
- Vinyl toss: `back.out(1.1)` (physics-flavored apex arrival)
- Vinyl flip: `ease-in-out` (on-screen continuous rotation)
- Text exit / enter: `ease-out` (elements leaving / entering the viewport)

Only `transform` and `opacity` are animated; `prefers-reduced-motion` swaps the flip for a 200ms opacity cross-fade.

## Project structure

```
app/
  layout.tsx            # fonts (Source Serif 4 local + Inter Google), metadata
  page.tsx              # mounts <Player />
  globals.css           # Tailwind + typography tokens + reduced-motion
  fonts/                # Source Serif 4 variable .ttf files
components/
  Player.tsx            # orchestrator: state, scroll hook, GSAP timeline
  vinyl/
    VinylCanvas.tsx     # <Canvas> + camera + lights
    Vinyl.tsx           # disc + two-sided label + center dot + hover tilt
  ui/
    ChromeFrame.tsx     # corner brackets, timecode, pause, scroll hint
    AnimatedText.tsx    # imperative char-stagger out/in component
lib/
  tracks.ts             # fake track list
  useTrackScroll.ts     # debounced wheel + keyboard + touch hook
```

## Deployment

Set up for Vercel: push to GitHub and import the repo at vercel.com/new. Everything is static; no env vars or API routes are required yet.

## Next steps

- Real audio playback via `<audio>` driven by `track.audioSrc`.
- Spotify OAuth in `app/api/spotify/…` to pull real tracks.
- Shader material on the label for groove/warp effects while spinning.
- Optional: wire the `TIMING` / `EASE` constants into a Leva panel for live tuning.
