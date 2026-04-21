export const CLASSIC_SCRIPT_PATHS = [
  // Core shared state and helpers.
  "/legacy/core/config.js",
  "/legacy/core/asset-state.js",
  "/legacy/core/utils.js",

  // UI theming, layout, and bindings.
  "/legacy/ui/theme.js",
  "/legacy/ui/layout.js",
  "/legacy/ui/state.js",
  "/legacy/ui/bindings.js",
  "/legacy/ui/render.js",

  // Scene lifecycle and upload/layout helpers.
  "/legacy/scene/canvas-core.js",
  "/legacy/scene/rebuild-flow.js",
  "/legacy/scene/upload-build.js",
  "/legacy/scene/overlay-layout.js",

  // Analysis primitives and mask builders.
  "/legacy/analysis/cache.js",
  "/legacy/analysis/async.js",
  "/legacy/analysis/sync.js",
  "/legacy/analysis/mask-builders.js",

  // Edge and path generation.
  "/legacy/edge/modes.js",
  "/legacy/edge/async.js",
  "/legacy/edge/render.js",
  "/legacy/path/processing.js",
  "/legacy/path/trace.js",
  "/legacy/path/variants.js",

  // Scene drawing depends on prior analysis helpers.
  "/legacy/scene/draw.js"
] as const;
