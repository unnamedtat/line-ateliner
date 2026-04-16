// Control binding helpers for inputs, actions, and tabs.
// Binds UI controls once.
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

// Binds a select control.
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

// Binds a range control.
function bindRange(id, settingKey) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  let lastAppliedValue = Number(element.value);
  let lastAppliedSource = "change";

  const handleInput = (event, source) => {
    const value = Number(event.target.value);
    if (source === "change" && lastAppliedSource === "input" && value === lastAppliedValue) {
      lastAppliedSource = source;
      return;
    }

    lastAppliedValue = value;
    lastAppliedSource = source;
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
      return;
    }

    scheduleOutputRebuild();
  };

  element.addEventListener("input", (event) => {
    handleInput(event, "input");
  });
  element.addEventListener("change", (event) => {
    handleInput(event, "change");
  });
}

// Binds a range control with a callback.
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

// Binds a color control.
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

// Binds a file input.
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

// Binds an action button.
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
