import { defineConfig } from "tsup";

export default defineConfig({
  // ── Entry points ────────────────────────────────────────────
  entry: {
    index: "src/index.ts",
    // Standalone bootstrap executables (fully self-contained)
    "bootstrap/desktop":   "src/bootstrap.desktop.ts",
    "bootstrap/container": "src/bootstrap.container.ts",
  },

  // ── Output formats ─────────────────────────────────────────
  format: ["cjs", "esm"],

  // ── Self-contained bundling ─────────────────────────────────
  // ALL runtime dependencies are inlined into the output.
  // The output works without any node_modules directory.
  noExternal: [
    "zod",
    "uuid",
    "eventemitter3",
  ],

  // ── Type declarations ───────────────────────────────────────
  dts: {
    entry: { index: "src/index.ts" },
    resolve: true,
  },

  // ── Source maps ─────────────────────────────────────────────
  sourcemap: true,

  // ── Output cleanup ──────────────────────────────────────────
  clean: true,

  // Node built-ins stay external (os, fs, path, child_process)
  platform: "node",
  target: "node18",

  // ── Tree-shaking ────────────────────────────────────────────
  treeshake: true,

  // ── esbuild options ─────────────────────────────────────────
  esbuildOptions(options) {
    // Ensure __dirname works in CJS output
    options.define = {
      ...options.define,
      "import.meta.url": "undefined",
    };
  },
});
