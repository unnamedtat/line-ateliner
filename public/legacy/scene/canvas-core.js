// Canvas lifecycle, render mode checks, and base paper drawing.
// p5 lifecycle, scene rebuilding, paper rendering, and line extraction/drawing.
let canvasHostObserver = null;
let sceneBuildSerial = 0;
let queuedBuildKind = "";
let queuedBuildMessage = "";
let queuedModeOutputOptions = {
  reuseGeometry: false
};
let activeSceneBuild = null;
let analysisWorkState = null;
let currentOutputGeometryKey = "";
let previewAnimationStartedAt = 0;
let sceneBackgroundHiddenAt = 0;
let sceneResumeRestorePromise = null;
let initialSceneBootScheduled = false;
let renderFrameCache = {
  mode: "",
  width: 0,
  height: 0,
  frames: new Map()
};

// Gets the canvas mount element.
function getCanvasHost() {
  return document.getElementById("canvas-mount");
}

// Gets global line width scale.
function getGlobalLineWidthScale() {
  return constrain((settings.lineWidthScale ?? 100) / 100, 0.2, 4);
}

// Gets the current canvas host size.
function getCanvasHostSize() {
  const host = getCanvasHost();
  if (host) {
    const rect = host.getBoundingClientRect();
    return {
      width: max(320, floor(rect.width || windowWidth || 320)),
      height: max(240, floor(rect.height || windowHeight || 240))
    };
  }

  return {
    width: max(320, floor(windowWidth || 320)),
    height: max(240, floor(windowHeight || 240))
  };
}

// Starts observing canvas host size changes.
function observeCanvasHost() {
  const host = getCanvasHost();
  if (!host || typeof ResizeObserver === "undefined") {
    return;
  }

  if (canvasHostObserver) {
    canvasHostObserver.disconnect();
  }

  canvasHostObserver = new ResizeObserver(() => {
    handleCanvasHostResize();
  });
  canvasHostObserver.observe(host);
}

// Restores the scene after the page spent too long in the background.
async function restoreSceneAfterBackgroundPause(force = false) {
  if (sceneResumeRestorePromise) {
    return sceneResumeRestorePromise;
  }

  const hiddenDurationMs =
    sceneBackgroundHiddenAt > 0 ? max(0, performance.now() - sceneBackgroundHiddenAt) : 0;
  if (!force && hiddenDurationMs < 15000) {
    return false;
  }

  sceneBackgroundHiddenAt = 0;
  sceneResumeRestorePromise = (async () => {
    try {
      if (appStatusState.analysisActive) {
        return false;
      }

      previewAnimationStartedAt = performance.now();
      if (typeof restoreSourceImageAfterResume === "function") {
        await restoreSourceImageAfterResume();
      }
      if (typeof restoreTextureImageAfterResume === "function") {
        await restoreTextureImageAfterResume();
      }

      if (typeof clearRenderFrameCache === "function") {
        clearRenderFrameCache();
      }
      const needsFullSceneRestore =
        typeof hasDrawableOutput === "function" ? !hasDrawableOutput() : true;
      if (needsFullSceneRestore && typeof rebuildSceneSynchronously === "function") {
        rebuildSceneSynchronously();
      } else if (typeof rebuildViewportSynchronously === "function") {
        rebuildViewportSynchronously();
      }
      if (typeof syncControls === "function") {
        syncControls();
      }
      return true;
    } catch (error) {
      console.warn("Failed to restore scene after background pause", error);
      return false;
    } finally {
      sceneResumeRestorePromise = null;
    }
  })();

  return sceneResumeRestorePromise;
}

// Starts page visibility listeners for background recovery.
function observePageLifecycle() {
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        sceneBackgroundHiddenAt = performance.now();
        return;
      }

      void restoreSceneAfterBackgroundPause(false);
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", () => {
      void restoreSceneAfterBackgroundPause(true);
    });
  }
}

// Handles canvas host resize updates.
function handleCanvasHostResize() {
  const nextSize = getCanvasHostSize();
  if (nextSize.width === width && nextSize.height === height) {
    return;
  }

  resizeCanvas(nextSize.width, nextSize.height);
  rebuildViewportSynchronously();
}

// Preloads the default source image.
function preload() {
  sourceImage = loadImage(SOURCE_IMAGE_PATH, (image) => {
    if (typeof updateSceneAssetRecord === "function") {
      updateSceneAssetRecord(
        "source",
        {
          image,
          href: SOURCE_IMAGE_PATH,
          blob: null,
          objectUrl: "",
          label: "figure.png"
        },
        {
          revokePreviousObjectUrl: false
        }
      );
    } else {
      sourceImage = image;
    }
  });
}

// Initializes the p5 sketch and UI state.
function setup() {
  if (typeof ensureRetroLayout === "function") {
    ensureRetroLayout();
  }
  previewAnimationStartedAt = performance.now();
  const host = getCanvasHost();
  const initialSize = getCanvasHostSize();
  const renderer = createCanvas(initialSize.width, initialSize.height);
  if (host) {
    renderer.parent(host);
  }
  renderer.elt.style.width = "100%";
  renderer.elt.style.height = "100%";
  pixelDensity(1);
  noiseDetail(4, 0.5);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  observeCanvasHost();
  observePageLifecycle();
  initDistortionOverlay();
  initTextureOverlay();
  bindControls();
  buildPaperBaseLayer();
  buildPaperLayer();
  buildSceneLayout();
  syncDistortionOverlay();
  clearRenderFrameCache();
  syncControls();
  if (!initialSceneBootScheduled) {
    initialSceneBootScheduled = true;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        rebuildScene("正在初始化预览...");
      }, 0);
    });
  }
}

// Handles window resized.
function windowResized() {
  handleCanvasHostResize();
}

// Draws the current frame for the active render mode.
function draw() {
  const animationFrame = getRenderAnimationFrame();
  if (paperBaseLayer) {
    image(paperBaseLayer, 0, 0);
  } else {
    const colors = getPaperColors();
    background(colors.base[0], colors.base[1], colors.base[2]);
  }

  if (!sceneLayout || !hasDrawableOutput()) {
    hideDistortionOverlay();
    drawLoadingHint();
    return;
  }

  if (isDistortionMode()) {
    drawDistortionFigure(animationFrame);
  } else {
    hideDistortionOverlay();
  }

  if (settings.referenceOverlay && !isDistortionMode()) {
    drawReferenceOverlay();
  }

  const boilFrame = floor(animationFrame / max(1, settings.boilHoldFrames));
  if (isDistortionMode()) {
    // Distortion mode renders through the SVG overlay so the canvas only keeps the paper/background.
  } else if (isPathMode(settings.renderMode)) {
    drawStrokeFigure(boilFrame);
  } else {
    drawEdgeFigure(boilFrame);
  }
  if (!settings.uiHidden) {
    drawCaption();
  }
}

// Checks whether the app has drawable output ready.
function hasDrawableOutput() {
  if (appStatusState.analysisActive || appStatusState.analysisFailed) {
    return false;
  }
  if (isDistortionMode()) {
    return Boolean(sourceImage && sceneLayout);
  }
  return isPathMode(settings.renderMode) ? strokePaths.length > 0 : edgeSamples.length > 0;
}

// Checks whether the active mode is distortion.
function isDistortionMode() {
  return settings.renderMode === "distortion";
}

// Checks whether the mode uses path rendering.
function isPathMode(mode) {
  return (
    mode === "path" ||
    mode === "region-grow" ||
    mode === "color-grow" ||
    mode === "color-boundary" ||
    mode === "contour" ||
    mode === "wave-contour" ||
    mode === "wave-shape" ||
    mode === "rubber-contour"
  );
}

// Gets the effective render mode for contour variants.
function getEffectiveRenderMode() {
  return settings.renderMode === "contour" ? settings.contourVariant : settings.renderMode;
}

// Reads a setting value scaled to tenths.
function getTenthsSetting(key) {
  return settings[key] / 10;
}

// Reads a setting value scaled to hundredths.
function getHundredthsSetting(key) {
  return settings[key] / 100;
}

// Builds the current ink stroke style.
function getInkStrokeStyle() {
  const fallbackColor = Array.isArray(INK) && INK.length === 3 ? INK : [44, 43, 40];
  return {
    color: typeof settings.inkColor === "string" ? hexToRgb(settings.inkColor) : fallbackColor,
    opacityScale: constrain((settings.inkOpacity ?? 100) / 100, 0, 1)
  };
}

// Builds the paper base layer.
function buildPaperBaseLayer() {
  paperBaseLayer = createGraphics(width, height);
  paperBaseLayer.clear();
  paperBaseLayer.pixelDensity(1);
  const colors = getPaperColors();
  if (settings.paperFillMode === "gradient") {
    drawLinearGradientToLayer(paperBaseLayer, colors.base, colors.accent, settings.paperGradientAngle);
    return;
  }

  paperBaseLayer.background(colors.base[0], colors.base[1], colors.base[2]);
}

// Draws the reference overlay image.
function drawReferenceOverlay() {
  if (!sourceImage || !sceneLayout) {
    return;
  }

  push();
  tint(255, constrain(settings.referenceOverlayOpacity, 0, 100) * 2.55);
  image(sourceImage, sceneLayout.x, sceneLayout.y, sceneLayout.width, sceneLayout.height);
  noTint();
  pop();
}

// Draws a linear gradient onto a graphics layer.
function drawLinearGradientToLayer(layer, startColor, endColor, angleDegrees) {
  const angle = radians(angleDegrees);
  const dirX = cos(angle);
  const dirY = sin(angle);
  const span = abs(width * dirX) + abs(height * dirY);
  const halfSpan = max(1, span * 0.5);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const ctx = layer.drawingContext;
  const gradient = ctx.createLinearGradient(
    centerX - dirX * halfSpan,
    centerY - dirY * halfSpan,
    centerX + dirX * halfSpan,
    centerY + dirY * halfSpan
  );

  gradient.addColorStop(0, rgbToCss(startColor));
  gradient.addColorStop(1, rgbToCss(endColor));
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
