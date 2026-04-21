// Upload handling and scene build pipelines.
let legacyImageWorker = null;
let legacyImageWorkerRequestSerial = 0;
const legacyImageWorkerPendingRequests = new Map();
let legacyRenderWorker = null;
let legacyRenderWorkerRequestSerial = 0;
const legacyRenderWorkerPendingRequests = new Map();
let sourceImageLoadSerial = 0;

// Checks whether the image worker can be used in this browser.
function canUseLegacyImageWorker() {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof window.__lineAtelierImageWorkerUrl === "string" &&
    window.__lineAtelierImageWorkerUrl.length > 0
  );
}

// Checks whether the render worker can be used in this browser.
function canUseLegacyRenderWorker() {
  return (
    typeof Worker !== "undefined" &&
    typeof window.__lineAtelierRenderWorkerUrl === "string" &&
    window.__lineAtelierRenderWorkerUrl.length > 0
  );
}

// Resolves the shared image worker instance.
function getLegacyImageWorker() {
  if (!canUseLegacyImageWorker()) {
    return null;
  }

  if (legacyImageWorker) {
    return legacyImageWorker;
  }

  legacyImageWorker = new Worker(window.__lineAtelierImageWorkerUrl, {
    type: "module"
  });

  legacyImageWorker.addEventListener("message", (event) => {
    const response = event.data;
    const pending = legacyImageWorkerPendingRequests.get(response?.id);
    if (!pending) {
      return;
    }

    legacyImageWorkerPendingRequests.delete(response.id);
    if (response.ok) {
      pending.resolve(response);
      return;
    }

    pending.reject(new Error(response?.error || "图片 Worker 处理失败。"));
  });

  legacyImageWorker.addEventListener("error", (event) => {
    const message = event?.message || "图片 Worker 启动失败。";
    legacyImageWorkerPendingRequests.forEach((pending) => {
      pending.reject(new Error(message));
    });
    legacyImageWorkerPendingRequests.clear();
    legacyImageWorker = null;
  });

  return legacyImageWorker;
}

// Resolves the shared render worker instance.
function getLegacyRenderWorker() {
  if (!canUseLegacyRenderWorker()) {
    return null;
  }

  if (legacyRenderWorker) {
    return legacyRenderWorker;
  }

  legacyRenderWorker = new Worker(window.__lineAtelierRenderWorkerUrl, {
    type: "module"
  });

  legacyRenderWorker.addEventListener("message", (event) => {
    const response = event.data;
    const pending = legacyRenderWorkerPendingRequests.get(response?.id);
    if (!pending) {
      return;
    }

    legacyRenderWorkerPendingRequests.delete(response.id);
    if (response.ok) {
      pending.resolve(response);
      return;
    }

    pending.reject(new Error(response?.error || "渲染 Worker 处理失败。"));
  });

  legacyRenderWorker.addEventListener("error", (event) => {
    const message = event?.message || "渲染 Worker 启动失败。";
    legacyRenderWorkerPendingRequests.forEach((pending) => {
      pending.reject(new Error(message));
    });
    legacyRenderWorkerPendingRequests.clear();
    legacyRenderWorker = null;
  });

  return legacyRenderWorker;
}

// Sends a processing request to the shared image worker.
function requestLegacyImageWorker(kind, source, maxDimension) {
  const worker = getLegacyImageWorker();
  if (!worker) {
    return Promise.reject(new Error("当前环境不支持图片 Worker。"));
  }

  return new Promise((resolve, reject) => {
    const id = ++legacyImageWorkerRequestSerial;
    legacyImageWorkerPendingRequests.set(id, {
      resolve,
      reject
    });
    worker.postMessage({
      id,
      kind,
      source,
      maxDimension
    });
  });
}

// Sends a processing request to the shared render worker.
function requestLegacyRenderWorker(kind, payload) {
  const worker = getLegacyRenderWorker();
  if (!worker) {
    return Promise.reject(new Error("当前环境不支持渲染 Worker。"));
  }

  return new Promise((resolve, reject) => {
    const id = ++legacyRenderWorkerRequestSerial;
    legacyRenderWorkerPendingRequests.set(id, {
      resolve,
      reject
    });
    worker.postMessage({
      id,
      kind,
      ...payload
    });
  });
}

// Builds a serializable settings snapshot for worker tasks.
function createWorkerSettingsSnapshot() {
  return { ...settings };
}

// Builds the shared analysis payload for render worker requests.
function createLegacyRenderAnalysisPayload() {
  const analysisImage = analysisState?.image;
  if (!analysisImage?.pixels || !analysisState?.width || !analysisState?.height) {
    return null;
  }

  return {
    width: analysisState.width,
    height: analysisState.height,
    pixels: analysisImage.pixels
  };
}

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

// Releases the last uploaded source object URL.
function revokeSourceImageObjectUrl() {
  if (!sourceImageObjectUrl) {
    return;
  }

  URL.revokeObjectURL(sourceImageObjectUrl);
  sourceImageObjectUrl = "";
}

// Creates a p5 image from a transferred ImageBitmap.
function createP5ImageFromBitmap(bitmap) {
  if (!bitmap || typeof createImage !== "function") {
    return null;
  }

  const bitmapWidth = max(1, bitmap.width || 1);
  const bitmapHeight = max(1, bitmap.height || 1);
  const nextImage = createImage(bitmapWidth, bitmapHeight);
  const targetCanvas = nextImage?.canvas || null;
  const ctx = targetCanvas?.getContext?.("2d") || null;

  try {
    if (!ctx || !targetCanvas) {
      return null;
    }

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(bitmap, 0, 0, targetCanvas.width, targetCanvas.height);
    if (typeof nextImage.setModified === "function") {
      nextImage.setModified(true);
    }
    return nextImage;
  } finally {
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}

// Loads a p5 image from an object URL.
function loadP5ImageFromObjectUrl(objectUrl) {
  return new Promise((resolve, reject) => {
    loadImage(
      objectUrl,
      (image) => {
        resolve(image);
      },
      () => {
        reject(new Error("无法从处理后的图片结果创建预览。"));
      }
    );
  });
}

// Applies an image worker upload result.
async function applyPreparedSourceImage(file, prepared, loadSerial) {
  const nextHref = URL.createObjectURL(prepared.blob);

  try {
    let nextSourceImage = createP5ImageFromBitmap(prepared.bitmap);
    if (!nextSourceImage) {
      nextSourceImage = await loadP5ImageFromObjectUrl(nextHref);
    }

    if (loadSerial !== sourceImageLoadSerial) {
      URL.revokeObjectURL(nextHref);
      return;
    }

    revokeSourceImageObjectUrl();
    sourceImageObjectUrl = nextHref;
    sourceImageBlob = prepared.blob;
    sourceImage = nextSourceImage;
    sourceImageHref = nextHref;
    sourceImageLabel = prepared.resized ? `${file.name} (resized)` : file.name;
    syncControls();
    rebuildScene("上传成功，正在分析图片并重建线稿预览...");
  } catch (error) {
    URL.revokeObjectURL(nextHref);
    throw error;
  }
}

// Loads a user-provided source image without worker assistance.
function loadUserImageFallback(file, loadSerial) {
  const objectUrl = URL.createObjectURL(file);
  loadImage(
    objectUrl,
    (image) => {
      if (loadSerial !== sourceImageLoadSerial) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const normalized = normalizeUploadedImage(image, MAX_UPLOADED_SOURCE_DIMENSION);
      const persistentHref = createDataUrlFromP5Image(normalized.image);
      revokeSourceImageObjectUrl();
      sourceImageBlob = null;
      sourceImage = normalized.image;
      sourceImageHref = persistentHref || objectUrl;
      sourceImageObjectUrl = persistentHref ? "" : objectUrl;
      sourceImageLabel = normalized.resized ? `${file.name} (resized)` : file.name;
      syncControls();
      rebuildScene("上传成功，正在分析图片并重建线稿预览...");
      if (persistentHref) {
        URL.revokeObjectURL(objectUrl);
      }
    },
    () => {
      URL.revokeObjectURL(objectUrl);
      if (loadSerial !== sourceImageLoadSerial) {
        return;
      }

      sourceImageLabel = `${file.name} (load failed)`;
      if (typeof setAnalysisUiState === "function") {
        setAnalysisUiState(false);
      }
      syncControls();
    }
  );
}

// Loads a user-provided source image.
function loadUserImage(file) {
  const loadSerial = ++sourceImageLoadSerial;
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

  if (!canUseLegacyImageWorker()) {
    loadUserImageFallback(file, loadSerial);
    return;
  }

  if (typeof patchAnalysisUiState === "function") {
    patchAnalysisUiState({
      analysisMessage: "已收到图片，正在后台整理像素..."
    });
  }

  requestLegacyImageWorker("prepare-upload", file, MAX_UPLOADED_SOURCE_DIMENSION)
    .then((prepared) => {
      return applyPreparedSourceImage(file, prepared, loadSerial);
    })
    .catch((error) => {
      console.warn("Image worker upload pipeline failed, falling back to main thread", error);
      if (loadSerial !== sourceImageLoadSerial) {
        return;
      }
      loadUserImageFallback(file, loadSerial);
    });
}

// Gets the animation frame value used for rendering.
function getPreviewAnimationFrame() {
  if (!Number.isFinite(previewAnimationStartedAt) || previewAnimationStartedAt <= 0) {
    previewAnimationStartedAt = performance.now();
  }

  const elapsedMs = max(0, performance.now() - previewAnimationStartedAt);
  return elapsedMs / (1000 / 60);
}

// Gets the animation frame value used for rendering.
function getRenderAnimationFrame() {
  const overrideFrame = exportState?.renderFrameValue;
  return Number.isFinite(overrideFrame) ? overrideFrame : getPreviewAnimationFrame();
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
    currentOutputGeometryKey = "";
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
  resumeAnalysisWorkTime();

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
async function runModeOutputBuild(runState, message = "", options = {}) {
  activeSceneBuild = runState;
  if (typeof setAnalysisUiState === "function") {
    setAnalysisUiState(true, message || "正在重算当前算法输出，请稍候...");
  }
  syncControls();
  beginAnalysisWork(runState);
  await yieldToUi();
  resumeAnalysisWorkTime();

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
      currentOutputGeometryKey = "";
      finalizeSceneBuild(runState, "success");
      syncControls();
      return true;
    }

    if (!analysisState) {
      await buildAnalysisStateAsync();
      await ensureAnalysisResponsive("正在创建分析缓存...", true);
    }

    if (options.reuseGeometry && (await rebuildCurrentModeVariantsAsync())) {
      await ensureAnalysisResponsive("正在细化当前抖动变体...", true);
      finalizeSceneBuild(runState, "success");
      syncControls();
      return true;
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
    queueNextBuild("scene", message);
    return;
  }

  const runState = {
    id: ++sceneBuildSerial,
    startedAt: performance.now(),
    activeElapsedMs: 0,
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
function rebuildModeOutput(message = "", options = {}) {
  if (activeSceneBuild?.running) {
    queueNextBuild("output", message, options);
    return;
  }

  const runState = {
    id: ++sceneBuildSerial,
    startedAt: performance.now(),
    activeElapsedMs: 0,
    promptShown: false,
    cancelled: false,
    failureMessage: "",
    running: true
  };

  runModeOutputBuild(runState, message, normalizeModeOutputOptions(options)).finally(() => {
    runState.running = false;
  });
}
