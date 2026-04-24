<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Creatura wasm

The listening-view background renders a forked build of [kamilmac/Creatura](https://github.com/kamilmac/Creatura). The Zig source lives in `vendor/creatura/`, and the compiled artifact at `public/wasm/creatura.wasm` is committed to the repo so contributors don't need a Zig toolchain. To rebuild after editing the Zig source, install Zig 0.13.0 and run `pnpm wasm:build`.
