// Shared UI state helpers, bindings, and high-level control actions.
// UI control bindings: DOM events, control synchronization, and contextual visibility.
const SELECT_BINDINGS = [
  {
    id: "render-mode",
    onChange: (value) => {
      settings.renderMode = value;
      scheduleOutputRebuild();
    }
  },
  {
    id: "contour-variant",
    onChange: (value) => {
      settings.contourVariant = value;
      scheduleOutputRebuild();
    }
  },
  {
    id: "analysis-quality",
    onChange: (value) => {
      settings.analysisQuality = value;
      scheduleRebuild();
    }
  },
  {
    id: "background-preset",
    onChange: (value) => {
      settings.backgroundPreset = value;
      applyBackgroundPreset(value);
      applyBackgroundTheme();
      rebuildPaperPreview();
    }
  },
  {
    id: "reference-overlay",
    onChange: (value) => {
      settings.referenceOverlay = value === "on";
      applyReferenceOverlayVisibility();
    }
  },
  {
    id: "paper-fill-mode",
    onChange: (value) => {
      settings.paperFillMode = value;
      applyBackgroundTheme();
      rebuildPaperPreview();
    }
  },
  {
    id: "paper-texture",
    onChange: (value) => {
      settings.paperTexture = value;
      rebuildPaperPreview();
    }
  }
];

const RANGE_BINDINGS = [
  ["scene-scale", "sceneScale"],
  ["scene-offset-x", "sceneOffsetX"],
  ["scene-offset-y", "sceneOffsetY"],
  ["line-threshold", "lineBrightnessThreshold"],
  ["ink-opacity", "inkOpacity"],
  ["reference-overlay-opacity", "referenceOverlayOpacity"],
  ["edge-threshold", "edgeThreshold"],
  ["edge-fill-threshold", "edgeFillThreshold"],
  ["edge-fill-cell-size", "edgeFillCellSize"],
  ["edge-fill-min-normal-gap", "edgeFillMinNormalGap"],
  ["edge-fill-max-normal-gap", "edgeFillMaxNormalGap"],
  ["edge-fill-max-tangent-gap", "edgeFillMaxTangentGap"],
  ["edge-fill-min-tangent-dot", "edgeFillMinTangentDot"],
  ["edge-fill-max-normal-dot", "edgeFillMaxNormalDot"],
  ["edge-smoothness", "edgeSmoothness"],
  ["ink-threshold", "inkBrightnessThreshold"],
  ["contrast-threshold", "localContrastThreshold"],
  ["color-threshold", "colorDistanceThreshold"],
  ["wave-amplitude", "waveAmplitude"],
  ["wave-frequency", "waveFrequency"],
  ["wave-speed", "waveSpeed"],
  ["distortion-scale", "distortionScale"],
  ["distortion-frequency", "distortionFrequency"],
  ["distortion-octaves", "distortionOctaves"],
  ["distortion-speed", "distortionSpeed"],
  ["paper-gradient-angle", "paperGradientAngle"],
  ["paper-texture-strength", "paperTextureStrength"],
  ["paper-texture-scale", "paperTextureScale"],
  ["line-width-scale", "lineWidthScale"],
  ["export-duration-seconds", "exportDurationSeconds"],
  ["export-frame-rate", "exportFrameRate"],
  ["export-resolution-scale", "exportResolutionScale"],
  ["boil-hold-frames", "boilHoldFrames"],
  ["edge-jitter-normal", "edgeJitterNormal"],
  ["edge-jitter-tangent", "edgeJitterTangent"],
  ["contour-stroke-thickness", "contourStrokeThickness"],
  ["path-jitter-normal", "pathJitterNormal"],
  ["path-jitter-tangent", "pathJitterTangent"],
  ["width-jitter", "widthJitter"]
];

const COLOR_BINDINGS = [
  ["paper-color", "paperColor"],
  ["paper-accent-color", "paperAccentColor"],
  ["ink-color", "inkColor"],
  ["texture-color", "textureColor"],
  ["texture-accent-color", "textureAccentColor"]
];

const CONTROL_VALUE_BINDINGS = [
  ["render-mode", () => settings.renderMode],
  ["contour-variant", () => settings.contourVariant],
  ["analysis-quality", () => settings.analysisQuality],
  ["scene-scale", () => settings.sceneScale],
  ["scene-offset-x", () => settings.sceneOffsetX],
  ["scene-offset-y", () => settings.sceneOffsetY],
  ["background-preset", () => settings.backgroundPreset],
  ["reference-overlay", () => (settings.referenceOverlay ? "on" : "off")],
  ["ink-color", () => settings.inkColor],
  ["ink-opacity", () => settings.inkOpacity],
  ["reference-overlay-opacity", () => settings.referenceOverlayOpacity],
  ["paper-fill-mode", () => settings.paperFillMode],
  ["paper-texture", () => settings.paperTexture],
  ["paper-color", () => settings.paperColor],
  ["paper-accent-color", () => settings.paperAccentColor],
  ["texture-color", () => settings.textureColor],
  ["texture-accent-color", () => settings.textureAccentColor],
  ["line-threshold", () => settings.lineBrightnessThreshold],
  ["edge-threshold", () => settings.edgeThreshold],
  ["edge-fill-threshold", () => settings.edgeFillThreshold],
  ["edge-fill-cell-size", () => round(settings.edgeFillCellSize)],
  ["edge-fill-min-normal-gap", () => settings.edgeFillMinNormalGap],
  ["edge-fill-max-normal-gap", () => settings.edgeFillMaxNormalGap],
  ["edge-fill-max-tangent-gap", () => settings.edgeFillMaxTangentGap],
  ["edge-fill-min-tangent-dot", () => settings.edgeFillMinTangentDot],
  ["edge-fill-max-normal-dot", () => settings.edgeFillMaxNormalDot],
  ["edge-smoothness", () => settings.edgeSmoothness],
  ["ink-threshold", () => settings.inkBrightnessThreshold],
  ["contrast-threshold", () => settings.localContrastThreshold],
  ["color-threshold", () => settings.colorDistanceThreshold],
  ["wave-amplitude", () => settings.waveAmplitude],
  ["wave-frequency", () => settings.waveFrequency],
  ["wave-speed", () => settings.waveSpeed],
  ["distortion-scale", () => settings.distortionScale],
  ["distortion-frequency", () => settings.distortionFrequency],
  ["distortion-octaves", () => settings.distortionOctaves],
  ["distortion-speed", () => settings.distortionSpeed],
  ["paper-gradient-angle", () => settings.paperGradientAngle],
  ["paper-texture-strength", () => settings.paperTextureStrength],
  ["paper-texture-opacity", () => settings.paperTextureOpacity],
  ["paper-texture-scale", () => settings.paperTextureScale],
  ["line-width-scale", () => settings.lineWidthScale],
  ["export-duration-seconds", () => settings.exportDurationSeconds],
  ["export-frame-rate", () => settings.exportFrameRate],
  ["export-resolution-scale", () => settings.exportResolutionScale],
  ["boil-hold-frames", () => settings.boilHoldFrames],
  ["edge-jitter-normal", () => settings.edgeJitterNormal],
  ["edge-jitter-tangent", () => settings.edgeJitterTangent],
  ["contour-stroke-thickness", () => settings.contourStrokeThickness],
  ["path-jitter-normal", () => settings.pathJitterNormal],
  ["path-jitter-tangent", () => settings.pathJitterTangent],
  ["width-jitter", () => settings.widthJitter]
];

const RANGE_READOUT_BINDINGS = [
  ["line-threshold"],
  ["ink-opacity", 1, "%"],
  ["reference-overlay-opacity", 1, "%"],
  ["scene-scale", 1, "%"],
  ["scene-offset-x", 1, "%"],
  ["scene-offset-y", 1, "%"],
  ["edge-threshold"],
  ["edge-fill-threshold"],
  ["edge-fill-cell-size"],
  ["edge-fill-min-normal-gap"],
  ["edge-fill-max-normal-gap"],
  ["edge-fill-max-tangent-gap"],
  ["edge-fill-min-tangent-dot"],
  ["edge-fill-max-normal-dot"],
  ["edge-smoothness"],
  ["ink-threshold"],
  ["contrast-threshold"],
  ["color-threshold"],
  ["wave-amplitude"],
  ["wave-frequency"],
  ["wave-speed"],
  ["distortion-scale"],
  ["distortion-frequency"],
  ["distortion-octaves"],
  ["distortion-speed"],
  ["paper-gradient-angle"],
  ["paper-texture-strength"],
  ["paper-texture-opacity", 1, "%"],
  ["paper-texture-scale"],
  ["line-width-scale", 1, "%"],
  ["export-duration-seconds", 1, "s"],
  ["export-frame-rate", 1, "fps"],
  ["export-resolution-scale", 1, "%"],
  ["boil-hold-frames"],
  ["edge-jitter-normal"],
  ["edge-jitter-tangent"],
  ["contour-stroke-thickness", 1, "%"],
  ["path-jitter-normal"],
  ["path-jitter-tangent"],
  ["width-jitter", 1, "%"]
];

// Rebuilds the paper preview layers.
function rebuildPaperPreview() {
  if (typeof buildPaperBaseLayer === "function") {
    buildPaperBaseLayer();
  }
  if (typeof buildPaperLayer === "function") {
    buildPaperLayer();
  }
  if (typeof clearRenderFrameCache === "function") {
    clearRenderFrameCache();
  }
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
}

// Refreshes the scene layout preview.
function refreshSceneLayoutPreview() {
  if (typeof buildSceneLayout === "function") {
    buildSceneLayout();
  }
  if (typeof clearRenderFrameCache === "function") {
    clearRenderFrameCache();
  }
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
}

// Refreshes the distortion preview.
function refreshDistortionPreview() {
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
}

// Refreshes export settings preview state.
function refreshExportSettingsPreview() {
  if (typeof applyExportUiState === "function") {
    applyExportUiState();
  }
}

// Sets the analysis UI state.
function setAnalysisUiState(active, message = "") {
  appStatusState = {
    ...appStatusState,
    analysisActive: Boolean(active),
    analysisMessage: active ? message || "正在读取图片并重建预览，请稍候。" : "",
    analysisPromptVisible: false,
    analysisFailed: false,
    analysisFailureMessage: ""
  };
  refreshUiState();
}

// Patches the analysis UI state.
function patchAnalysisUiState(patch = {}) {
  appStatusState = {
    ...appStatusState,
    ...patch
  };
  refreshUiState();
}

// Reveals the export panel.
function revealExportPanel() {
  settings.uiHidden = false;
  if (typeof setActiveControlTab === "function") {
    setActiveControlTab("export");
  }
  applyUiVisibility();
}

// Resets all settings to defaults.
function resetAllSettings() {
  if (exportState.active || appStatusState.analysisActive) {
    return;
  }

  const preservedUiHidden = settings.uiHidden;
  settings = {
    ...DEFAULT_SETTINGS,
    uiHidden: preservedUiHidden
  };

  syncControls();
  rebuildScene("所有参数已恢复默认值，正在重建预览...");
}
