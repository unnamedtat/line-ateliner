export const LEGACY_CONTROL_DEFAULTS: Record<string, string | number> = {
  "render-mode": "edge-fill",
  "contour-variant": "contour",
  "analysis-quality": "medium",
  "scene-scale": 130,
  "scene-offset-x": 0,
  "scene-offset-y": 0,
  "background-preset": "warm",
  "reference-overlay": "on",
  "ink-color": "#2c2b28",
  "ink-opacity": 100,
  "reference-overlay-opacity": 95,
  "paper-fill-mode": "solid",
  "paper-texture": "speckle",
  "paper-color": "#fff",
  "paper-accent-color": "#efe3cd",
  "texture-color": "#000000",
  "texture-accent-color": "#fff7ea",
  "line-threshold": 228,
  "edge-threshold": 42,
  "edge-fill-threshold": 21,
  "edge-fill-cell-size": 6,
  "edge-fill-min-normal-gap": 11,
  "edge-fill-max-normal-gap": 62,
  "edge-fill-max-tangent-gap": 36,
  "edge-fill-min-tangent-dot": 88,
  "edge-fill-max-normal-dot": -35,
  "edge-smoothness": 1,
  "ink-threshold": 242,
  "contrast-threshold": 8,
  "color-threshold": 24,
  "wave-amplitude": 14,
  "wave-frequency": 28,
  "wave-speed": 45,
  "distortion-scale": 20,
  "distortion-frequency": 8,
  "distortion-octaves": 2,
  "distortion-speed": 36,
  "paper-gradient-angle": 18,
  "paper-texture-strength": 64,
  "paper-texture-opacity": 78,
  "paper-texture-scale": 42,
  "line-width-scale": 100,
  "export-duration-seconds": 3,
  "export-frame-rate": 18,
  "export-resolution-scale": 200,
  "boil-hold-frames": 5,
  "edge-jitter-normal": 70,
  "edge-jitter-tangent": 70,
  "contour-stroke-thickness": 150,
  "path-jitter-normal": 13,
  "path-jitter-tangent": 4,
  "width-jitter": 8
};

const LEGACY_RANGE_READOUT_FORMATS: Record<string, { divisor?: number; suffix?: string }> = {
  "line-threshold": {},
  "ink-opacity": { suffix: "%" },
  "reference-overlay-opacity": { suffix: "%" },
  "scene-scale": { suffix: "%" },
  "scene-offset-x": { suffix: "%" },
  "scene-offset-y": { suffix: "%" },
  "edge-threshold": {},
  "edge-fill-threshold": {},
  "edge-fill-cell-size": {},
  "edge-fill-min-normal-gap": {},
  "edge-fill-max-normal-gap": {},
  "edge-fill-max-tangent-gap": {},
  "edge-fill-min-tangent-dot": {},
  "edge-fill-max-normal-dot": {},
  "edge-smoothness": {},
  "ink-threshold": {},
  "contrast-threshold": {},
  "color-threshold": {},
  "wave-amplitude": {},
  "wave-frequency": {},
  "wave-speed": {},
  "distortion-scale": {},
  "distortion-frequency": {},
  "distortion-octaves": {},
  "distortion-speed": {},
  "paper-gradient-angle": {},
  "paper-texture-strength": {},
  "paper-texture-opacity": { suffix: "%" },
  "paper-texture-scale": {},
  "line-width-scale": { suffix: "%" },
  "export-duration-seconds": { suffix: "s" },
  "export-frame-rate": { suffix: "fps" },
  "export-resolution-scale": { suffix: "%" },
  "boil-hold-frames": {},
  "edge-jitter-normal": {},
  "edge-jitter-tangent": {},
  "contour-stroke-thickness": { suffix: "%" },
  "path-jitter-normal": {},
  "path-jitter-tangent": {},
  "width-jitter": { suffix: "%" }
};

function formatRangeReadout(value: number, divisor = 1, suffix = "") {
  return `${divisor === 1 ? value : value / divisor}${suffix}`;
}

export const LEGACY_RANGE_READOUT_DEFAULTS: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_RANGE_READOUT_FORMATS).map(([id, format]) => [
    id,
    formatRangeReadout(
      Number(LEGACY_CONTROL_DEFAULTS[id] ?? 0),
      format.divisor ?? 1,
      format.suffix ?? ""
    )
  ])
);

export function getLegacyControlDefault(id: string, fallback: string | number = "") {
  return LEGACY_CONTROL_DEFAULTS[id] ?? fallback;
}

export function getLegacyRangeReadoutDefault(id: string, fallback = "") {
  return LEGACY_RANGE_READOUT_DEFAULTS[id] ?? fallback;
}
