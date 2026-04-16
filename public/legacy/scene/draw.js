// Stroke drawing, loading hints, and caption helpers.
// Draws the stroke figure frame.
function drawStrokeFigure(boilFrame) {
  image(getOrBuildCachedFrameLayer(boilFrame), 0, 0);
}

// Draws stroke paths.
function drawStrokePaths(paths, activeVariant, scaleX, scaleY, unit, inkStyle, contourThicknessScale = 1, target = null) {
  for (const path of paths) {
    const variant = path.variants[activeVariant];
    if (!variant || variant.points.length < 2) {
      continue;
    }

    for (let i = 1; i < variant.points.length; i += 1) {
      drawStrokeSegment(
        variant.points[i - 1],
        variant.points[i],
        path.averageRadius,
        variant.alphaScale,
        scaleX,
        scaleY,
        unit,
        inkStyle,
        contourThicknessScale,
        target
      );
    }

    if (path.closed && variant.points.length > 2) {
      drawStrokeSegment(
        variant.points[variant.points.length - 1],
        variant.points[0],
        path.averageRadius,
        variant.alphaScale,
        scaleX,
        scaleY,
        unit,
        inkStyle,
        contourThicknessScale,
        target
      );
    }
  }
}

// Builds path jitter variants asynchronously.
async function preparePathVariantsAsync(paths, options = {}) {
  const variantMode = options.variantMode || "default";
  const waveContour = variantMode === "wave-contour";
  const waveShape = variantMode === "wave-shape";
  const rubberContour = variantMode === "rubber-contour";

  for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
    if (pathIndex % 18 === 0) {
      await ensureAnalysisResponsive("正在生成路径抖动变体...");
    }
    const path = paths[pathIndex];
    path.variants = [];
    const totalLength = max(0.0001, measurePathLength(path.points, path.closed));
    const cumulativeLengths = buildCumulativeLengths(path.points);

    for (let variantIndex = 0; variantIndex < BOIL_VARIANTS; variantIndex += 1) {
      const points = [];

      for (let i = 0; i < path.points.length; i += 1) {
        if (i > 0 && i % 160 === 0) {
          await ensureAnalysisResponsive("正在细化路径抖动...");
        }
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

// Draws a stroke segment.
function drawStrokeSegment(
  pointA,
  pointB,
  averageRadius,
  alphaScale,
  scaleX,
  scaleY,
  unit,
  inkStyle,
  contourThicknessScale = 1,
  target = null
) {
  const weightValue = max(0.65, ((pointA.radius + pointB.radius) * 0.5) * unit * 0.9 * contourThicknessScale);
  const alphaValue =
    lerp(70, 122, constrain(averageRadius / 2.6, 0, 1)) * alphaScale * inkStyle.opacityScale;

  strokeTarget(target, inkStyle.color[0], inkStyle.color[1], inkStyle.color[2], constrain(alphaValue, 0, 255));
  strokeWeightTarget(target, weightValue);
  lineTarget(target, pointA.x * scaleX, pointA.y * scaleY, pointB.x * scaleX, pointB.y * scaleY);
}

// Draws the loading hint.
function drawLoadingHint() {
  noStroke();
  fill(60, 58, 54, 120);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.025);
  const fallbackText = appStatusState.analysisFailed
    ? "分析失败，请调整参数后重试"
    : appStatusState.analysisActive
      ? "正在分析图片..."
      : "loading source image...";
  text(fallbackText, width * 0.5, height * 0.5);
}

// Draws the canvas caption.
function drawCaption() {
  const colors = getPaperColors();
  const captionColor = computeCaptionColor(colors.base, colors.accent);
  noStroke();
  fill(captionColor[0], captionColor[1], captionColor[2], 118);
  textAlign(LEFT, TOP);
  textSize(min(width, height) * 0.015);

  const effectiveMode = getEffectiveRenderMode();
  const modeLabelByMode = {
    path: "centerline paths",
    "region-grow": "region grow",
    "color-grow": "color grow",
    "color-boundary": "color boundary",
    distortion: "svg distortion",
    "wave-contour": "wave contour",
    "wave-shape": "wave shape",
    "rubber-contour": "rubber contour",
    contour: "contour trace",
    "edge-fill": "edge fill"
  };
  const modeLabel = modeLabelByMode[effectiveMode] || "edge sampling";

}
