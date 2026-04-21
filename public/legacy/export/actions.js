// User-facing export actions for MP4, GIF, and PNG.

// Runs an export task with a frozen snapshot of all export-sensitive state.
async function withFrozenExportSnapshot(config, task) {
  const snapshot = createExportSnapshot(config);
  setActiveExportSnapshot(snapshot);

  try {
    return await task(snapshot);
  } finally {
    clearActiveExportSnapshot();
  }
}

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

  const mimeType = typeof pickVideoMimeType === "function" ? pickVideoMimeType() : "";
  const canUseFixedMp4 = typeof canUseFixedTimelineMp4Encoding === "function" && canUseFixedTimelineMp4Encoding();
  if (!canUseFixedMp4 && !mimeType) {
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
    const videoBlob = await withFrozenExportSnapshot(config, async (exportSnapshot) => {
      return withManualExportRendering(async () => {
        return withTemporaryExportRenderSize(config, async () => {
          return recordVideoBlob(config, exportCanvas, exportCtx, mimeType, async (frameIndex) => {
            setExportState({
              active: true,
              format: "video",
              status: `正在导出 MP4... ${frameIndex + 1}/${config.totalFrames}`
            });
          }, exportSnapshot);
        });
      }, exportSnapshot);
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
    await withFrozenExportSnapshot(config, async (exportSnapshot) => {
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
          }, exportSnapshot, {
            throttleToRealtime: false
          });
        });
      }, exportSnapshot);
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
    await withFrozenExportSnapshot(
      {
        ...getExportConfig(),
        totalFrames: 1,
        frameDelayMs: 0
      },
      async (exportSnapshot) => {
        await drawCompositeExportFrame(exportCanvas, exportCtx, exportSnapshot.startFrameValue, exportSnapshot);
      }
    );
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
