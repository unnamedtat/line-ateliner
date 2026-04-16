// p5 lifecycle, scene rebuilding, paper rendering, and line extraction/drawing.
let canvasHostObserver = null;
let sceneBuildSerial = 0;
let sceneBuildQueued = false;
let queuedSceneBuildMessage = "";
let activeSceneBuild = null;
let analysisWorkState = null;
let renderFrameCache = {
  mode: "",
  width: 0,
  height: 0,
  frames: new Map()
};

function getCanvasHost() {
  return document.getElementById("canvas-mount");
}

function getGlobalLineWidthScale() {
  return constrain((settings.lineWidthScale ?? 100) / 100, 0.2, 4);
}

function getCanvasHostSize() {
  const host = getCanvasHost();
  if (host) {
    const rect = host.getBoundingClientRect();
    return {
      width: max(320, floor(rect.width || windowWidth || 320)),
      height: max(240, floor(rect.height || windowHeight || 240))
    };
  }

  return {
    width: max(320, floor(windowWidth || 320)),
    height: max(240, floor(windowHeight || 240))
  };
}

function observeCanvasHost() {
  const host = getCanvasHost();
  if (!host || typeof ResizeObserver === "undefined") {
    return;
  }

  if (canvasHostObserver) {
    canvasHostObserver.disconnect();
  }

  canvasHostObserver = new ResizeObserver(() => {
    handleCanvasHostResize();
  });
  canvasHostObserver.observe(host);
}

function handleCanvasHostResize() {
  const nextSize = getCanvasHostSize();
  if (nextSize.width === width && nextSize.height === height) {
    return;
  }

  resizeCanvas(nextSize.width, nextSize.height);
  rebuildViewportSynchronously();
}

function preload() {
  sourceImage = loadImage(SOURCE_IMAGE_PATH);
}

function setup() {
  if (typeof ensureRetroLayout === "function") {
    ensureRetroLayout();
  }
  const host = getCanvasHost();
  const initialSize = getCanvasHostSize();
  const renderer = createCanvas(initialSize.width, initialSize.height);
  if (host) {
    renderer.parent(host);
  }
  renderer.elt.style.width = "100%";
  renderer.elt.style.height = "100%";
  pixelDensity(1);
  noiseDetail(4, 0.5);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  observeCanvasHost();
  initDistortionOverlay();
  initTextureOverlay();
  bindControls();
  syncControls();
  rebuildScene("正在初始化预览...");
}

function windowResized() {
  handleCanvasHostResize();
}

function draw() {
  const animationFrame = getRenderAnimationFrame();
  if (paperBaseLayer) {
    image(paperBaseLayer, 0, 0);
  } else {
    const colors = getPaperColors();
    background(colors.base[0], colors.base[1], colors.base[2]);
  }
  bindControls();
  if (typeof syncCanvasEmptyState === "function") {
    syncCanvasEmptyState();
  }

  if (!sceneLayout || !hasDrawableOutput()) {
    hideDistortionOverlay();
    drawLoadingHint();
    return;
  }

  if (isDistortionMode()) {
    drawDistortionFigure(animationFrame);
  } else {
    hideDistortionOverlay();
  }

  if (settings.referenceOverlay && !isDistortionMode()) {
    drawReferenceOverlay();
  }

  const boilFrame = floor(animationFrame / max(1, settings.boilHoldFrames));
  if (isDistortionMode()) {
    // Distortion mode renders through the SVG overlay so the canvas only keeps the paper/background.
  } else if (isPathMode(settings.renderMode)) {
    drawStrokeFigure(boilFrame);
  } else {
    drawEdgeFigure(boilFrame);
  }
  if (!settings.uiHidden) {
    drawCaption();
  }
}

function hasDrawableOutput() {
  if (appStatusState.analysisActive || appStatusState.analysisFailed) {
    return false;
  }
  if (isDistortionMode()) {
    return Boolean(sourceImage && sceneLayout);
  }
  return isPathMode(settings.renderMode) ? strokePaths.length > 0 : edgeSamples.length > 0;
}

function isDistortionMode() {
  return settings.renderMode === "distortion";
}

function isPathMode(mode) {
  return (
    mode === "path" ||
    mode === "region-grow" ||
    mode === "color-grow" ||
    mode === "color-boundary" ||
    mode === "contour" ||
    mode === "wave-contour" ||
    mode === "wave-shape" ||
    mode === "rubber-contour"
  );
}

function getEffectiveRenderMode() {
  return settings.renderMode === "contour" ? settings.contourVariant : settings.renderMode;
}

function getTenthsSetting(key) {
  return settings[key] / 10;
}

function getHundredthsSetting(key) {
  return settings[key] / 100;
}

function getInkStrokeStyle() {
  const fallbackColor = Array.isArray(INK) && INK.length === 3 ? INK : [44, 43, 40];
  return {
    color: typeof settings.inkColor === "string" ? hexToRgb(settings.inkColor) : fallbackColor,
    opacityScale: constrain((settings.inkOpacity ?? 100) / 100, 0, 1)
  };
}

function buildPaperBaseLayer() {
  paperBaseLayer = createGraphics(width, height);
  paperBaseLayer.clear();
  paperBaseLayer.pixelDensity(1);
  const colors = getPaperColors();
  if (settings.paperFillMode === "gradient") {
    drawLinearGradientToLayer(paperBaseLayer, colors.base, colors.accent, settings.paperGradientAngle);
    return;
  }

  paperBaseLayer.background(colors.base[0], colors.base[1], colors.base[2]);
}

function drawReferenceOverlay() {
  if (!sourceImage || !sceneLayout) {
    return;
  }

  push();
  tint(255, constrain(settings.referenceOverlayOpacity, 0, 100) * 2.55);
  image(sourceImage, sceneLayout.x, sceneLayout.y, sceneLayout.width, sceneLayout.height);
  noTint();
  pop();
}

function drawLinearGradientToLayer(layer, startColor, endColor, angleDegrees) {
  const angle = radians(angleDegrees);
  const dirX = cos(angle);
  const dirY = sin(angle);
  const span = abs(width * dirX) + abs(height * dirY);
  const halfSpan = max(1, span * 0.5);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const ctx = layer.drawingContext;
  const gradient = ctx.createLinearGradient(
    centerX - dirX * halfSpan,
    centerY - dirY * halfSpan,
    centerX + dirX * halfSpan,
    centerY + dirY * halfSpan
  );

  gradient.addColorStop(0, rgbToCss(startColor));
  gradient.addColorStop(1, rgbToCss(endColor));
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildScene("参数已更新，正在重建预览...");
  }, 60);
}

function scheduleOutputRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildModeOutput("参数已更新，正在重算当前笔触...");
  }, 60);
}

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

function getBoilSequenceIndex(boilFrame) {
  const sequenceLength = Array.isArray(BOIL_SEQUENCE) ? BOIL_SEQUENCE.length : 0;
  if (!sequenceLength) {
    return 0;
  }

  return ((boilFrame % sequenceLength) + sequenceLength) % sequenceLength;
}

function invalidateSceneOutput() {
  sceneLayout = null;
  analysisState = null;
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];
  clearRenderFrameCache();
}

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

function cancelAnalysisWait() {
  if (!activeSceneBuild?.running) {
    return;
  }

  sceneBuildQueued = false;
  queuedSceneBuildMessage = "";
  activeSceneBuild.cancelled = true;
  activeSceneBuild.failureMessage = "已停止这次分析。你可以调整图片或算法后重新尝试。";
}

function yieldToUi() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function createAnalysisAbortError() {
  const error = new Error("Analysis aborted.");
  error.code = "ANALYSIS_ABORTED";
  return error;
}

function isAnalysisAbortError(error) {
  return error?.code === "ANALYSIS_ABORTED";
}

function beginAnalysisWork(runState) {
  analysisWorkState = {
    runState,
    lastYieldAt: performance.now()
  };
}

function endAnalysisWork() {
  analysisWorkState = null;
}

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

async function ensureAnalysisResponsive(message = "", force = false) {
  if (!(await maybeYieldAnalysis(message, force))) {
    throw createAnalysisAbortError();
  }
}

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

function getSafeUploadDimensions(imageWidth, imageHeight, maxDimension) {
  const safeMax = max(1, floor(maxDimension || 1));
  const longestSide = max(imageWidth, imageHeight);
  if (longestSide <= safeMax) {
    return {
      width: max(1, floor(imageWidth)),
      height: max(1, floor(imageHeight)),
      resized: false
    };
  }

  const scale = safeMax / longestSide;
  return {
    width: max(1, floor(imageWidth * scale)),
    height: max(1, floor(imageHeight * scale)),
    resized: true
  };
}

function normalizeUploadedImage(image, maxDimension) {
  if (!image || !image.width || !image.height) {
    return { image, resized: false };
  }

  const targetSize = getSafeUploadDimensions(image.width, image.height, maxDimension);
  if (!targetSize.resized) {
    return { image, resized: false };
  }

  image.resize(targetSize.width, targetSize.height);
  return { image, resized: true };
}

function createDataUrlFromP5Image(image) {
  if (!image || !image.width || !image.height) {
    return "";
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = max(1, image.width || 1);
  tempCanvas.height = max(1, image.height || 1);
  const ctx = tempCanvas.getContext("2d");
  const drawable = image.canvas || image.elt || image.image || image;

  if (!ctx || !drawable) {
    return "";
  }

  try {
    ctx.drawImage(drawable, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL("image/png");
  } catch (error) {
    console.warn("Failed to build image data URL", error);
    return "";
  }
}

function loadUserImage(file) {
  sourceImageLabel = `${file.name} (读取中...)`;
  if (typeof setAnalysisUiState === "function") {
    setAnalysisUiState(true, "已收到图片，正在读取文件...");
  }
  syncControls();

  if (!file.type.startsWith("image/")) {
    sourceImageLabel = `${file.name} (unsupported file)`;
    if (typeof setAnalysisUiState === "function") {
      setAnalysisUiState(false);
    }
    syncControls();
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  loadImage(
    objectUrl,
    (image) => {
      try {
        const normalized = normalizeUploadedImage(image, MAX_UPLOADED_SOURCE_DIMENSION);
        sourceImage = normalized.image;
        sourceImageHref = createDataUrlFromP5Image(sourceImage) || objectUrl;
        sourceImageLabel = normalized.resized ? `${file.name} (resized)` : file.name;
        syncControls();
        rebuildScene("上传成功，正在分析图片并重建线稿预览...");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    () => {
      URL.revokeObjectURL(objectUrl);
      sourceImageLabel = `${file.name} (load failed)`;
      if (typeof setAnalysisUiState === "function") {
        setAnalysisUiState(false);
      }
      syncControls();
    }
  );
}

function getRenderAnimationFrame() {
  const overrideFrame = exportState?.renderFrameValue;
  return Number.isFinite(overrideFrame) ? overrideFrame : frameCount;
}

function loadUserTexture(file) {
  uploadedTextureLabel = `${file.name} (loading...)`;
  syncControls();

  if (!file.type.startsWith("image/")) {
    uploadedTextureLabel = `${file.name} (unsupported file)`;
    syncControls();
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  loadImage(
    objectUrl,
    (image) => {
      try {
        const normalized = normalizeUploadedImage(image, MAX_UPLOADED_TEXTURE_DIMENSION);
        uploadedTextureImage = normalized.image;
        uploadedTextureLabel = normalized.resized ? `${file.name} (resized)` : file.name;
        if (settings.paperTexture !== "upload") {
          settings.paperTexture = "upload";
        }
        syncControls();
        rebuildScene("纹理已更新，正在重建预览...");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    () => {
      URL.revokeObjectURL(objectUrl);
      uploadedTextureLabel = `${file.name} (load failed)`;
      syncControls();
    }
  );
}

function rebuildSceneSynchronously() {
  clearTimeout(rebuildTimer);
  buildPaperBaseLayer();
  buildPaperLayer();
  buildSceneLayout();
  syncDistortionOverlay();
  clearRenderFrameCache();
  if (isDistortionMode()) {
    analysisState = null;
    edgeSamples = [];
    hatchSamples = [];
    strokePaths = [];
    return;
  }
  buildAnalysisState();
  buildCurrentModeOutput();
}

function rebuildViewportSynchronously() {
  clearTimeout(rebuildTimer);
  buildPaperBaseLayer();
  buildPaperLayer();
  buildSceneLayout();
  syncDistortionOverlay();
  clearRenderFrameCache();
}

async function runSceneBuild(runState, message = "") {
  activeSceneBuild = runState;
  invalidateSceneOutput();
  if (typeof setAnalysisUiState === "function") {
    setAnalysisUiState(true, message || "正在重建预览，请稍候...");
  }
  syncControls();
  beginAnalysisWork(runState);
  await yieldToUi();

  try {
    if (!refreshLongWaitState(runState, "正在生成纸面与布局...")) {
      finalizeSceneBuild(runState, "failure");
      return false;
    }
    clearTimeout(rebuildTimer);
    buildPaperBaseLayer();
    buildPaperLayer();
    buildSceneLayout();
    syncDistortionOverlay();
    clearRenderFrameCache();
    await ensureAnalysisResponsive("正在准备分析任务...", true);

    if (isDistortionMode()) {
      analysisState = null;
      edgeSamples = [];
      hatchSamples = [];
      strokePaths = [];
      finalizeSceneBuild(runState, "success");
      syncControls();
      return true;
    }

    await buildAnalysisStateAsync();
    await ensureAnalysisResponsive("正在生成笔触与沸腾帧缓存...", true);

    await buildCurrentModeOutputAsync();
    await ensureAnalysisResponsive("仍在整理最终笔触...", true);

    finalizeSceneBuild(runState, "success");
    syncControls();
    return true;
  } catch (error) {
    if (!isAnalysisAbortError(error)) {
      console.error(error);
      runState.failureMessage = error?.message || "分析失败，请重试。";
    }
    invalidateSceneOutput();
    finalizeSceneBuild(runState, "failure");
    return false;
  } finally {
    endAnalysisWork();
  }
}

async function runModeOutputBuild(runState, message = "") {
  activeSceneBuild = runState;
  if (typeof setAnalysisUiState === "function") {
    setAnalysisUiState(true, message || "正在重算当前算法输出，请稍候...");
  }
  syncControls();
  beginAnalysisWork(runState);
  await yieldToUi();

  try {
    clearTimeout(rebuildTimer);
    if (!sceneLayout) {
      buildSceneLayout();
    }
    syncDistortionOverlay();
    clearRenderFrameCache();
    await ensureAnalysisResponsive("正在准备当前算法输出...", true);

    if (isDistortionMode()) {
      edgeSamples = [];
      hatchSamples = [];
      strokePaths = [];
      finalizeSceneBuild(runState, "success");
      syncControls();
      return true;
    }

    if (!analysisState) {
      await buildAnalysisStateAsync();
      await ensureAnalysisResponsive("正在创建分析缓存...", true);
    }

    await buildCurrentModeOutputAsync();
    await ensureAnalysisResponsive("正在整理最终笔触...", true);

    finalizeSceneBuild(runState, "success");
    syncControls();
    return true;
  } catch (error) {
    if (!isAnalysisAbortError(error)) {
      console.error(error);
      runState.failureMessage = error?.message || "重算失败，请重试。";
    }
    invalidateSceneOutput();
    finalizeSceneBuild(runState, "failure");
    return false;
  } finally {
    endAnalysisWork();
  }
}

function rebuildScene(message = "") {
  if (activeSceneBuild?.running) {
    queueNextSceneBuild(message);
    return;
  }

  const runState = {
    id: ++sceneBuildSerial,
    startedAt: performance.now(),
    promptShown: false,
    cancelled: false,
    failureMessage: "",
    running: true
  };

  runSceneBuild(runState, message).finally(() => {
    runState.running = false;
  });
}

function rebuildModeOutput(message = "") {
  if (activeSceneBuild?.running) {
    queueNextSceneBuild(message);
    return;
  }

  const runState = {
    id: ++sceneBuildSerial,
    startedAt: performance.now(),
    promptShown: false,
    cancelled: false,
    failureMessage: "",
    running: true
  };

  runModeOutputBuild(runState, message).finally(() => {
    runState.running = false;
  });
}

function initDistortionOverlay() {
  distortionOverlay = document.getElementById("distortion-overlay");
  distortionImageNode = document.getElementById("distortion-image");
  distortionTurbulenceNode = document.getElementById("distortion-turbulence");
  distortionDisplacementNode = document.getElementById("distortion-displacement");
  syncDistortionOverlay();
}

function initTextureOverlay() {
  textureOverlayNode = document.getElementById("paper-texture-overlay");
  syncTextureOverlay();
}

function syncDistortionOverlay(frameValue = getRenderAnimationFrame()) {
  if (!distortionOverlay || !distortionImageNode) {
    return;
  }

  if (!isDistortionMode() || !sceneLayout || !sourceImageHref) {
    hideDistortionOverlay();
    return;
  }

  distortionOverlay.style.display = "block";
  distortionOverlay.setAttribute("viewBox", `0 0 ${max(1, width)} ${max(1, height)}`);
  distortionImageNode.setAttribute("href", sourceImageHref);
  distortionImageNode.setAttribute("x", sceneLayout.x.toFixed(2));
  distortionImageNode.setAttribute("y", sceneLayout.y.toFixed(2));
  distortionImageNode.setAttribute("width", sceneLayout.width.toFixed(2));
  distortionImageNode.setAttribute("height", sceneLayout.height.toFixed(2));
  updateDistortionFilter(frameValue);
}

function hideDistortionOverlay() {
  if (distortionOverlay) {
    distortionOverlay.style.display = "none";
  }
}

function drawDistortionFigure(frameValue = getRenderAnimationFrame()) {
  syncDistortionOverlay(frameValue);
}

function updateDistortionFilter(frameValue) {
  if (!distortionTurbulenceNode || !distortionDisplacementNode) {
    return;
  }

  const speed = settings.distortionSpeed / 100;
  const wobble = frameValue * (0.006 + speed * 0.03);
  const distortionFrequency = getHundredthsSetting("distortionFrequency");
  const baseFrequencyX = max(0.001, distortionFrequency * (1 + sin(wobble) * 0.08));
  const baseFrequencyY = max(0.001, distortionFrequency * (1 + cos(wobble * 1.17 + 0.8) * 0.08));
  distortionTurbulenceNode.setAttribute(
    "baseFrequency",
    `${baseFrequencyX.toFixed(4)} ${baseFrequencyY.toFixed(4)}`
  );
  distortionTurbulenceNode.setAttribute("numOctaves", String(round(settings.distortionOctaves)));
  distortionDisplacementNode.setAttribute("scale", getTenthsSetting("distortionScale").toFixed(2));
}

function buildPaperLayer() {
  paperLayer = createGraphics(width, height);
  paperLayer.clear();
  paperLayer.pixelDensity(1);
  const colors = getTextureColors();
  const strength = constrain(settings.paperTextureStrength / 100, 0, 1);
  const scale = lerp(0.008, 0.045, settings.paperTextureScale / 100);

  if (settings.paperTexture === "none" || strength <= 0) {
    syncTextureOverlay();
    return;
  }

  if (settings.paperTexture === "grain") {
    drawGrainTexture(colors, strength, scale);
  } else if (settings.paperTexture === "speckle") {
    drawSpeckleTexture(colors, strength);
  } else if (settings.paperTexture === "cloud") {
    drawCloudTexture(colors, strength, scale);
  } else if (settings.paperTexture === "crosshatch") {
    drawCrosshatchTexture(colors, strength, scale);
  } else if (settings.paperTexture === "upload") {
    drawUploadedTexture(colors, strength);
  }

  syncTextureOverlay();
}

function drawGrainTexture(colors, strength, scale) {
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const n = noise(x * scale, y * scale, 10);
      const local = noise(x * scale * 3.4 + 40, y * scale * 3.4 + 70, 20);
      const shade = (n - 0.5) * 2 * 22 * strength + (local - 0.5) * 2 * 10 * strength;
      const t = constrain(0.5 + shade / 90, 0, 1);
      const rgb = lerpRgb(colors.base, colors.accent, t);
      const alpha = constrain(abs(shade) * 3.4 + 8 * strength, 0, 42);
      blendPixelIntoLayer(x, y, rgb, alpha);
    }
  }

  paperLayer.updatePixels();
}

function drawSpeckleTexture(colors, strength) {
  paperLayer.noStroke();
  const count = floor(width * height * lerp(0.0018, 0.0068, strength));

  for (let i = 0; i < count; i += 1) {
    const t = constrain(noise(i * 0.17, 90) * 1.12 - 0.06, 0, 1);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(20, 74) * strength);
    paperLayer.circle(random(width), random(height), random(0.6, 2.4));
  }

  const dustCount = floor(width * height * lerp(0.00018, 0.00075, strength));
  for (let i = 0; i < dustCount; i += 1) {
    const t = constrain(noise(i * 0.11 + 50, 120) * 1.15 - 0.08, 0, 1);
    const rgb = lerpRgb(colors.accent, colors.base, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(18, 44) * strength);
    paperLayer.circle(random(width), random(height), random(1.8, 4.8));
  }
}

function drawCloudTexture(colors, strength, scale) {
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const broad = noise(x * scale * 0.45 + 120, y * scale * 0.45 + 30, 40);
      const detail = noise(x * scale * 1.9 + 10, y * scale * 1.9 + 160, 50);
      const mixAmount = constrain(broad * 0.72 + detail * 0.28, 0, 1);
      const rgb = lerpRgb(colors.base, colors.accent, mixAmount);
      const alpha = lerp(0, 54, constrain((mixAmount - 0.28) * 1.3, 0, 1)) * strength;
      blendPixelIntoLayer(x, y, rgb, alpha);
    }
  }

  paperLayer.updatePixels();
}

function drawCrosshatchTexture(colors, strength, scale) {
  paperLayer.strokeCap(ROUND);
  paperLayer.strokeWeight(0.4 + strength * 0.75);

  const diagCount = floor(lerp(220, 680, strength));
  for (let i = 0; i < diagCount; i += 1) {
    const t = constrain(noise(i * 0.07, 220) * 1.15 - 0.08, 0, 1);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.stroke(rgb[0], rgb[1], rgb[2], lerp(14, 42, strength));
    const x = random(-width * 0.15, width);
    const y = random(0, height);
    const dx = random(18, 56) * (0.72 + scale * 18);
    const dy = random(10, 28) * (0.72 + scale * 18);
    paperLayer.line(x, y, x + dx, y + dy);
  }

  for (let i = 0; i < floor(diagCount * 0.84); i += 1) {
    const t = constrain(noise(i * 0.09, 260) * 1.1 - 0.05, 0, 1);
    const rgb = lerpRgb(colors.accent, colors.base, t);
    paperLayer.stroke(rgb[0], rgb[1], rgb[2], lerp(10, 32, strength));
    const x = random(0, width * 1.1);
    const y = random(-height * 0.1, height);
    const dx = random(12, 34) * (0.72 + scale * 18);
    const dy = random(-28, -10) * (0.72 + scale * 18);
    paperLayer.line(x, y, x + dx, y + dy);
  }

  paperLayer.noStroke();
  const knotCount = floor(width * height * lerp(0.00022, 0.00095, strength));
  for (let i = 0; i < knotCount; i += 1) {
    const t = noise(i * 0.13 + 90, 310);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(10, 28) * strength);
    paperLayer.ellipse(random(width), random(height), random(0.8, 1.8), random(0.4, 1.1));
  }
}

function drawUploadedTexture(colors, strength) {
  if (!uploadedTextureImage) {
    return;
  }

  const textureLayer = createGraphics(width, height);
  textureLayer.pixelDensity(1);
  textureLayer.clear();
  textureLayer.imageMode(CORNER);
  textureLayer.image(uploadedTextureImage, 0, 0, width, height);
  textureLayer.loadPixels();
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = textureLayer.pixels[idx];
      const g = textureLayer.pixels[idx + 1];
      const b = textureLayer.pixels[idx + 2];
      const a = textureLayer.pixels[idx + 3] / 255;
      const brightnessValue = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const mapped = lerpRgb(colors.base, colors.accent, brightnessValue);
      const alpha = a * lerp(28, 132, strength);
      blendPixelIntoLayer(x, y, mapped, alpha);
    }
  }

  paperLayer.updatePixels();
}

function blendPixelIntoLayer(x, y, rgb, alpha) {
  const idx = (y * width + x) * 4;
  paperLayer.pixels[idx] = rgb[0];
  paperLayer.pixels[idx + 1] = rgb[1];
  paperLayer.pixels[idx + 2] = rgb[2];
  paperLayer.pixels[idx + 3] = constrain(alpha, 0, 255);
}

function syncTextureOverlay() {
  if (!textureOverlayNode) {
    return;
  }

  const textureEnabled =
    settings.paperTexture !== "none" &&
    settings.paperTextureStrength > 0 &&
    settings.paperTextureOpacity > 0 &&
    paperLayer?.canvas;

  if (!textureEnabled) {
    textureOverlayNode.style.display = "none";
    textureOverlayNode.removeAttribute("src");
    return;
  }

  textureOverlayNode.src = paperLayer.canvas.toDataURL("image/png");
  textureOverlayNode.style.display = "block";
  textureOverlayNode.style.opacity = (constrain(settings.paperTextureOpacity, 0, 100) / 100).toFixed(2);
}

function buildSceneLayout() {
  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    sceneLayout = null;
    return;
  }

  const margin = min(width, height) * 0.07;
  const imageAspect = sourceImage.width / sourceImage.height;
  let drawWidth = width - margin * 2;
  let drawHeight = drawWidth / imageAspect;

  if (drawHeight > height - margin * 2) {
    drawHeight = height - margin * 2;
    drawWidth = drawHeight * imageAspect;
  }

  const scaleFactor = max(0.05, settings.sceneScale / 100);
  drawWidth *= scaleFactor;
  drawHeight *= scaleFactor;
  const offsetX = (settings.sceneOffsetX / 100) * width;
  const offsetY = (settings.sceneOffsetY / 100) * height;

  sceneLayout = {
    x: (width - drawWidth) * 0.5 + offsetX,
    y: (height - drawHeight) * 0.5 + offsetY,
    width: drawWidth,
    height: drawHeight
  };
}

function buildAnalysisState() {
  if (analysisState?.image && typeof analysisState.image.remove === "function") {
    analysisState.image.remove();
  }

  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    analysisState = null;
    return;
  }

  let analysisWidth = sourceImage.width;
  let analysisHeight = sourceImage.height;
  const maxDimension = getAnalysisMaxDimension();
  const longestSide = max(analysisWidth, analysisHeight);

  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide;
    analysisWidth = max(1, floor(analysisWidth * scale));
    analysisHeight = max(1, floor(analysisHeight * scale));
  }

  const analysisImage = createGraphics(analysisWidth, analysisHeight);
  analysisImage.pixelDensity(1);
  analysisImage.background(255);
  analysisImage.imageMode(CORNER);
  analysisImage.image(sourceImage, 0, 0, analysisWidth, analysisHeight);
  analysisImage.loadPixels();
  analysisState = {
    image: analysisImage,
    width: analysisImage.width,
    height: analysisImage.height,
    cache: {
      // These maps are reused across algorithm switches so we don't resample the
      // same source image for brightness / RGB data every time the mode changes.
      brightnessMap: null,
      filteredBrightnessMaps: new Map(),
      localContrastMaps: new Map(),
      rgbMaps: null,
      colorDeltaMaps: new Map(),
      inkMask: null
    }
  };
}

async function buildAnalysisStateAsync() {
  if (analysisState?.image && typeof analysisState.image.remove === "function") {
    analysisState.image.remove();
  }

  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    analysisState = null;
    return;
  }

  let analysisWidth = sourceImage.width;
  let analysisHeight = sourceImage.height;
  const maxDimension = getAnalysisMaxDimension();
  const longestSide = max(analysisWidth, analysisHeight);

  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide;
    analysisWidth = max(1, floor(analysisWidth * scale));
    analysisHeight = max(1, floor(analysisHeight * scale));
  }

  await ensureAnalysisResponsive("正在创建分析画布...", true);
  const analysisImage = createGraphics(analysisWidth, analysisHeight);
  analysisImage.pixelDensity(1);
  analysisImage.background(255);
  analysisImage.imageMode(CORNER);
  analysisImage.image(sourceImage, 0, 0, analysisWidth, analysisHeight);
  analysisImage.loadPixels();
  analysisState = {
    image: analysisImage,
    width: analysisImage.width,
    height: analysisImage.height,
    cache: {
      brightnessMap: null,
      filteredBrightnessMaps: new Map(),
      localContrastMaps: new Map(),
      rgbMaps: null,
      colorDeltaMaps: new Map(),
      inkMask: null
    }
  };
}

function getAnalysisImage() {
  return analysisState?.image || null;
}

function getAnalysisCache() {
  return analysisState?.cache || null;
}

function getAnalysisMaxDimension() {
  return ANALYSIS_QUALITY_PRESETS[settings.analysisQuality] || ANALYSIS_QUALITY_PRESETS.medium;
}

function getSceneScale() {
  if (!sceneLayout || !analysisState) {
    return { x: 1, y: 1, unit: 1 };
  }

  const scaleX = sceneLayout.width / max(1, analysisState.width);
  const scaleY = sceneLayout.height / max(1, analysisState.height);
  return {
    x: scaleX,
    y: scaleY,
    unit: min(scaleX, scaleY)
  };
}

function getBrightnessMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.brightnessMap) {
    return cache.brightnessMap;
  }

  const brightnessMap = buildBrightnessMap(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.brightnessMap = brightnessMap;
  }
  return brightnessMap;
}

function getFilteredBrightnessMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.filteredBrightnessMaps?.has(smoothPasses)) {
    return cache.filteredBrightnessMaps.get(smoothPasses);
  }

  let brightnessMap = getBrightnessMap();
  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = blurScalarMap(brightnessMap, analysisImage.width, analysisImage.height);
  }

  if (cache?.filteredBrightnessMaps) {
    cache.filteredBrightnessMaps.set(smoothPasses, brightnessMap);
  }
  return brightnessMap;
}

function getLocalContrastMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.localContrastMaps?.has(smoothPasses)) {
    return cache.localContrastMaps.get(smoothPasses);
  }

  const contrastMap = buildLocalContrastMap(
    getFilteredBrightnessMap(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache?.localContrastMaps) {
    cache.localContrastMaps.set(smoothPasses, contrastMap);
  }
  return contrastMap;
}

function getRgbMaps() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return {
      rMap: new Uint8Array(),
      gMap: new Uint8Array(),
      bMap: new Uint8Array()
    };
  }
  if (cache?.rgbMaps) {
    return cache.rgbMaps;
  }

  const rgbMaps = buildRgbMaps(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.rgbMaps = rgbMaps;
  }
  return rgbMaps;
}

function getColorDeltaMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.colorDeltaMaps?.has(smoothPasses)) {
    return cache.colorDeltaMaps.get(smoothPasses);
  }

  const { rMap, gMap, bMap } = getRgbMaps();
  const colorDeltaMap = buildColorDeltaMap(rMap, gMap, bMap, analysisImage.width, analysisImage.height);
  if (cache?.colorDeltaMaps) {
    cache.colorDeltaMaps.set(smoothPasses, colorDeltaMap);
  }
  return colorDeltaMap;
}

function getInkMask() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Uint8Array();
  }
  if (cache?.inkMask) {
    return cache.inkMask;
  }

  const inkMask = buildInkMask(getFilteredBrightnessMap(), analysisImage.width, analysisImage.height);
  if (cache) {
    cache.inkMask = inkMask;
  }
  return inkMask;
}

async function buildBrightnessMapAsync(analysisImage, w, h) {
  const brightnessMap = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在计算亮度图...");
    }
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 4;
      const r = analysisImage.pixels[idx];
      const g = analysisImage.pixels[idx + 1];
      const b = analysisImage.pixels[idx + 2];
      brightnessMap[y * w + x] = r * 0.299 + g * 0.587 + b * 0.114;
    }
  }

  return brightnessMap;
}

async function blurScalarMapAsync(sourceMap, w, h) {
  const blurred = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在平滑图像采样...");
    }
    for (let x = 0; x < w; x += 1) {
      let weightedSum = 0;
      let weightTotal = 0;

      for (let oy = -1; oy <= 1; oy += 1) {
        const sy = constrain(y + oy, 0, h - 1);
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = constrain(x + ox, 0, w - 1);
          const weight = ox === 0 && oy === 0 ? 4 : ox === 0 || oy === 0 ? 2 : 1;
          weightedSum += sourceMap[sy * w + sx] * weight;
          weightTotal += weight;
        }
      }

      blurred[y * w + x] = weightedSum / weightTotal;
    }
  }

  return blurred;
}

async function buildLocalContrastMapAsync(brightnessMap, w, h) {
  const contrastMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在计算局部对比...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];
      const neighborhoodMean =
        (brightnessMap[idx - 1] +
          brightnessMap[idx + 1] +
          brightnessMap[idx - w] +
          brightnessMap[idx + w]) * 0.25;
      contrastMap[idx] = neighborhoodMean - center;
    }
  }

  return contrastMap;
}

async function buildRgbMapsAsync(analysisImage, w, h) {
  const rMap = new Uint8Array(w * h);
  const gMap = new Uint8Array(w * h);
  const bMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在读取颜色通道...");
    }
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const pixelIndex = idx * 4;
      rMap[idx] = analysisImage.pixels[pixelIndex];
      gMap[idx] = analysisImage.pixels[pixelIndex + 1];
      bMap[idx] = analysisImage.pixels[pixelIndex + 2];
    }
  }

  return { rMap, gMap, bMap };
}

async function buildInkMaskAsync(brightnessMap, w, h) {
  const mask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在提取墨线区域...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];

      let localTotal = 0;
      let localCount = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          localTotal += brightnessMap[(y + offsetY) * w + x + offsetX];
          localCount += 1;
        }
      }

      const localMean = localTotal / localCount;
      const isInk =
        center < settings.inkBrightnessThreshold ||
        center + settings.localContrastThreshold < localMean;

      if (isInk) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

async function getBrightnessMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.brightnessMap) {
    return cache.brightnessMap;
  }

  const brightnessMap = await buildBrightnessMapAsync(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.brightnessMap = brightnessMap;
  }
  return brightnessMap;
}

async function getFilteredBrightnessMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.filteredBrightnessMaps?.has(smoothPasses)) {
    return cache.filteredBrightnessMaps.get(smoothPasses);
  }

  let brightnessMap = await getBrightnessMapAsync();
  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = await blurScalarMapAsync(brightnessMap, analysisImage.width, analysisImage.height);
  }

  if (cache?.filteredBrightnessMaps) {
    cache.filteredBrightnessMaps.set(smoothPasses, brightnessMap);
  }
  return brightnessMap;
}

async function getLocalContrastMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.localContrastMaps?.has(smoothPasses)) {
    return cache.localContrastMaps.get(smoothPasses);
  }

  const contrastMap = await buildLocalContrastMapAsync(
    await getFilteredBrightnessMapAsync(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache?.localContrastMaps) {
    cache.localContrastMaps.set(smoothPasses, contrastMap);
  }
  return contrastMap;
}

async function getRgbMapsAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return {
      rMap: new Uint8Array(),
      gMap: new Uint8Array(),
      bMap: new Uint8Array()
    };
  }
  if (cache?.rgbMaps) {
    return cache.rgbMaps;
  }

  const rgbMaps = await buildRgbMapsAsync(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.rgbMaps = rgbMaps;
  }
  return rgbMaps;
}

async function getInkMaskAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Uint8Array();
  }
  if (cache?.inkMask) {
    return cache.inkMask;
  }

  const inkMask = await buildInkMaskAsync(
    await getFilteredBrightnessMapAsync(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache) {
    cache.inkMask = inkMask;
  }
  return inkMask;
}

function buildBrightnessMap(analysisImage, w, h) {
  const brightnessMap = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 4;
      const r = analysisImage.pixels[idx];
      const g = analysisImage.pixels[idx + 1];
      const b = analysisImage.pixels[idx + 2];
      brightnessMap[y * w + x] = r * 0.299 + g * 0.587 + b * 0.114;
    }
  }

  return brightnessMap;
}

function buildFilteredBrightnessMap(analysisImage, w, h) {
  let brightnessMap = buildBrightnessMap(analysisImage, w, h);
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));

  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = blurScalarMap(brightnessMap, w, h);
  }

  return brightnessMap;
}

function blurScalarMap(sourceMap, w, h) {
  const blurred = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let weightedSum = 0;
      let weightTotal = 0;

      for (let oy = -1; oy <= 1; oy += 1) {
        const sy = constrain(y + oy, 0, h - 1);
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = constrain(x + ox, 0, w - 1);
          const weight = ox === 0 && oy === 0 ? 4 : ox === 0 || oy === 0 ? 2 : 1;
          weightedSum += sourceMap[sy * w + sx] * weight;
          weightTotal += weight;
        }
      }

      blurred[y * w + x] = weightedSum / weightTotal;
    }
  }

  return blurred;
}

function buildLocalContrastMap(brightnessMap, w, h) {
  const contrastMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];
      const neighborhoodMean =
        (brightnessMap[idx - 1] +
          brightnessMap[idx + 1] +
          brightnessMap[idx - w] +
          brightnessMap[idx + w]) * 0.25;
      contrastMap[idx] = neighborhoodMean - center;
    }
  }

  return contrastMap;
}

function buildRgbMaps(analysisImage, w, h) {
  const rMap = new Uint8Array(w * h);
  const gMap = new Uint8Array(w * h);
  const bMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const pixelIndex = idx * 4;
      rMap[idx] = analysisImage.pixels[pixelIndex];
      gMap[idx] = analysisImage.pixels[pixelIndex + 1];
      bMap[idx] = analysisImage.pixels[pixelIndex + 2];
    }
  }

  return { rMap, gMap, bMap };
}

function buildColorDeltaMap(rMap, gMap, bMap, w, h) {
  const colorDeltaMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const avgR = (rMap[idx - 1] + rMap[idx + 1] + rMap[idx - w] + rMap[idx + w]) * 0.25;
      const avgG = (gMap[idx - 1] + gMap[idx + 1] + gMap[idx - w] + gMap[idx + w]) * 0.25;
      const avgB = (bMap[idx - 1] + bMap[idx + 1] + bMap[idx - w] + bMap[idx + w]) * 0.25;
      const dr = rMap[idx] - avgR;
      const dg = gMap[idx] - avgG;
      const db = bMap[idx] - avgB;
      colorDeltaMap[idx] = sqrt(dr * dr + dg * dg + db * db);
    }
  }

  return colorDeltaMap;
}

function buildRegionGrowField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const regionMask = buildRegionGrowMask(brightnessMap, contrastMap, w, h);

  strokePaths = buildPathsFromMask(regionMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES + 1
  });
  preparePathVariants(strokePaths);
}

function buildColorGrowField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const { rMap, gMap, bMap } = getRgbMaps();
  const colorDeltaMap = getColorDeltaMap();
  const colorMask = buildColorGrowMask(brightnessMap, contrastMap, colorDeltaMap, rMap, gMap, bMap, w, h);

  strokePaths = buildPathsFromMask(colorMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES + 1
  });
  preparePathVariants(strokePaths);
}

function buildColorBoundaryField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const { rMap, gMap, bMap } = getRgbMaps();
  const boundaryMask = buildColorBoundaryMask(brightnessMap, contrastMap, rMap, gMap, bMap, w, h);

  strokePaths = buildPathsFromMask(boundaryMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES
  });
  preparePathVariants(strokePaths);
}

async function buildColorBoundaryFieldAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = await getFilteredBrightnessMapAsync();
  const contrastMap = await getLocalContrastMapAsync();
  const { rMap, gMap, bMap } = await getRgbMapsAsync();
  const boundaryMask = await buildColorBoundaryMaskAsync(brightnessMap, contrastMap, rMap, gMap, bMap, w, h);

  strokePaths = await buildPathsFromMaskAsync(boundaryMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES
  });
  await preparePathVariantsAsync(strokePaths);
}

function buildContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths);
}

function buildWaveContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "wave-contour" });
}

function buildWaveShapeField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "wave-shape" });
}

function buildRubberContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "rubber-contour" });
}

function buildContourPaths() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const mask = getInkMask();

  return buildPathsFromMask(mask, w, h, {
    boundaryOnly: true,
    closePasses: MORPH_CLOSE_PASSES
  });
}

async function buildContourPathsAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const mask = await getInkMaskAsync();

  return buildPathsFromMaskAsync(mask, w, h, {
    boundaryOnly: true,
    closePasses: MORPH_CLOSE_PASSES
  });
}

function buildPathsFromMask(mask, w, h, options = {}) {
  const closePasses = options.closePasses ?? MORPH_CLOSE_PASSES;
  const boundaryOnly = options.boundaryOnly ?? false;
  const closedMask = closeBinaryMask(mask, w, h, closePasses);
  const traceMask = boundaryOnly ? extractBoundaryMask(closedMask, w, h) : thinMask(closedMask, w, h, THINNING_MAX_ITERATIONS);
  const traceDistanceField = boundaryOnly
    ? buildConstantDistanceField(traceMask, 1.05)
    : computeDistanceField(closedMask, w, h);

  return buildStrokePaths(traceMask, traceDistanceField, w, h)
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);
}

async function buildPathsFromMaskAsync(mask, w, h, options = {}) {
  const closePasses = options.closePasses ?? MORPH_CLOSE_PASSES;
  const boundaryOnly = options.boundaryOnly ?? false;
  const closedMask = await closeBinaryMaskAsync(mask, w, h, closePasses);
  const traceMask = boundaryOnly
    ? extractBoundaryMask(closedMask, w, h)
    : await thinMaskAsync(closedMask, w, h, THINNING_MAX_ITERATIONS);
  const traceDistanceField = boundaryOnly
    ? buildConstantDistanceField(traceMask, 1.05)
    : await computeDistanceFieldAsync(closedMask, w, h);

  return (await buildStrokePathsAsync(traceMask, traceDistanceField, w, h))
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);
}

function buildRegionGrowMask(brightnessMap, contrastMap, w, h) {
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const seedThreshold = settings.lineBrightnessThreshold;
  const expandThreshold = min(255, seedThreshold + 18);
  const contrastThreshold = max(2, settings.localContrastThreshold);
  const neighborDriftLimit = 34;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        brightnessMap[idx] < seedThreshold &&
        contrastMap[idx] > contrastThreshold * 0.42
      ) {
        queued[idx] = 1;
        queue[tail] = idx;
        tail += 1;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;

    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentContrast = contrastMap[idx];
    const currentIsInk =
      currentBrightness <= expandThreshold ||
      currentContrast >= contrastThreshold;
    if (!currentIsInk) {
      continue;
    }

    mask[idx] = 1;
    const x = idx % w;
    const y = floor(idx / w);

    for (const dir of NEIGHBOR_DIRS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) {
        continue;
      }

      const nIdx = ny * w + nx;
      if (queued[nIdx]) {
        continue;
      }

      const neighborBrightness = brightnessMap[nIdx];
      const neighborContrast = contrastMap[nIdx];
      if (
        (
          neighborBrightness <= expandThreshold ||
          neighborContrast >= contrastThreshold * 0.75
        ) &&
        abs(neighborBrightness - currentBrightness) <= neighborDriftLimit
      ) {
        queued[nIdx] = 1;
        queue[tail] = nIdx;
        tail += 1;
      }
    }
  }

  return mask;
}

function buildColorGrowMask(brightnessMap, contrastMap, colorDeltaMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const seedBrightnessThreshold = settings.lineBrightnessThreshold;
  const expandBrightnessThreshold = min(255, seedBrightnessThreshold + 26);
  const contrastThreshold = max(2, settings.localContrastThreshold);
  const colorThreshold = settings.colorDistanceThreshold;
  const colorDriftLimit = max(10, colorThreshold * 1.35);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        brightnessMap[idx] < seedBrightnessThreshold ||
        (
          colorDeltaMap[idx] > colorThreshold &&
          contrastMap[idx] > contrastThreshold * 0.35
        )
      ) {
        queued[idx] = 1;
        queue[tail] = idx;
        tail += 1;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;

    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentColorDelta = colorDeltaMap[idx];
    const currentIsInk =
      currentBrightness <= expandBrightnessThreshold ||
      currentColorDelta >= colorThreshold * 0.72 ||
      contrastMap[idx] >= contrastThreshold;
    if (!currentIsInk) {
      continue;
    }

    mask[idx] = 1;
    const x = idx % w;
    const y = floor(idx / w);

    for (const dir of NEIGHBOR_DIRS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) {
        continue;
      }

      const nIdx = ny * w + nx;
      if (queued[nIdx]) {
        continue;
      }

      const dr = rMap[nIdx] - rMap[idx];
      const dg = gMap[nIdx] - gMap[idx];
      const db = bMap[nIdx] - bMap[idx];
      const neighborColorDrift = sqrt(dr * dr + dg * dg + db * db);

      if (
        neighborColorDrift <= colorDriftLimit &&
        (
          brightnessMap[nIdx] <= expandBrightnessThreshold ||
          colorDeltaMap[nIdx] >= colorThreshold * 0.55 ||
          contrastMap[nIdx] >= contrastThreshold * 0.72
        )
      ) {
        queued[nIdx] = 1;
        queue[tail] = nIdx;
        tail += 1;
      }
    }
  }

  return mask;
}

function buildColorBoundaryMask(brightnessMap, contrastMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const colorThreshold = settings.colorDistanceThreshold;
  const contrastThreshold = max(1, settings.localContrastThreshold * 0.55);
  const brightnessGuard = settings.lineBrightnessThreshold + 18;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;

      const horizontalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - 1, idx + 1);
      const verticalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w, idx + w);
      const diagADelta = colorDistanceBetween(rMap, gMap, bMap, idx - w - 1, idx + w + 1);
      const diagBDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w + 1, idx + w - 1);
      const strongestDelta = max(horizontalDelta, verticalDelta, diagADelta, diagBDelta);

      const isBoundary =
        strongestDelta >= colorThreshold &&
        (
          contrastMap[idx] >= contrastThreshold ||
          brightnessMap[idx] <= brightnessGuard
        );

      if (isBoundary) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

function colorDistanceBetween(rMap, gMap, bMap, indexA, indexB) {
  const dr = rMap[indexA] - rMap[indexB];
  const dg = gMap[indexA] - gMap[indexB];
  const db = bMap[indexA] - bMap[indexB];
  return sqrt(dr * dr + dg * dg + db * db);
}

function extractBoundaryMask(mask, w, h) {
  const boundaryMask = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const hasBackgroundNeighbor =
        !mask[idx - 1] ||
        !mask[idx + 1] ||
        !mask[idx - w] ||
        !mask[idx + w];

      if (hasBackgroundNeighbor) {
        boundaryMask[idx] = 1;
      }
    }
  }

  return boundaryMask;
}

function buildConstantDistanceField(mask, radiusValue) {
  const field = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      field[i] = radiusValue;
    }
  }
  return field;
}

function buildEdgeField(useFillMerge) {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const candidateEdges = [];
  const candidateHatches = [];

  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const center = brightnessMap[y * w + x];
      const left = brightnessMap[y * w + x - 1];
      const right = brightnessMap[y * w + x + 1];
      const up = brightnessMap[(y - 1) * w + x];
      const down = brightnessMap[(y + 1) * w + x];
      const darkness = 255 - center;

      const sobelX =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * left -
        brightnessMap[(y + 1) * w + x - 1] +
        brightnessMap[(y - 1) * w + x + 1] +
        2 * right +
        brightnessMap[(y + 1) * w + x + 1];

      const sobelY =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * up -
        brightnessMap[(y - 1) * w + x + 1] +
        brightnessMap[(y + 1) * w + x - 1] +
        2 * down +
        brightnessMap[(y + 1) * w + x + 1];

      const edgeStrength = sqrt(sobelX * sobelX + sobelY * sobelY) * 0.25;
      const neighborhoodMean = (left + right + up + down) * 0.25;
      const isDarkCenter =
        center < settings.lineBrightnessThreshold &&
        center + 6 < neighborhoodMean;
      const support =
        Number(left < 236) +
        Number(right < 236) +
        Number(up < 236) +
        Number(down < 236);

      if (!isDarkCenter && edgeStrength < settings.edgeThreshold) {
        continue;
      }

      if (support < 2 && darkness < 24 && edgeStrength < settings.edgeThreshold * 1.3) {
        continue;
      }

      const keepNoise = noise(x * 0.034, y * 0.034);
      const keepChance = constrain(
        map(edgeStrength + darkness * 0.65, settings.edgeThreshold, 210, 0.18, 0.92),
        0.14,
        0.92
      );
      if (keepNoise > keepChance) {
        continue;
      }

      const tangentAngle = atan2(sobelY, sobelX) + HALF_PI;
      const tx = cos(tangentAngle);
      const ty = sin(tangentAngle);
      const nx = -ty;
      const ny = tx;
      const strength = constrain(map(edgeStrength, settings.edgeThreshold, 160, 0, 1), 0, 1);
      const lengthValue = isDarkCenter
        ? lerp(2.8, 7.8, darkness / 255)
        : lerp(3.2, 8.8, strength);

      candidateEdges.push({
        sampleX: x,
        sampleY: y,
        nxPos: x / w,
        nyPos: y / h,
        tx,
        ty,
        nx,
        ny,
        strength,
        darkness: darkness / 255,
        lengthValue,
        weightValue: lerp(0.5, 1.9, darkness / 255),
        alphaValue: lerp(42, 110, constrain(strength * 0.8 + darkness / 255 * 0.6, 0, 1)),
        seed: x * 0.173 + y * 0.291,
        pairMerged: false
      });

      if (!useFillMerge && darkness > 24 && support >= 3 && noise(x * 0.05 + 60, y * 0.05 + 60) > 0.7) {
        candidateHatches.push({
          nxPos: x / w,
          nyPos: y / h,
          tx,
          ty,
          nx,
          ny,
          strength,
          darkness: darkness / 255,
          lengthValue: lengthValue * 0.82,
          weightValue: lerp(0.35, 0.95, darkness / 255),
          alphaValue: lerp(22, 58, darkness / 255),
          seed: x * 0.111 + y * 0.149,
          pairMerged: false
        });
      }
    }
  }

  candidateEdges.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  candidateHatches.sort((a, b) => b.darkness - a.darkness);

  edgeSamples = useFillMerge
    ? pairNearbyEdges(candidateEdges, w, h, getTenthsSetting("edgeFillThreshold")).slice(0, MAX_EDGE_SAMPLES)
    : candidateEdges.slice(0, MAX_EDGE_SAMPLES);
  hatchSamples = useFillMerge ? [] : candidateHatches.slice(0, MAX_HATCH_SAMPLES);

  prepareEdgeVariants(edgeSamples, false);
  prepareEdgeVariants(hatchSamples, true);
}

function buildCurrentModeOutput() {
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];

  if (!sceneLayout || !analysisState) {
    return;
  }

  const effectiveMode = getEffectiveRenderMode();

  if (effectiveMode === "path") {
    buildStrokeField();
  } else if (effectiveMode === "region-grow") {
    buildRegionGrowField();
  } else if (effectiveMode === "color-grow") {
    buildColorGrowField();
  } else if (effectiveMode === "color-boundary") {
    buildColorBoundaryField();
  } else if (effectiveMode === "wave-contour") {
    buildWaveContourField();
  } else if (effectiveMode === "wave-shape") {
    buildWaveShapeField();
  } else if (effectiveMode === "rubber-contour") {
    buildRubberContourField();
  } else if (effectiveMode === "contour") {
    buildContourField();
  } else {
    buildEdgeField(effectiveMode === "edge-fill");
  }
}

async function buildColorBoundaryMaskAsync(brightnessMap, contrastMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const colorThreshold = settings.colorDistanceThreshold;
  const contrastThreshold = max(1, settings.localContrastThreshold * 0.55);
  const brightnessGuard = settings.lineBrightnessThreshold + 18;

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在检测色块边界...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;

      const horizontalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - 1, idx + 1);
      const verticalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w, idx + w);
      const diagADelta = colorDistanceBetween(rMap, gMap, bMap, idx - w - 1, idx + w + 1);
      const diagBDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w + 1, idx + w - 1);
      const strongestDelta = max(horizontalDelta, verticalDelta, diagADelta, diagBDelta);

      const isBoundary =
        strongestDelta >= colorThreshold &&
        (contrastMap[idx] >= contrastThreshold || brightnessMap[idx] <= brightnessGuard);

      if (isBoundary) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

async function pairNearbyEdgesAsync(samples, w, h, pairThreshold) {
  const buckets = new Map();
  const used = new Uint8Array(samples.length);
  const pairedSamples = [];
  const pairCellSize = max(1, floor(settings.edgeFillCellSize));
  const minNormalGap = min(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxNormalGap = max(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxTangentGap = max(0, getTenthsSetting("edgeFillMaxTangentGap"));
  const minTangentDot = constrain(getHundredthsSetting("edgeFillMinTangentDot"), 0, 1);
  const maxNormalDot = constrain(getHundredthsSetting("edgeFillMaxNormalDot"), -1, 1);

  for (let i = 0; i < samples.length; i += 1) {
    if (i % 400 === 0) {
      await ensureAnalysisResponsive("正在整理边缘配对...");
    }
    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    const key = `${cellX},${cellY}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(i);
  }

  for (let i = 0; i < samples.length; i += 1) {
    if (i % 160 === 0) {
      await ensureAnalysisResponsive("正在匹配双侧边缘...");
    }
    if (used[i]) {
      continue;
    }

    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const bucket = buckets.get(`${cellX + offsetX},${cellY + offsetY}`);
        if (!bucket) {
          continue;
        }

        for (const candidateIndex of bucket) {
          if (candidateIndex === i || used[candidateIndex]) {
            continue;
          }

          const other = samples[candidateIndex];
          const tangentDot = abs(sample.tx * other.tx + sample.ty * other.ty);
          if (tangentDot < minTangentDot) {
            continue;
          }

          const normalDot = sample.nx * other.nx + sample.ny * other.ny;
          if (normalDot > maxNormalDot) {
            continue;
          }

          const dx = other.sampleX - sample.sampleX;
          const dy = other.sampleY - sample.sampleY;
          const tangentGap = abs(dx * sample.tx + dy * sample.ty);
          const normalGap = abs(dx * sample.nx + dy * sample.ny);

          if (normalGap < minNormalGap || normalGap > maxNormalGap || tangentGap > maxTangentGap) {
            continue;
          }

          const score =
            tangentDot * 2.1 +
            (-normalDot) * 1.4 -
            tangentGap * 0.3 -
            abs(normalGap - 2.8) * 0.18 +
            min(sample.darkness, other.darkness) * 0.35;
          if (score > bestScore) {
            bestScore = score;
            bestIndex = candidateIndex;
          }
        }
      }
    }

    if (bestIndex === -1 || bestScore < pairThreshold) {
      used[i] = 1;
      pairedSamples.push(sample);
      continue;
    }

    used[i] = 1;
    used[bestIndex] = 1;
    pairedSamples.push(createPairedEdgeSample(sample, samples[bestIndex], w, h));
  }

  pairedSamples.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  return pairedSamples;
}

async function prepareEdgeVariantsAsync(samples, isHatch) {
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    if (sampleIndex % 240 === 0) {
      await ensureAnalysisResponsive("正在生成边缘抖动变体...");
    }
    const sample = samples[sampleIndex];
    const gridX = floor(sample.nxPos * 28);
    const gridY = floor(sample.nyPos * 42);
    sample.variants = [];

    for (let variant = 0; variant < BOIL_VARIANTS; variant += 1) {
      const clusterNormal = map(
        noise(gridX * 0.23 + variant * 3.1, gridY * 0.17 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const clusterTangent = map(
        noise(gridX * 0.19 + variant * 4.3, gridY * 0.21 + 80 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const localNormal = map(noise(sample.seed * 0.31 + variant * 7.3, 10), 0, 1, -1, 1);
      const localTangent = map(noise(sample.seed * 0.27 + variant * 6.1, 40), 0, 1, -1, 1);
      const lengthScale = lerp(0.9, 1.08, noise(sample.seed * 0.23 + variant * 8.1, 90));
      const alphaScale = lerp(0.88, 1.06, noise(sample.seed * 0.17 + variant * 5.9, 140));
      const weightScale = lerp(0.86, 1.14, noise(sample.seed * 0.11 + variant * 9.7, 180));
      const echoDrift = map(noise(sample.seed * 0.07 + variant * 4.7, 220), 0, 1, -1, 1);

      sample.variants.push({
        normalOffset:
          (clusterNormal * 0.72 + localNormal * 0.28) * getTenthsSetting("edgeJitterNormal"),
        tangentOffset:
          (clusterTangent * 0.65 + localTangent * 0.35) * getTenthsSetting("edgeJitterTangent"),
        lengthScale,
        alphaScale,
        weightScale,
        echoDrift,
        visible: isHatch
          ? noise(sample.seed * 0.13 + variant * 5.1, 260) > 0.24
          : noise(sample.seed * 0.09 + variant * 3.7, 260) > 0.05
      });
    }
  }
}

async function buildEdgeFieldAsync(useFillMerge) {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = await getFilteredBrightnessMapAsync();
  const candidateEdges = [];
  const candidateHatches = [];

  for (let y = 1; y < h - 1; y += 2) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在扫描边缘候选...");
    }
    for (let x = 1; x < w - 1; x += 2) {
      const center = brightnessMap[y * w + x];
      const left = brightnessMap[y * w + x - 1];
      const right = brightnessMap[y * w + x + 1];
      const up = brightnessMap[(y - 1) * w + x];
      const down = brightnessMap[(y + 1) * w + x];
      const darkness = 255 - center;

      const sobelX =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * left -
        brightnessMap[(y + 1) * w + x - 1] +
        brightnessMap[(y - 1) * w + x + 1] +
        2 * right +
        brightnessMap[(y + 1) * w + x + 1];

      const sobelY =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * up -
        brightnessMap[(y - 1) * w + x + 1] +
        brightnessMap[(y + 1) * w + x - 1] +
        2 * down +
        brightnessMap[(y + 1) * w + x + 1];

      const edgeStrength = sqrt(sobelX * sobelX + sobelY * sobelY) * 0.25;
      const neighborhoodMean = (left + right + up + down) * 0.25;
      const isDarkCenter = center < settings.lineBrightnessThreshold && center + 6 < neighborhoodMean;
      const support = Number(left < 236) + Number(right < 236) + Number(up < 236) + Number(down < 236);

      if (!isDarkCenter && edgeStrength < settings.edgeThreshold) {
        continue;
      }
      if (support < 2 && darkness < 24 && edgeStrength < settings.edgeThreshold * 1.3) {
        continue;
      }

      const keepNoise = noise(x * 0.034, y * 0.034);
      const keepChance = constrain(
        map(edgeStrength + darkness * 0.65, settings.edgeThreshold, 210, 0.18, 0.92),
        0.14,
        0.92
      );
      if (keepNoise > keepChance) {
        continue;
      }

      const tangentAngle = atan2(sobelY, sobelX) + HALF_PI;
      const tx = cos(tangentAngle);
      const ty = sin(tangentAngle);
      const nx = -ty;
      const ny = tx;
      const strength = constrain(map(edgeStrength, settings.edgeThreshold, 160, 0, 1), 0, 1);
      const lengthValue = isDarkCenter ? lerp(2.8, 7.8, darkness / 255) : lerp(3.2, 8.8, strength);

      candidateEdges.push({
        sampleX: x,
        sampleY: y,
        nxPos: x / w,
        nyPos: y / h,
        tx,
        ty,
        nx,
        ny,
        strength,
        darkness: darkness / 255,
        lengthValue,
        weightValue: lerp(0.5, 1.9, darkness / 255),
        alphaValue: lerp(42, 110, constrain(strength * 0.8 + darkness / 255 * 0.6, 0, 1)),
        seed: x * 0.173 + y * 0.291,
        pairMerged: false
      });

      if (!useFillMerge && darkness > 24 && support >= 3 && noise(x * 0.05 + 60, y * 0.05 + 60) > 0.7) {
        candidateHatches.push({
          nxPos: x / w,
          nyPos: y / h,
          tx,
          ty,
          nx,
          ny,
          strength,
          darkness: darkness / 255,
          lengthValue: lengthValue * 0.82,
          weightValue: lerp(0.35, 0.95, darkness / 255),
          alphaValue: lerp(22, 58, darkness / 255),
          seed: x * 0.111 + y * 0.149,
          pairMerged: false
        });
      }
    }
  }

  candidateEdges.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  candidateHatches.sort((a, b) => b.darkness - a.darkness);

  edgeSamples = useFillMerge
    ? (await pairNearbyEdgesAsync(candidateEdges, w, h, getTenthsSetting("edgeFillThreshold"))).slice(0, MAX_EDGE_SAMPLES)
    : candidateEdges.slice(0, MAX_EDGE_SAMPLES);
  hatchSamples = useFillMerge ? [] : candidateHatches.slice(0, MAX_HATCH_SAMPLES);

  await prepareEdgeVariantsAsync(edgeSamples, false);
  await prepareEdgeVariantsAsync(hatchSamples, true);
}

async function buildCurrentModeOutputAsync() {
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];

  if (!sceneLayout || !analysisState) {
    return;
  }

  const effectiveMode = getEffectiveRenderMode();

  if (effectiveMode === "path") {
    await buildStrokeFieldAsync();
  } else if (effectiveMode === "color-boundary") {
    await buildColorBoundaryFieldAsync();
  } else if (effectiveMode === "wave-contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "wave-contour" });
  } else if (effectiveMode === "wave-shape") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "wave-shape" });
  } else if (effectiveMode === "rubber-contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "rubber-contour" });
  } else if (effectiveMode === "contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths);
  } else {
    await buildEdgeFieldAsync(effectiveMode === "edge-fill");
  }
}

function pairNearbyEdges(samples, w, h, pairThreshold) {
  const buckets = new Map();
  const used = new Uint8Array(samples.length);
  const pairedSamples = [];
  const pairCellSize = max(1, floor(settings.edgeFillCellSize));
  const minNormalGap = min(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxNormalGap = max(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxTangentGap = max(0, getTenthsSetting("edgeFillMaxTangentGap"));
  const minTangentDot = constrain(getHundredthsSetting("edgeFillMinTangentDot"), 0, 1);
  const maxNormalDot = constrain(getHundredthsSetting("edgeFillMaxNormalDot"), -1, 1);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    const key = `${cellX},${cellY}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(i);
  }

  for (let i = 0; i < samples.length; i += 1) {
    if (used[i]) {
      continue;
    }

    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const bucket = buckets.get(`${cellX + offsetX},${cellY + offsetY}`);
        if (!bucket) {
          continue;
        }

        for (const candidateIndex of bucket) {
          if (candidateIndex === i || used[candidateIndex]) {
            continue;
          }

          const other = samples[candidateIndex];
          const tangentDot = abs(sample.tx * other.tx + sample.ty * other.ty);
          if (tangentDot < minTangentDot) {
            continue;
          }

          const normalDot = sample.nx * other.nx + sample.ny * other.ny;
          if (normalDot > maxNormalDot) {
            continue;
          }

          const dx = other.sampleX - sample.sampleX;
          const dy = other.sampleY - sample.sampleY;
          const tangentGap = abs(dx * sample.tx + dy * sample.ty);
          const normalGap = abs(dx * sample.nx + dy * sample.ny);

          if (
            normalGap < minNormalGap ||
            normalGap > maxNormalGap ||
            tangentGap > maxTangentGap
          ) {
            continue;
          }

          const score =
            tangentDot * 2.1 +
            (-normalDot) * 1.4 -
            tangentGap * 0.3 -
            abs(normalGap - 2.8) * 0.18 +
            min(sample.darkness, other.darkness) * 0.35;
          if (score > bestScore) {
            bestScore = score;
            bestIndex = candidateIndex;
          }
        }
      }
    }

    if (bestIndex === -1 || bestScore < pairThreshold) {
      used[i] = 1;
      pairedSamples.push(sample);
      continue;
    }

    used[i] = 1;
    used[bestIndex] = 1;
    pairedSamples.push(createPairedEdgeSample(sample, samples[bestIndex], w, h));
  }

  pairedSamples.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  return pairedSamples;
}

function createPairedEdgeSample(a, b, w, h) {
  const tangentAlignment = a.tx * b.tx + a.ty * b.ty < 0 ? -1 : 1;
  const tx = a.tx + b.tx * tangentAlignment;
  const ty = a.ty + b.ty * tangentAlignment;
  const tangentLength = max(0.0001, sqrt(tx * tx + ty * ty));
  const mergedTx = tx / tangentLength;
  const mergedTy = ty / tangentLength;

  const centerX = (a.sampleX + b.sampleX) * 0.5;
  const centerY = (a.sampleY + b.sampleY) * 0.5;
  const dx = b.sampleX - a.sampleX;
  const dy = b.sampleY - a.sampleY;
  const edgeSpan = abs(dx * a.nx + dy * a.ny);
  const averagedDarkness = (a.darkness + b.darkness) * 0.5;

  return {
    sampleX: centerX,
    sampleY: centerY,
    nxPos: centerX / w,
    nyPos: centerY / h,
    tx: mergedTx,
    ty: mergedTy,
    nx: -mergedTy,
    ny: mergedTx,
    strength: max(a.strength, b.strength),
    darkness: max(a.darkness, b.darkness),
    lengthValue: max(a.lengthValue, b.lengthValue) + edgeSpan * 0.2,
    weightValue: constrain(edgeSpan * 0.82 + lerp(0.18, 0.72, averagedDarkness), 1.15, 4.8),
    alphaValue: min(126, (a.alphaValue + b.alphaValue) * 0.55),
    seed: (a.seed + b.seed) * 0.5,
    pairMerged: true
  };
}

function prepareEdgeVariants(samples, isHatch) {
  for (const sample of samples) {
    const gridX = floor(sample.nxPos * 28);
    const gridY = floor(sample.nyPos * 42);
    sample.variants = [];

    for (let variant = 0; variant < BOIL_VARIANTS; variant += 1) {
      const clusterNormal = map(
        noise(gridX * 0.23 + variant * 3.1, gridY * 0.17 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const clusterTangent = map(
        noise(gridX * 0.19 + variant * 4.3, gridY * 0.21 + 80 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const localNormal = map(noise(sample.seed * 0.31 + variant * 7.3, 10), 0, 1, -1, 1);
      const localTangent = map(noise(sample.seed * 0.27 + variant * 6.1, 40), 0, 1, -1, 1);
      const lengthScale = lerp(0.9, 1.08, noise(sample.seed * 0.23 + variant * 8.1, 90));
      const alphaScale = lerp(0.88, 1.06, noise(sample.seed * 0.17 + variant * 5.9, 140));
      const weightScale = lerp(0.86, 1.14, noise(sample.seed * 0.11 + variant * 9.7, 180));
      const echoDrift = map(noise(sample.seed * 0.07 + variant * 4.7, 220), 0, 1, -1, 1);

      sample.variants.push({
        normalOffset:
          (clusterNormal * 0.72 + localNormal * 0.28) * getTenthsSetting("edgeJitterNormal"),
        tangentOffset:
          (clusterTangent * 0.65 + localTangent * 0.35) * getTenthsSetting("edgeJitterTangent"),
        lengthScale,
        alphaScale,
        weightScale,
        echoDrift,
        visible: isHatch
          ? noise(sample.seed * 0.13 + variant * 5.1, 260) > 0.24
          : noise(sample.seed * 0.09 + variant * 3.7, 260) > 0.05
      });
    }
  }
}

function drawEdgeFigure(boilFrame) {
  image(getOrBuildCachedFrameLayer(boilFrame), 0, 0);
}

function getOrBuildCachedFrameLayer(boilFrame) {
  const cacheMode = getRenderCacheModeKey();
  const sequenceIndex = getBoilSequenceIndex(boilFrame);
  const needsFreshCache =
    renderFrameCache.mode !== cacheMode ||
    renderFrameCache.width !== width ||
    renderFrameCache.height !== height;

  if (needsFreshCache) {
    clearRenderFrameCache();
    renderFrameCache.mode = cacheMode;
    renderFrameCache.width = width;
    renderFrameCache.height = height;
  }

  if (renderFrameCache.frames.has(sequenceIndex)) {
    return renderFrameCache.frames.get(sequenceIndex);
  }

  // Non-SVG modes only have a small number of boil states, so caching them once
  // keeps both playback and export from redrawing thousands of segments every frame.
  const frameLayer = createGraphics(width, height);
  frameLayer.clear();
  frameLayer.pixelDensity(1);
  frameLayer.strokeCap(ROUND);
  frameLayer.strokeJoin(ROUND);
  renderFrameToLayer(frameLayer, sequenceIndex);
  renderFrameCache.frames.set(sequenceIndex, frameLayer);
  return frameLayer;
}

function renderFrameToLayer(layer, sequenceIndex) {
  const { x: scaleX, y: scaleY, unit } = getSceneScale();
  const activeVariant = BOIL_SEQUENCE[sequenceIndex % BOIL_SEQUENCE.length];
  const inkStyle = getInkStrokeStyle();

  layer.push();
  layer.translate(sceneLayout.x, sceneLayout.y);
  if (isPathMode(settings.renderMode)) {
    const contourThicknessScale = getContourStrokeThicknessScale() * getGlobalLineWidthScale();
    drawStrokePaths(strokePaths, activeVariant, scaleX, scaleY, unit, inkStyle, contourThicknessScale, layer);
  } else {
    const echoVariant = BOIL_SEQUENCE[(sequenceIndex + 2) % BOIL_SEQUENCE.length];
    const globalLineWidthScale = getGlobalLineWidthScale();
    drawEdgeLayer(edgeSamples, activeVariant, echoVariant, unit, false, inkStyle, globalLineWidthScale, layer);
    drawEdgeLayer(hatchSamples, activeVariant, echoVariant, unit, true, inkStyle, globalLineWidthScale, layer);
  }
  layer.pop();
}

function strokeTarget(target, r, g, b, a) {
  if (target) {
    target.stroke(r, g, b, a);
    return;
  }
  stroke(r, g, b, a);
}

function strokeWeightTarget(target, value) {
  if (target) {
    target.strokeWeight(value);
    return;
  }
  strokeWeight(value);
}

function lineTarget(target, x1, y1, x2, y2) {
  if (target) {
    target.line(x1, y1, x2, y2);
    return;
  }
  line(x1, y1, x2, y2);
}

function drawEdgeLayer(samples, activeVariant, echoVariant, unit, isHatch, inkStyle, globalLineWidthScale = 1, target = null) {
  for (const sample of samples) {
    const variant = sample.variants?.[activeVariant];
    if (!variant || !variant.visible) {
      continue;
    }

    const baseX = sample.nxPos * sceneLayout.width;
    const baseY = sample.nyPos * sceneLayout.height;
    const normalMotionScale = sample.pairMerged ? 0.62 : 1;
    const tangentMotionScale = sample.pairMerged ? 0.92 : 1;
    const centerX =
      baseX +
      sample.nx * variant.normalOffset * unit * (0.72 + sample.darkness * 0.8) * normalMotionScale +
      sample.tx * variant.tangentOffset * unit * (0.6 + sample.strength * 0.55) * tangentMotionScale;
    const centerY =
      baseY +
      sample.ny * variant.normalOffset * unit * (0.72 + sample.darkness * 0.8) * normalMotionScale +
      sample.ty * variant.tangentOffset * unit * (0.6 + sample.strength * 0.55) * tangentMotionScale;

    const baseLength = sample.lengthValue * unit * (isHatch ? 0.74 : 1) * variant.lengthScale;
    const passes = isHatch || sample.pairMerged ? 1 : 2;

    for (let pass = 0; pass < passes; pass += 1) {
      const echo = sample.variants?.[echoVariant] || variant;
      const passDrift = pass === 0 ? 0 : echo.echoDrift * unit * 0.95;
      const x1 = centerX - sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y1 = centerY - sample.ty * baseLength * 0.5 + sample.ny * passDrift;
      const x2 = centerX + sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y2 = centerY + sample.ty * baseLength * 0.5 + sample.ny * passDrift;

      const alphaScale = variant.alphaScale * (isHatch ? 0.84 : sample.pairMerged ? 0.96 : 1 - pass * 0.22);
      const weightScale = variant.weightScale * (isHatch ? 1 : sample.pairMerged ? 1.08 : 1 - pass * 0.14);
      strokeTarget(
        target,
        inkStyle.color[0],
        inkStyle.color[1],
        inkStyle.color[2],
        constrain(sample.alphaValue * alphaScale * inkStyle.opacityScale, 0, 255)
      );
      strokeWeightTarget(target, max(0.3, sample.weightValue * unit * weightScale * globalLineWidthScale));
      lineTarget(target, x1, y1, x2, y2);
    }
  }
}

function buildStrokeField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const inkMask = getInkMask();
  const closedMask = closeBinaryMask(inkMask, w, h, MORPH_CLOSE_PASSES);
  const distanceField = computeDistanceField(closedMask, w, h);
  const skeletonMask = thinMask(closedMask, w, h, THINNING_MAX_ITERATIONS);

  strokePaths = buildStrokePaths(skeletonMask, distanceField, w, h)
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);

  preparePathVariants(strokePaths);
}

async function buildStrokeFieldAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const inkMask = await getInkMaskAsync();
  const closedMask = await closeBinaryMaskAsync(inkMask, w, h, MORPH_CLOSE_PASSES);
  const distanceField = await computeDistanceFieldAsync(closedMask, w, h);
  const skeletonMask = await thinMaskAsync(closedMask, w, h, THINNING_MAX_ITERATIONS);

  strokePaths = (await buildStrokePathsAsync(skeletonMask, distanceField, w, h))
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);

  await preparePathVariantsAsync(strokePaths);
}

function buildInkMask(brightnessMap, w, h) {
  const mask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];

      let localTotal = 0;
      let localCount = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          localTotal += brightnessMap[(y + offsetY) * w + x + offsetX];
          localCount += 1;
        }
      }

      const localMean = localTotal / localCount;
      const isInk =
        center < settings.inkBrightnessThreshold ||
        center + settings.localContrastThreshold < localMean;

      if (isInk) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

function closeBinaryMask(mask, w, h, passes) {
  let current = mask.slice();

  for (let pass = 0; pass < passes; pass += 1) {
    current = dilateMask(current, w, h);
    current = erodeMask(current, w, h);
  }

  return current;
}

async function closeBinaryMaskAsync(mask, w, h, passes) {
  let current = mask.slice();

  for (let pass = 0; pass < passes; pass += 1) {
    current = await dilateMaskAsync(current, w, h);
    current = await erodeMaskAsync(current, w, h);
  }

  return current;
}

function dilateMask(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      let hasInk = 0;
      for (let offsetY = -1; offsetY <= 1 && !hasInk; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (mask[(y + offsetY) * w + x + offsetX]) {
            hasInk = 1;
            break;
          }
        }
      }
      output[y * w + x] = hasInk;
    }
  }

  return output;
}

async function dilateMaskAsync(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在扩张线条区域...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      let hasInk = 0;
      for (let offsetY = -1; offsetY <= 1 && !hasInk; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (mask[(y + offsetY) * w + x + offsetX]) {
            hasInk = 1;
            break;
          }
        }
      }
      output[y * w + x] = hasInk;
    }
  }

  return output;
}

function erodeMask(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      let inkNeighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          inkNeighbors += mask[(y + offsetY) * w + x + offsetX];
        }
      }
      output[y * w + x] = inkNeighbors >= 5 ? 1 : 0;
    }
  }

  return output;
}

async function erodeMaskAsync(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在收缩线条区域...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      let inkNeighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          inkNeighbors += mask[(y + offsetY) * w + x + offsetX];
        }
      }
      output[y * w + x] = inkNeighbors >= 5 ? 1 : 0;
    }
  }

  return output;
}

function computeDistanceField(mask, w, h) {
  const distanceField = new Float32Array(mask.length);
  const largeValue = 1e6;

  for (let i = 0; i < mask.length; i += 1) {
    distanceField[i] = mask[i] ? largeValue : 0;
  }

  for (let y = 1; y < h; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx - 1] + 1,
        distanceField[idx - w] + 1,
        distanceField[idx - w - 1] + Math.SQRT2,
        distanceField[idx - w + 1] + Math.SQRT2
      );
    }
  }

  for (let y = h - 2; y >= 0; y -= 1) {
    for (let x = w - 2; x >= 1; x -= 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx + 1] + 1,
        distanceField[idx + w] + 1,
        distanceField[idx + w + 1] + Math.SQRT2,
        distanceField[idx + w - 1] + Math.SQRT2
      );
    }
  }

  return distanceField;
}

async function computeDistanceFieldAsync(mask, w, h) {
  const distanceField = new Float32Array(mask.length);
  const largeValue = 1e6;

  for (let i = 0; i < mask.length; i += 1) {
    if (i % 12000 === 0) {
      await ensureAnalysisResponsive("正在计算笔触宽度场...");
    }
    distanceField[i] = mask[i] ? largeValue : 0;
  }

  for (let y = 1; y < h; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在传播距离场...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx - 1] + 1,
        distanceField[idx - w] + 1,
        distanceField[idx - w - 1] + Math.SQRT2,
        distanceField[idx - w + 1] + Math.SQRT2
      );
    }
  }

  for (let y = h - 2; y >= 0; y -= 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在回填距离场...");
    }
    for (let x = w - 2; x >= 1; x -= 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx + 1] + 1,
        distanceField[idx + w] + 1,
        distanceField[idx + w + 1] + Math.SQRT2,
        distanceField[idx + w - 1] + Math.SQRT2
      );
    }
  }

  return distanceField;
}

function thinMask(mask, w, h, maxIterations) {
  const current = mask.slice();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const changedFirst = thinningPass(current, w, h, true);
    const changedSecond = thinningPass(current, w, h, false);
    if (!changedFirst && !changedSecond) {
      break;
    }
  }

  return current;
}

async function thinMaskAsync(mask, w, h, maxIterations) {
  const current = mask.slice();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    await ensureAnalysisResponsive(`正在细化中心线... ${iteration + 1}/${maxIterations}`);
    const changedFirst = await thinningPassAsync(current, w, h, true);
    const changedSecond = await thinningPassAsync(current, w, h, false);
    if (!changedFirst && !changedSecond) {
      break;
    }
  }

  return current;
}

function thinningPass(mask, w, h, firstStep) {
  const toDelete = [];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const p2 = mask[(y - 1) * w + x];
      const p3 = mask[(y - 1) * w + x + 1];
      const p4 = mask[y * w + x + 1];
      const p5 = mask[(y + 1) * w + x + 1];
      const p6 = mask[(y + 1) * w + x];
      const p7 = mask[(y + 1) * w + x - 1];
      const p8 = mask[y * w + x - 1];
      const p9 = mask[(y - 1) * w + x - 1];

      const neighborSum = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
      if (neighborSum < 2 || neighborSum > 6) {
        continue;
      }

      const transitions =
        Number(!p2 && p3) +
        Number(!p3 && p4) +
        Number(!p4 && p5) +
        Number(!p5 && p6) +
        Number(!p6 && p7) +
        Number(!p7 && p8) +
        Number(!p8 && p9) +
        Number(!p9 && p2);

      if (transitions !== 1) {
        continue;
      }

      const keepCondition = firstStep
        ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
        : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

      if (keepCondition) {
        toDelete.push(idx);
      }
    }
  }

  for (const idx of toDelete) {
    mask[idx] = 0;
  }

  return toDelete.length > 0;
}

async function thinningPassAsync(mask, w, h, firstStep) {
  const toDelete = [];

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在细化骨架像素...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const p2 = mask[(y - 1) * w + x];
      const p3 = mask[(y - 1) * w + x + 1];
      const p4 = mask[y * w + x + 1];
      const p5 = mask[(y + 1) * w + x + 1];
      const p6 = mask[(y + 1) * w + x];
      const p7 = mask[(y + 1) * w + x - 1];
      const p8 = mask[y * w + x - 1];
      const p9 = mask[(y - 1) * w + x - 1];

      const neighborSum = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
      if (neighborSum < 2 || neighborSum > 6) {
        continue;
      }

      const transitions =
        Number(!p2 && p3) +
        Number(!p3 && p4) +
        Number(!p4 && p5) +
        Number(!p5 && p6) +
        Number(!p6 && p7) +
        Number(!p7 && p8) +
        Number(!p8 && p9) +
        Number(!p9 && p2);

      if (transitions !== 1) {
        continue;
      }

      const keepCondition = firstStep
        ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
        : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

      if (keepCondition) {
        toDelete.push(idx);
      }
    }
  }

  for (let i = 0; i < toDelete.length; i += 1) {
    if (i % 12000 === 0) {
      await ensureAnalysisResponsive("正在提交骨架裁剪...");
    }
    mask[toDelete[i]] = 0;
  }

  return toDelete.length > 0;
}

function buildStrokePaths(skeletonMask, distanceField, w, h) {
  const degrees = new Uint8Array(skeletonMask.length);
  const visitedEdges = new Set();
  const paths = [];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!skeletonMask[idx]) {
        continue;
      }
      degrees[idx] = getSkeletonNeighbors(idx, skeletonMask, w, h).length;
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx] || degrees[idx] === 2 || degrees[idx] === 0) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, false);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx]) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, true);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  return paths;
}

async function buildStrokePathsAsync(skeletonMask, distanceField, w, h) {
  const degrees = new Uint8Array(skeletonMask.length);
  const visitedEdges = new Set();
  const paths = [];

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在统计骨架连通度...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!skeletonMask[idx]) {
        continue;
      }
      degrees[idx] = getSkeletonNeighbors(idx, skeletonMask, w, h).length;
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (idx % 12000 === 0) {
      await ensureAnalysisResponsive("正在追踪开放路径...");
    }
    if (!skeletonMask[idx] || degrees[idx] === 2 || degrees[idx] === 0) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, false);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (idx % 12000 === 0) {
      await ensureAnalysisResponsive("正在追踪闭环路径...");
    }
    if (!skeletonMask[idx]) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, true);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function getSkeletonNeighbors(idx, mask, w, h) {
  const x = idx % w;
  const y = floor(idx / w);
  const neighbors = [];

  for (const dir of NEIGHBOR_DIRS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      continue;
    }

    const nIdx = ny * w + nx;
    if (mask[nIdx]) {
      neighbors.push(nIdx);
    }
  }

  return neighbors;
}

function getEdgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function tracePath(startIdx, nextIdx, mask, degrees, w, h, visitedEdges, allowLoop) {
  const path = [startIdx];
  let prev = startIdx;
  let current = nextIdx;

  while (true) {
    visitedEdges.add(getEdgeKey(prev, current));
    path.push(current);

    if (allowLoop && current === startIdx) {
      break;
    }

    if (degrees[current] !== 2 && current !== startIdx) {
      break;
    }

    const neighbors = getSkeletonNeighbors(current, mask, w, h).filter((candidate) => candidate !== prev);
    const candidates = neighbors.filter((candidate) => !visitedEdges.has(getEdgeKey(current, candidate)));

    if (!candidates.length) {
      if (allowLoop) {
        const loopCandidate = neighbors.find((candidate) => candidate === startIdx);
        if (loopCandidate !== undefined && !visitedEdges.has(getEdgeKey(current, loopCandidate))) {
          prev = current;
          current = loopCandidate;
          continue;
        }
      }
      break;
    }

    const chosen = chooseNextNeighbor(prev, current, candidates, w);
    prev = current;
    current = chosen;
  }

  return path;
}

function chooseNextNeighbor(prev, current, candidates, w) {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const prevX = prev % w;
  const prevY = floor(prev / w);
  const currentX = current % w;
  const currentY = floor(current / w);
  const dirX = currentX - prevX;
  const dirY = currentY - prevY;

  let bestCandidate = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const nextX = candidate % w;
    const nextY = floor(candidate / w);
    const stepX = nextX - currentX;
    const stepY = nextY - currentY;
    const stepLength = max(0.0001, sqrt(stepX * stepX + stepY * stepY));
    const score = (dirX * stepX + dirY * stepY) / stepLength;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function finalizePath(indexPath, distanceField, w, h) {
  if (!indexPath || indexPath.length < MIN_PATH_PIXELS) {
    return null;
  }

  const closed = indexPath.length > 2 && indexPath[0] === indexPath[indexPath.length - 1];
  const trimmedPath = closed ? indexPath.slice(0, -1) : indexPath.slice();
  const points = trimmedPath.map((idx) => {
    const x = idx % w;
    const y = floor(idx / w);
    return {
      x: x + 0.5,
      y: y + 0.5,
      radius: max(0.7, distanceField[idx] * WIDTH_RESPONSE)
    };
  });

  const resampled = resamplePath(points, PATH_RESAMPLE_SPACING, closed);
  const smoothed = smoothPath(resampled, closed);
  const pathLength = measurePathLength(smoothed, closed);
  if (smoothed.length < 2 || pathLength < MIN_PATH_DRAW_LENGTH) {
    return null;
  }

  let radiusTotal = 0;
  for (const point of smoothed) {
    radiusTotal += point.radius;
  }

  return {
    points: smoothed,
    closed,
    averageRadius: radiusTotal / smoothed.length,
    drawScore: pathLength * (0.8 + radiusTotal / max(1, smoothed.length) * 0.35),
    seed: smoothed[0].x * 0.173 + smoothed[0].y * 0.291 + pathLength * 0.07,
    variants: []
  };
}

function resamplePath(points, spacing, closed) {
  if (points.length < 2) {
    return points.slice();
  }

  const source = points.slice();
  if (closed) {
    source.push(points[0]);
  }

  const resampled = [copyPoint(source[0])];
  let accumulated = 0;

  for (let i = 1; i < source.length; i += 1) {
    let start = copyPoint(source[i - 1]);
    const end = source[i];
    let segmentLength = dist(start.x, start.y, end.x, end.y);

    if (segmentLength === 0) {
      continue;
    }

    while (accumulated + segmentLength >= spacing) {
      const ratio = (spacing - accumulated) / segmentLength;
      const nextPoint = {
        x: lerp(start.x, end.x, ratio),
        y: lerp(start.y, end.y, ratio),
        radius: lerp(start.radius, end.radius, ratio)
      };
      resampled.push(nextPoint);
      start = nextPoint;
      segmentLength = dist(start.x, start.y, end.x, end.y);
      accumulated = 0;
      if (segmentLength === 0) {
        break;
      }
    }

    accumulated += segmentLength;
  }

  if (!closed) {
    const lastPoint = source[source.length - 1];
    const currentLast = resampled[resampled.length - 1];
    if (dist(lastPoint.x, lastPoint.y, currentLast.x, currentLast.y) > spacing * 0.35) {
      resampled.push(copyPoint(lastPoint));
    }
  }

  if (closed && resampled.length > 2) {
    const lastPoint = resampled[resampled.length - 1];
    if (dist(lastPoint.x, lastPoint.y, resampled[0].x, resampled[0].y) < spacing * 0.7) {
      resampled.pop();
    }
  }

  return resampled;
}

function smoothPath(points, closed) {
  let current = points.map(copyPoint);

  for (let pass = 0; pass < 2; pass += 1) {
    const next = current.map(copyPoint);
    for (let i = 0; i < current.length; i += 1) {
      const prevIndex = i === 0 ? (closed ? current.length - 1 : 0) : i - 1;
      const nextIndex = i === current.length - 1 ? (closed ? 0 : current.length - 1) : i + 1;
      const prev = current[prevIndex];
      const point = current[i];
      const following = current[nextIndex];

      if (!closed && (i === 0 || i === current.length - 1)) {
        next[i] = copyPoint(point);
        continue;
      }

      next[i] = {
        x: (prev.x + point.x * 2 + following.x) * 0.25,
        y: (prev.y + point.y * 2 + following.y) * 0.25,
        radius: (prev.radius + point.radius * 2 + following.radius) * 0.25
      };
    }
    current = next;
  }

  return current;
}

function measurePathLength(points, closed) {
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }

  if (closed && points.length > 2) {
    total += dist(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y);
  }

  return total;
}

function copyPoint(point) {
  return {
    x: point.x,
    y: point.y,
    radius: point.radius
  };
}

function preparePathVariants(paths, options = {}) {
  const variantMode = options.variantMode || "default";
  const waveContour = variantMode === "wave-contour";
  const waveShape = variantMode === "wave-shape";
  const rubberContour = variantMode === "rubber-contour";

  for (const path of paths) {
    path.variants = [];
    const totalLength = max(0.0001, measurePathLength(path.points, path.closed));
    const cumulativeLengths = buildCumulativeLengths(path.points);

    for (let variantIndex = 0; variantIndex < BOIL_VARIANTS; variantIndex += 1) {
      const points = [];

      for (let i = 0; i < path.points.length; i += 1) {
        const basePoint = path.points[i];
        const progress = cumulativeLengths[i] / totalLength;
        const tangent = getPathTangent(path.points, i, path.closed);
        const normal = { x: -tangent.y, y: tangent.x };
        const radiusScale = constrain(basePoint.radius / 2.4, 0.65, 1.25);
        let normalNoise;
        let tangentNoise;
        let shapeField = null;

        if (waveContour) {
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency"));
          const wavePhase = variantIndex * TWO_PI * lerp(0.08, 1.15, settings.waveSpeed / 100);
          const harmonicPhase = variantIndex * TWO_PI * lerp(0.03, 0.48, settings.waveSpeed / 100);
          const wavePrimary = sin(progress * TWO_PI * waveCycles + wavePhase);
          const waveSecondary = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.75) + harmonicPhase);
          const waveNoise = map(noise(progress * 2.6 + variantIndex * 1.7, path.seed * 0.23 + 60), 0, 1, -1, 1);
          normalNoise = wavePrimary * 0.72 + waveSecondary * 0.2 + waveNoise * 0.08;
          tangentNoise = map(
            noise(progress * 2.1 + variantIndex * 2.3, path.seed * 0.17 + 120),
            0,
            1,
            -1,
            1
          ) * 0.22;
        } else if (waveShape) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed);
          normalNoise = shapeField.dx * normal.x + shapeField.dy * normal.y;
          tangentNoise = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
        } else if (rubberContour) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed * 0.61 + 37);
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency") * 0.72);
          const softPhase = variantIndex * TWO_PI * lerp(0.05, 0.78, settings.waveSpeed / 100);
          const bounce = sin(progress * TWO_PI * waveCycles + softPhase + path.seed * 0.004);
          const squeeze = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.55) - softPhase * 0.7);
          const fieldNormal = shapeField.dx * normal.x + shapeField.dy * normal.y;
          const fieldTangent = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
          normalNoise = bounce * 0.46 + fieldNormal * 0.54;
          tangentNoise = squeeze * 0.16 + fieldTangent * 0.34;
        } else {
          normalNoise =
            map(noise(progress * 3.6 + variantIndex * 11.3, path.seed * 0.19), 0, 1, -1, 1) * 0.75 +
            map(noise(progress * 8.4 + variantIndex * 4.7, path.seed * 0.31 + 80), 0, 1, -1, 1) * 0.25;
          tangentNoise = map(
            noise(progress * 4.3 + variantIndex * 9.1, path.seed * 0.27 + 140),
            0,
            1,
            -1,
            1
          );
        }
        const widthNoise = map(
          noise(progress * 5.7 + variantIndex * 7.9, path.seed * 0.13 + 220),
          0,
          1,
          1 - getHundredthsSetting("widthJitter"),
          1 + getHundredthsSetting("widthJitter") * (rubberContour ? 1.18 : 1)
        );

        const normalAmplitude = waveContour
          ? getTenthsSetting("waveAmplitude")
          : waveShape
            ? getTenthsSetting("waveAmplitude") * 1.12
            : rubberContour
              ? getTenthsSetting("waveAmplitude") * 0.92
              : getTenthsSetting("pathJitterNormal");
        const tangentAmplitude = waveContour
          ? getTenthsSetting("edgeJitterTangent")
          : waveShape
            ? getTenthsSetting("edgeJitterTangent") * 0.72
            : rubberContour
              ? getTenthsSetting("edgeJitterTangent") * 0.9
              : getTenthsSetting("pathJitterTangent");

        points.push({
          x:
            basePoint.x +
            normal.x * normalNoise * normalAmplitude * radiusScale +
            tangent.x * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dx || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          y:
            basePoint.y +
            normal.y * normalNoise * normalAmplitude * radiusScale +
            tangent.y * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dy || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          radius: basePoint.radius * widthNoise
        });
      }

      path.variants.push({
        points,
        alphaScale: lerp(0.92, 1.04, noise(path.seed * 0.11 + variantIndex * 3.7, 300))
      });
    }
  }
}

function buildCumulativeLengths(points) {
  const lengths = new Float32Array(points.length);
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    lengths[i] = total;
  }

  return lengths;
}

function sampleSharedWaveField(x, y, variantIndex, seed) {
  const longestSide = max(1, max(analysisState?.width || 1, analysisState?.height || 1));
  const spatialScale = (getTenthsSetting("waveFrequency") * TWO_PI) / longestSide;
  const speedMix = settings.waveSpeed / 100;
  const phase = variantIndex * TWO_PI * lerp(0.06, 1.1, speedMix);
  const wobblePhase = variantIndex * TWO_PI * lerp(0.03, 0.72, speedMix);
  const nx = x * spatialScale;
  const ny = y * spatialScale;

  const dx =
    sin(nx * 1.02 + ny * 0.34 + phase + seed * 0.0009) * 0.72 +
    sin(nx * 0.41 - ny * 0.88 + wobblePhase + seed * 0.0004) * 0.28;
  const dy =
    sin(ny * 0.97 - nx * 0.29 + phase * 0.92 + seed * 0.0007) * 0.7 +
    sin(nx * 0.76 + ny * 0.23 + wobblePhase * 1.07 + seed * 0.0003) * 0.3;

  return { dx, dy };
}

function getPathTangent(points, index, closed) {
  const prevIndex = index === 0 ? (closed ? points.length - 1 : 0) : index - 1;
  const nextIndex = index === points.length - 1 ? (closed ? 0 : points.length - 1) : index + 1;
  const prev = points[prevIndex];
  const next = points[nextIndex];
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const lengthValue = max(0.0001, sqrt(dx * dx + dy * dy));

  return {
    x: dx / lengthValue,
    y: dy / lengthValue
  };
}

function getContourStrokeThicknessScale() {
  const effectiveMode = getEffectiveRenderMode();
  const isContourMode =
    effectiveMode === "contour" ||
    effectiveMode === "wave-contour" ||
    effectiveMode === "wave-shape" ||
    effectiveMode === "rubber-contour";

  if (!isContourMode) {
    return 1;
  }

  return constrain((settings.contourStrokeThickness ?? 100) / 100, 0.2, 4);
}

function drawStrokeFigure(boilFrame) {
  image(getOrBuildCachedFrameLayer(boilFrame), 0, 0);
}

function drawStrokePaths(paths, activeVariant, scaleX, scaleY, unit, inkStyle, contourThicknessScale = 1, target = null) {
  for (const path of paths) {
    const variant = path.variants[activeVariant];
    if (!variant || variant.points.length < 2) {
      continue;
    }

    for (let i = 1; i < variant.points.length; i += 1) {
      drawStrokeSegment(
        variant.points[i - 1],
        variant.points[i],
        path.averageRadius,
        variant.alphaScale,
        scaleX,
        scaleY,
        unit,
        inkStyle,
        contourThicknessScale,
        target
      );
    }

    if (path.closed && variant.points.length > 2) {
      drawStrokeSegment(
        variant.points[variant.points.length - 1],
        variant.points[0],
        path.averageRadius,
        variant.alphaScale,
        scaleX,
        scaleY,
        unit,
        inkStyle,
        contourThicknessScale,
        target
      );
    }
  }
}

async function preparePathVariantsAsync(paths, options = {}) {
  const variantMode = options.variantMode || "default";
  const waveContour = variantMode === "wave-contour";
  const waveShape = variantMode === "wave-shape";
  const rubberContour = variantMode === "rubber-contour";

  for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
    if (pathIndex % 18 === 0) {
      await ensureAnalysisResponsive("正在生成路径抖动变体...");
    }
    const path = paths[pathIndex];
    path.variants = [];
    const totalLength = max(0.0001, measurePathLength(path.points, path.closed));
    const cumulativeLengths = buildCumulativeLengths(path.points);

    for (let variantIndex = 0; variantIndex < BOIL_VARIANTS; variantIndex += 1) {
      const points = [];

      for (let i = 0; i < path.points.length; i += 1) {
        if (i > 0 && i % 160 === 0) {
          await ensureAnalysisResponsive("正在细化路径抖动...");
        }
        const basePoint = path.points[i];
        const progress = cumulativeLengths[i] / totalLength;
        const tangent = getPathTangent(path.points, i, path.closed);
        const normal = { x: -tangent.y, y: tangent.x };
        const radiusScale = constrain(basePoint.radius / 2.4, 0.65, 1.25);
        let normalNoise;
        let tangentNoise;
        let shapeField = null;

        if (waveContour) {
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency"));
          const wavePhase = variantIndex * TWO_PI * lerp(0.08, 1.15, settings.waveSpeed / 100);
          const harmonicPhase = variantIndex * TWO_PI * lerp(0.03, 0.48, settings.waveSpeed / 100);
          const wavePrimary = sin(progress * TWO_PI * waveCycles + wavePhase);
          const waveSecondary = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.75) + harmonicPhase);
          const waveNoise = map(noise(progress * 2.6 + variantIndex * 1.7, path.seed * 0.23 + 60), 0, 1, -1, 1);
          normalNoise = wavePrimary * 0.72 + waveSecondary * 0.2 + waveNoise * 0.08;
          tangentNoise = map(
            noise(progress * 2.1 + variantIndex * 2.3, path.seed * 0.17 + 120),
            0,
            1,
            -1,
            1
          ) * 0.22;
        } else if (waveShape) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed);
          normalNoise = shapeField.dx * normal.x + shapeField.dy * normal.y;
          tangentNoise = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
        } else if (rubberContour) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed * 0.61 + 37);
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency") * 0.72);
          const softPhase = variantIndex * TWO_PI * lerp(0.05, 0.78, settings.waveSpeed / 100);
          const bounce = sin(progress * TWO_PI * waveCycles + softPhase + path.seed * 0.004);
          const squeeze = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.55) - softPhase * 0.7);
          const fieldNormal = shapeField.dx * normal.x + shapeField.dy * normal.y;
          const fieldTangent = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
          normalNoise = bounce * 0.46 + fieldNormal * 0.54;
          tangentNoise = squeeze * 0.16 + fieldTangent * 0.34;
        } else {
          normalNoise =
            map(noise(progress * 3.6 + variantIndex * 11.3, path.seed * 0.19), 0, 1, -1, 1) * 0.75 +
            map(noise(progress * 8.4 + variantIndex * 4.7, path.seed * 0.31 + 80), 0, 1, -1, 1) * 0.25;
          tangentNoise = map(
            noise(progress * 4.3 + variantIndex * 9.1, path.seed * 0.27 + 140),
            0,
            1,
            -1,
            1
          );
        }
        const widthNoise = map(
          noise(progress * 5.7 + variantIndex * 7.9, path.seed * 0.13 + 220),
          0,
          1,
          1 - getHundredthsSetting("widthJitter"),
          1 + getHundredthsSetting("widthJitter") * (rubberContour ? 1.18 : 1)
        );

        const normalAmplitude = waveContour
          ? getTenthsSetting("waveAmplitude")
          : waveShape
            ? getTenthsSetting("waveAmplitude") * 1.12
            : rubberContour
              ? getTenthsSetting("waveAmplitude") * 0.92
              : getTenthsSetting("pathJitterNormal");
        const tangentAmplitude = waveContour
          ? getTenthsSetting("edgeJitterTangent")
          : waveShape
            ? getTenthsSetting("edgeJitterTangent") * 0.72
            : rubberContour
              ? getTenthsSetting("edgeJitterTangent") * 0.9
              : getTenthsSetting("pathJitterTangent");

        points.push({
          x:
            basePoint.x +
            normal.x * normalNoise * normalAmplitude * radiusScale +
            tangent.x * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dx || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          y:
            basePoint.y +
            normal.y * normalNoise * normalAmplitude * radiusScale +
            tangent.y * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dy || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          radius: basePoint.radius * widthNoise
        });
      }

      path.variants.push({
        points,
        alphaScale: lerp(0.92, 1.04, noise(path.seed * 0.11 + variantIndex * 3.7, 300))
      });
    }
  }
}

function drawStrokeSegment(
  pointA,
  pointB,
  averageRadius,
  alphaScale,
  scaleX,
  scaleY,
  unit,
  inkStyle,
  contourThicknessScale = 1,
  target = null
) {
  const weightValue = max(0.65, ((pointA.radius + pointB.radius) * 0.5) * unit * 0.9 * contourThicknessScale);
  const alphaValue =
    lerp(70, 122, constrain(averageRadius / 2.6, 0, 1)) * alphaScale * inkStyle.opacityScale;

  strokeTarget(target, inkStyle.color[0], inkStyle.color[1], inkStyle.color[2], constrain(alphaValue, 0, 255));
  strokeWeightTarget(target, weightValue);
  lineTarget(target, pointA.x * scaleX, pointA.y * scaleY, pointB.x * scaleX, pointB.y * scaleY);
}

function drawLoadingHint() {
  noStroke();
  fill(60, 58, 54, 120);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.025);
  const fallbackText = appStatusState.analysisFailed
    ? "分析失败，请调整参数后重试"
    : appStatusState.analysisActive
      ? "正在分析图片..."
      : "loading source image...";
  text(fallbackText, width * 0.5, height * 0.5);
}

function drawCaption() {
  const colors = getPaperColors();
  const captionColor = computeCaptionColor(colors.base, colors.accent);
  noStroke();
  fill(captionColor[0], captionColor[1], captionColor[2], 118);
  textAlign(LEFT, TOP);
  textSize(min(width, height) * 0.015);

  const effectiveMode = getEffectiveRenderMode();
  const modeLabel =
    effectiveMode === "path"
      ? "centerline paths"
      : effectiveMode === "region-grow"
        ? "region grow"
      : effectiveMode === "color-grow"
          ? "color grow"
          : effectiveMode === "color-boundary"
            ? "color boundary"
        : effectiveMode === "distortion"
          ? "svg distortion"
        : effectiveMode === "wave-contour"
          ? "wave contour"
          : effectiveMode === "wave-shape"
            ? "wave shape"
            : effectiveMode === "rubber-contour"
              ? "rubber contour"
        : effectiveMode === "contour"
          ? "contour trace"
        : effectiveMode === "edge-fill"
        ? "edge fill"
        : "edge sampling";
}
