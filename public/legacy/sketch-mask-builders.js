// Mask and contour path builders for contour-style modes.
// Builds contour paths from the current ink mask.
function buildContourPaths() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const mask = getInkMask();

  return buildPathsFromMask(mask, w, h, {
    boundaryOnly: true,
    closePasses: MORPH_CLOSE_PASSES
  });
}

// Builds contour paths asynchronously.
async function buildContourPathsAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const mask = await getInkMaskAsync();

  return buildPathsFromMaskAsync(mask, w, h, {
    boundaryOnly: true,
    closePasses: MORPH_CLOSE_PASSES
  });
}

// Builds stroke paths from a binary mask.
function buildPathsFromMask(mask, w, h, options = {}) {
  const closePasses = options.closePasses ?? MORPH_CLOSE_PASSES;
  const boundaryOnly = options.boundaryOnly ?? false;
  const closedMask = closeBinaryMask(mask, w, h, closePasses);
  const traceMask = boundaryOnly ? extractBoundaryMask(closedMask, w, h) : thinMask(closedMask, w, h, THINNING_MAX_ITERATIONS);
  const traceDistanceField = boundaryOnly
    ? buildConstantDistanceField(traceMask, 1.05)
    : computeDistanceField(closedMask, w, h);

  return buildStrokePaths(traceMask, traceDistanceField, w, h)
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);
}

// Builds stroke paths from a binary mask asynchronously.
async function buildPathsFromMaskAsync(mask, w, h, options = {}) {
  const closePasses = options.closePasses ?? MORPH_CLOSE_PASSES;
  const boundaryOnly = options.boundaryOnly ?? false;
  const closedMask = await closeBinaryMaskAsync(mask, w, h, closePasses);
  const traceMask = boundaryOnly
    ? extractBoundaryMask(closedMask, w, h)
    : await thinMaskAsync(closedMask, w, h, THINNING_MAX_ITERATIONS);
  const traceDistanceField = boundaryOnly
    ? buildConstantDistanceField(traceMask, 1.05)
    : await computeDistanceFieldAsync(closedMask, w, h);

  return (await buildStrokePathsAsync(traceMask, traceDistanceField, w, h))
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);
}

// Builds the region-grow mask.
function buildRegionGrowMask(brightnessMap, contrastMap, w, h) {
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const seedThreshold = settings.lineBrightnessThreshold;
  const expandThreshold = min(255, seedThreshold + 18);
  const contrastThreshold = max(2, settings.localContrastThreshold);
  const neighborDriftLimit = 34;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        brightnessMap[idx] < seedThreshold &&
        contrastMap[idx] > contrastThreshold * 0.42
      ) {
        queued[idx] = 1;
        queue[tail] = idx;
        tail += 1;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;

    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentContrast = contrastMap[idx];
    const currentIsInk =
      currentBrightness <= expandThreshold ||
      currentContrast >= contrastThreshold;
    if (!currentIsInk) {
      continue;
    }

    mask[idx] = 1;
    const x = idx % w;
    const y = floor(idx / w);

    for (const dir of NEIGHBOR_DIRS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) {
        continue;
      }

      const nIdx = ny * w + nx;
      if (queued[nIdx]) {
        continue;
      }

      const neighborBrightness = brightnessMap[nIdx];
      const neighborContrast = contrastMap[nIdx];
      if (
        (
          neighborBrightness <= expandThreshold ||
          neighborContrast >= contrastThreshold * 0.75
        ) &&
        abs(neighborBrightness - currentBrightness) <= neighborDriftLimit
      ) {
        queued[nIdx] = 1;
        queue[tail] = nIdx;
        tail += 1;
      }
    }
  }

  return mask;
}

// Builds the color-grow mask.
function buildColorGrowMask(brightnessMap, contrastMap, colorDeltaMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const seedBrightnessThreshold = settings.lineBrightnessThreshold;
  const expandBrightnessThreshold = min(255, seedBrightnessThreshold + 26);
  const contrastThreshold = max(2, settings.localContrastThreshold);
  const colorThreshold = settings.colorDistanceThreshold;
  const colorDriftLimit = max(10, colorThreshold * 1.35);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        brightnessMap[idx] < seedBrightnessThreshold ||
        (
          colorDeltaMap[idx] > colorThreshold &&
          contrastMap[idx] > contrastThreshold * 0.35
        )
      ) {
        queued[idx] = 1;
        queue[tail] = idx;
        tail += 1;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;

    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentColorDelta = colorDeltaMap[idx];
    const currentIsInk =
      currentBrightness <= expandBrightnessThreshold ||
      currentColorDelta >= colorThreshold * 0.72 ||
      contrastMap[idx] >= contrastThreshold;
    if (!currentIsInk) {
      continue;
    }

    mask[idx] = 1;
    const x = idx % w;
    const y = floor(idx / w);

    for (const dir of NEIGHBOR_DIRS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) {
        continue;
      }

      const nIdx = ny * w + nx;
      if (queued[nIdx]) {
        continue;
      }

      const dr = rMap[nIdx] - rMap[idx];
      const dg = gMap[nIdx] - gMap[idx];
      const db = bMap[nIdx] - bMap[idx];
      const neighborColorDrift = sqrt(dr * dr + dg * dg + db * db);

      if (
        neighborColorDrift <= colorDriftLimit &&
        (
          brightnessMap[nIdx] <= expandBrightnessThreshold ||
          colorDeltaMap[nIdx] >= colorThreshold * 0.55 ||
          contrastMap[nIdx] >= contrastThreshold * 0.72
        )
      ) {
        queued[nIdx] = 1;
        queue[tail] = nIdx;
        tail += 1;
      }
    }
  }

  return mask;
}

// Builds the color-boundary mask.
function buildColorBoundaryMask(brightnessMap, contrastMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const colorThreshold = settings.colorDistanceThreshold;
  const contrastThreshold = max(1, settings.localContrastThreshold * 0.55);
  const brightnessGuard = settings.lineBrightnessThreshold + 18;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;

      const horizontalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - 1, idx + 1);
      const verticalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w, idx + w);
      const diagADelta = colorDistanceBetween(rMap, gMap, bMap, idx - w - 1, idx + w + 1);
      const diagBDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w + 1, idx + w - 1);
      const strongestDelta = max(horizontalDelta, verticalDelta, diagADelta, diagBDelta);

      const isBoundary =
        strongestDelta >= colorThreshold &&
        (
          contrastMap[idx] >= contrastThreshold ||
          brightnessMap[idx] <= brightnessGuard
        );

      if (isBoundary) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

// Computes the color distance between two pixels.
function colorDistanceBetween(rMap, gMap, bMap, indexA, indexB) {
  const dr = rMap[indexA] - rMap[indexB];
  const dg = gMap[indexA] - gMap[indexB];
  const db = bMap[indexA] - bMap[indexB];
  return sqrt(dr * dr + dg * dg + db * db);
}

// Extracts only the boundary pixels from a mask.
function extractBoundaryMask(mask, w, h) {
  const boundaryMask = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const hasBackgroundNeighbor =
        !mask[idx - 1] ||
        !mask[idx + 1] ||
        !mask[idx - w] ||
        !mask[idx + w];

      if (hasBackgroundNeighbor) {
        boundaryMask[idx] = 1;
      }
    }
  }

  return boundaryMask;
}

// Builds a constant distance field.
function buildConstantDistanceField(mask, radiusValue) {
  const field = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      field[i] = radiusValue;
    }
  }
  return field;
}
