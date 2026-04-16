// Analysis state creation and cached synchronous map accessors.
// Builds the synchronous analysis state.
function buildAnalysisState() {
  if (analysisState?.image && typeof analysisState.image.remove === "function") {
    analysisState.image.remove();
  }

  if (typeof clearEdgeFieldCache === "function") {
    clearEdgeFieldCache();
  }

  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    analysisState = null;
    return;
  }

  let analysisWidth = sourceImage.width;
  let analysisHeight = sourceImage.height;
  const maxDimension = getAnalysisMaxDimension();
  const longestSide = max(analysisWidth, analysisHeight);

  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide;
    analysisWidth = max(1, floor(analysisWidth * scale));
    analysisHeight = max(1, floor(analysisHeight * scale));
  }

  const analysisImage = createGraphics(analysisWidth, analysisHeight);
  analysisImage.pixelDensity(1);
  analysisImage.background(255);
  analysisImage.imageMode(CORNER);
  analysisImage.image(sourceImage, 0, 0, analysisWidth, analysisHeight);
  analysisImage.loadPixels();
  analysisState = {
    image: analysisImage,
    width: analysisImage.width,
    height: analysisImage.height,
    cache: {
      // These maps are reused across algorithm switches so we don't resample the
      // same source image for brightness / RGB data every time the mode changes.
      brightnessMap: null,
      filteredBrightnessMaps: new Map(),
      localContrastMaps: new Map(),
      rgbMaps: null,
      colorDeltaMaps: new Map(),
      inkMask: null
    }
  };
}

// Builds the asynchronous analysis state.
async function buildAnalysisStateAsync() {
  if (analysisState?.image && typeof analysisState.image.remove === "function") {
    analysisState.image.remove();
  }

  if (typeof clearEdgeFieldCache === "function") {
    clearEdgeFieldCache();
  }

  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    analysisState = null;
    return;
  }

  let analysisWidth = sourceImage.width;
  let analysisHeight = sourceImage.height;
  const maxDimension = getAnalysisMaxDimension();
  const longestSide = max(analysisWidth, analysisHeight);

  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide;
    analysisWidth = max(1, floor(analysisWidth * scale));
    analysisHeight = max(1, floor(analysisHeight * scale));
  }

  await ensureAnalysisResponsive("正在创建分析画布...", true);
  const analysisImage = createGraphics(analysisWidth, analysisHeight);
  analysisImage.pixelDensity(1);
  analysisImage.background(255);
  analysisImage.imageMode(CORNER);
  analysisImage.image(sourceImage, 0, 0, analysisWidth, analysisHeight);
  analysisImage.loadPixels();
  analysisState = {
    image: analysisImage,
    width: analysisImage.width,
    height: analysisImage.height,
    cache: {
      brightnessMap: null,
      filteredBrightnessMaps: new Map(),
      localContrastMaps: new Map(),
      rgbMaps: null,
      colorDeltaMaps: new Map(),
      inkMask: null
    }
  };
}

// Gets the current analysis image.
function getAnalysisImage() {
  return analysisState?.image || null;
}

// Gets the analysis cache object.
function getAnalysisCache() {
  return analysisState?.cache || null;
}

// Gets the max analysis dimension for the quality preset.
function getAnalysisMaxDimension() {
  return ANALYSIS_QUALITY_PRESETS[settings.analysisQuality] || ANALYSIS_QUALITY_PRESETS.medium;
}

// Gets the current scene scale.
function getSceneScale() {
  if (!sceneLayout || !analysisState) {
    return { x: 1, y: 1, unit: 1 };
  }

  const scaleX = sceneLayout.width / max(1, analysisState.width);
  const scaleY = sceneLayout.height / max(1, analysisState.height);
  return {
    x: scaleX,
    y: scaleY,
    unit: min(scaleX, scaleY)
  };
}

// Gets the cached brightness map.
function getBrightnessMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.brightnessMap) {
    return cache.brightnessMap;
  }

  const brightnessMap = buildBrightnessMap(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.brightnessMap = brightnessMap;
  }
  return brightnessMap;
}

// Gets the cached filtered brightness map.
function getFilteredBrightnessMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.filteredBrightnessMaps?.has(smoothPasses)) {
    return cache.filteredBrightnessMaps.get(smoothPasses);
  }

  let brightnessMap = getBrightnessMap();
  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = blurScalarMap(brightnessMap, analysisImage.width, analysisImage.height);
  }

  if (cache?.filteredBrightnessMaps) {
    cache.filteredBrightnessMaps.set(smoothPasses, brightnessMap);
  }
  return brightnessMap;
}

// Gets the cached local contrast map.
function getLocalContrastMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.localContrastMaps?.has(smoothPasses)) {
    return cache.localContrastMaps.get(smoothPasses);
  }

  const contrastMap = buildLocalContrastMap(
    getFilteredBrightnessMap(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache?.localContrastMaps) {
    cache.localContrastMaps.set(smoothPasses, contrastMap);
  }
  return contrastMap;
}

// Gets the cached RGB maps.
function getRgbMaps() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return {
      rMap: new Uint8Array(),
      gMap: new Uint8Array(),
      bMap: new Uint8Array()
    };
  }
  if (cache?.rgbMaps) {
    return cache.rgbMaps;
  }

  const rgbMaps = buildRgbMaps(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.rgbMaps = rgbMaps;
  }
  return rgbMaps;
}

// Gets the cached color delta map.
function getColorDeltaMap() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.colorDeltaMaps?.has(smoothPasses)) {
    return cache.colorDeltaMaps.get(smoothPasses);
  }

  const { rMap, gMap, bMap } = getRgbMaps();
  const colorDeltaMap = buildColorDeltaMap(rMap, gMap, bMap, analysisImage.width, analysisImage.height);
  if (cache?.colorDeltaMaps) {
    cache.colorDeltaMaps.set(smoothPasses, colorDeltaMap);
  }
  return colorDeltaMap;
}

// Gets the cached ink mask.
function getInkMask() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Uint8Array();
  }
  if (cache?.inkMask) {
    return cache.inkMask;
  }

  const inkMask = buildInkMask(getFilteredBrightnessMap(), analysisImage.width, analysisImage.height);
  if (cache) {
    cache.inkMask = inkMask;
  }
  return inkMask;
}
