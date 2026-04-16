// Synchronous analysis map builders and basic mode outputs.
// Builds the brightness map.
function buildBrightnessMap(analysisImage, w, h) {
  const brightnessMap = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 4;
      const r = analysisImage.pixels[idx];
      const g = analysisImage.pixels[idx + 1];
      const b = analysisImage.pixels[idx + 2];
      brightnessMap[y * w + x] = r * 0.299 + g * 0.587 + b * 0.114;
    }
  }

  return brightnessMap;
}

// Builds the filtered brightness map.
function buildFilteredBrightnessMap(analysisImage, w, h) {
  let brightnessMap = buildBrightnessMap(analysisImage, w, h);
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));

  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = blurScalarMap(brightnessMap, w, h);
  }

  return brightnessMap;
}

// Blurs a scalar map.
function blurScalarMap(sourceMap, w, h) {
  const blurred = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let weightedSum = 0;
      let weightTotal = 0;

      for (let oy = -1; oy <= 1; oy += 1) {
        const sy = constrain(y + oy, 0, h - 1);
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = constrain(x + ox, 0, w - 1);
          const weight = ox === 0 && oy === 0 ? 4 : ox === 0 || oy === 0 ? 2 : 1;
          weightedSum += sourceMap[sy * w + sx] * weight;
          weightTotal += weight;
        }
      }

      blurred[y * w + x] = weightedSum / weightTotal;
    }
  }

  return blurred;
}

// Builds the local contrast map.
function buildLocalContrastMap(brightnessMap, w, h) {
  const contrastMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];
      const neighborhoodMean =
        (brightnessMap[idx - 1] +
          brightnessMap[idx + 1] +
          brightnessMap[idx - w] +
          brightnessMap[idx + w]) * 0.25;
      contrastMap[idx] = neighborhoodMean - center;
    }
  }

  return contrastMap;
}

// Builds RGB maps.
function buildRgbMaps(analysisImage, w, h) {
  const rMap = new Uint8Array(w * h);
  const gMap = new Uint8Array(w * h);
  const bMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const pixelIndex = idx * 4;
      rMap[idx] = analysisImage.pixels[pixelIndex];
      gMap[idx] = analysisImage.pixels[pixelIndex + 1];
      bMap[idx] = analysisImage.pixels[pixelIndex + 2];
    }
  }

  return { rMap, gMap, bMap };
}

// Builds the color delta map.
function buildColorDeltaMap(rMap, gMap, bMap, w, h) {
  const colorDeltaMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const avgR = (rMap[idx - 1] + rMap[idx + 1] + rMap[idx - w] + rMap[idx + w]) * 0.25;
      const avgG = (gMap[idx - 1] + gMap[idx + 1] + gMap[idx - w] + gMap[idx + w]) * 0.25;
      const avgB = (bMap[idx - 1] + bMap[idx + 1] + bMap[idx - w] + bMap[idx + w]) * 0.25;
      const dr = rMap[idx] - avgR;
      const dg = gMap[idx] - avgG;
      const db = bMap[idx] - avgB;
      colorDeltaMap[idx] = sqrt(dr * dr + dg * dg + db * db);
    }
  }

  return colorDeltaMap;
}

// Builds the region-grow field.
function buildRegionGrowField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const regionMask = buildRegionGrowMask(brightnessMap, contrastMap, w, h);

  strokePaths = buildPathsFromMask(regionMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES + 1
  });
  preparePathVariants(strokePaths);
}

// Builds the color-grow field.
function buildColorGrowField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const { rMap, gMap, bMap } = getRgbMaps();
  const colorDeltaMap = getColorDeltaMap();
  const colorMask = buildColorGrowMask(brightnessMap, contrastMap, colorDeltaMap, rMap, gMap, bMap, w, h);

  strokePaths = buildPathsFromMask(colorMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES + 1
  });
  preparePathVariants(strokePaths);
}

// Builds the color-boundary field.
function buildColorBoundaryField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const contrastMap = getLocalContrastMap();
  const { rMap, gMap, bMap } = getRgbMaps();
  const boundaryMask = buildColorBoundaryMask(brightnessMap, contrastMap, rMap, gMap, bMap, w, h);

  strokePaths = buildPathsFromMask(boundaryMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES
  });
  preparePathVariants(strokePaths);
}

// Builds the color-boundary field asynchronously.
async function buildColorBoundaryFieldAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = await getFilteredBrightnessMapAsync();
  const contrastMap = await getLocalContrastMapAsync();
  const { rMap, gMap, bMap } = await getRgbMapsAsync();
  const boundaryMask = await buildColorBoundaryMaskAsync(brightnessMap, contrastMap, rMap, gMap, bMap, w, h);

  strokePaths = await buildPathsFromMaskAsync(boundaryMask, w, h, {
    boundaryOnly: false,
    closePasses: MORPH_CLOSE_PASSES
  });
  await preparePathVariantsAsync(strokePaths);
}

// Builds the contour field.
function buildContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths);
}

// Builds the wave contour field.
function buildWaveContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "wave-contour" });
}

// Builds the wave shape field.
function buildWaveShapeField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "wave-shape" });
}

// Builds the rubber contour field.
function buildRubberContourField() {
  strokePaths = buildContourPaths();
  preparePathVariants(strokePaths, { variantMode: "rubber-contour" });
}
