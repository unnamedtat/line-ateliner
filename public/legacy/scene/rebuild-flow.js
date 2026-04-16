// Scene rebuild scheduling, cancellation, and responsiveness helpers.
// Schedules a full scene rebuild.
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildScene("参数已更新，正在重建预览...");
  }, 60);
}

// Normalizes output rebuild options.
function normalizeModeOutputOptions(options = {}) {
  return {
    reuseGeometry: Boolean(options.reuseGeometry)
  };
}

// Schedules a lighter output-only rebuild.
function scheduleOutputRebuild(options = {}) {
  clearTimeout(rebuildTimer);
  const nextOptions = normalizeModeOutputOptions(options);
  rebuildTimer = setTimeout(() => {
    rebuildModeOutput("参数已更新，正在重算当前笔触...", nextOptions);
  }, nextOptions.reuseGeometry ? 90 : 60);
}

// Clears the cached render frame layers.
function clearRenderFrameCache() {
  if (renderFrameCache?.frames instanceof Map) {
    renderFrameCache.frames.forEach((layer) => {
      if (layer && typeof layer.remove === "function") {
        layer.remove();
      }
    });
  }

  renderFrameCache = {
    mode: "",
    width: 0,
    height: 0,
    frames: new Map()
  };
}

// Gets the reusable geometry bucket for the current mode.
function getOutputGeometryKeyForMode(mode = getEffectiveRenderMode()) {
  if (mode === "edge" || mode === "edge-fill") {
    return mode;
  }

  if (
    mode === "path" ||
    mode === "region-grow" ||
    mode === "color-grow" ||
    mode === "color-boundary"
  ) {
    return mode;
  }

  if (
    mode === "contour" ||
    mode === "wave-contour" ||
    mode === "wave-shape" ||
    mode === "rubber-contour"
  ) {
    return "contour";
  }

  return "";
}

// Gets variant build options for path-based modes.
function getPathVariantOptionsForMode(mode = getEffectiveRenderMode()) {
  if (mode === "wave-contour") {
    return { variantMode: "wave-contour" };
  }

  if (mode === "wave-shape") {
    return { variantMode: "wave-shape" };
  }

  if (mode === "rubber-contour") {
    return { variantMode: "rubber-contour" };
  }

  return {};
}

// Regenerates only the current mode's jitter variants when geometry is unchanged.
async function rebuildCurrentModeVariantsAsync() {
  const effectiveMode = getEffectiveRenderMode();
  const geometryKey = getOutputGeometryKeyForMode(effectiveMode);
  if (!geometryKey || currentOutputGeometryKey !== geometryKey) {
    return false;
  }

  if (geometryKey === "edge" || geometryKey === "edge-fill") {
    if (!edgeSamples.length && !hatchSamples.length) {
      return false;
    }

    await prepareEdgeVariantsAsync(edgeSamples, false);
    await prepareEdgeVariantsAsync(hatchSamples, true);
    return true;
  }

  if (!strokePaths.length) {
    return false;
  }

  await preparePathVariantsAsync(strokePaths, getPathVariantOptionsForMode(effectiveMode));
  return true;
}

// Builds the cache key for rendered frames.
function getRenderCacheModeKey() {
  const effectiveMode = getEffectiveRenderMode();
  if (effectiveMode === "distortion") {
    return "distortion";
  }

  return [
    effectiveMode,
    width,
    height,
    settings.inkColor,
    settings.inkOpacity,
    settings.lineWidthScale,
    settings.contourStrokeThickness
  ].join("|");
}

// Gets the active boil sequence index.
function getBoilSequenceIndex(boilFrame) {
  const sequenceLength = Array.isArray(BOIL_SEQUENCE) ? BOIL_SEQUENCE.length : 0;
  if (!sequenceLength) {
    return 0;
  }

  return ((boilFrame % sequenceLength) + sequenceLength) % sequenceLength;
}

// Clears the current scene output state.
function invalidateSceneOutput() {
  sceneLayout = null;
  analysisState = null;
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];
  currentOutputGeometryKey = "";
  clearRenderFrameCache();
}

// Queues the next rebuild request.
function queueNextBuild(kind = "scene", message = "", options = {}) {
  const nextOptions = normalizeModeOutputOptions(options);
  const fallbackMessage =
    kind === "output"
      ? "参数已更新，当前输出结束后会自动重算。"
      : "参数已更新，当前分析结束后会自动重算。";

  if (kind === "scene") {
    queuedBuildKind = "scene";
    queuedModeOutputOptions = normalizeModeOutputOptions();
  } else if (queuedBuildKind !== "scene") {
    if (queuedBuildKind === "output") {
      queuedModeOutputOptions = {
        reuseGeometry: queuedModeOutputOptions.reuseGeometry && nextOptions.reuseGeometry
      };
    } else {
      queuedBuildKind = "output";
      queuedModeOutputOptions = nextOptions;
    }
  }

  queuedBuildMessage = message || queuedBuildMessage || fallbackMessage;
  if (appStatusState.analysisActive && typeof patchAnalysisUiState === "function") {
    // Analysis itself is still running on the main thread, so UI changes queue up
    // a fresh rebuild instead of starting another overlapping pass immediately.
    patchAnalysisUiState({
      analysisMessage: queuedBuildMessage
    });
  }
}

// Continues waiting for the current analysis.
function continueAnalysisWait() {
  if (!appStatusState.analysisActive || !appStatusState.analysisPromptVisible) {
    return;
  }

  if (typeof patchAnalysisUiState === "function") {
    patchAnalysisUiState({
      analysisPromptVisible: false,
      analysisMessage: "继续等待中，仍在分析当前图片..."
    });
  }
}

// Cancels the current analysis wait flow.
function cancelAnalysisWait() {
  if (!activeSceneBuild?.running) {
    return;
  }

  queuedBuildKind = "";
  queuedBuildMessage = "";
  queuedModeOutputOptions = normalizeModeOutputOptions();
  activeSceneBuild.cancelled = true;
  activeSceneBuild.failureMessage = "已停止这次分析。你可以调整图片或算法后重新尝试。";
}

// Yields control back to the browser UI thread.
function yieldToUi() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

// Creates the shared analysis abort error.
function createAnalysisAbortError() {
  const error = new Error("Analysis aborted.");
  error.code = "ANALYSIS_ABORTED";
  return error;
}

// Checks whether an error is an analysis abort.
function isAnalysisAbortError(error) {
  return error?.code === "ANALYSIS_ABORTED";
}

// Marks analysis work as active.
function beginAnalysisWork(runState) {
  analysisWorkState = {
    runState,
    lastYieldAt: performance.now()
  };
}

// Clears the active analysis work marker.
function endAnalysisWork() {
  analysisWorkState = null;
}

// Conditionally yields during long analysis work.
async function maybeYieldAnalysis(message = "", force = false) {
  const state = analysisWorkState;
  if (!state?.runState) {
    return true;
  }

  const now = performance.now();
  if (!force && now - state.lastYieldAt < 12) {
    return !state.runState.cancelled;
  }

  state.lastYieldAt = now;
  if (!refreshLongWaitState(state.runState, message)) {
    return false;
  }

  await yieldToUi();
  return refreshLongWaitState(state.runState, message);
}

// Keeps analysis work responsive and cancellable.
async function ensureAnalysisResponsive(message = "", force = false) {
  if (!(await maybeYieldAnalysis(message, force))) {
    throw createAnalysisAbortError();
  }
}

// Flushes any queued rebuild after analysis completes.
function flushQueuedSceneBuild() {
  if (!queuedBuildKind) {
    return;
  }

  const nextKind = queuedBuildKind;
  const nextMessage = queuedBuildMessage;
  const nextOptions = normalizeModeOutputOptions(queuedModeOutputOptions);
  queuedBuildKind = "";
  queuedBuildMessage = "";
  queuedModeOutputOptions = normalizeModeOutputOptions();
  window.requestAnimationFrame(() => {
    if (nextKind === "output") {
      rebuildModeOutput(nextMessage || "参数已更新，正在重算当前笔触...", nextOptions);
      return;
    }

    rebuildScene(nextMessage || "参数已更新，正在重建预览...");
  });
}

// Finalizes a scene build result.
function finalizeSceneBuild(runState, status = "idle") {
  if (activeSceneBuild?.id === runState.id) {
    activeSceneBuild = null;
  }

  if (status === "success") {
    if (typeof setAnalysisUiState === "function") {
      setAnalysisUiState(false);
    }
  } else if (status === "failure" && typeof patchAnalysisUiState === "function") {
    patchAnalysisUiState({
      analysisActive: false,
      analysisMessage: "",
      analysisPromptVisible: false,
      analysisFailed: true,
      analysisFailureMessage:
        runState.failureMessage || "这次分析没有在限定时间内完成，请调整图片尺寸或算法后重试。"
    });
  }

  flushQueuedSceneBuild();
}

// Refreshes long-running analysis messaging.
function refreshLongWaitState(runState, message = "") {
  if (!runState?.running) {
    return false;
  }

  const elapsed = performance.now() - runState.startedAt;
  if (elapsed >= ANALYSIS_TIMEOUT_MS) {
    runState.cancelled = true;
    runState.failureMessage = "分析超过 30 秒仍未完成，已自动停止。请先降低图像采样质量或切换更轻量的算法。";
    return false;
  }

  if (
    elapsed >= ANALYSIS_LONG_WAIT_PROMPT_MS &&
    !runState.promptShown &&
    typeof patchAnalysisUiState === "function"
  ) {
    runState.promptShown = true;
    patchAnalysisUiState({
      analysisPromptVisible: true,
      analysisMessage:
        message || "这次分析时间较长。你可以继续等待，也可以停止并提示失败。"
    });
  } else if (message && typeof patchAnalysisUiState === "function") {
    patchAnalysisUiState({
      analysisMessage: message
    });
  }

  return !runState.cancelled;
}
