#!/usr/bin/env node
// Build the vendored Creatura wasm and copy it to public/wasm/creatura.wasm.
// Requires Zig 0.13.0 on PATH (set ZIG to override the binary).

import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const creaturaDir = join(repoRoot, "vendor", "creatura");
const outWasm = join(creaturaDir, "zig-out", "bin", "zigl.wasm");
const dest = join(repoRoot, "public", "wasm", "creatura.wasm");

const zig = process.env.ZIG ?? "zig";

const args = [
  "build",
  "--global-cache-dir",
  ".zig-global-cache",
  "--cache-dir",
  ".zig-cache",
];

console.log(`> ${zig} ${args.join(" ")}  (cwd: ${creaturaDir})`);
const result = spawnSync(zig, args, { cwd: creaturaDir, stdio: "inherit" });

if (result.error) {
  console.error(
    `Failed to invoke '${zig}'. Install Zig 0.13.0 or set ZIG to its full path.`,
  );
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(outWasm)) {
  console.error(`Build succeeded but ${outWasm} is missing.`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(outWasm, dest);
console.log(`Copied ${outWasm} -> ${dest}`);
