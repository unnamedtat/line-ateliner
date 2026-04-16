// UI control bindings: DOM events, control synchronization, and contextual visibility.
const SELECT_BINDINGS = [
  {
    id: "render-mode",
    onChange: (value) => {
      settings.renderMode = value;
      scheduleRebuild();
    }
  },
  {
    id: "contour-variant",
    onChange: (value) => {
      settings.contourVariant = value;
      scheduleRebuild();
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

function refreshDistortionPreview() {
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
}

function refreshExportSettingsPreview() {
  if (typeof applyExportUiState === "function") {
    applyExportUiState();
  }
}

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

function patchAnalysisUiState(patch = {}) {
  appStatusState = {
    ...appStatusState,
    ...patch
  };
  refreshUiState();
}

function revealExportPanel() {
  settings.uiHidden = false;
  if (typeof setActiveControlTab === "function") {
    setActiveControlTab("export");
  }
  applyUiVisibility();
}

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

function bindControls() {
  ensureRetroLayout();
  const panel = document.getElementById("ui-shell");
  if (!panel) {
    return;
  }

  if (panel.dataset.bound === "1") {
    refreshUiState();
    return;
  }

  panel.dataset.bound = "1";

  SELECT_BINDINGS.forEach(({ id, onChange }) => bindSelect(id, onChange));
  RANGE_BINDINGS.forEach(([id, settingKey]) => bindRange(id, settingKey));
  COLOR_BINDINGS.forEach(([id, settingKey]) => bindColor(id, settingKey));

  bindRangeWithCallback("paper-texture-opacity", "paperTextureOpacity", (value) => {
    settings.paperTextureOpacity = value;
    syncTextureOverlay();
  });

  bindFileInput("image-upload", loadUserImage);
  bindFileInput("texture-upload", loadUserTexture);

  document.querySelectorAll("[data-panel-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      settings.uiHidden = !settings.uiHidden;
      applyUiVisibility();
    });
  });

  document.querySelectorAll("[data-tab]").forEach((tabButton) => {
    tabButton.addEventListener("click", () => {
      setActiveControlTab(tabButton.dataset.tab);
    });
  });

  const resetButton = document.getElementById("reset-settings");
  if (resetButton) {
    resetButton.addEventListener("click", resetAllSettings);
  }

  [
    ["export-video", startVideoExport],
    ["export-gif", startGifExport],
    ["toolbar-export-video", startVideoExport],
    ["toolbar-export-gif", startGifExport]
  ].forEach(([id, action]) => {
    bindActionButton(id, action);
  });

  ["export-recovery-primary", "export-recovery-secondary"].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    element.addEventListener("click", () => {
      const action = element.dataset.exportAction || "";
      if (!action || exportState.active || typeof runExportRecoveryAction !== "function") {
        return;
      }
      runExportRecoveryAction(action);
    });
  });

  [
    ["analysis-continue-wait", continueAnalysisWait],
    ["analysis-stop-wait", cancelAnalysisWait]
  ].forEach(([id, action]) => {
    bindActionButton(id, action);
  });

  syncControls();
}

function bindSelect(id, onChange) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.addEventListener("change", (event) => {
    onChange(event.target.value);
    syncControls();
  });
}

function bindRange(id, settingKey) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const handleInput = (event) => {
    const value = Number(event.target.value);
    settings[settingKey] = value;
    updateRangeReadout(id);

    if (id === "scene-scale" || id === "scene-offset-x" || id === "scene-offset-y") {
      refreshSceneLayoutPreview();
      return;
    }

    if (
      id === "paper-gradient-angle" ||
      id === "paper-texture-strength" ||
      id === "paper-texture-scale"
    ) {
      rebuildPaperPreview();
      return;
    }

    if (
      id === "export-duration-seconds" ||
      id === "export-frame-rate" ||
      id === "export-resolution-scale"
    ) {
      refreshExportSettingsPreview();
      return;
    }

    if (id === "reference-overlay-opacity" || id === "boil-hold-frames") {
      return;
    }

    if (
      id === "distortion-scale" ||
      id === "distortion-frequency" ||
      id === "distortion-octaves" ||
      id === "distortion-speed"
    ) {
      refreshDistortionPreview();
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
      return;
    }

    scheduleRebuild();
  };

  element.addEventListener("input", handleInput);
  element.addEventListener("change", handleInput);
}

function bindRangeWithCallback(id, settingKey, callback) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const handleInput = (event) => {
    const value = Number(event.target.value);
    settings[settingKey] = value;
    updateRangeReadout(id, 1, "%");
    callback(value);
  };

  element.addEventListener("input", handleInput);
  element.addEventListener("change", handleInput);
}

function bindColor(id, settingKey) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const handleInput = (event) => {
    settings[settingKey] = event.target.value;

    if (
      id === "paper-color" ||
      id === "paper-accent-color" ||
      id === "texture-color" ||
      id === "texture-accent-color"
    ) {
      applyBackgroundTheme();
      rebuildPaperPreview();
      return;
    }

    if (id === "ink-color" && typeof clearRenderFrameCache === "function") {
      clearRenderFrameCache();
    }
  };

  element.addEventListener("input", handleInput);
  element.addEventListener("change", handleInput);
}

function bindFileInput(id, onFile) {
  const input = document.getElementById(id);
  if (!input) {
    return;
  }

  input.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFile(file);
    }
  });
}

function bindActionButton(id, onClick) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.addEventListener("click", () => {
    if (!exportState.active) {
      onClick();
    }
  });
}

function syncControls() {
  CONTROL_VALUE_BINDINGS.forEach(([id, getValue]) => {
    setControlValue(id, getValue());
  });

  RANGE_READOUT_BINDINGS.forEach(([id, divisor = 1, suffix = ""]) => {
    updateRangeReadout(id, divisor, suffix);
  });

  const imageName = document.getElementById("image-name");
  if (imageName) {
    imageName.textContent = appStatusState.analysisActive
      ? `当前图片: ${sourceImageLabel} · 正在分析...`
      : `当前图片: ${sourceImageLabel}`;
  }

  const uploadSummary = document.getElementById("image-upload-summary");
  if (uploadSummary) {
    uploadSummary.textContent = sourceImageLabel;
  }

  const textureUploadSummary = document.getElementById("texture-upload-summary");
  if (textureUploadSummary) {
    textureUploadSummary.textContent = uploadedTextureLabel;
  }

  refreshUiState();
}

function refreshUiState() {
  applyUiVisibility();
  applyBackgroundTheme();
  applyAlgorithmVisibility();
  applyReferenceOverlayVisibility();
  applyImportExportLocks();
  applyResetButtonState();
  applyControlTooltips();
  applyActiveTab();
  syncStatusSummary();
  syncCanvasEmptyState();
  applyExportUiState();
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
}

function applyImportExportLocks() {
  const importExportLocked = Boolean(appStatusState.analysisActive);
  const importTargets = ["image-upload", "texture-upload"];
  const exportReady = !appStatusState.analysisActive && !appStatusState.analysisFailed;

  importTargets.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.disabled = importExportLocked;
    }

    document.querySelectorAll(`label[for="${id}"]`).forEach((label) => {
      label.classList.toggle("is-disabled", importExportLocked);
      label.setAttribute("aria-disabled", importExportLocked ? "true" : "false");
    });
  });

  document.body.classList.toggle("is-analysis-locked", importExportLocked);
  document.body.dataset.exportReady = exportReady ? "true" : "false";
}

function applyResetButtonState() {
  const resetButton = document.getElementById("reset-settings");
  if (!resetButton) {
    return;
  }

  const resetLocked = Boolean(exportState.active || appStatusState.analysisActive);
  resetButton.disabled = resetLocked;
  resetButton.setAttribute("aria-disabled", resetLocked ? "true" : "false");
}

function setControlValue(id, value) {
  const element = document.getElementById(id);
  if (element && element.value !== String(value)) {
    element.value = String(value);
  }
}

function updateRangeReadout(id, divisor = 1, suffix = "") {
  const element = document.getElementById(id);
  const output = document.querySelector(`[data-readout-for="${id}"]`);
  if (!element || !output) {
    return;
  }

  const numericValue = Number(element.value);
  output.textContent = divisor === 1 ? `${numericValue}${suffix}` : `${numericValue / divisor}${suffix}`;
}

function applyAlgorithmVisibility() {
  const activeModes = getVisibleModes();
  document.querySelectorAll("[data-modes]").forEach((element) => {
    const modes = (element.dataset.modes || "").split(/\s+/).filter(Boolean);
    const visible = modes.length === 0 || modes.some((mode) => activeModes.has(mode));
    element.classList.toggle("is-hidden", !visible);
  });
}

function getVisibleModes() {
  const modes = new Set([settings.renderMode]);
  if (settings.renderMode === "contour") {
    modes.add(`contour-variant-${settings.contourVariant}`);
  }
  return modes;
}

function applyReferenceOverlayVisibility() {
  document.querySelectorAll("[data-requires-overlay]").forEach((element) => {
    element.classList.toggle("is-hidden", !settings.referenceOverlay);
  });
}

function applyControlTooltips() {
  Object.entries(CONTROL_TOOLTIPS).forEach(([id, tooltip]) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    const label = document.querySelector(`label[for="${id}"]`);
    const block = element.closest(".control-block");
    if (block) {
      block.dataset.tooltip = tooltip;
    }
    if (label) {
      label.dataset.tooltip = tooltip;
    }
  });
}

function applyExportUiState() {
  const status = document.getElementById("export-status");
  const inlineStatus = document.getElementById("export-status-inline");
  const estimate = document.getElementById("export-estimate");
  const recoveryRow = document.getElementById("export-recovery-actions");
  const recoveryPrimary = document.getElementById("export-recovery-primary");
  const recoverySecondary = document.getElementById("export-recovery-secondary");
  const estimateSummary =
    typeof getExportEstimateSummary === "function"
      ? getExportEstimateSummary()
      : { text: "", level: "normal" };

  let canExportOutput = false;
  if (typeof hasDrawableOutput === "function") {
    try {
      canExportOutput = Boolean(hasDrawableOutput());
    } catch (error) {
      canExportOutput = false;
    }
  }
  const exportLocked = exportState.active || appStatusState.analysisActive || !canExportOutput;

  [
    document.getElementById("export-video"),
    document.getElementById("toolbar-export-video")
  ].forEach((videoButton) => {
    if (!videoButton) {
      return;
    }
    videoButton.disabled = exportLocked;
    videoButton.textContent = exportState.active && exportState.format === "video" ? "导出中..." : "导出 MP4";
  });

  [
    document.getElementById("export-gif"),
    document.getElementById("toolbar-export-gif")
  ].forEach((gifButton) => {
    if (!gifButton) {
      return;
    }
    gifButton.disabled = exportLocked;
    gifButton.textContent = exportState.active && exportState.format === "gif" ? "导出中..." : "导出 GIF";
  });

  if (status) {
    status.textContent = exportState.status;
  }
  if (inlineStatus) {
    inlineStatus.textContent = exportState.status;
  }
  if (estimate) {
    estimate.textContent = estimateSummary.text;
    estimate.dataset.level = estimateSummary.level || "normal";
  }

  if (recoveryRow && recoveryPrimary && recoverySecondary) {
    const recovery = exportState.recovery;
    const primary = recovery?.primary || null;
    const secondary = recovery?.secondary || null;
    recoveryRow.classList.toggle("is-hidden", !primary && !secondary);

    recoveryPrimary.classList.toggle("is-hidden", !primary);
    recoveryPrimary.disabled = exportLocked;
    recoveryPrimary.textContent = primary?.label || "";
    recoveryPrimary.dataset.exportAction = primary?.action || "";

    recoverySecondary.classList.toggle("is-hidden", !secondary);
    recoverySecondary.disabled = exportLocked;
    recoverySecondary.textContent = secondary?.label || "";
    recoverySecondary.dataset.exportAction = secondary?.action || "";
  }
}
