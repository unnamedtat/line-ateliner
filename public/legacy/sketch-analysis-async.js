// Asynchronous analysis map builders and cache readers.
// Builds the brightness map asynchronously.
async function buildBrightnessMapAsync(analysisImage, w, h) {
  const brightnessMap = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在计算亮度图...");
    }
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

// Blurs a scalar map asynchronously.
async function blurScalarMapAsync(sourceMap, w, h) {
  const blurred = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在平滑图像采样...");
    }
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

// Builds the local contrast map asynchronously.
async function buildLocalContrastMapAsync(brightnessMap, w, h) {
  const contrastMap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在计算局部对比...");
    }
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

// Builds RGB maps asynchronously.
async function buildRgbMapsAsync(analysisImage, w, h) {
  const rMap = new Uint8Array(w * h);
  const gMap = new Uint8Array(w * h);
  const bMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y += 1) {
    if (y % 24 === 0) {
      await ensureAnalysisResponsive("正在读取颜色通道...");
    }
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

// Builds the ink mask asynchronously.
async function buildInkMaskAsync(brightnessMap, w, h) {
  const mask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在提取墨线区域...");
    }
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

// Gets the brightness map asynchronously.
async function getBrightnessMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.brightnessMap) {
    return cache.brightnessMap;
  }

  const brightnessMap = await buildBrightnessMapAsync(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.brightnessMap = brightnessMap;
  }
  return brightnessMap;
}

// Gets the filtered brightness map asynchronously.
async function getFilteredBrightnessMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.filteredBrightnessMaps?.has(smoothPasses)) {
    return cache.filteredBrightnessMaps.get(smoothPasses);
  }

  let brightnessMap = await getBrightnessMapAsync();
  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = await blurScalarMapAsync(brightnessMap, analysisImage.width, analysisImage.height);
  }

  if (cache?.filteredBrightnessMaps) {
    cache.filteredBrightnessMaps.set(smoothPasses, brightnessMap);
  }
  return brightnessMap;
}

// Gets the local contrast map asynchronously.
async function getLocalContrastMapAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  const smoothPasses = max(0, floor(settings.edgeSmoothness || 0));
  if (!analysisImage) {
    return new Float32Array();
  }
  if (cache?.localContrastMaps?.has(smoothPasses)) {
    return cache.localContrastMaps.get(smoothPasses);
  }

  const contrastMap = await buildLocalContrastMapAsync(
    await getFilteredBrightnessMapAsync(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache?.localContrastMaps) {
    cache.localContrastMaps.set(smoothPasses, contrastMap);
  }
  return contrastMap;
}

// Gets the RGB maps asynchronously.
async function getRgbMapsAsync() {
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

  const rgbMaps = await buildRgbMapsAsync(analysisImage, analysisImage.width, analysisImage.height);
  if (cache) {
    cache.rgbMaps = rgbMaps;
  }
  return rgbMaps;
}

// Gets the ink mask asynchronously.
async function getInkMaskAsync() {
  const analysisImage = getAnalysisImage();
  const cache = getAnalysisCache();
  if (!analysisImage) {
    return new Uint8Array();
  }
  if (cache?.inkMask) {
    return cache.inkMask;
  }

  const inkMask = await buildInkMaskAsync(
    await getFilteredBrightnessMapAsync(),
    analysisImage.width,
    analysisImage.height
  );
  if (cache) {
    cache.inkMask = inkMask;
  }
  return inkMask;
}
