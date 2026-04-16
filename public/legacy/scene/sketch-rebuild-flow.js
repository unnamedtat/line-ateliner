// Scene rebuild scheduling, cancellation, and responsiveness helpers.
// Schedules a full scene rebuild.
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildScene("参数已更新，正在重建预览...");
  }, 60);
}

// Schedules a lighter output-only rebuild.
function scheduleOutputRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildModeOutput("参数已更新，正在重算当前笔触...");
  }, 60);
}

// Schedules a lighter variants-only refresh for jitter-style controls.
function scheduleVariantRefresh() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    if (refreshCurrentModeVariants()) {
      return;
    }
    rebuildModeOutput("参数已更新，正在重算当前笔触...");
  }, 60);
}

// Creates an empty render frame cache object.
function createRenderFrameCacheState() {
  return {
    mode: "",
    width: 0,
    height: 0,
    frames: new Map()
  };
}

// Disposes a render frame cache object.
function disposeRenderFrameCache(cacheState) {
  if (!(cacheState?.frames instanceof Map)) {
    return;
  }

  cacheState.frames.forEach((layer) => {
    if (layer && typeof layer.remove === "function") {
      layer.remove();
    }
  });
}

// Clears the cached render frame layers.
function clearRenderFrameCache() {
  disposeRenderFrameCache(renderFrameCache);
  renderFrameCache = createRenderFrameCacheState();
}

// Clears the cached raw edge candidates used before pair/variant expansion.
function clearEdgeFieldCache() {
  edgeFieldCache = {
    key: "",
    candidateEdges: [],
    candidateHatches: []
  };
}

// Builds the cache key for raw edge candidates.
function getEdgeFieldCacheKey() {
  const analysisImage = getAnalysisImage();
  if (!analysisImage) {
    return "";
  }

  return [
    analysisImage.width,
    analysisImage.height,
    settings.lineBrightnessThreshold,
    settings.edgeThreshold,
    settings.edgeSmoothness
  ].join("|");
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

// Builds the variant options for the current path-based mode.
function getCurrentPathVariantOptions() {
  const effectiveMode = getEffectiveRenderMode();
  if (effectiveMode === "wave-contour") {
    return { variantMode: "wave-contour" };
  }
  if (effectiveMode === "wave-shape") {
    return { variantMode: "wave-shape" };
  }
  if (effectiveMode === "rubber-contour") {
    return { variantMode: "rubber-contour" };
  }
  return {};
}

// Captures the current drawable scene so it can stay visible while a rebuild runs.
function capturePreviewSceneSnapshot() {
  const hasDistortionOutput = typeof isDistortionMode === "function" && isDistortionMode() && sourceImage && sceneLayout;
  const hasLineOutput = edgeSamples.length > 0 || hatchSamples.length > 0 || strokePaths.length > 0;
  if (!sceneLayout || (!hasDistortionOutput && !hasLineOutput)) {
    return false;
  }

  clearPreviewSceneSnapshot();
  previewSceneSnapshot = {
    sceneLayout,
    analysisState,
    edgeSamples,
    hatchSamples,
    strokePaths,
    renderFrameCache,
    paperBaseLayer,
    sourceImage,
    sourceImageHref,
    settings: {
      renderMode: settings.renderMode,
      contourVariant: settings.contourVariant,
      inkColor: settings.inkColor,
      inkOpacity: settings.inkOpacity,
      lineWidthScale: settings.lineWidthScale,
      contourStrokeThickness: settings.contourStrokeThickness
    }
  };
  renderFrameCache = createRenderFrameCacheState();
  return true;
}

// Clears the retained preview snapshot once a fresh render is ready.
function clearPreviewSceneSnapshot() {
  if (!previewSceneSnapshot) {
    return;
  }

  if (previewSceneSnapshot.renderFrameCache && previewSceneSnapshot.renderFrameCache !== renderFrameCache) {
    disposeRenderFrameCache(previewSceneSnapshot.renderFrameCache);
  }
  previewSceneSnapshot = null;
}

// Refreshes only the current mode's boil/jitter variants and frame cache.
function refreshCurrentModeVariants() {
  if (appStatusState.analysisActive || activeSceneBuild?.running || !sceneLayout || !analysisState) {
    return false;
  }

  if (typeof isDistortionMode === "function" && isDistortionMode()) {
    if (typeof syncDistortionOverlay === "function") {
      syncDistortionOverlay();
    }
    return true;
  }

  const effectiveMode = getEffectiveRenderMode();
  clearRenderFrameCache();

  if (effectiveMode === "edge" || effectiveMode === "edge-fill") {
    if (!edgeSamples.length && !hatchSamples.length) {
      return false;
    }
    prepareEdgeVariants(edgeSamples, false);
    prepareEdgeVariants(hatchSamples, true);
    return true;
  }

  if (!strokePaths.length) {
    return false;
  }

  preparePathVariants(strokePaths, getCurrentPathVariantOptions());
  return true;
}

// Clears the current scene output state.
function invalidateSceneOutput(options = {}) {
  const preserveSnapshot = Boolean(options.preserveSnapshot);
  sceneLayout = null;
  analysisState = null;
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];
  clearEdgeFieldCache();
  if (preserveSnapshot) {
    renderFrameCache = createRenderFrameCacheState();
    return;
  }
  clearRenderFrameCache();
  clearPreviewSceneSnapshot();
}

// Queues the next scene rebuild request.
function queueNextSceneBuild(message = "") {
  sceneBuildQueued = true;
  queuedSceneBuildMessage = message || queuedSceneBuildMessage || "参数已更新，当前分析结束后会自动重算。";
  if (appStatusState.analysisActive && typeof patchAnalysisUiState === "function") {
    // Analysis itself is still running on the main thread, so UI changes queue up
    // a fresh rebuild instead of starting another overlapping pass immediately.
    patchAnalysisUiState({
      analysisMessage: queuedSceneBuildMessage
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

  sceneBuildQueued = false;
  queuedSceneBuildMessage = "";
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
  if (!sceneBuildQueued) {
    return;
  }

  const nextMessage = queuedSceneBuildMessage;
  sceneBuildQueued = false;
  queuedSceneBuildMessage = "";
  window.requestAnimationFrame(() => {
    rebuildScene(nextMessage || "参数已更新，正在重建预览...");
  });
}

// Finalizes a scene build result.
function finalizeSceneBuild(runState, status = "idle") {
  if (activeSceneBuild?.id === runState.id) {
    activeSceneBuild = null;
  }

  if (status === "success") {
    clearPreviewSceneSnapshot();
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
