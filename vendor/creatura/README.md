# Creatura (vendored + forked)

Vendored from [kamilmac/Creatura](https://github.com/kamilmac/Creatura) and extended
with audio-reactive exports for the Musicversum listening view.

## Added exports (relative to upstream)

| Export | Purpose |
| --- | --- |
| `setEnergy(low, mid, high)` | Drives circle radii (low), wet-spot/density (mid), and chromatic/blur intensity (high). All inputs in `[0, 1]`. |
| `setDensity(d)` | Multiplier on the count of orbiting points actually drawn. `~0.0..1.5`. |
| `setSpeedScale(s)` | Multiplies orbit speed and velocity integration in `point.zig`. `~0.4..2.0`. |
| `setIntensity(i)` | Master multiplier for blur radius and chromatic aberration. `~0..1.5`. |

Defaults reproduce the upstream visual look 1:1.

## Building

Requires Zig **0.13.0** (newer versions have breaking std library changes that the
upstream code does not yet target).

```sh
pnpm wasm:build       # or: npm run wasm:build
```

That runs `zig build` here and copies `zig-out/bin/zigl.wasm` to
`public/wasm/creatura.wasm` so the Next.js app can fetch it at `/wasm/creatura.wasm`.

The compiled artifact is committed so contributors without Zig can still run the app.
