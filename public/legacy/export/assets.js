// Export asset loading and overlay helpers.

// Builds a stable data URL from any drawable image source.
function createStableDataUrlFromDrawable(drawable, widthValue, heightValue) {
  if (!drawable || !widthValue || !heightValue) {
    return "";
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.max(1, widthValue);
  tempCanvas.height = Math.max(1, heightValue);
  const ctx = tempCanvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  try {
    ctx.drawImage(drawable, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL("image/png");
  } catch (error) {
    console.warn("Failed to build stable export asset URL", error);
    return "";
  }
}

// Loads or reuses a drawable for an export asset snapshot.
async function ensureExportAssetDrawable(assetSnapshot) {
  if (!assetSnapshot) {
    return null;
  }

  if (assetSnapshot.drawable) {
    return assetSnapshot.drawable;
  }

  if (!assetSnapshot.href) {
    return null;
  }

  assetSnapshot.drawable = await loadHtmlImage(assetSnapshot.href);
  return assetSnapshot.drawable;
}

// Captures the current source asset into a stable export snapshot.
function createSourceExportSnapshot() {
  const sourceAssetImage =
    typeof getSceneAssetImage === "function" ? getSceneAssetImage("source") : sourceImage;
  const drawable =
    sourceAssetImage?.canvas || sourceAssetImage?.elt || sourceAssetImage?.image || sourceAssetImage;
  const widthValue = sourceAssetImage?.width || sourceImage?.width || 0;
  const heightValue = sourceAssetImage?.height || sourceImage?.height || 0;
  const stableHref =
    createStableDataUrlFromDrawable(drawable, widthValue, heightValue) ||
    (typeof getSceneAssetPersistentHref === "function" ? getSceneAssetPersistentHref("source") : sourceImageHref);

  return {
    href: stableHref,
    width: widthValue,
    height: heightValue,
    drawable: null
  };
}

// Captures the current paper texture overlay into a stable export snapshot.
function createTextureOverlayExportSnapshot() {
  if (!textureOverlayNode || textureOverlayNode.style.display === "none") {
    return null;
  }

  const overlayDrawable = paperLayer?.canvas || textureOverlayNode;
  const stableHref =
    createStableDataUrlFromDrawable(overlayDrawable, width, height) || textureOverlayNode.src || "";
  if (!stableHref) {
    return null;
  }

  return {
    href: stableHref,
    opacity: Number.parseFloat(textureOverlayNode.style.opacity || "1"),
    drawable: null
  };
}

// Captures all export-sensitive state at the start of an export session.
function createExportSnapshot(config) {
  return {
    config: cloneExportValue(config),
    startFrameValue: getRenderAnimationFrame(),
    settings: cloneExportValue(settings),
    mode: getEffectiveRenderMode(),
    sourceSize: {
      width: sourceImage?.width || 0,
      height: sourceImage?.height || 0
    },
    analysisSize: {
      width: analysisState?.width || 0,
      height: analysisState?.height || 0
    },
    edgeSamples: cloneExportValue(edgeSamples || []),
    hatchSamples: cloneExportValue(hatchSamples || []),
    strokePaths: cloneExportValue(strokePaths || []),
    sourceAsset: createSourceExportSnapshot(),
    textureOverlay: createTextureOverlayExportSnapshot()
  };
}

// Checks whether full offscreen export rendering can be used.
function canUseDirectOffscreenExport(snapshot = getActiveExportSnapshot()) {
  return (
    typeof requestLegacyExportWorker === "function" &&
    canUseLegacyExportWorker() &&
    Boolean(snapshot?.sourceSize?.width && snapshot?.sourceSize?.height)
  );
}

// Builds export scene layout without mutating the live viewport.
function buildExportSceneLayout(exportWidth, exportHeight, snapshot = getActiveExportSnapshot()) {
  const sourceWidth = snapshot?.sourceSize?.width || sourceImage?.width || 0;
  const sourceHeight = snapshot?.sourceSize?.height || sourceImage?.height || 0;
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const margin = min(exportWidth, exportHeight) * 0.07;
  const imageAspect = sourceWidth / sourceHeight;
  let drawWidth = exportWidth - margin * 2;
  let drawHeight = drawWidth / imageAspect;

  if (drawHeight > exportHeight - margin * 2) {
    drawHeight = exportHeight - margin * 2;
    drawWidth = drawHeight * imageAspect;
  }

  const exportSettings = snapshot?.settings || settings;
  const scaleFactor = max(0.05, exportSettings.sceneScale / 100);
  drawWidth *= scaleFactor;
  drawHeight *= scaleFactor;
  const offsetX = (exportSettings.sceneOffsetX / 100) * exportWidth;
  const offsetY = (exportSettings.sceneOffsetY / 100) * exportHeight;

  return {
    x: (exportWidth - drawWidth) * 0.5 + offsetX,
    y: (exportHeight - drawHeight) * 0.5 + offsetY,
    width: drawWidth,
    height: drawHeight
  };
}

// Builds the current distortion overlay markup for export.
function buildDistortionOverlayExportMarkup(
  exportWidth,
  exportHeight,
  frameValue = getRenderAnimationFrame(),
  snapshot = getActiveExportSnapshot()
) {
  if ((snapshot?.mode || getEffectiveRenderMode()) !== "distortion") {
    return "";
  }

  const exportSceneLayout = buildExportSceneLayout(exportWidth, exportHeight, snapshot);
  const sourceHref = snapshot?.sourceAsset?.href || sourceImageHref;
  if (!exportSceneLayout || !sourceHref) {
    return "";
  }

  const exportSettings = snapshot?.settings || settings;
  const speed = exportSettings.distortionSpeed / 100;
  const wobble = frameValue * (0.006 + speed * 0.03);
  const distortionFrequency = (exportSettings.distortionFrequency || 0) / 100;
  const baseFrequencyX = max(0.001, distortionFrequency * (1 + sin(wobble) * 0.08));
  const baseFrequencyY = max(0.001, distortionFrequency * (1 + cos(wobble * 1.17 + 0.8) * 0.08));
  const numOctaves = String(round(exportSettings.distortionOctaves || 0));
  const displacementScale = ((exportSettings.distortionScale || 0) / 10).toFixed(2);

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
  <defs>
    <filter id="export-distortion-filter">
      <feTurbulence type="turbulence" baseFrequency="${baseFrequencyX.toFixed(4)} ${baseFrequencyY.toFixed(4)}" numOctaves="${numOctaves}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <image
    href="${sourceHref}"
    x="${exportSceneLayout.x.toFixed(2)}"
    y="${exportSceneLayout.y.toFixed(2)}"
    width="${exportSceneLayout.width.toFixed(2)}"
    height="${exportSceneLayout.height.toFixed(2)}"
    preserveAspectRatio="none"
    filter="url(#export-distortion-filter)"
  />
</svg>`.trim();
}

// Captures the current texture overlay as an ImageBitmap for worker composition.
async function captureTextureOverlayBitmap() {
  if (!textureOverlayNode || textureOverlayNode.style.display === "none" || !textureOverlayNode.src) {
    return null;
  }

  if (!textureOverlayNode.complete) {
    await loadHtmlImage(textureOverlayNode.src);
  }

  if (typeof createImageBitmap !== "function") {
    return null;
  }

  return createImageBitmap(textureOverlayNode);
}

// Creates a source bitmap for direct export rendering.
async function captureSourceImageBitmap(snapshot = getActiveExportSnapshot()) {
  const drawable = await ensureExportAssetDrawable(snapshot?.sourceAsset);
  if (!drawable || typeof createImageBitmap !== "function") {
    return null;
  }

  return createImageBitmap(drawable);
}

// Builds a direct-render export payload.
async function buildDirectExportPayload(targetCanvas, frameValue, snapshot = getActiveExportSnapshot()) {
  if (!canUseDirectOffscreenExport(snapshot)) {
    return null;
  }

  const exportWidth = targetCanvas.width;
  const exportHeight = targetCanvas.height;
  const transferList = [];
  const sourceBitmap = await captureSourceImageBitmap(snapshot);
  if (sourceBitmap) {
    transferList.push(sourceBitmap);
  }
  let textureBitmap = null;
  const textureOverlayDrawable = await ensureExportAssetDrawable(snapshot?.textureOverlay);
  if (textureOverlayDrawable && typeof createImageBitmap === "function") {
    textureBitmap = await createImageBitmap(textureOverlayDrawable);
  }
  if (textureBitmap) {
    transferList.push(textureBitmap);
  }

  return {
    payload: {
      width: exportWidth,
      height: exportHeight,
      mode: snapshot.mode,
      frameValue,
      settings: snapshot.settings,
      sourceSize: snapshot.sourceSize,
      analysisSize: snapshot.analysisSize,
      edgeSamples: snapshot.edgeSamples,
      hatchSamples: snapshot.hatchSamples,
      strokePaths: snapshot.strokePaths,
      sourceBitmap,
      distortionSvgMarkup: buildDistortionOverlayExportMarkup(exportWidth, exportHeight, frameValue, snapshot),
      textureBitmap,
      textureOpacity: snapshot.textureOverlay?.opacity ?? 1
    },
    transferList
  };
}

// Draws the full export frame through the export worker when available.
async function drawCompositeExportFrameWithWorker(
  targetCanvas,
  targetCtx,
  frameValue = getRenderAnimationFrame(),
  snapshot = getActiveExportSnapshot()
) {
  const request = await buildDirectExportPayload(targetCanvas, frameValue, snapshot);
  if (!request) {
    throw new Error("Direct offscreen export is not available.");
  }

  const result = await requestLegacyExportWorker(
    "render-frame",
    request.payload,
    request.transferList
  );

  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.drawImage(result.bitmap, 0, 0, targetCanvas.width, targetCanvas.height);
  result.bitmap?.close?.();
}

// Ensures the source image href is embedded.
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
    const embeddedHref = tempCanvas.toDataURL("image/png");
    if (typeof updateSceneAssetRecord === "function") {
      updateSceneAssetRecord(
        "source",
        {
          href: embeddedHref,
          objectUrl: "",
          blob: null
        },
        {
          revokePreviousObjectUrl: false
        }
      );
    } else {
      sourceImageHref = embeddedHref;
    }
  } catch (error) {
    console.warn("Failed to embed source image for export", error);
  }
}

// Loads an HTML image element.
function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image during export."));
    image.src = src;
  });
}

// Clones the distortion overlay markup for export.
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

// Renders the distortion overlay frame.
async function renderDistortionOverlayFrame(
  exportWidth,
  exportHeight,
  frameValue = getRenderAnimationFrame(),
  snapshot = getActiveExportSnapshot()
) {
  const svgMarkup = buildDistortionOverlayExportMarkup(exportWidth, exportHeight, frameValue, snapshot);
  if (!svgMarkup) {
    return null;
  }

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  return loadHtmlImage(svgUrl);
}

// Draws the texture overlay to a context.
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

// Draws the full composite export frame.
async function drawCompositeExportFrame(
  targetCanvas,
  targetCtx,
  frameValue = getRenderAnimationFrame(),
  snapshot = getActiveExportSnapshot()
) {
  if (typeof requestLegacyExportWorker === "function" && canUseLegacyExportWorker()) {
    try {
      await drawCompositeExportFrameWithWorker(targetCanvas, targetCtx, frameValue, snapshot);
      return;
    } catch (error) {
      console.warn("Export worker composition failed, falling back to main thread", error);
    }
  }

  const exportWidth = targetCanvas.width;
  const exportHeight = targetCanvas.height;
  const mainCanvas = getMainCanvasElement();
  if (!mainCanvas) {
    throw new Error("Main canvas is not available.");
  }

  targetCtx.clearRect(0, 0, exportWidth, exportHeight);
  targetCtx.drawImage(mainCanvas, 0, 0, exportWidth, exportHeight);

  const exportMode = snapshot?.mode || getEffectiveRenderMode();
  if (exportMode === "distortion") {
    const distortionFrame = await renderDistortionOverlayFrame(exportWidth, exportHeight, frameValue, snapshot);
    if (distortionFrame) {
      targetCtx.drawImage(distortionFrame, 0, 0, exportWidth, exportHeight);
    }
  }

  if (snapshot?.textureOverlay?.href) {
    const textureImage = await ensureExportAssetDrawable(snapshot.textureOverlay);
    if (textureImage) {
      targetCtx.save();
      targetCtx.globalAlpha = Number.isFinite(snapshot.textureOverlay.opacity) ? snapshot.textureOverlay.opacity : 1;
      targetCtx.drawImage(textureImage, 0, 0, exportWidth, exportHeight);
      targetCtx.restore();
    }
  } else {
    await drawTextureOverlayToContext(targetCtx, exportWidth, exportHeight);
  }
}

// Builds a snapshot canvas.
function buildSnapshotCanvas() {
  const canvasSize = getExportCanvasSize();
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvasSize.width;
  exportCanvas.height = canvasSize.height;
  const exportCtx = configureExportContext(exportCanvas.getContext("2d"));
  return { exportCanvas, exportCtx };
}

// Downloads a blob to the user machine.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Builds a timestamp for export filenames.
function buildExportStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// Builds an export filename.
function buildExportFilename(extension, basename = `handdrawn-export-${buildExportStamp()}`) {
  return `${basename}.${extension}`;
}

// Converts a canvas to a blob.
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

// Resolves the GIF worker script URL.
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

// Finds the loaded GIF library script.
function findGifLibraryScript() {
  return Array.from(document.querySelectorAll("script")).find((script) => script.src.endsWith(GIF_LIBRARY_SCRIPT));
}

// Ensures the GIF library script is loaded.
async function ensureGifLibraryLoaded() {
  if (typeof GIF === "function") {
    return;
  }

  if (!gifLibraryLoadPromise) {
    gifLibraryLoadPromise = new Promise((resolve, reject) => {
      const existingScript = findGifLibraryScript();
      const script = existingScript || document.createElement("script");

      const cleanup = () => {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      };

      const handleLoad = () => {
        cleanup();
        if (typeof GIF === "function") {
          resolve();
          return;
        }
        reject(new Error("GIF 编码器加载后仍不可用"));
      };

      const handleError = () => {
        cleanup();
        reject(new Error("无法加载 GIF 编码器脚本"));
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existingScript) {
        script.src = GIF_LIBRARY_SCRIPT;
        script.async = true;
        script.dataset.gifLibrary = "true";
        document.body.appendChild(script);
      }
    }).catch((error) => {
      gifLibraryLoadPromise = null;
      throw error;
    });
  }

  await gifLibraryLoadPromise;
}

// Preloads the GIF library script.
function preloadGifLibrary() {
  ensureGifLibraryLoaded().catch((error) => {
    console.warn("GIF library preload failed", error);
  });
}
