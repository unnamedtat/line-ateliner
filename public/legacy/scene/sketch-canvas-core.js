// Canvas lifecycle, render mode checks, and base paper drawing.
// p5 lifecycle, scene rebuilding, paper rendering, and line extraction/drawing.
let canvasHostObserver = null;
let sceneBuildSerial = 0;
let sceneBuildQueued = false;
let queuedSceneBuildMessage = "";
let activeSceneBuild = null;
let analysisWorkState = null;
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
  sourceImage = loadImage(SOURCE_IMAGE_PATH);
}

// Initializes the p5 sketch and UI state.
function setup() {
  if (typeof ensureRetroLayout === "function") {
    ensureRetroLayout();
  }
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
  initDistortionOverlay();
  initTextureOverlay();
  bindControls();
  syncControls();
  rebuildScene("正在初始化预览...");
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
  bindControls();
  if (typeof syncCanvasEmptyState === "function") {
    syncCanvasEmptyState();
  }

  const retainedScene = getRetainedSceneSnapshot();
  if (!sceneLayout || !hasDrawableOutput()) {
    if (retainedScene) {
      drawRetainedScene(retainedScene, animationFrame);
      return;
    }
    hideDistortionOverlay();
    drawLoadingHint();
    return;
  }

  drawActiveSceneFrame(animationFrame);
}

// Draws the currently active scene state.
function drawActiveSceneFrame(animationFrame) {
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

// Gets the retained scene snapshot used while a new build is still running.
function getRetainedSceneSnapshot() {
  if ((appStatusState.analysisActive || appStatusState.analysisFailed) && previewSceneSnapshot) {
    return previewSceneSnapshot;
  }
  return null;
}

// Draws the retained scene snapshot while new output is being computed.
function drawRetainedScene(snapshot, animationFrame) {
  const previousState = {
    paperBaseLayer,
    sceneLayout,
    analysisState,
    edgeSamples,
    hatchSamples,
    strokePaths,
    renderFrameCache,
    sourceImage,
    sourceImageHref,
    renderMode: settings.renderMode,
    contourVariant: settings.contourVariant,
    inkColor: settings.inkColor,
    inkOpacity: settings.inkOpacity,
    lineWidthScale: settings.lineWidthScale,
    contourStrokeThickness: settings.contourStrokeThickness
  };

  paperBaseLayer = snapshot.paperBaseLayer || previousState.paperBaseLayer;
  sceneLayout = snapshot.sceneLayout;
  analysisState = snapshot.analysisState;
  edgeSamples = snapshot.edgeSamples;
  hatchSamples = snapshot.hatchSamples;
  strokePaths = snapshot.strokePaths;
  renderFrameCache = snapshot.renderFrameCache;
  sourceImage = snapshot.sourceImage || previousState.sourceImage;
  sourceImageHref = snapshot.sourceImageHref || previousState.sourceImageHref;
  settings.renderMode = snapshot.settings?.renderMode || previousState.renderMode;
  settings.contourVariant = snapshot.settings?.contourVariant || previousState.contourVariant;
  settings.inkColor = snapshot.settings?.inkColor || previousState.inkColor;
  settings.inkOpacity = snapshot.settings?.inkOpacity ?? previousState.inkOpacity;
  settings.lineWidthScale = snapshot.settings?.lineWidthScale ?? previousState.lineWidthScale;
  settings.contourStrokeThickness =
    snapshot.settings?.contourStrokeThickness ?? previousState.contourStrokeThickness;

  try {
    if (paperBaseLayer) {
      image(paperBaseLayer, 0, 0);
    }
    drawActiveSceneFrame(animationFrame);
  } finally {
    paperBaseLayer = previousState.paperBaseLayer;
    sceneLayout = previousState.sceneLayout;
    analysisState = previousState.analysisState;
    edgeSamples = previousState.edgeSamples;
    hatchSamples = previousState.hatchSamples;
    strokePaths = previousState.strokePaths;
    renderFrameCache = previousState.renderFrameCache;
    sourceImage = previousState.sourceImage;
    sourceImageHref = previousState.sourceImageHref;
    settings.renderMode = previousState.renderMode;
    settings.contourVariant = previousState.contourVariant;
    settings.inkColor = previousState.inkColor;
    settings.inkOpacity = previousState.inkOpacity;
    settings.lineWidthScale = previousState.lineWidthScale;
    settings.contourStrokeThickness = previousState.contourStrokeThickness;
  }
}

// Checks whether the app has drawable output ready.
function hasDrawableOutput() {
  if (appStatusState.analysisActive || appStatusState.analysisFailed) {
    return Boolean(getRetainedSceneSnapshot());
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
