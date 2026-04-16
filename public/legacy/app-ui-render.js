// UI synchronization and visibility helpers.
// Syncs control values back to the UI.
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

// Refreshes the overall UI state.
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

// Applies import and export lock states.
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

// Applies the reset button state.
function applyResetButtonState() {
  const resetButton = document.getElementById("reset-settings");
  if (!resetButton) {
    return;
  }

  const resetLocked = Boolean(exportState.active || appStatusState.analysisActive);
  resetButton.disabled = resetLocked;
  resetButton.setAttribute("aria-disabled", resetLocked ? "true" : "false");
}

// Sets a control value.
function setControlValue(id, value) {
  const element = document.getElementById(id);
  if (element && element.value !== String(value)) {
    element.value = String(value);
  }
}

// Updates a range control readout.
function updateRangeReadout(id, divisor = 1, suffix = "") {
  const element = document.getElementById(id);
  const output = document.querySelector(`[data-readout-for="${id}"]`);
  if (!element || !output) {
    return;
  }

  const numericValue = Number(element.value);
  output.textContent = divisor === 1 ? `${numericValue}${suffix}` : `${numericValue / divisor}${suffix}`;
}

// Applies mode-based control visibility.
function applyAlgorithmVisibility() {
  const activeModes = getVisibleModes();
  document.querySelectorAll("[data-modes]").forEach((element) => {
    const modes = (element.dataset.modes || "").split(/\s+/).filter(Boolean);
    const visible = modes.length === 0 || modes.some((mode) => activeModes.has(mode));
    element.classList.toggle("is-hidden", !visible);
  });
}

// Gets the currently visible render modes.
function getVisibleModes() {
  const modes = new Set([settings.renderMode]);
  if (settings.renderMode === "contour") {
    modes.add(`contour-variant-${settings.contourVariant}`);
  }
  return modes;
}

// Applies reference overlay visibility.
function applyReferenceOverlayVisibility() {
  document.querySelectorAll("[data-requires-overlay]").forEach((element) => {
    element.classList.toggle("is-hidden", !settings.referenceOverlay);
  });
}

// Applies control tooltip metadata.
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

// Applies the export UI state.
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
