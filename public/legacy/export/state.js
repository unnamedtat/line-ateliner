// Export state, timing, and estimate helpers.
// Export helpers for MP4, GIF, and PNG fallback output.
const GIF_LIBRARY_SCRIPT = "/vendor/gif.js";
const GIF_WORKER_SCRIPT = window.__lineAtelierGifWorkerUrl || "/vendor/gif.worker.js";
let gifWorkerBlobUrl = "";
let gifLibraryLoadPromise = null;

// Sets export state and syncs the export UI.
function setExportState(patch) {
  exportState = {
    ...exportState,
    ...patch
  };
  if (typeof applyExportUiState === "function") {
    applyExportUiState();
  }
}

// Gets the main canvas element.
function getMainCanvasElement() {
  return document.querySelector("canvas");
}

// Captures the canvas presentation metrics.
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

// Locks the canvas presentation size.
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

// Restores the canvas presentation size.
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

// Gets the export canvas size.
function getExportCanvasSize() {
  const mainCanvas = getMainCanvasElement();
  return {
    width: mainCanvas?.width || width || window.innerWidth,
    height: mainCanvas?.height || height || window.innerHeight
  };
}

// Reads a live export input value.
function readLiveExportValue(id, fallback) {
  const input = document.getElementById(id);
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

// Builds the export configuration.
function getExportConfig() {
  const fps = Math.max(1, Math.round(readLiveExportValue("export-frame-rate", settings.exportFrameRate || 18)));
  const durationSeconds = Math.max(1, readLiveExportValue("export-duration-seconds", settings.exportDurationSeconds || 3));
  const canvasSize = getExportCanvasSize();
  const resolutionScale = Math.max(
    1,
    readLiveExportValue("export-resolution-scale", settings.exportResolutionScale || 100) / 100
  );

  settings.exportFrameRate = fps;
  settings.exportDurationSeconds = Number(durationSeconds.toFixed(1));
  settings.exportResolutionScale = Math.round(resolutionScale * 100);

  return {
    fps,
    durationSeconds: settings.exportDurationSeconds,
    totalFrames: Math.max(1, Math.round(fps * durationSeconds)),
    frameDelayMs: 1000 / fps,
    baseWidth: canvasSize.width,
    baseHeight: canvasSize.height,
    width: Math.max(1, Math.round(canvasSize.width * resolutionScale)),
    height: Math.max(1, Math.round(canvasSize.height * resolutionScale)),
    resolutionScale
  };
}

// Formats an export estimate range.
function formatEstimateRange(minSeconds, maxSeconds) {
  if (maxSeconds <= 60) {
    return `${minSeconds}-${maxSeconds} 秒`;
  }

  const minMinutes = (minSeconds / 60).toFixed(1).replace(/\.0$/, "");
  const maxMinutes = (maxSeconds / 60).toFixed(1).replace(/\.0$/, "");
  return `${minMinutes}-${maxMinutes} 分钟`;
}

// Builds the export estimate summary.
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

// Builds export recovery actions.
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

// Builds a recovery status message.
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

// Runs an export recovery action.
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

// Waits for a number of milliseconds.
function waitMs(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

// Sets the current export render frame override.
function setExportRenderFrameValue(frameValue) {
  exportState.renderFrameValue = Number.isFinite(frameValue) ? frameValue : null;
}

// Configures the export rendering context.
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

// Gets the export animation step.
function getExportAnimationStep(config) {
  // Export sampling should follow the same time base as the live preview,
  // which advances against the browser's ~60fps frameCount timeline.
  return Math.max(1, 60 / Math.max(1, config.fps));
}

// Gets the non-SVG export cycle length.
function getNonSvgExportCycleLength() {
  const boilSequenceLength = Array.isArray(BOIL_SEQUENCE) ? BOIL_SEQUENCE.length : 0;
  const holdFrames = Math.max(1, Math.round(settings?.boilHoldFrames || 1));
  if (!boilSequenceLength) {
    return holdFrames;
  }

  return boilSequenceLength * holdFrames;
}

// Gets the export frame value.
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

// Waits for the next animation frame.
function nextAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}
