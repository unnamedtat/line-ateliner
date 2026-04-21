// User-facing export actions for MP4, GIF, and PNG.
// Starts video export.
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
  const basename = `ateliner-export-${buildExportStamp()}`;

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

// Starts GIF export.
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

  try {
    await ensureGifLibraryLoaded();
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

// Starts PNG export.
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
