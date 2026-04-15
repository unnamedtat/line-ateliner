// UI theme helpers: paper colors, texture colors, and CSS variable sync.
function getBackgroundPreset() {
  return BACKGROUND_PRESETS[settings.backgroundPreset] || BACKGROUND_PRESETS.warm;
}

function getPaperColors() {
  return {
    base: hexToRgb(settings.paperColor),
    accent: hexToRgb(settings.paperAccentColor)
  };
}

function getTextureColors() {
  return {
    base: hexToRgb(settings.textureColor),
    accent: hexToRgb(settings.textureAccentColor)
  };
}

function rgbToCssAlpha(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function applyBackgroundTheme() {
  const bodyStyle = document.body.style;
  const rootStyle = document.documentElement.style;
  const paperBase = hexToRgb(settings.paperColor);
  const paperAccent = hexToRgb(settings.paperAccentColor);
  const ink = hexToRgb(settings.inkColor || "#2c2b28");
  const mist = [214, 225, 235];
  const sand = [225, 216, 206];
  const paperWhite = [247, 246, 242];
  const panelTop = lerpRgb(lerpRgb(paperBase, paperWhite, 0.5), mist, 0.18);
  const panelBottom = lerpRgb(lerpRgb(paperAccent, paperWhite, 0.56), sand, 0.18);
  const cardSurface = lerpRgb(panelTop, [255, 255, 255], 0.62);
  const cardBorder = lerpRgb(panelBottom, mist, 0.34);
  const accent = lerpRgb(mist, ink, 0.34);
  const accentStrong = lerpRgb(accent, [73, 103, 132], 0.42);
  const secondary = lerpRgb(sand, [191, 174, 154], 0.35);
  const text = lerpRgb(ink, [88, 95, 104], 0.42);
  const muted = lerpRgb(text, [255, 255, 255], 0.26);

  if (settings.paperFillMode === "gradient") {
    bodyStyle.background = `linear-gradient(${settings.paperGradientAngle}deg, ${settings.paperColor}, ${settings.paperAccentColor})`;
  } else {
    bodyStyle.background = settings.paperColor;
  }

  rootStyle.setProperty("--ui-shell-top", rgbToCssAlpha(panelTop, 0.96));
  rootStyle.setProperty("--ui-shell-bottom", rgbToCssAlpha(panelBottom, 0.9));
  rootStyle.setProperty("--ui-shell-border", rgbToCssAlpha(cardBorder, 0.86));
  rootStyle.setProperty("--ui-shell-shadow", "0 20px 46px rgba(79, 91, 104, 0.16)");
  rootStyle.setProperty("--ui-card-bg", rgbToCssAlpha(cardSurface, 0.68));
  rootStyle.setProperty("--ui-card-border", rgbToCssAlpha(cardBorder, 0.9));
  rootStyle.setProperty("--ui-text", rgbToCss(text));
  rootStyle.setProperty("--ui-muted", rgbToCss(muted));
  rootStyle.setProperty("--ui-accent", rgbToCss(accent));
  rootStyle.setProperty("--ui-accent-strong", rgbToCss(accentStrong));
  rootStyle.setProperty("--ui-accent-soft", rgbToCssAlpha(mist, 0.34));
  rootStyle.setProperty("--ui-secondary", rgbToCss(secondary));
  rootStyle.setProperty("--ui-secondary-soft", rgbToCssAlpha(sand, 0.3));
  rootStyle.setProperty("--ui-button-bg", "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(243,245,247,0.92))");
  rootStyle.setProperty("--ui-button-border", rgbToCssAlpha(cardBorder, 0.8));
  rootStyle.setProperty("--ui-tooltip-bg", "rgba(73, 82, 92, 0.94)");
  rootStyle.setProperty("--ui-tooltip-text", "rgba(248, 249, 250, 0.98)");
}

function applyBackgroundPreset(presetKey) {
  const preset = BACKGROUND_PRESETS[presetKey];
  if (!preset) {
    return;
  }

  settings.paperColor = preset.paperColor;
  settings.paperAccentColor = preset.paperAccentColor;
  settings.paperTexture = preset.texture;
}
