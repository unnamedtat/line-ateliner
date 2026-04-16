// Small shared helpers used by UI, layout, and drawing code.
function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized;

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

// Interpolates two RGB colors.
function lerpRgb(a, b, t) {
  return [
    round(lerp(a[0], b[0], t)),
    round(lerp(a[1], b[1], t)),
    round(lerp(a[2], b[2], t))
  ];
}

// Converts an RGB color to CSS rgb.
function rgbToCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// Computes the caption color.
function computeCaptionColor(base, accent) {
  const mixed = lerpRgb(base, accent, 0.35);
  const luminance = mixed[0] * 0.299 + mixed[1] * 0.587 + mixed[2] * 0.114;
  const offset = luminance > 170 ? -138 : 138;

  return [
    constrain(mixed[0] + offset, 34, 232),
    constrain(mixed[1] + offset, 34, 232),
    constrain(mixed[2] + offset, 34, 232)
  ];
}
