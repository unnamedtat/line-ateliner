// Path variant generation and contour stroke sizing helpers.
// Finalizes a traced path.
function finalizePath(indexPath, distanceField, w, h) {
  if (!indexPath || indexPath.length < MIN_PATH_PIXELS) {
    return null;
  }

  const closed = indexPath.length > 2 && indexPath[0] === indexPath[indexPath.length - 1];
  const trimmedPath = closed ? indexPath.slice(0, -1) : indexPath.slice();
  const points = trimmedPath.map((idx) => {
    const x = idx % w;
    const y = floor(idx / w);
    return {
      x: x + 0.5,
      y: y + 0.5,
      radius: max(0.7, distanceField[idx] * WIDTH_RESPONSE)
    };
  });

  const resampled = resamplePath(points, PATH_RESAMPLE_SPACING, closed);
  const smoothed = smoothPath(resampled, closed);
  const pathLength = measurePathLength(smoothed, closed);
  if (smoothed.length < 2 || pathLength < MIN_PATH_DRAW_LENGTH) {
    return null;
  }

  let radiusTotal = 0;
  for (const point of smoothed) {
    radiusTotal += point.radius;
  }

  return {
    points: smoothed,
    closed,
    averageRadius: radiusTotal / smoothed.length,
    drawScore: pathLength * (0.8 + radiusTotal / max(1, smoothed.length) * 0.35),
    seed: smoothed[0].x * 0.173 + smoothed[0].y * 0.291 + pathLength * 0.07,
    variants: []
  };
}

// Resamples a path by spacing.
function resamplePath(points, spacing, closed) {
  if (points.length < 2) {
    return points.slice();
  }

  const source = points.slice();
  if (closed) {
    source.push(points[0]);
  }

  const resampled = [copyPoint(source[0])];
  let accumulated = 0;

  for (let i = 1; i < source.length; i += 1) {
    let start = copyPoint(source[i - 1]);
    const end = source[i];
    let segmentLength = dist(start.x, start.y, end.x, end.y);

    if (segmentLength === 0) {
      continue;
    }

    while (accumulated + segmentLength >= spacing) {
      const ratio = (spacing - accumulated) / segmentLength;
      const nextPoint = {
        x: lerp(start.x, end.x, ratio),
        y: lerp(start.y, end.y, ratio),
        radius: lerp(start.radius, end.radius, ratio)
      };
      resampled.push(nextPoint);
      start = nextPoint;
      segmentLength = dist(start.x, start.y, end.x, end.y);
      accumulated = 0;
      if (segmentLength === 0) {
        break;
      }
    }

    accumulated += segmentLength;
  }

  if (!closed) {
    const lastPoint = source[source.length - 1];
    const currentLast = resampled[resampled.length - 1];
    if (dist(lastPoint.x, lastPoint.y, currentLast.x, currentLast.y) > spacing * 0.35) {
      resampled.push(copyPoint(lastPoint));
    }
  }

  if (closed && resampled.length > 2) {
    const lastPoint = resampled[resampled.length - 1];
    if (dist(lastPoint.x, lastPoint.y, resampled[0].x, resampled[0].y) < spacing * 0.7) {
      resampled.pop();
    }
  }

  return resampled;
}

// Smooths a path.
function smoothPath(points, closed) {
  let current = points.map(copyPoint);

  for (let pass = 0; pass < 2; pass += 1) {
    const next = current.map(copyPoint);
    for (let i = 0; i < current.length; i += 1) {
      const prevIndex = i === 0 ? (closed ? current.length - 1 : 0) : i - 1;
      const nextIndex = i === current.length - 1 ? (closed ? 0 : current.length - 1) : i + 1;
      const prev = current[prevIndex];
      const point = current[i];
      const following = current[nextIndex];

      if (!closed && (i === 0 || i === current.length - 1)) {
        next[i] = copyPoint(point);
        continue;
      }

      next[i] = {
        x: (prev.x + point.x * 2 + following.x) * 0.25,
        y: (prev.y + point.y * 2 + following.y) * 0.25,
        radius: (prev.radius + point.radius * 2 + following.radius) * 0.25
      };
    }
    current = next;
  }

  return current;
}

// Measures the path length.
function measurePathLength(points, closed) {
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }

  if (closed && points.length > 2) {
    total += dist(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y);
  }

  return total;
}

// Copies a path point.
function copyPoint(point) {
  return {
    x: point.x,
    y: point.y,
    radius: point.radius
  };
}

// Builds path jitter variants.
function preparePathVariants(paths, options = {}) {
  const variantMode = options.variantMode || "default";
  const waveContour = variantMode === "wave-contour";
  const waveShape = variantMode === "wave-shape";
  const rubberContour = variantMode === "rubber-contour";

  for (const path of paths) {
    path.variants = [];
    const totalLength = max(0.0001, measurePathLength(path.points, path.closed));
    const cumulativeLengths = buildCumulativeLengths(path.points);

    for (let variantIndex = 0; variantIndex < BOIL_VARIANTS; variantIndex += 1) {
      const points = [];

      for (let i = 0; i < path.points.length; i += 1) {
        const basePoint = path.points[i];
        const progress = cumulativeLengths[i] / totalLength;
        const tangent = getPathTangent(path.points, i, path.closed);
        const normal = { x: -tangent.y, y: tangent.x };
        const radiusScale = constrain(basePoint.radius / 2.4, 0.65, 1.25);
        let normalNoise;
        let tangentNoise;
        let shapeField = null;

        if (waveContour) {
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency"));
          const wavePhase = variantIndex * TWO_PI * lerp(0.08, 1.15, settings.waveSpeed / 100);
          const harmonicPhase = variantIndex * TWO_PI * lerp(0.03, 0.48, settings.waveSpeed / 100);
          const wavePrimary = sin(progress * TWO_PI * waveCycles + wavePhase);
          const waveSecondary = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.75) + harmonicPhase);
          const waveNoise = map(noise(progress * 2.6 + variantIndex * 1.7, path.seed * 0.23 + 60), 0, 1, -1, 1);
          normalNoise = wavePrimary * 0.72 + waveSecondary * 0.2 + waveNoise * 0.08;
          tangentNoise = map(
            noise(progress * 2.1 + variantIndex * 2.3, path.seed * 0.17 + 120),
            0,
            1,
            -1,
            1
          ) * 0.22;
        } else if (waveShape) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed);
          normalNoise = shapeField.dx * normal.x + shapeField.dy * normal.y;
          tangentNoise = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
        } else if (rubberContour) {
          shapeField = sampleSharedWaveField(basePoint.x, basePoint.y, variantIndex, path.seed * 0.61 + 37);
          const waveCycles = max(0.1, getTenthsSetting("waveFrequency") * 0.72);
          const softPhase = variantIndex * TWO_PI * lerp(0.05, 0.78, settings.waveSpeed / 100);
          const bounce = sin(progress * TWO_PI * waveCycles + softPhase + path.seed * 0.004);
          const squeeze = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.55) - softPhase * 0.7);
          const fieldNormal = shapeField.dx * normal.x + shapeField.dy * normal.y;
          const fieldTangent = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
          normalNoise = bounce * 0.46 + fieldNormal * 0.54;
          tangentNoise = squeeze * 0.16 + fieldTangent * 0.34;
        } else {
          normalNoise =
            map(noise(progress * 3.6 + variantIndex * 11.3, path.seed * 0.19), 0, 1, -1, 1) * 0.75 +
            map(noise(progress * 8.4 + variantIndex * 4.7, path.seed * 0.31 + 80), 0, 1, -1, 1) * 0.25;
          tangentNoise = map(
            noise(progress * 4.3 + variantIndex * 9.1, path.seed * 0.27 + 140),
            0,
            1,
            -1,
            1
          );
        }
        const widthNoise = map(
          noise(progress * 5.7 + variantIndex * 7.9, path.seed * 0.13 + 220),
          0,
          1,
          1 - getHundredthsSetting("widthJitter"),
          1 + getHundredthsSetting("widthJitter") * (rubberContour ? 1.18 : 1)
        );

        const normalAmplitude = waveContour
          ? getTenthsSetting("waveAmplitude")
          : waveShape
            ? getTenthsSetting("waveAmplitude") * 1.12
            : rubberContour
              ? getTenthsSetting("waveAmplitude") * 0.92
              : getTenthsSetting("pathJitterNormal");
        const tangentAmplitude = waveContour
          ? getTenthsSetting("edgeJitterTangent")
          : waveShape
            ? getTenthsSetting("edgeJitterTangent") * 0.72
            : rubberContour
              ? getTenthsSetting("edgeJitterTangent") * 0.9
              : getTenthsSetting("pathJitterTangent");

        points.push({
          x:
            basePoint.x +
            normal.x * normalNoise * normalAmplitude * radiusScale +
            tangent.x * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dx || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          y:
            basePoint.y +
            normal.y * normalNoise * normalAmplitude * radiusScale +
            tangent.y * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dy || 0) * getTenthsSetting("waveAmplitude") * 0.34 * radiusScale : 0),
          radius: basePoint.radius * widthNoise
        });
      }

      path.variants.push({
        points,
        alphaScale: lerp(0.92, 1.04, noise(path.seed * 0.11 + variantIndex * 3.7, 300))
      });
    }
  }
}

// Builds cumulative path lengths.
function buildCumulativeLengths(points) {
  const lengths = new Float32Array(points.length);
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    lengths[i] = total;
  }

  return lengths;
}

// Samples the shared wave field.
function sampleSharedWaveField(x, y, variantIndex, seed) {
  const longestSide = max(1, max(analysisState?.width || 1, analysisState?.height || 1));
  const spatialScale = (getTenthsSetting("waveFrequency") * TWO_PI) / longestSide;
  const speedMix = settings.waveSpeed / 100;
  const phase = variantIndex * TWO_PI * lerp(0.06, 1.1, speedMix);
  const wobblePhase = variantIndex * TWO_PI * lerp(0.03, 0.72, speedMix);
  const nx = x * spatialScale;
  const ny = y * spatialScale;

  const dx =
    sin(nx * 1.02 + ny * 0.34 + phase + seed * 0.0009) * 0.72 +
    sin(nx * 0.41 - ny * 0.88 + wobblePhase + seed * 0.0004) * 0.28;
  const dy =
    sin(ny * 0.97 - nx * 0.29 + phase * 0.92 + seed * 0.0007) * 0.7 +
    sin(nx * 0.76 + ny * 0.23 + wobblePhase * 1.07 + seed * 0.0003) * 0.3;

  return { dx, dy };
}

// Gets the tangent for a path point.
function getPathTangent(points, index, closed) {
  const prevIndex = index === 0 ? (closed ? points.length - 1 : 0) : index - 1;
  const nextIndex = index === points.length - 1 ? (closed ? 0 : points.length - 1) : index + 1;
  const prev = points[prevIndex];
  const next = points[nextIndex];
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const lengthValue = max(0.0001, sqrt(dx * dx + dy * dy));

  return {
    x: dx / lengthValue,
    y: dy / lengthValue
  };
}

// Gets the contour stroke thickness scale.
function getContourStrokeThicknessScale() {
  const effectiveMode = getEffectiveRenderMode();
  const isContourMode =
    effectiveMode === "contour" ||
    effectiveMode === "wave-contour" ||
    effectiveMode === "wave-shape" ||
    effectiveMode === "rubber-contour";

  if (!isContourMode) {
    return 1;
  }

  return constrain((settings.contourStrokeThickness ?? 100) / 100, 0.2, 4);
}
