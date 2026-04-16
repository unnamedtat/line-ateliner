// Upload handling and scene build pipelines.
// Calculates safe dimensions for uploaded images.
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

// Normalizes an uploaded image to safe dimensions.
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

// Creates a data URL from a p5 image.
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

// Loads a user-provided source image.
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

// Gets the animation frame value used for rendering.
function getRenderAnimationFrame() {
  const overrideFrame = exportState?.renderFrameValue;
  return Number.isFinite(overrideFrame) ? overrideFrame : frameCount;
}

// Loads a user-provided paper texture.
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

// Rebuilds the scene synchronously.
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

// Rebuilds only the viewport synchronously.
function rebuildViewportSynchronously() {
  clearTimeout(rebuildTimer);
  buildPaperBaseLayer();
  buildPaperLayer();
  buildSceneLayout();
  syncDistortionOverlay();
  clearRenderFrameCache();
}

// Runs the full asynchronous scene build pipeline.
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

// Runs the lighter mode output build pipeline.
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

// Starts a full scene rebuild.
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

// Starts an output-only rebuild.
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
