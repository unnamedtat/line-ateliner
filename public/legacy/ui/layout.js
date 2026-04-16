// UI bridge helpers: labels, panel state, and React-owned shell snapshots.
const RENDER_MODE_LABELS = {
  edge: "边缘采样",
  "edge-fill": "边缘线填充",
  "region-grow": "亮度扩张",
  "color-grow": "颜色扩张",
  "color-boundary": "色块边界",
  distortion: "SVG 形变",
  contour: "轮廓描摹",
  path: "中心线路径"
};

const CONTOUR_VARIANT_LABELS = {
  contour: "标准轮廓",
  "wave-contour": "波浪轮廓",
  "wave-shape": "波浪形变",
  "rubber-contour": "橡皮轮廓"
};

const LEGACY_UI_SYNC_EVENT = "lineatelier:uistate";
const LEGACY_UI_READY_EVENT = "lineatelier:bridge-ready";

let activeControlTab = "input";

// Ensures the React-rendered retro shell is marked ready.
function ensureRetroLayout() {
  const panel = document.getElementById("ui-shell");
  if (!panel) {
    return;
  }

  document.body.classList.add("is-retro-layout");
  panel.dataset.retroReady = "1";
  syncLegacyUiBridge();
}

// Gets the current mode label.
function getCurrentModeLabel() {
  if (settings.renderMode === "contour") {
    return CONTOUR_VARIANT_LABELS[settings.contourVariant] || RENDER_MODE_LABELS.contour;
  }

  return RENDER_MODE_LABELS[settings.renderMode] || settings.renderMode;
}

// Safely checks whether there is drawable output.
function hasDrawableOutputSafe() {
  if (typeof hasDrawableOutput !== "function") {
    return false;
  }

  try {
    return Boolean(hasDrawableOutput());
  } catch (error) {
    return false;
  }
}

// Safely reads the export estimate summary.
function getExportEstimateSnapshot() {
  if (typeof getExportEstimateSummary !== "function") {
    return {
      text: "",
      level: "normal"
    };
  }

  try {
    return getExportEstimateSummary();
  } catch (error) {
    return {
      text: "",
      level: "normal"
    };
  }
}

// Builds the status line for the current file.
function getFileSummaryLabel() {
  if (appStatusState.analysisFailed) {
    return `${sourceImageLabel} - 分析失败`;
  }

  if (appStatusState.analysisActive) {
    return `${sourceImageLabel} - 正在分析中`;
  }

  if (sourceImage && sourceImage.width && sourceImage.height) {
    return `${sourceImageLabel} - ${sourceImage.width}×${sourceImage.height}`;
  }

  return sourceImageLabel;
}

// Builds the input section file label.
function getImageNameLabel() {
  return appStatusState.analysisActive
    ? `当前图片: ${sourceImageLabel} · 正在分析...`
    : `当前图片: ${sourceImageLabel}`;
}

// Builds the canvas processing copy.
function getProcessingCopy() {
  if (appStatusState.analysisFailed) {
    return appStatusState.analysisFailureMessage || "当前这次分析没有完成，请调整参数后重试。";
  }

  return appStatusState.analysisMessage || "正在读取图片并重建预览，请稍候。";
}

// Gets the current visible modes.
function getVisibleModesSnapshot() {
  const modes = new Set([settings.renderMode]);
  if (settings.renderMode === "contour") {
    modes.add(`contour-variant-${settings.contourVariant}`);
  }

  return Array.from(modes);
}

// Builds the current control value snapshot.
function buildControlValueSnapshot() {
  const values = {};

  if (Array.isArray(CONTROL_VALUE_BINDINGS)) {
    CONTROL_VALUE_BINDINGS.forEach(([id, getValue]) => {
      values[id] = getValue();
    });
  }

  return values;
}

// Builds the current range readout snapshot.
function buildRangeReadoutSnapshot(controlValues) {
  const readouts = {};

  if (Array.isArray(RANGE_READOUT_BINDINGS)) {
    RANGE_READOUT_BINDINGS.forEach(([id, divisor = 1, suffix = ""]) => {
      const numericValue = Number(controlValues[id] ?? 0);
      readouts[id] =
        divisor === 1 ? `${numericValue}${suffix}` : `${numericValue / divisor}${suffix}`;
    });
  }

  return readouts;
}

// Builds the current UI snapshot for React.
function buildLegacyUiSnapshot() {
  const estimateSummary = getExportEstimateSnapshot();
  const canExportOutput = hasDrawableOutputSafe();
  const exportLocked = exportState.active || appStatusState.analysisActive || !canExportOutput;
  const controlValues = buildControlValueSnapshot();
  const recovery = exportState.recovery || {};
  const videoLabel = exportState.active && exportState.format === "video" ? "导出中..." : "导出 MP4";
  const gifLabel = exportState.active && exportState.format === "gif" ? "导出中..." : "导出 GIF";
  const isAnalyzing = Boolean(appStatusState.analysisActive);
  const hasFailure = Boolean(appStatusState.analysisFailed);

  return {
    ready: true,
    activeControlTab,
    uiHidden: Boolean(settings.uiHidden),
    modeSummary: `${getCurrentModeLabel()}模式`,
    fileSummary: getFileSummaryLabel(),
    imageName: getImageNameLabel(),
    textureUploadSummary: uploadedTextureLabel,
    importExportLocked: isAnalyzing,
    resetLocked: Boolean(exportState.active || appStatusState.analysisActive),
    canvasEmptyVisible: !canExportOutput && !isAnalyzing && !hasFailure,
    processingVisible: isAnalyzing || hasFailure,
    processingBadge: hasFailure ? "分析失败" : "上传后正分析",
    processingCopy: getProcessingCopy(),
    processingActionsVisible: isAnalyzing && Boolean(appStatusState.analysisPromptVisible),
    exportLocked,
    exportVideoLabel: videoLabel,
    exportGifLabel: gifLabel,
    exportStatus: exportState.status,
    exportEstimate: estimateSummary.text,
    exportEstimateLevel: estimateSummary.level || "normal",
    recoveryPrimary: recovery.primary || null,
    recoverySecondary: recovery.secondary || null,
    controlValues,
    rangeReadouts: buildRangeReadoutSnapshot(controlValues),
    visibleModes: getVisibleModesSnapshot(),
    referenceOverlayEnabled: Boolean(settings.referenceOverlay)
  };
}

// Creates the shared React bridge object.
function ensureLegacyUiBridge() {
  if (window.__lineAtelierUiBridge) {
    return window.__lineAtelierUiBridge;
  }

  window.__lineAtelierUiBridge = {
    getSnapshot: buildLegacyUiSnapshot,
    actions: {
      togglePanel: () => {
        settings.uiHidden = !settings.uiHidden;
        syncLegacyUiBridge();
      },
      setActiveControlTab: (tab) => {
        setActiveControlTab(tab);
      },
      resetAllSettings: () => {
        if (typeof resetAllSettings === "function") {
          resetAllSettings();
        }
      },
      startVideoExport: () => {
        if (typeof startVideoExport === "function") {
          startVideoExport();
        }
      },
      startGifExport: () => {
        if (typeof startGifExport === "function") {
          startGifExport();
        }
      },
      continueAnalysisWait: () => {
        if (typeof continueAnalysisWait === "function") {
          continueAnalysisWait();
        }
      },
      cancelAnalysisWait: () => {
        if (typeof cancelAnalysisWait === "function") {
          cancelAnalysisWait();
        }
      },
      runExportRecoveryAction: (action) => {
        if (typeof runExportRecoveryAction === "function") {
          runExportRecoveryAction(action);
        }
      },
      updateSelect: (id, value) => {
        if (typeof applySelectControlChange === "function") {
          applySelectControlChange(id, value);
        }
      },
      updateRange: (id, value, source) => {
        if (typeof applyRangeControlChange === "function") {
          applyRangeControlChange(id, value, source);
        }
      },
      updateColor: (id, value) => {
        if (typeof applyColorControlChange === "function") {
          applyColorControlChange(id, value);
        }
      },
      updateFile: (id, file) => {
        if (typeof applyFileControlChange === "function") {
          applyFileControlChange(id, file);
        }
      }
    }
  };

  window.dispatchEvent(new CustomEvent(LEGACY_UI_READY_EVENT));
  return window.__lineAtelierUiBridge;
}

// Pushes the latest UI snapshot to React listeners.
function syncLegacyUiBridge() {
  const bridge = ensureLegacyUiBridge();
  window.dispatchEvent(
    new CustomEvent(LEGACY_UI_SYNC_EVENT, {
      detail: bridge.getSnapshot()
    })
  );
}

// Applies the active control tab.
function applyActiveTab() {
  syncLegacyUiBridge();
}

// Syncs the status summary text.
function syncStatusSummary() {
  syncLegacyUiBridge();
}

// Sets the active control tab.
function setActiveControlTab(tab) {
  activeControlTab = tab || "input";

  if (activeControlTab === "export" && typeof preloadGifLibrary === "function") {
    preloadGifLibrary();
  }

  syncLegacyUiBridge();
}

// Syncs the canvas empty state.
function syncCanvasEmptyState() {
  syncLegacyUiBridge();
}

// Applies overall UI visibility.
function applyUiVisibility() {
  syncLegacyUiBridge();
}
