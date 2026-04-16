// Edge mode builders and current mode routing.
// Gets cached raw edge candidates, rebuilding them only when extraction inputs change.
function getEdgeFieldCandidates() {
  const analysisImage = getAnalysisImage();
  const cacheKey = getEdgeFieldCacheKey();
  if (!analysisImage) {
    return {
      candidateEdges: [],
      candidateHatches: []
    };
  }

  if (edgeFieldCache.key === cacheKey) {
    return edgeFieldCache;
  }

  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = getFilteredBrightnessMap();
  const candidateEdges = [];
  const candidateHatches = [];

  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const center = brightnessMap[y * w + x];
      const left = brightnessMap[y * w + x - 1];
      const right = brightnessMap[y * w + x + 1];
      const up = brightnessMap[(y - 1) * w + x];
      const down = brightnessMap[(y + 1) * w + x];
      const darkness = 255 - center;

      const sobelX =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * left -
        brightnessMap[(y + 1) * w + x - 1] +
        brightnessMap[(y - 1) * w + x + 1] +
        2 * right +
        brightnessMap[(y + 1) * w + x + 1];

      const sobelY =
        -brightnessMap[(y - 1) * w + x - 1] -
        2 * up -
        brightnessMap[(y - 1) * w + x + 1] +
        brightnessMap[(y + 1) * w + x - 1] +
        2 * down +
        brightnessMap[(y + 1) * w + x + 1];

      const edgeStrength = sqrt(sobelX * sobelX + sobelY * sobelY) * 0.25;
      const neighborhoodMean = (left + right + up + down) * 0.25;
      const isDarkCenter =
        center < settings.lineBrightnessThreshold &&
        center + 6 < neighborhoodMean;
      const support =
        Number(left < 236) +
        Number(right < 236) +
        Number(up < 236) +
        Number(down < 236);

      if (!isDarkCenter && edgeStrength < settings.edgeThreshold) {
        continue;
      }

      if (support < 2 && darkness < 24 && edgeStrength < settings.edgeThreshold * 1.3) {
        continue;
      }

      const keepNoise = noise(x * 0.034, y * 0.034);
      const keepChance = constrain(
        map(edgeStrength + darkness * 0.65, settings.edgeThreshold, 210, 0.18, 0.92),
        0.14,
        0.92
      );
      if (keepNoise > keepChance) {
        continue;
      }

      const tangentAngle = atan2(sobelY, sobelX) + HALF_PI;
      const tx = cos(tangentAngle);
      const ty = sin(tangentAngle);
      const nx = -ty;
      const ny = tx;
      const strength = constrain(map(edgeStrength, settings.edgeThreshold, 160, 0, 1), 0, 1);
      const lengthValue = isDarkCenter
        ? lerp(2.8, 7.8, darkness / 255)
        : lerp(3.2, 8.8, strength);

      candidateEdges.push({
        sampleX: x,
        sampleY: y,
        nxPos: x / w,
        nyPos: y / h,
        tx,
        ty,
        nx,
        ny,
        strength,
        darkness: darkness / 255,
        lengthValue,
        weightValue: lerp(0.5, 1.9, darkness / 255),
        alphaValue: lerp(42, 110, constrain(strength * 0.8 + darkness / 255 * 0.6, 0, 1)),
        seed: x * 0.173 + y * 0.291,
        pairMerged: false
      });

      if (darkness > 24 && support >= 3 && noise(x * 0.05 + 60, y * 0.05 + 60) > 0.7) {
        candidateHatches.push({
          nxPos: x / w,
          nyPos: y / h,
          tx,
          ty,
          nx,
          ny,
          strength,
          darkness: darkness / 255,
          lengthValue: lengthValue * 0.82,
          weightValue: lerp(0.35, 0.95, darkness / 255),
          alphaValue: lerp(22, 58, darkness / 255),
          seed: x * 0.111 + y * 0.149,
          pairMerged: false
        });
      }
    }
  }

  candidateEdges.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  candidateHatches.sort((a, b) => b.darkness - a.darkness);

  edgeFieldCache = {
    key: cacheKey,
    candidateEdges,
    candidateHatches
  };

  return edgeFieldCache;
}

// Builds the edge field output.
function buildEdgeField(useFillMerge) {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const { candidateEdges, candidateHatches } = getEdgeFieldCandidates();

  edgeSamples = useFillMerge
    ? pairNearbyEdges(candidateEdges, w, h, getTenthsSetting("edgeFillThreshold")).slice(0, MAX_EDGE_SAMPLES)
    : candidateEdges.slice(0, MAX_EDGE_SAMPLES);
  hatchSamples = useFillMerge ? [] : candidateHatches.slice(0, MAX_HATCH_SAMPLES);

  prepareEdgeVariants(edgeSamples, false);
  prepareEdgeVariants(hatchSamples, true);
}

// Builds output for the current render mode.
function buildCurrentModeOutput() {
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];

  if (!sceneLayout || !analysisState) {
    return;
  }

  const effectiveMode = getEffectiveRenderMode();

  if (effectiveMode === "path") {
    buildStrokeField();
  } else if (effectiveMode === "region-grow") {
    buildRegionGrowField();
  } else if (effectiveMode === "color-grow") {
    buildColorGrowField();
  } else if (effectiveMode === "color-boundary") {
    buildColorBoundaryField();
  } else if (effectiveMode === "wave-contour") {
    buildWaveContourField();
  } else if (effectiveMode === "wave-shape") {
    buildWaveShapeField();
  } else if (effectiveMode === "rubber-contour") {
    buildRubberContourField();
  } else if (effectiveMode === "contour") {
    buildContourField();
  } else {
    buildEdgeField(effectiveMode === "edge-fill");
  }
}
