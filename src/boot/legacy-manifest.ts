export const LEGACY_BRIDGE_SCRIPT_PATHS = [
  // Core shared state and helpers.
  "/legacy/core/config.js",
  "/legacy/core/asset-state.js",
  "/legacy/core/utils.js",

  // UI theming, layout, and bridge state.
  "/legacy/ui/theme.js",
  "/legacy/ui/state.js",
  "/legacy/ui/bindings.js",
  "/legacy/ui/render.js",
  "/legacy/ui/layout.js",
  "/legacy/scene/rebuild-flow.js"
] as const;

export const LEGACY_PREVIEW_SCRIPT_PATHS = [
  // Scene lifecycle and upload/layout helpers.
  "/legacy/scene/canvas-core.js",
  "/legacy/scene/upload-build.js",
  "/legacy/scene/overlay-layout.js",

  // Scene drawing depends on prior analysis helpers.
  "/legacy/scene/draw.js"
] as const;
