// UI synchronization and visibility helpers.
// Syncs control values back to the UI.
function syncControls() {
  refreshUiState();
}

// Refreshes the overall UI state.
function refreshUiState() {
  applyBackgroundTheme();
  applyImportExportLocks();
  applyControlTooltips();
  if (typeof syncDistortionOverlay === "function") {
    syncDistortionOverlay();
  }
  if (typeof syncLegacyUiBridge === "function") {
    syncLegacyUiBridge();
  }
}

// Applies import and export lock states.
function applyImportExportLocks() {
  const importExportLocked = Boolean(appStatusState.analysisActive || exportState.active);
  const importTargets = ["image-upload", "texture-upload"];
  const exportReady = !appStatusState.analysisActive && !appStatusState.analysisFailed;

  importTargets.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.disabled = importExportLocked;
    }
  });

  document.body.classList.toggle("is-analysis-locked", importExportLocked);
  document.body.dataset.exportReady = exportReady ? "true" : "false";
}

// Applies the reset button state.
function applyResetButtonState() {
  if (typeof syncLegacyUiBridge === "function") {
    syncLegacyUiBridge();
  }
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
  Object.entries(getLocalizedControlTooltips()).forEach(([id, tooltip]) => {
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
  if (typeof syncLegacyUiBridge === "function") {
    syncLegacyUiBridge();
  }
}
