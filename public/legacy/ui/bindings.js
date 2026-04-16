// Control binding helpers for inputs, actions, and tabs.
// Binds UI controls once.
function bindControls() {
  ensureRetroLayout();
  const panel = document.getElementById("ui-shell");
  if (!panel) {
    return;
  }

  if (panel.dataset.bound === "1") {
    return;
  }

  panel.dataset.bound = "1";

  syncControls();
}

// Applies a select control change.
function applySelectControlChange(id, value) {
  const binding = SELECT_BINDINGS.find((item) => item.id === id);
  if (!binding) {
    return;
  }

  binding.onChange(value);
  syncControls();
}

const rangeControlState = new Map();

// Applies a range control change.
function applyRangeControlChange(id, value, source = "change") {
  const binding = RANGE_BINDINGS.find(([rangeId]) => rangeId === id);
  if (!binding && id !== "paper-texture-opacity") {
    return;
  }

  const state = rangeControlState.get(id) || {
    lastAppliedValue: NaN,
    lastAppliedSource: "change"
  };

  if (source === "change" && state.lastAppliedSource === "input" && value === state.lastAppliedValue) {
    state.lastAppliedSource = source;
    rangeControlState.set(id, state);
    return;
  }

  state.lastAppliedValue = value;
  state.lastAppliedSource = source;
  rangeControlState.set(id, state);

  if (id === "paper-texture-opacity") {
    settings.paperTextureOpacity = value;
    syncTextureOverlay();
    syncControls();
    return;
  }

  const [, settingKey] = binding;
  settings[settingKey] = value;

  if (id === "scene-scale" || id === "scene-offset-x" || id === "scene-offset-y") {
    refreshSceneLayoutPreview();
    syncControls();
    return;
  }

  if (
    id === "paper-gradient-angle" ||
    id === "paper-texture-strength" ||
    id === "paper-texture-scale"
  ) {
    rebuildPaperPreview();
    syncControls();
    return;
  }

  if (
    id === "export-duration-seconds" ||
    id === "export-frame-rate" ||
    id === "export-resolution-scale"
  ) {
    refreshExportSettingsPreview();
    syncControls();
    return;
  }

  if (id === "reference-overlay-opacity" || id === "boil-hold-frames") {
    syncControls();
    return;
  }

  if (
    id === "distortion-scale" ||
    id === "distortion-frequency" ||
    id === "distortion-octaves" ||
    id === "distortion-speed"
  ) {
    refreshDistortionPreview();
    syncControls();
    return;
  }

  if (
    id === "ink-opacity" ||
    id === "line-width-scale" ||
    id === "contour-stroke-thickness"
  ) {
    if (typeof clearRenderFrameCache === "function") {
      clearRenderFrameCache();
    }
    syncControls();
    return;
  }

  if (
    id === "wave-amplitude" ||
    id === "wave-frequency" ||
    id === "wave-speed" ||
    id === "edge-jitter-normal" ||
    id === "edge-jitter-tangent" ||
    id === "path-jitter-normal" ||
    id === "path-jitter-tangent" ||
    id === "width-jitter"
  ) {
    scheduleOutputRebuild({ reuseGeometry: true });
    syncControls();
    return;
  }

  scheduleOutputRebuild();
  syncControls();
}

// Applies a color control change.
function applyColorControlChange(id, value) {
  const binding = COLOR_BINDINGS.find(([colorId]) => colorId === id);
  if (!binding) {
    return;
  }

  const [, settingKey] = binding;
  settings[settingKey] = value;

  if (
    id === "paper-color" ||
    id === "paper-accent-color" ||
    id === "texture-color" ||
    id === "texture-accent-color"
  ) {
    applyBackgroundTheme();
    rebuildPaperPreview();
    syncControls();
    return;
  }

  if (id === "ink-color" && typeof clearRenderFrameCache === "function") {
    clearRenderFrameCache();
  }

  syncControls();
}

// Applies a file control change.
function applyFileControlChange(id, file) {
  if (!file) {
    return;
  }

  if (id === "image-upload") {
    loadUserImage(file);
    return;
  }

  if (id === "texture-upload") {
    loadUserTexture(file);
  }
}

