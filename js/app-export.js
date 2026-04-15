// Export helpers for MP4, GIF, and PNG fallback output.
const GIF_WORKER_SCRIPT = "https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js";
let gifWorkerBlobUrl = "";

function setExportState(patch) {
  exportState = {
    ...exportState,
    ...patch
  };
  if (typeof applyExportUiState === "function") {
    applyExportUiState();
  }
}

function getMainCanvasElement() {
  return document.querySelector("canvas");
}

function captureCanvasPresentation(canvas) {
  const rect = canvas?.getBoundingClientRect();
  return {
    width: rect?.width || 0,
    height: rect?.height || 0,
    styleWidth: canvas?.style.width || "",
    styleHeight: canvas?.style.height || "",
    styleMaxWidth: canvas?.style.maxWidth || "",
    styleMaxHeight: canvas?.style.maxHeight || "",
    styleAspectRatio: canvas?.style.aspectRatio || ""
  };
}

function lockCanvasPresentation(canvas, presentation) {
  if (!canvas || !presentation?.width || !presentation?.height) {
    return;
  }

  canvas.style.width = `${presentation.width}px`;
  canvas.style.height = `${presentation.height}px`;
  canvas.style.maxWidth = `${presentation.width}px`;
  canvas.style.maxHeight = `${presentation.height}px`;
  canvas.style.aspectRatio = `${presentation.width} / ${presentation.height}`;
}

function restoreCanvasPresentation(canvas, presentation) {
  if (!canvas || !presentation) {
    return;
  }

  canvas.style.width = presentation.styleWidth;
  canvas.style.height = presentation.styleHeight;
  canvas.style.maxWidth = presentation.styleMaxWidth;
  canvas.style.maxHeight = presentation.styleMaxHeight;
  canvas.style.aspectRatio = presentation.styleAspectRatio;
}

function getExportCanvasSize() {
  const mainCanvas = getMainCanvasElement();
  return {
    width: mainCanvas?.width || width || window.innerWidth,
    height: mainCanvas?.height || height || window.innerHeight
  };
}

function readLiveExportValue(id, fallback) {
  const input = document.getElementById(id);
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function getExportConfig() {
  const fps = Math.max(1, Math.round(readLiveExportValue("export-frame-rate", settings.exportFrameRate || 18)));
  const durationSeconds = Math.max(
    1,
    Math.round(readLiveExportValue("export-duration-seconds", settings.exportDurationSeconds || 3))
  );
  const canvasSize = getExportCanvasSize();
  const resolutionScale = Math.max(
    1,
    readLiveExportValue("export-resolution-scale", settings.exportResolutionScale || 100) / 100
  );

  settings.exportFrameRate = fps;
  settings.exportDurationSeconds = durationSeconds;
  settings.exportResolutionScale = Math.round(resolutionScale * 100);

  return {
    fps,
    durationSeconds,
    totalFrames: fps * durationSeconds,
    frameDelayMs: Math.round(1000 / fps),
    baseWidth: canvasSize.width,
    baseHeight: canvasSize.height,
    width: Math.max(1, Math.round(canvasSize.width * resolutionScale)),
    height: Math.max(1, Math.round(canvasSize.height * resolutionScale)),
    resolutionScale
  };
}

function formatEstimateRange(minSeconds, maxSeconds) {
  if (maxSeconds <= 60) {
    return `${minSeconds}-${maxSeconds} 秒`;
  }

  const minMinutes = (minSeconds / 60).toFixed(1).replace(/\.0$/, "");
  const maxMinutes = (maxSeconds / 60).toFixed(1).replace(/\.0$/, "");
  return `${minMinutes}-${maxMinutes} 分钟`;
}

function getExportEstimateSummary() {
  const config = getExportConfig();
  const megaPixels = (config.width * config.height) / 1000000;
  const workUnits = Math.max(1, megaPixels * config.totalFrames);
  const mp4Min = Math.max(2, Math.round(workUnits * 0.2));
  const mp4Max = Math.max(mp4Min + 2, Math.round(workUnits * 0.42));
  const gifMin = Math.max(4, Math.round(workUnits * 0.5));
  const gifMax = Math.max(gifMin + 4, Math.round(workUnits * 0.95));
  const isHighResolution = config.resolutionScale >= 3;
  const isHeavyFrameCount = config.totalFrames >= 96;
  const isHeavyPixels = megaPixels >= 5.5;
  const level = isHighResolution || isHeavyFrameCount || isHeavyPixels ? "warning" : "normal";
  const warning = level === "warning"
    ? `当前 ${Math.round(config.resolutionScale * 100)}% 清晰度 / ${config.totalFrames} 帧，高清导出会明显更慢，内存占用也更高。`
    : `当前 ${Math.round(config.resolutionScale * 100)}% 清晰度 / ${config.totalFrames} 帧，适合常规导出。`;

  return {
    text: `预计耗时：MP4 ${formatEstimateRange(mp4Min, mp4Max)}，GIF ${formatEstimateRange(gifMin, gifMax)}。${warning}`,
    level,
    videoRange: formatEstimateRange(mp4Min, mp4Max),
    gifRange: formatEstimateRange(gifMin, gifMax)
  };
}

function getExportFailureRecovery(format) {
  const canExportMp4 = Boolean(pickVideoMimeType());

  if (format === "video") {
    return {
      primary: {
        action: "gif",
        label: "改导出 GIF"
      },
      secondary: {
        action: "png",
        label: "导出 PNG 快照"
      }
    };
  }

  if (canExportMp4) {
    return {
      primary: {
        action: "video",
        label: "改导出 MP4"
      },
      secondary: {
        action: "png",
        label: "导出 PNG 快照"
      }
    };
  }

  return {
    primary: {
      action: "png",
      label: "导出 PNG 快照"
    },
    secondary: null
  };
}

function buildRecoveryStatus(format, error, recovery) {
  const reason = error?.message || error || "未知错误";

  if (format === "video") {
    return `MP4 导出失败：${reason}。建议先改导出 GIF；如果只需要先交付一张静态图，可以直接导出 PNG 快照。`;
  }

  if (recovery?.primary?.action === "video") {
    return `GIF 导出失败：${reason}。建议改导出 MP4；如果想先拿到一个稳定结果，可以直接导出 PNG 快照。`;
  }

  return `GIF 导出失败：${reason}。当前浏览器不适合继续做动画导出，建议先导出 PNG 快照兜底。`;
}

function runExportRecoveryAction(action) {
  if (action === "gif") {
    startGifExport();
    return;
  }

  if (action === "video") {
    startVideoExport();
    return;
  }

  if (action === "png") {
    startPngExport();
  }
}

function waitMs(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function setExportRenderFrameValue(frameValue) {
  exportState.renderFrameValue = Number.isFinite(frameValue) ? frameValue : null;
}

function configureExportContext(ctx) {
  if (!ctx) {
    return ctx;
  }

  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
  return ctx;
}

function getExportAnimationStep(config) {
  // Export sampling should follow the same time base as the live preview,
  // which advances against the browser's ~60fps frameCount timeline.
  return Math.max(1, 60 / Math.max(1, config.fps));
}

function getNonSvgExportCycleLength() {
  const boilSequenceLength = Array.isArray(BOIL_SEQUENCE) ? BOIL_SEQUENCE.length : 0;
  const holdFrames = Math.max(1, Math.round(settings?.boilHoldFrames || 1));
  if (!boilSequenceLength) {
    return holdFrames;
  }

  return boilSequenceLength * holdFrames;
}

function getExportFrameValue(config, frameIndex, frameStartValue) {
  const animationStep = getExportAnimationStep(config);

  if (typeof isDistortionMode === "function" && isDistortionMode()) {
    return frameStartValue + frameIndex * animationStep;
  }

  const cycleLength = getNonSvgExportCycleLength();
  if (cycleLength <= 0) {
    return frameIndex * animationStep;
  }

  // Non-SVG exports should start from a stable cycle head so the clip doesn't
  // pick up an arbitrary preview phase and appear to "hang" around a seam.
  return (frameIndex * animationStep) % cycleLength;
}

function nextAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function ensureSourceImageEmbeddedHref() {
  if (!sourceImage || typeof sourceImageHref !== "string") {
    return;
  }

  if (sourceImageHref.startsWith("data:")) {
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.max(1, sourceImage.width || 1);
  tempCanvas.height = Math.max(1, sourceImage.height || 1);
  const ctx = tempCanvas.getContext("2d");
  const drawable = sourceImage.canvas || sourceImage.elt || sourceImage.image || sourceImage;

  try {
    ctx.drawImage(drawable, 0, 0, tempCanvas.width, tempCanvas.height);
    sourceImageHref = tempCanvas.toDataURL("image/png");
  } catch (error) {
    console.warn("Failed to embed source image for export", error);
  }
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image during export."));
    image.src = src;
  });
}

function cloneDistortionOverlayMarkup(exportWidth, exportHeight) {
  if (!distortionOverlay) {
    return null;
  }

  ensureSourceImageEmbeddedHref();
  const clone = distortionOverlay.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(exportWidth));
  clone.setAttribute("height", String(exportHeight));
  clone.style.display = "block";

  const imageNode = clone.querySelector("#distortion-image");
  if (imageNode) {
    imageNode.setAttribute("href", sourceImageHref);
    imageNode.setAttributeNS("http://www.w3.org/1999/xlink", "href", sourceImageHref);
    imageNode.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", sourceImageHref);
  }

  return new XMLSerializer().serializeToString(clone);
}

async function renderDistortionOverlayFrame(exportWidth, exportHeight) {
  const svgMarkup = cloneDistortionOverlayMarkup(exportWidth, exportHeight);
  if (!svgMarkup) {
    return null;
  }

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  return loadHtmlImage(svgUrl);
}

async function drawTextureOverlayToContext(targetCtx, exportWidth, exportHeight) {
  if (!textureOverlayNode || textureOverlayNode.style.display === "none" || !textureOverlayNode.src) {
    return;
  }

  if (!textureOverlayNode.complete) {
    await loadHtmlImage(textureOverlayNode.src);
  }

  const opacity = Number.parseFloat(textureOverlayNode.style.opacity || "1");
  targetCtx.save();
  targetCtx.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
  targetCtx.drawImage(textureOverlayNode, 0, 0, exportWidth, exportHeight);
  targetCtx.restore();
}

async function drawCompositeExportFrame(targetCanvas, targetCtx) {
  const exportWidth = targetCanvas.width;
  const exportHeight = targetCanvas.height;
  const mainCanvas = getMainCanvasElement();
  if (!mainCanvas) {
    throw new Error("Main canvas is not available.");
  }

  targetCtx.clearRect(0, 0, exportWidth, exportHeight);
  targetCtx.drawImage(mainCanvas, 0, 0, exportWidth, exportHeight);

  if (isDistortionMode()) {
    const distortionFrame = await renderDistortionOverlayFrame(exportWidth, exportHeight);
    if (distortionFrame) {
      targetCtx.drawImage(distortionFrame, 0, 0, exportWidth, exportHeight);
    }
  }

  await drawTextureOverlayToContext(targetCtx, exportWidth, exportHeight);
}

function buildSnapshotCanvas() {
  const canvasSize = getExportCanvasSize();
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvasSize.width;
  exportCanvas.height = canvasSize.height;
  const exportCtx = configureExportContext(exportCanvas.getContext("2d"));
  return { exportCanvas, exportCtx };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildExportFilename(extension, basename = `handdrawn-export-${buildExportStamp()}`) {
  return `${basename}.${extension}`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("无法生成导出文件。"));
      },
      type,
      quality
    );
  });
}

async function resolveGifWorkerScriptUrl() {
  if (gifWorkerBlobUrl) {
    return gifWorkerBlobUrl;
  }

  const response = await fetch(GIF_WORKER_SCRIPT, { mode: "cors", cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`无法加载 GIF worker (${response.status})`);
  }

  const workerSource = await response.text();
  gifWorkerBlobUrl = URL.createObjectURL(
    new Blob([workerSource], {
      type: "application/javascript"
    })
  );
  return gifWorkerBlobUrl;
}

function pickVideoMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/mp4;codecs=hvc1",
    "video/mp4;codecs=avc1.64001F",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4"
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function estimateVideoBitsPerSecond(config) {
  const bitrate = Math.round(config.width * config.height * config.fps * 0.12);
  return Math.min(40000000, Math.max(6000000, bitrate));
}

async function renderExportFrame(config, targetCanvas, targetCtx, frameIndex, frameStartValue) {
  const frameValue = getExportFrameValue(config, frameIndex, frameStartValue);
  setExportRenderFrameValue(frameValue);

  if (typeof redraw === "function") {
    redraw();
  }

  await nextAnimationFrame();
  await drawCompositeExportFrame(targetCanvas, targetCtx);
  return frameValue;
}

async function withManualExportRendering(task) {
  const canControlLoop =
    typeof noLoop === "function" &&
    typeof redraw === "function" &&
    typeof loop === "function";
  const wasLooping = typeof isLooping === "function" ? isLooping() : true;

  if (!canControlLoop || !wasLooping) {
    try {
      return await task();
    } finally {
      setExportRenderFrameValue(null);
    }
  }

  noLoop();
  try {
    return await task();
  } finally {
    setExportRenderFrameValue(null);
    loop();
    await nextAnimationFrame();
  }
}

async function withTemporaryExportRenderSize(config, task) {
  const mainCanvas = getMainCanvasElement();
  if (!mainCanvas) {
    throw new Error("Main canvas is not available.");
  }

  const originalWidth = mainCanvas.width || width;
  const originalHeight = mainCanvas.height || height;
  const originalPresentation = captureCanvasPresentation(mainCanvas);
  if (typeof resizeCanvas !== "function") {
    return task();
  }

  try {
    if (originalWidth !== config.width || originalHeight !== config.height) {
      lockCanvasPresentation(mainCanvas, originalPresentation);
      resizeCanvas(config.width, config.height);
      lockCanvasPresentation(mainCanvas, originalPresentation);
      if (typeof rebuildViewportSynchronously === "function") {
        rebuildViewportSynchronously();
      } else if (typeof rebuildSceneSynchronously === "function") {
        rebuildSceneSynchronously();
      }
      await nextAnimationFrame();
    }

    return await task();
  } finally {
    if (originalWidth !== config.width || originalHeight !== config.height) {
      resizeCanvas(originalWidth, originalHeight);
      lockCanvasPresentation(mainCanvas, originalPresentation);
      if (typeof rebuildViewportSynchronously === "function") {
        rebuildViewportSynchronously();
      } else if (typeof rebuildSceneSynchronously === "function") {
        rebuildSceneSynchronously();
      }
      await nextAnimationFrame();
    }
    restoreCanvasPresentation(mainCanvas, originalPresentation);
  }
}

async function captureFrames(config, targetCanvas, targetCtx, onFrame) {
  const frameStartValue = Number.isFinite(frameCount) ? frameCount : 0;
  for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex += 1) {
    const frameStartedAt = performance.now();
    await renderExportFrame(config, targetCanvas, targetCtx, frameIndex, frameStartValue);
    await onFrame(frameIndex);
    if (frameIndex < config.totalFrames - 1) {
      const frameElapsed = performance.now() - frameStartedAt;
      const remainingDelay = config.frameDelayMs - frameElapsed;
      if (remainingDelay > 1) {
        await waitMs(remainingDelay);
      }
    }
  }
}

async function recordVideoBlob(config, exportCanvas, exportCtx, mimeType, onProgress) {
  let stream = exportCanvas.captureStream(0);
  let videoTrack = stream.getVideoTracks()[0] || null;
  let supportsManualFrameCapture = typeof videoTrack?.requestFrame === "function";

  if (!supportsManualFrameCapture) {
    stream.getTracks().forEach((track) => track.stop());
    stream = exportCanvas.captureStream(config.fps);
    videoTrack = stream.getVideoTracks()[0] || null;
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: estimateVideoBitsPerSecond(config)
  });
  const chunks = [];

  const stopPromise = new Promise((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });
    recorder.addEventListener("stop", resolve, { once: true });
    recorder.addEventListener(
      "error",
      (event) => {
        reject(event.error || new Error("Video export failed."));
      },
      { once: true }
    );
  });

  try {
    recorder.start();
    await captureFrames(config, exportCanvas, exportCtx, async (frameIndex) => {
      if (supportsManualFrameCapture) {
        videoTrack?.requestFrame();
      }
      await onProgress(frameIndex);
    });
    recorder.stop();
    await stopPromise;
    return new Blob(chunks, { type: mimeType });
  } catch (error) {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    throw error;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function startVideoExport() {
  if (exportState.active) {
    return;
  }

  if (!sceneLayout || !hasDrawableOutput()) {
    setExportState({
      active: false,
      format: "",
      status: "当前没有可导出的画面。",
      recovery: null
    });
    return;
  }

  const mimeType = pickVideoMimeType();
  if (!mimeType) {
    const recovery = getExportFailureRecovery("video");
    setExportState({
      active: false,
      format: "",
      status: buildRecoveryStatus("video", "当前浏览器不支持 MP4 导出", recovery),
      recovery
    });
    if (typeof revealExportPanel === "function") {
      revealExportPanel();
    }
    return;
  }

  const config = getExportConfig();
  const estimate = getExportEstimateSummary();
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = config.width;
  exportCanvas.height = config.height;
  const exportCtx = configureExportContext(exportCanvas.getContext("2d"));
  const basename = `handdrawn-export-${buildExportStamp()}`;

  setExportState({
    active: true,
    format: "video",
    status: `正在准备 MP4... ${config.durationSeconds}s / ${config.totalFrames} 帧，预计 ${estimate.videoRange}`,
    recovery: null
  });

  try {
    const videoBlob = await withManualExportRendering(async () => {
      return withTemporaryExportRenderSize(config, async () => {
        return recordVideoBlob(config, exportCanvas, exportCtx, mimeType, async (frameIndex) => {
          setExportState({
            active: true,
            format: "video",
            status: `正在导出 MP4... ${frameIndex + 1}/${config.totalFrames}`
          });
        });
      });
    });

    downloadBlob(videoBlob, buildExportFilename("mp4", basename));
    setExportState({
      active: false,
      format: "",
      status: "MP4 导出完成。",
      recovery: null
    });
  } catch (error) {
    console.error(error);
    const recovery = getExportFailureRecovery("video");
    setExportState({
      active: false,
      format: "",
      status: buildRecoveryStatus("video", error, recovery),
      recovery
    });
    if (typeof revealExportPanel === "function") {
      revealExportPanel();
    }
  }
}

async function startGifExport() {
  if (exportState.active) {
    return;
  }

  if (!sceneLayout || !hasDrawableOutput()) {
    setExportState({
      active: false,
      format: "",
      status: "当前没有可导出的画面。",
      recovery: null
    });
    return;
  }

  if (typeof GIF !== "function") {
    const recovery = getExportFailureRecovery("gif");
    setExportState({
      active: false,
      format: "",
      status: buildRecoveryStatus("gif", "GIF 编码器没有加载成功", recovery),
      recovery
    });
    if (typeof revealExportPanel === "function") {
      revealExportPanel();
    }
    return;
  }

  const config = getExportConfig();
  const estimate = getExportEstimateSummary();
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = config.width;
  exportCanvas.height = config.height;
  const exportCtx = configureExportContext(exportCanvas.getContext("2d"));
  let workerScriptUrl = "";

  try {
    workerScriptUrl = await resolveGifWorkerScriptUrl();
  } catch (error) {
    const recovery = getExportFailureRecovery("gif");
    setExportState({
      active: false,
      format: "",
      status: buildRecoveryStatus("gif", error, recovery),
      recovery
    });
    if (typeof revealExportPanel === "function") {
      revealExportPanel();
    }
    return;
  }

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: config.width,
    height: config.height,
    workerScript: workerScriptUrl
  });

  setExportState({
    active: true,
    format: "gif",
    status: `正在准备 GIF... ${config.durationSeconds}s / ${config.totalFrames} 帧，预计 ${estimate.gifRange}`,
    recovery: null
  });

  try {
    await withManualExportRendering(async () => {
      await withTemporaryExportRenderSize(config, async () => {
        await captureFrames(config, exportCanvas, exportCtx, async (frameIndex) => {
          gif.addFrame(exportCanvas, {
            copy: true,
            delay: config.frameDelayMs
          });
          setExportState({
            active: true,
            format: "gif",
            status: `正在采集 GIF 帧... ${frameIndex + 1}/${config.totalFrames}`
          });
        });
      });
    });

    const blob = await new Promise((resolve) => {
      gif.on("finished", resolve);
      gif.on("progress", (progress) => {
        const percent = Math.round(progress * 100);
        setExportState({
          active: true,
          format: "gif",
          status: `正在编码 GIF... ${percent}%`
        });
      });
      gif.render();
    });

    downloadBlob(blob, buildExportFilename("gif"));
    setExportState({
      active: false,
      format: "",
      status: "GIF 导出完成。",
      recovery: null
    });
  } catch (error) {
    console.error(error);
    const recovery = getExportFailureRecovery("gif");
    setExportState({
      active: false,
      format: "",
      status: buildRecoveryStatus("gif", error, recovery),
      recovery
    });
    if (typeof revealExportPanel === "function") {
      revealExportPanel();
    }
  }
}

async function startPngExport() {
  if (exportState.active) {
    return;
  }

  if (!sceneLayout || !hasDrawableOutput()) {
    setExportState({
      active: false,
      format: "",
      status: "当前没有可导出的画面。",
      recovery: null
    });
    return;
  }

  const { exportCanvas, exportCtx } = buildSnapshotCanvas();

  setExportState({
    active: true,
    format: "png",
    status: "正在导出 PNG 快照...",
    recovery: null
  });

  try {
    await drawCompositeExportFrame(exportCanvas, exportCtx);
    const blob = await canvasToBlob(exportCanvas, "image/png");
    downloadBlob(blob, buildExportFilename("png"));
    setExportState({
      active: false,
      format: "",
      status: "PNG 快照导出完成。",
      recovery: null
    });
  } catch (error) {
    console.error(error);
    setExportState({
      active: false,
      format: "",
      status: `PNG 快照导出失败：${error.message || error}`,
      recovery: null
    });
  }
}

