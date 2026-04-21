// Export asset loading and overlay helpers.

// Checks whether full offscreen export rendering can be used.
function canUseDirectOffscreenExport() {
  return (
    typeof requestLegacyExportWorker === "function" &&
    canUseLegacyExportWorker() &&
    Boolean(sceneLayout && analysisState)
  );
}

// Builds export scene layout without mutating the live viewport.
function buildExportSceneLayout(exportWidth, exportHeight) {
  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    return null;
  }

  const margin = min(exportWidth, exportHeight) * 0.07;
  const imageAspect = sourceImage.width / sourceImage.height;
  let drawWidth = exportWidth - margin * 2;
  let drawHeight = drawWidth / imageAspect;

  if (drawHeight > exportHeight - margin * 2) {
    drawHeight = exportHeight - margin * 2;
    drawWidth = drawHeight * imageAspect;
  }

  const scaleFactor = max(0.05, settings.sceneScale / 100);
  drawWidth *= scaleFactor;
  drawHeight *= scaleFactor;
  const offsetX = (settings.sceneOffsetX / 100) * exportWidth;
  const offsetY = (settings.sceneOffsetY / 100) * exportHeight;

  return {
    x: (exportWidth - drawWidth) * 0.5 + offsetX,
    y: (exportHeight - drawHeight) * 0.5 + offsetY,
    width: drawWidth,
    height: drawHeight
  };
}

// Builds the current distortion overlay markup for export.
function buildDistortionOverlayExportMarkup(exportWidth, exportHeight, frameValue = getRenderAnimationFrame()) {
  if (!isDistortionMode()) {
    return "";
  }

  ensureSourceImageEmbeddedHref();
  const exportSceneLayout = buildExportSceneLayout(exportWidth, exportHeight);
  if (!exportSceneLayout || !sourceImageHref) {
    return "";
  }

  const speed = settings.distortionSpeed / 100;
  const wobble = frameValue * (0.006 + speed * 0.03);
  const distortionFrequency = getHundredthsSetting("distortionFrequency");
  const baseFrequencyX = max(0.001, distortionFrequency * (1 + sin(wobble) * 0.08));
  const baseFrequencyY = max(0.001, distortionFrequency * (1 + cos(wobble * 1.17 + 0.8) * 0.08));
  const numOctaves = String(round(settings.distortionOctaves));
  const displacementScale = getTenthsSetting("distortionScale").toFixed(2);

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
  <defs>
    <filter id="export-distortion-filter">
      <feTurbulence type="turbulence" baseFrequency="${baseFrequencyX.toFixed(4)} ${baseFrequencyY.toFixed(4)}" numOctaves="${numOctaves}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <image
    href="${sourceImageHref}"
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
async function captureSourceImageBitmap() {
  const sourceAssetImage =
    typeof getSceneAssetImage === "function" ? getSceneAssetImage("source") : sourceImage;
  const drawable =
    sourceAssetImage?.canvas || sourceAssetImage?.elt || sourceAssetImage?.image || sourceAssetImage;
  if (!drawable || typeof createImageBitmap !== "function") {
    return null;
  }

  return createImageBitmap(drawable);
}

// Builds a direct-render export payload.
async function buildDirectExportPayload(targetCanvas, frameValue) {
  if (!canUseDirectOffscreenExport()) {
    return null;
  }

  const exportWidth = targetCanvas.width;
  const exportHeight = targetCanvas.height;
  const transferList = [];
  const sourceBitmap = await captureSourceImageBitmap();
  if (sourceBitmap) {
    transferList.push(sourceBitmap);
  }
  const textureBitmap = await captureTextureOverlayBitmap();
  if (textureBitmap) {
    transferList.push(textureBitmap);
  }

  return {
    payload: {
      width: exportWidth,
      height: exportHeight,
      mode: getEffectiveRenderMode(),
      frameValue,
      settings: createWorkerSettingsSnapshot(),
      sourceSize: {
        width: sourceImage?.width || 0,
        height: sourceImage?.height || 0
      },
      analysisSize: {
        width: analysisState?.width || 0,
        height: analysisState?.height || 0
      },
      edgeSamples,
      hatchSamples,
      strokePaths,
      sourceBitmap,
      distortionSvgMarkup: buildDistortionOverlayExportMarkup(exportWidth, exportHeight, frameValue),
      textureBitmap,
      textureOpacity: Number.parseFloat(textureOverlayNode?.style.opacity || "1")
    },
    transferList
  };
}

// Draws the full export frame through the export worker when available.
async function drawCompositeExportFrameWithWorker(targetCanvas, targetCtx, frameValue = getRenderAnimationFrame()) {
  const request = await buildDirectExportPayload(targetCanvas, frameValue);
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
async function renderDistortionOverlayFrame(exportWidth, exportHeight) {
  const svgMarkup = cloneDistortionOverlayMarkup(exportWidth, exportHeight);
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
async function drawCompositeExportFrame(targetCanvas, targetCtx, frameValue = getRenderAnimationFrame()) {
  if (typeof requestLegacyExportWorker === "function" && canUseLegacyExportWorker()) {
    try {
      await drawCompositeExportFrameWithWorker(targetCanvas, targetCtx, frameValue);
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

  if (isDistortionMode()) {
    const distortionFrame = await renderDistortionOverlayFrame(exportWidth, exportHeight);
    if (distortionFrame) {
      targetCtx.drawImage(distortionFrame, 0, 0, exportWidth, exportHeight);
    }
  }

  await drawTextureOverlayToContext(targetCtx, exportWidth, exportHeight);
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
