// Frame rendering and temporary export sizing helpers.
// Picks a supported video MIME type.
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

// Estimates the export video bitrate.
function estimateVideoBitsPerSecond(config) {
  const bitrate = Math.round(config.width * config.height * config.fps * 0.12);
  return Math.min(40000000, Math.max(6000000, bitrate));
}

// Renders one export frame.
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

// Runs export work with manual render control.
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

// Runs export work at a temporary render size.
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

// Captures all export frames.
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

// Records a video blob from captured frames.
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
