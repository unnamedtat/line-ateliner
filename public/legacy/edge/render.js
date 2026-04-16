// Edge pairing, frame caching, and edge drawing helpers.
// Pairs nearby edges.
function pairNearbyEdges(samples, w, h, pairThreshold) {
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

          if (
            normalGap < minNormalGap ||
            normalGap > maxNormalGap ||
            tangentGap > maxTangentGap
          ) {
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

// Creates a merged edge sample pair.
function createPairedEdgeSample(a, b, w, h) {
  const tangentAlignment = a.tx * b.tx + a.ty * b.ty < 0 ? -1 : 1;
  const tx = a.tx + b.tx * tangentAlignment;
  const ty = a.ty + b.ty * tangentAlignment;
  const tangentLength = max(0.0001, sqrt(tx * tx + ty * ty));
  const mergedTx = tx / tangentLength;
  const mergedTy = ty / tangentLength;

  const centerX = (a.sampleX + b.sampleX) * 0.5;
  const centerY = (a.sampleY + b.sampleY) * 0.5;
  const dx = b.sampleX - a.sampleX;
  const dy = b.sampleY - a.sampleY;
  const edgeSpan = abs(dx * a.nx + dy * a.ny);
  const averagedDarkness = (a.darkness + b.darkness) * 0.5;

  return {
    sampleX: centerX,
    sampleY: centerY,
    nxPos: centerX / w,
    nyPos: centerY / h,
    tx: mergedTx,
    ty: mergedTy,
    nx: -mergedTy,
    ny: mergedTx,
    strength: max(a.strength, b.strength),
    darkness: max(a.darkness, b.darkness),
    lengthValue: max(a.lengthValue, b.lengthValue) + edgeSpan * 0.2,
    weightValue: constrain(edgeSpan * 0.82 + lerp(0.18, 0.72, averagedDarkness), 1.15, 4.8),
    alphaValue: min(126, (a.alphaValue + b.alphaValue) * 0.55),
    seed: (a.seed + b.seed) * 0.5,
    pairMerged: true
  };
}

// Builds edge jitter variants.
function prepareEdgeVariants(samples, isHatch) {
  for (const sample of samples) {
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

// Draws the edge figure frame.
function drawEdgeFigure(boilFrame) {
  image(getOrBuildCachedFrameLayer(boilFrame), 0, 0);
}

// Gets or builds a cached frame layer.
function getOrBuildCachedFrameLayer(boilFrame) {
  const cacheMode = getRenderCacheModeKey();
  const sequenceIndex = getBoilSequenceIndex(boilFrame);
  const needsFreshCache =
    renderFrameCache.mode !== cacheMode ||
    renderFrameCache.width !== width ||
    renderFrameCache.height !== height;

  if (needsFreshCache) {
    clearRenderFrameCache();
    renderFrameCache.mode = cacheMode;
    renderFrameCache.width = width;
    renderFrameCache.height = height;
  }

  if (renderFrameCache.frames.has(sequenceIndex)) {
    return renderFrameCache.frames.get(sequenceIndex);
  }

  // Non-SVG modes only have a small number of boil states, so caching them once
  // keeps both playback and export from redrawing thousands of segments every frame.
  const frameLayer = createGraphics(width, height);
  frameLayer.clear();
  frameLayer.pixelDensity(1);
  frameLayer.strokeCap(ROUND);
  frameLayer.strokeJoin(ROUND);
  renderFrameToLayer(frameLayer, sequenceIndex);
  renderFrameCache.frames.set(sequenceIndex, frameLayer);
  return frameLayer;
}

// Renders a frame into a graphics layer.
function renderFrameToLayer(layer, sequenceIndex) {
  const { x: scaleX, y: scaleY, unit } = getSceneScale();
  const activeVariant = BOIL_SEQUENCE[sequenceIndex % BOIL_SEQUENCE.length];
  const inkStyle = getInkStrokeStyle();

  layer.push();
  layer.translate(sceneLayout.x, sceneLayout.y);
  if (isPathMode(settings.renderMode)) {
    const contourThicknessScale = getContourStrokeThicknessScale() * getGlobalLineWidthScale();
    drawStrokePaths(strokePaths, activeVariant, scaleX, scaleY, unit, inkStyle, contourThicknessScale, layer);
  } else {
    const echoVariant = BOIL_SEQUENCE[(sequenceIndex + 2) % BOIL_SEQUENCE.length];
    const globalLineWidthScale = getGlobalLineWidthScale();
    drawEdgeLayer(edgeSamples, activeVariant, echoVariant, unit, false, inkStyle, globalLineWidthScale, layer);
    drawEdgeLayer(hatchSamples, activeVariant, echoVariant, unit, true, inkStyle, globalLineWidthScale, layer);
  }
  layer.pop();
}

// Applies stroke color to the render target.
function strokeTarget(target, r, g, b, a) {
  if (target) {
    target.stroke(r, g, b, a);
    return;
  }
  stroke(r, g, b, a);
}

// Applies stroke weight to the render target.
function strokeWeightTarget(target, value) {
  if (target) {
    target.strokeWeight(value);
    return;
  }
  strokeWeight(value);
}

// Draws a line on the render target.
function lineTarget(target, x1, y1, x2, y2) {
  if (target) {
    target.line(x1, y1, x2, y2);
    return;
  }
  line(x1, y1, x2, y2);
}

// Draws one edge layer.
function drawEdgeLayer(samples, activeVariant, echoVariant, unit, isHatch, inkStyle, globalLineWidthScale = 1, target = null) {
  for (const sample of samples) {
    const variant = sample.variants?.[activeVariant];
    if (!variant || !variant.visible) {
      continue;
    }

    const baseX = sample.nxPos * sceneLayout.width;
    const baseY = sample.nyPos * sceneLayout.height;
    const normalMotionScale = sample.pairMerged ? 0.62 : 1;
    const tangentMotionScale = sample.pairMerged ? 0.92 : 1;
    const centerX =
      baseX +
      sample.nx * variant.normalOffset * unit * (0.72 + sample.darkness * 0.8) * normalMotionScale +
      sample.tx * variant.tangentOffset * unit * (0.6 + sample.strength * 0.55) * tangentMotionScale;
    const centerY =
      baseY +
      sample.ny * variant.normalOffset * unit * (0.72 + sample.darkness * 0.8) * normalMotionScale +
      sample.ty * variant.tangentOffset * unit * (0.6 + sample.strength * 0.55) * tangentMotionScale;

    const baseLength = sample.lengthValue * unit * (isHatch ? 0.74 : 1) * variant.lengthScale;
    const passes = isHatch || sample.pairMerged ? 1 : 2;

    for (let pass = 0; pass < passes; pass += 1) {
      const echo = sample.variants?.[echoVariant] || variant;
      const passDrift = pass === 0 ? 0 : echo.echoDrift * unit * 0.95;
      const x1 = centerX - sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y1 = centerY - sample.ty * baseLength * 0.5 + sample.ny * passDrift;
      const x2 = centerX + sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y2 = centerY + sample.ty * baseLength * 0.5 + sample.ny * passDrift;

      const alphaScale = variant.alphaScale * (isHatch ? 0.84 : sample.pairMerged ? 0.96 : 1 - pass * 0.22);
      const weightScale = variant.weightScale * (isHatch ? 1 : sample.pairMerged ? 1.08 : 1 - pass * 0.14);
      strokeTarget(
        target,
        inkStyle.color[0],
        inkStyle.color[1],
        inkStyle.color[2],
        constrain(sample.alphaValue * alphaScale * inkStyle.opacityScale, 0, 255)
      );
      strokeWeightTarget(target, max(0.3, sample.weightValue * unit * weightScale * globalLineWidthScale));
      lineTarget(target, x1, y1, x2, y2);
    }
  }
}
