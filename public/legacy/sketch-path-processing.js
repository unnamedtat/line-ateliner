// Ink mask processing, morphology, distance fields, and thinning.
// Builds the stroke field.
function buildStrokeField() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const inkMask = getInkMask();
  const closedMask = closeBinaryMask(inkMask, w, h, MORPH_CLOSE_PASSES);
  const distanceField = computeDistanceField(closedMask, w, h);
  const skeletonMask = thinMask(closedMask, w, h, THINNING_MAX_ITERATIONS);

  strokePaths = buildStrokePaths(skeletonMask, distanceField, w, h)
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);

  preparePathVariants(strokePaths);
}

// Builds the stroke field asynchronously.
async function buildStrokeFieldAsync() {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const inkMask = await getInkMaskAsync();
  const closedMask = await closeBinaryMaskAsync(inkMask, w, h, MORPH_CLOSE_PASSES);
  const distanceField = await computeDistanceFieldAsync(closedMask, w, h);
  const skeletonMask = await thinMaskAsync(closedMask, w, h, THINNING_MAX_ITERATIONS);

  strokePaths = (await buildStrokePathsAsync(skeletonMask, distanceField, w, h))
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);

  await preparePathVariantsAsync(strokePaths);
}

// Builds the ink mask.
function buildInkMask(brightnessMap, w, h) {
  const mask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const center = brightnessMap[idx];

      let localTotal = 0;
      let localCount = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          localTotal += brightnessMap[(y + offsetY) * w + x + offsetX];
          localCount += 1;
        }
      }

      const localMean = localTotal / localCount;
      const isInk =
        center < settings.inkBrightnessThreshold ||
        center + settings.localContrastThreshold < localMean;

      if (isInk) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

// Closes a binary mask.
function closeBinaryMask(mask, w, h, passes) {
  let current = mask.slice();

  for (let pass = 0; pass < passes; pass += 1) {
    current = dilateMask(current, w, h);
    current = erodeMask(current, w, h);
  }

  return current;
}

// Closes a binary mask asynchronously.
async function closeBinaryMaskAsync(mask, w, h, passes) {
  let current = mask.slice();

  for (let pass = 0; pass < passes; pass += 1) {
    current = await dilateMaskAsync(current, w, h);
    current = await erodeMaskAsync(current, w, h);
  }

  return current;
}

// Dilates a binary mask.
function dilateMask(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      let hasInk = 0;
      for (let offsetY = -1; offsetY <= 1 && !hasInk; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (mask[(y + offsetY) * w + x + offsetX]) {
            hasInk = 1;
            break;
          }
        }
      }
      output[y * w + x] = hasInk;
    }
  }

  return output;
}

// Dilates a binary mask asynchronously.
async function dilateMaskAsync(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在扩张线条区域...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      let hasInk = 0;
      for (let offsetY = -1; offsetY <= 1 && !hasInk; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (mask[(y + offsetY) * w + x + offsetX]) {
            hasInk = 1;
            break;
          }
        }
      }
      output[y * w + x] = hasInk;
    }
  }

  return output;
}

// Erodes a binary mask.
function erodeMask(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      let inkNeighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          inkNeighbors += mask[(y + offsetY) * w + x + offsetX];
        }
      }
      output[y * w + x] = inkNeighbors >= 5 ? 1 : 0;
    }
  }

  return output;
}

// Erodes a binary mask asynchronously.
async function erodeMaskAsync(mask, w, h) {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在收缩线条区域...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      let inkNeighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          inkNeighbors += mask[(y + offsetY) * w + x + offsetX];
        }
      }
      output[y * w + x] = inkNeighbors >= 5 ? 1 : 0;
    }
  }

  return output;
}

// Computes the distance field.
function computeDistanceField(mask, w, h) {
  const distanceField = new Float32Array(mask.length);
  const largeValue = 1e6;

  for (let i = 0; i < mask.length; i += 1) {
    distanceField[i] = mask[i] ? largeValue : 0;
  }

  for (let y = 1; y < h; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx - 1] + 1,
        distanceField[idx - w] + 1,
        distanceField[idx - w - 1] + Math.SQRT2,
        distanceField[idx - w + 1] + Math.SQRT2
      );
    }
  }

  for (let y = h - 2; y >= 0; y -= 1) {
    for (let x = w - 2; x >= 1; x -= 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx + 1] + 1,
        distanceField[idx + w] + 1,
        distanceField[idx + w + 1] + Math.SQRT2,
        distanceField[idx + w - 1] + Math.SQRT2
      );
    }
  }

  return distanceField;
}

// Computes the distance field asynchronously.
async function computeDistanceFieldAsync(mask, w, h) {
  const distanceField = new Float32Array(mask.length);
  const largeValue = 1e6;

  for (let i = 0; i < mask.length; i += 1) {
    if (i % 12000 === 0) {
      await ensureAnalysisResponsive("正在计算笔触宽度场...");
    }
    distanceField[i] = mask[i] ? largeValue : 0;
  }

  for (let y = 1; y < h; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在传播距离场...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx - 1] + 1,
        distanceField[idx - w] + 1,
        distanceField[idx - w - 1] + Math.SQRT2,
        distanceField[idx - w + 1] + Math.SQRT2
      );
    }
  }

  for (let y = h - 2; y >= 0; y -= 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在回填距离场...");
    }
    for (let x = w - 2; x >= 1; x -= 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      distanceField[idx] = min(
        distanceField[idx],
        distanceField[idx + 1] + 1,
        distanceField[idx + w] + 1,
        distanceField[idx + w + 1] + Math.SQRT2,
        distanceField[idx + w - 1] + Math.SQRT2
      );
    }
  }

  return distanceField;
}

// Thins a binary mask.
function thinMask(mask, w, h, maxIterations) {
  const current = mask.slice();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const changedFirst = thinningPass(current, w, h, true);
    const changedSecond = thinningPass(current, w, h, false);
    if (!changedFirst && !changedSecond) {
      break;
    }
  }

  return current;
}

// Thins a binary mask asynchronously.
async function thinMaskAsync(mask, w, h, maxIterations) {
  const current = mask.slice();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    await ensureAnalysisResponsive(`正在细化中心线... ${iteration + 1}/${maxIterations}`);
    const changedFirst = await thinningPassAsync(current, w, h, true);
    const changedSecond = await thinningPassAsync(current, w, h, false);
    if (!changedFirst && !changedSecond) {
      break;
    }
  }

  return current;
}
