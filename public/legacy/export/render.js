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

// Gets the exact GIF frame delay in milliseconds using the format's 10ms timing granularity.
function getGifFrameDelayMs(config, frameIndex) {
  const currentCentiseconds = Math.round((frameIndex * 100) / Math.max(1, config.fps));
  const nextCentiseconds = Math.round(((frameIndex + 1) * 100) / Math.max(1, config.fps));
  return Math.max(10, (nextCentiseconds - currentCentiseconds) * 10);
}

// Gets the fixed-timeline MP4 muxer bindings exposed by the module runtime.
function getFixedTimelineMp4MuxerApi() {
  return window.__lineAtelierMp4Muxer || null;
}

// Picks a WebCodecs video encoder configuration for MP4 export.
async function pickFixedTimelineVideoEncoderConfig(config) {
  if (typeof VideoEncoder === "undefined" || typeof VideoEncoder.isConfigSupported !== "function") {
    return null;
  }

  const candidateCodecs = [
    "avc1.640028",
    "avc1.4d401f",
    "avc1.42e01e",
    "avc1.42001f"
  ];

  for (const codec of candidateCodecs) {
    const encoderConfig = {
      codec,
      width: config.width,
      height: config.height,
      bitrate: estimateVideoBitsPerSecond(config),
      framerate: config.fps,
      bitrateMode: "constant",
      latencyMode: "quality",
      avc: {
        format: "avc"
      }
    };

    try {
      const support = await VideoEncoder.isConfigSupported(encoderConfig);
      if (support?.supported) {
        return {
          encoderConfig: support.config || encoderConfig,
          muxerCodec: "avc"
        };
      }
    } catch (error) {
      console.warn("Failed to probe WebCodecs video encoder support", error);
    }
  }

  return null;
}

// Renders one export frame.
async function renderExportFrame(
  config,
  targetCanvas,
  targetCtx,
  frameIndex,
  frameStartValue,
  exportSnapshot = getActiveExportSnapshot()
) {
  const frameValue = getExportFrameValue(config, frameIndex, frameStartValue, exportSnapshot);
  const canRenderOffscreen =
    typeof canUseDirectOffscreenExport === "function" &&
    canUseDirectOffscreenExport(exportSnapshot);

  if (!canRenderOffscreen) {
    setExportRenderFrameValue(frameValue);
  }

  if (
    typeof redraw === "function" &&
    !canRenderOffscreen
  ) {
    redraw();
  }

  await drawCompositeExportFrame(targetCanvas, targetCtx, frameValue, exportSnapshot);
  return frameValue;
}

// Runs export work with manual render control.
async function withManualExportRendering(task, exportSnapshot = getActiveExportSnapshot()) {
  const canControlLoop =
    typeof noLoop === "function" &&
    typeof redraw === "function" &&
    typeof loop === "function";
  const wasLooping = typeof isLooping === "function" ? isLooping() : true;
  const canStayLive =
    typeof canUseDirectOffscreenExport === "function" &&
    canUseDirectOffscreenExport(exportSnapshot);

  if (!canControlLoop || !wasLooping || canStayLive) {
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
async function withTemporaryExportRenderSize(config, task, exportSnapshot = getActiveExportSnapshot()) {
  if (typeof canUseDirectOffscreenExport === "function" && canUseDirectOffscreenExport(exportSnapshot)) {
    return task();
  }

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
async function captureFrames(
  config,
  targetCanvas,
  targetCtx,
  onFrame,
  exportSnapshot = getActiveExportSnapshot(),
  options = {}
) {
  const throttleToRealtime = options.throttleToRealtime !== false;
  const frameStartValue = Number.isFinite(exportSnapshot?.startFrameValue)
    ? exportSnapshot.startFrameValue
    : Number.isFinite(frameCount)
      ? frameCount
      : 0;
  for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex += 1) {
    const frameStartedAt = performance.now();
    await renderExportFrame(config, targetCanvas, targetCtx, frameIndex, frameStartValue, exportSnapshot);
    await onFrame(frameIndex);
    if (throttleToRealtime && frameIndex < config.totalFrames - 1) {
      const frameElapsed = performance.now() - frameStartedAt;
      const remainingDelay = config.frameDelayMs - frameElapsed;
      if (remainingDelay > 1) {
        await waitMs(remainingDelay);
      }
    }
  }
}

// Encodes a fixed-timeline MP4 directly from rendered export frames.
async function encodeFixedTimelineVideoBlob(
  config,
  exportCanvas,
  exportCtx,
  onProgress,
  exportSnapshot = getActiveExportSnapshot()
) {
  const muxerApi = getFixedTimelineMp4MuxerApi();
  const encoderSelection = await pickFixedTimelineVideoEncoderConfig(config);
  if (!muxerApi?.Muxer || !muxerApi?.ArrayBufferTarget || !encoderSelection) {
    throw new Error("当前浏览器不支持固定时间轴 MP4 编码。");
  }

  const target = new muxerApi.ArrayBufferTarget();
  const muxer = new muxerApi.Muxer({
    target,
    video: {
      codec: encoderSelection.muxerCodec,
      width: config.width,
      height: config.height,
      frameRate: config.fps
    },
    fastStart: {
      expectedVideoChunks: config.totalFrames
    },
    firstTimestampBehavior: "strict"
  });

  let encodeError = null;
  const encoder = new VideoEncoder({
    output(chunk, meta) {
      muxer.addVideoChunk(chunk, meta);
    },
    error(error) {
      encodeError = error instanceof Error ? error : new Error(String(error));
    }
  });

  try {
    encoder.configure(encoderSelection.encoderConfig);
    const frameDurationUs = Math.round(1000000 / Math.max(1, config.fps));

    await captureFrames(
      config,
      exportCanvas,
      exportCtx,
      async (frameIndex) => {
        if (encodeError) {
          throw encodeError;
        }

        const frame = new VideoFrame(exportCanvas, {
          timestamp: frameIndex * frameDurationUs,
          duration: frameDurationUs
        });

        try {
          encoder.encode(frame, {
            keyFrame: frameIndex === 0 || frameIndex % Math.max(1, config.fps * 2) === 0
          });
        } finally {
          frame.close();
        }

        await onProgress(frameIndex);
      },
      exportSnapshot,
      {
        throttleToRealtime: false
      }
    );

    await encoder.flush();
    if (encodeError) {
      throw encodeError;
    }

    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    if (typeof encoder.close === "function" && encoder.state !== "closed") {
      encoder.close();
    }
  }
}

// Records a video blob from captured frames.
async function recordVideoBlobWithMediaRecorder(
  config,
  exportCanvas,
  exportCtx,
  mimeType,
  onProgress,
  exportSnapshot = getActiveExportSnapshot()
) {
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
    }, exportSnapshot);
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

// Records or encodes a video blob from captured frames.
async function recordVideoBlob(
  config,
  exportCanvas,
  exportCtx,
  mimeType,
  onProgress,
  exportSnapshot = getActiveExportSnapshot()
) {
  if (canUseFixedTimelineMp4Encoding()) {
    try {
      return await encodeFixedTimelineVideoBlob(
        config,
        exportCanvas,
        exportCtx,
        onProgress,
        exportSnapshot
      );
    } catch (error) {
      console.warn("Fixed-timeline MP4 export failed, falling back to MediaRecorder", error);
      if (!mimeType) {
        throw error;
      }
    }
  }

  return recordVideoBlobWithMediaRecorder(config, exportCanvas, exportCtx, mimeType, onProgress, exportSnapshot);
}
