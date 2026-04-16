// Asynchronous edge pairing and edge field builders.
// Builds the color-boundary mask asynchronously.
async function buildColorBoundaryMaskAsync(brightnessMap, contrastMap, rMap, gMap, bMap, w, h) {
  const mask = new Uint8Array(w * h);
  const colorThreshold = settings.colorDistanceThreshold;
  const contrastThreshold = max(1, settings.localContrastThreshold * 0.55);
  const brightnessGuard = settings.lineBrightnessThreshold + 18;

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在检测色块边界...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;

      const horizontalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - 1, idx + 1);
      const verticalDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w, idx + w);
      const diagADelta = colorDistanceBetween(rMap, gMap, bMap, idx - w - 1, idx + w + 1);
      const diagBDelta = colorDistanceBetween(rMap, gMap, bMap, idx - w + 1, idx + w - 1);
      const strongestDelta = max(horizontalDelta, verticalDelta, diagADelta, diagBDelta);

      const isBoundary =
        strongestDelta >= colorThreshold &&
        (contrastMap[idx] >= contrastThreshold || brightnessMap[idx] <= brightnessGuard);

      if (isBoundary) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

// Pairs nearby edges asynchronously.
async function pairNearbyEdgesAsync(samples, w, h, pairThreshold) {
  const buckets = new Map();
  const used = new Uint8Array(samples.length);
  const pairedSamples = [];
  const pairCellSize = max(1, floor(settings.edgeFillCellSize));
  const minNormalGap = min(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxNormalGap = max(getTenthsSetting("edgeFillMinNormalGap"), getTenthsSetting("edgeFillMaxNormalGap"));
  const maxTangentGap = max(0, getTenthsSetting("edgeFillMaxTangentGap"));
  const minTangentDot = constrain(getHundredthsSetting("edgeFillMinTangentDot"), 0, 1);
  const maxNormalDot = constrain(getHundredthsSetting("edgeFillMaxNormalDot"), -1, 1);

  for (let i = 0; i < samples.length; i += 1) {
    if (i % 400 === 0) {
      await ensureAnalysisResponsive("正在整理边缘配对...");
    }
    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    const key = `${cellX},${cellY}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(i);
  }

  for (let i = 0; i < samples.length; i += 1) {
    if (i % 160 === 0) {
      await ensureAnalysisResponsive("正在匹配双侧边缘...");
    }
    if (used[i]) {
      continue;
    }

    const sample = samples[i];
    const cellX = floor(sample.sampleX / pairCellSize);
    const cellY = floor(sample.sampleY / pairCellSize);
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const bucket = buckets.get(`${cellX + offsetX},${cellY + offsetY}`);
        if (!bucket) {
          continue;
        }

        for (const candidateIndex of bucket) {
          if (candidateIndex === i || used[candidateIndex]) {
            continue;
          }

          const other = samples[candidateIndex];
          const tangentDot = abs(sample.tx * other.tx + sample.ty * other.ty);
          if (tangentDot < minTangentDot) {
            continue;
          }

          const normalDot = sample.nx * other.nx + sample.ny * other.ny;
          if (normalDot > maxNormalDot) {
            continue;
          }

          const dx = other.sampleX - sample.sampleX;
          const dy = other.sampleY - sample.sampleY;
          const tangentGap = abs(dx * sample.tx + dy * sample.ty);
          const normalGap = abs(dx * sample.nx + dy * sample.ny);

          if (normalGap < minNormalGap || normalGap > maxNormalGap || tangentGap > maxTangentGap) {
            continue;
          }

          const score =
            tangentDot * 2.1 +
            (-normalDot) * 1.4 -
            tangentGap * 0.3 -
            abs(normalGap - 2.8) * 0.18 +
            min(sample.darkness, other.darkness) * 0.35;
          if (score > bestScore) {
            bestScore = score;
            bestIndex = candidateIndex;
          }
        }
      }
    }

    if (bestIndex === -1 || bestScore < pairThreshold) {
      used[i] = 1;
      pairedSamples.push(sample);
      continue;
    }

    used[i] = 1;
    used[bestIndex] = 1;
    pairedSamples.push(createPairedEdgeSample(sample, samples[bestIndex], w, h));
  }

  pairedSamples.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  return pairedSamples;
}

// Builds edge jitter variants asynchronously.
async function prepareEdgeVariantsAsync(samples, isHatch) {
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    if (sampleIndex % 240 === 0) {
      await ensureAnalysisResponsive("正在生成边缘抖动变体...");
    }
    const sample = samples[sampleIndex];
    const gridX = floor(sample.nxPos * 28);
    const gridY = floor(sample.nyPos * 42);
    sample.variants = [];

    for (let variant = 0; variant < BOIL_VARIANTS; variant += 1) {
      const clusterNormal = map(
        noise(gridX * 0.23 + variant * 3.1, gridY * 0.17 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const clusterTangent = map(
        noise(gridX * 0.19 + variant * 4.3, gridY * 0.21 + 80 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const localNormal = map(noise(sample.seed * 0.31 + variant * 7.3, 10), 0, 1, -1, 1);
      const localTangent = map(noise(sample.seed * 0.27 + variant * 6.1, 40), 0, 1, -1, 1);
      const lengthScale = lerp(0.9, 1.08, noise(sample.seed * 0.23 + variant * 8.1, 90));
      const alphaScale = lerp(0.88, 1.06, noise(sample.seed * 0.17 + variant * 5.9, 140));
      const weightScale = lerp(0.86, 1.14, noise(sample.seed * 0.11 + variant * 9.7, 180));
      const echoDrift = map(noise(sample.seed * 0.07 + variant * 4.7, 220), 0, 1, -1, 1);

      sample.variants.push({
        normalOffset:
          (clusterNormal * 0.72 + localNormal * 0.28) * getTenthsSetting("edgeJitterNormal"),
        tangentOffset:
          (clusterTangent * 0.65 + localTangent * 0.35) * getTenthsSetting("edgeJitterTangent"),
        lengthScale,
        alphaScale,
        weightScale,
        echoDrift,
        visible: isHatch
          ? noise(sample.seed * 0.13 + variant * 5.1, 260) > 0.24
          : noise(sample.seed * 0.09 + variant * 3.7, 260) > 0.05
      });
    }
  }
}

// Builds the edge field asynchronously.
async function buildEdgeFieldAsync(useFillMerge) {
  const analysisImage = getAnalysisImage();
  const w = analysisImage.width;
  const h = analysisImage.height;
  const brightnessMap = await getFilteredBrightnessMapAsync();
  const candidateEdges = [];
  const candidateHatches = [];

  for (let y = 1; y < h - 1; y += 2) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在扫描边缘候选...");
    }
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
      const isDarkCenter = center < settings.lineBrightnessThreshold && center + 6 < neighborhoodMean;
      const support = Number(left < 236) + Number(right < 236) + Number(up < 236) + Number(down < 236);

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
      const lengthValue = isDarkCenter ? lerp(2.8, 7.8, darkness / 255) : lerp(3.2, 8.8, strength);

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

      if (!useFillMerge && darkness > 24 && support >= 3 && noise(x * 0.05 + 60, y * 0.05 + 60) > 0.7) {
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

  edgeSamples = useFillMerge
    ? (await pairNearbyEdgesAsync(candidateEdges, w, h, getTenthsSetting("edgeFillThreshold"))).slice(0, MAX_EDGE_SAMPLES)
    : candidateEdges.slice(0, MAX_EDGE_SAMPLES);
  hatchSamples = useFillMerge ? [] : candidateHatches.slice(0, MAX_HATCH_SAMPLES);

  await prepareEdgeVariantsAsync(edgeSamples, false);
  await prepareEdgeVariantsAsync(hatchSamples, true);
}

// Builds output for the current render mode asynchronously.
async function buildCurrentModeOutputAsync() {
  edgeSamples = [];
  hatchSamples = [];
  strokePaths = [];

  if (!sceneLayout || !analysisState) {
    return;
  }

  const effectiveMode = getEffectiveRenderMode();

  if (effectiveMode === "path") {
    await buildStrokeFieldAsync();
  } else if (effectiveMode === "color-boundary") {
    await buildColorBoundaryFieldAsync();
  } else if (effectiveMode === "wave-contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "wave-contour" });
  } else if (effectiveMode === "wave-shape") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "wave-shape" });
  } else if (effectiveMode === "rubber-contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths, { variantMode: "rubber-contour" });
  } else if (effectiveMode === "contour") {
    strokePaths = await buildContourPathsAsync();
    await preparePathVariantsAsync(strokePaths);
  } else {
    await buildEdgeFieldAsync(effectiveMode === "edge-fill");
  }
}
