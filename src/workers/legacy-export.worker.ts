type EdgeVariant = {
  normalOffset: number;
  tangentOffset: number;
  lengthScale: number;
  alphaScale: number;
  weightScale: number;
  echoDrift: number;
  visible: boolean;
};

type EdgeSample = {
  nxPos: number;
  nyPos: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  strength: number;
  darkness: number;
  lengthValue: number;
  weightValue: number;
  alphaValue: number;
  pairMerged: boolean;
  variants?: EdgeVariant[];
};

type PathPoint = {
  x: number;
  y: number;
  radius: number;
};

type PathVariant = {
  points: PathPoint[];
  alphaScale: number;
};

type StrokePath = {
  points: PathPoint[];
  closed: boolean;
  averageRadius: number;
  variants: PathVariant[];
};

type ComposeFrameRequest = {
  id: number;
  kind: "compose-frame";
  width: number;
  height: number;
  baseFrame: ImageBitmap;
  distortionSvgMarkup?: string;
  textureBitmap?: ImageBitmap | null;
  textureOpacity?: number;
};

type RenderFrameRequest = {
  id: number;
  kind: "render-frame";
  width: number;
  height: number;
  mode: string;
  frameValue: number;
  settings: Record<string, number | string | boolean>;
  sourceSize: {
    width: number;
    height: number;
  };
  analysisSize: {
    width: number;
    height: number;
  };
  edgeSamples: EdgeSample[];
  hatchSamples: EdgeSample[];
  strokePaths: StrokePath[];
  sourceBitmap?: ImageBitmap | null;
  distortionSvgMarkup?: string;
  textureBitmap?: ImageBitmap | null;
  textureOpacity?: number;
};

type WorkerRequest = ComposeFrameRequest | RenderFrameRequest;

type WorkerSuccessResponse = {
  id: number;
  kind: WorkerRequest["kind"];
  ok: true;
  bitmap: ImageBitmap;
};

type WorkerFailureResponse = {
  id: number;
  kind: WorkerRequest["kind"];
  ok: false;
  error: string;
};

const BOIL_SEQUENCE = [0, 0, 1, 1, 2, 2, 1, 1, 3, 3, 1, 1];

function max(...values: number[]) {
  return Math.max(...values);
}

function min(...values: number[]) {
  return Math.min(...values);
}

function floor(value: number) {
  return Math.floor(value);
}

function round(value: number) {
  return Math.round(value);
}

function abs(value: number) {
  return Math.abs(value);
}

function sqrt(value: number) {
  return Math.sqrt(value);
}

function cos(value: number) {
  return Math.cos(value);
}

function sin(value: number) {
  return Math.sin(value);
}

function constrain(value: number, lower: number, upper: number) {
  return Math.min(Math.max(value, lower), upper);
}

function lerp(start: number, stop: number, amount: number) {
  return start + (stop - start) * amount;
}

function createSizedCanvas(width: number, height: number) {
  return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
}

function hexToRgb(hex: string) {
  const normalized = String(hex || "").replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  return [
    Number.parseInt(value.slice(0, 2) || "00", 16),
    Number.parseInt(value.slice(2, 4) || "00", 16),
    Number.parseInt(value.slice(4, 6) || "00", 16)
  ];
}

function rgbToCss(rgb: number[], alpha = 1) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function getPaperColors(settings: Record<string, number | string | boolean>) {
  return {
    base: hexToRgb(String(settings.paperColor || "#ffffff")),
    accent: hexToRgb(String(settings.paperAccentColor || "#efe3cd"))
  };
}

function getInkStrokeStyle(settings: Record<string, number | string | boolean>) {
  return {
    color: hexToRgb(String(settings.inkColor || "#2c2b28")),
    opacityScale: constrain(Number(settings.inkOpacity || 100) / 100, 0, 1)
  };
}

function getSceneLayout(
  exportWidth: number,
  exportHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  settings: Record<string, number | string | boolean>
) {
  const margin = min(exportWidth, exportHeight) * 0.07;
  const imageAspect = sourceWidth / max(1, sourceHeight);
  let drawWidth = exportWidth - margin * 2;
  let drawHeight = drawWidth / imageAspect;

  if (drawHeight > exportHeight - margin * 2) {
    drawHeight = exportHeight - margin * 2;
    drawWidth = drawHeight * imageAspect;
  }

  const scaleFactor = max(0.05, Number(settings.sceneScale || 100) / 100);
  drawWidth *= scaleFactor;
  drawHeight *= scaleFactor;
  const offsetX = (Number(settings.sceneOffsetX || 0) / 100) * exportWidth;
  const offsetY = (Number(settings.sceneOffsetY || 0) / 100) * exportHeight;

  return {
    x: (exportWidth - drawWidth) * 0.5 + offsetX,
    y: (exportHeight - drawHeight) * 0.5 + offsetY,
    width: drawWidth,
    height: drawHeight
  };
}

function getSceneScale(
  sceneLayout: { width: number; height: number },
  analysisWidth: number,
  analysisHeight: number
) {
  const scaleX = sceneLayout.width / max(1, analysisWidth);
  const scaleY = sceneLayout.height / max(1, analysisHeight);
  return {
    x: scaleX,
    y: scaleY,
    unit: min(scaleX, scaleY)
  };
}

function getBoilSequenceIndex(frameValue: number, settings: Record<string, number | string | boolean>) {
  const holdFrames = max(1, round(Number(settings.boilHoldFrames || 1)));
  const boilFrame = floor(frameValue / holdFrames);
  return ((boilFrame % BOIL_SEQUENCE.length) + BOIL_SEQUENCE.length) % BOIL_SEQUENCE.length;
}

async function bitmapFromSvgMarkup(svgMarkup: string) {
  const blob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8"
  });
  return createImageBitmap(blob);
}

function drawPaperBase(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  settings: Record<string, number | string | boolean>
) {
  const colors = getPaperColors(settings);
  ctx.clearRect(0, 0, width, height);

  if (settings.paperFillMode === "gradient") {
    const angle = (Number(settings.paperGradientAngle || 0) * Math.PI) / 180;
    const dirX = cos(angle);
    const dirY = sin(angle);
    const span = abs(width * dirX) + abs(height * dirY);
    const halfSpan = max(1, span * 0.5);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const gradient = ctx.createLinearGradient(
      centerX - dirX * halfSpan,
      centerY - dirY * halfSpan,
      centerX + dirX * halfSpan,
      centerY + dirY * halfSpan
    );
    gradient.addColorStop(0, rgbToCss(colors.base));
    gradient.addColorStop(1, rgbToCss(colors.accent));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = rgbToCss(colors.base);
  ctx.fillRect(0, 0, width, height);
}

function drawReferenceOverlay(
  ctx: OffscreenCanvasRenderingContext2D,
  sourceBitmap: ImageBitmap,
  sceneLayout: { x: number; y: number; width: number; height: number },
  settings: Record<string, number | string | boolean>
) {
  ctx.save();
  ctx.globalAlpha = constrain(Number(settings.referenceOverlayOpacity || 0) / 100, 0, 1);
  ctx.drawImage(sourceBitmap, sceneLayout.x, sceneLayout.y, sceneLayout.width, sceneLayout.height);
  ctx.restore();
}

function drawStrokePathsToContext(
  ctx: OffscreenCanvasRenderingContext2D,
  strokePaths: StrokePath[],
  activeVariant: number,
  scaleX: number,
  scaleY: number,
  unit: number,
  inkStyle: { color: number[]; opacityScale: number },
  contourThicknessScale: number
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const path of strokePaths) {
    const variant = path.variants?.[activeVariant];
    if (!variant || variant.points.length < 2) {
      continue;
    }

    ctx.strokeStyle = rgbToCss(
      inkStyle.color,
      constrain(
        lerp(70, 122, constrain(path.averageRadius / 2.6, 0, 1)) *
          variant.alphaScale *
          inkStyle.opacityScale,
        0,
        255
      ) / 255
    );

    for (let i = 1; i < variant.points.length; i += 1) {
      const pointA = variant.points[i - 1];
      const pointB = variant.points[i];
      const weightValue = max(
        0.65,
        ((pointA.radius + pointB.radius) * 0.5) * unit * 0.9 * contourThicknessScale
      );
      ctx.lineWidth = weightValue;
      ctx.beginPath();
      ctx.moveTo(pointA.x * scaleX, pointA.y * scaleY);
      ctx.lineTo(pointB.x * scaleX, pointB.y * scaleY);
      ctx.stroke();
    }

    if (path.closed && variant.points.length > 2) {
      const pointA = variant.points[variant.points.length - 1];
      const pointB = variant.points[0];
      const weightValue = max(
        0.65,
        ((pointA.radius + pointB.radius) * 0.5) * unit * 0.9 * contourThicknessScale
      );
      ctx.lineWidth = weightValue;
      ctx.beginPath();
      ctx.moveTo(pointA.x * scaleX, pointA.y * scaleY);
      ctx.lineTo(pointB.x * scaleX, pointB.y * scaleY);
      ctx.stroke();
    }
  }
}

function drawEdgeLayerToContext(
  ctx: OffscreenCanvasRenderingContext2D,
  samples: EdgeSample[],
  sceneLayout: { width: number; height: number },
  activeVariant: number,
  echoVariant: number,
  unit: number,
  isHatch: boolean,
  inkStyle: { color: number[]; opacityScale: number },
  globalLineWidthScale: number
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

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
      const passDrift = pass === 0 ? 0 : (echo?.echoDrift || 0) * unit * 0.95;
      const x1 = centerX - sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y1 = centerY - sample.ty * baseLength * 0.5 + sample.ny * passDrift;
      const x2 = centerX + sample.tx * baseLength * 0.5 + sample.nx * passDrift;
      const y2 = centerY + sample.ty * baseLength * 0.5 + sample.ny * passDrift;

      const alphaScale = variant.alphaScale * (isHatch ? 0.84 : sample.pairMerged ? 0.96 : 1 - pass * 0.22);
      const weightScale = variant.weightScale * (isHatch ? 1 : sample.pairMerged ? 1.08 : 1 - pass * 0.14);
      ctx.strokeStyle = rgbToCss(
        inkStyle.color,
        constrain(sample.alphaValue * alphaScale * inkStyle.opacityScale, 0, 255) / 255
      );
      ctx.lineWidth = max(0.3, sample.weightValue * unit * weightScale * globalLineWidthScale);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

async function composeFrame(request: ComposeFrameRequest) {
  const canvas = createSizedCanvas(request.width, request.height);
  const ctx = canvas.getContext("2d", {
    alpha: true
  });

  if (!ctx) {
    throw new Error("无法创建导出离屏画布。");
  }

  let distortionBitmap: ImageBitmap | null = null;

  try {
    ctx.clearRect(0, 0, request.width, request.height);
    ctx.drawImage(request.baseFrame, 0, 0, request.width, request.height);

    if (request.distortionSvgMarkup) {
      distortionBitmap = await bitmapFromSvgMarkup(request.distortionSvgMarkup);
      ctx.drawImage(distortionBitmap, 0, 0, request.width, request.height);
    }

    if (request.textureBitmap) {
      ctx.save();
      ctx.globalAlpha = Number.isFinite(request.textureOpacity) ? request.textureOpacity : 1;
      ctx.drawImage(request.textureBitmap, 0, 0, request.width, request.height);
      ctx.restore();
    }

    return canvas.transferToImageBitmap();
  } finally {
    request.baseFrame.close();
    request.textureBitmap?.close?.();
    distortionBitmap?.close?.();
  }
}

async function renderFrame(request: RenderFrameRequest) {
  const canvas = createSizedCanvas(request.width, request.height);
  const ctx = canvas.getContext("2d", {
    alpha: true
  });

  if (!ctx) {
    throw new Error("无法创建导出离屏渲染上下文。");
  }

  let distortionBitmap: ImageBitmap | null = null;

  try {
    drawPaperBase(ctx, request.width, request.height, request.settings);

    const sceneLayout = getSceneLayout(
      request.width,
      request.height,
      request.sourceSize.width,
      request.sourceSize.height,
      request.settings
    );

    if (request.mode === "distortion") {
      if (request.distortionSvgMarkup) {
        distortionBitmap = await bitmapFromSvgMarkup(request.distortionSvgMarkup);
        ctx.drawImage(distortionBitmap, 0, 0, request.width, request.height);
      }
    } else {
      if (request.settings.referenceOverlay === true && request.sourceBitmap) {
        drawReferenceOverlay(ctx, request.sourceBitmap, sceneLayout, request.settings);
      }

      const sceneScale = getSceneScale(sceneLayout, request.analysisSize.width, request.analysisSize.height);
      const sequenceIndex = getBoilSequenceIndex(request.frameValue, request.settings);
      const activeVariant = BOIL_SEQUENCE[sequenceIndex % BOIL_SEQUENCE.length];
      const echoVariant = BOIL_SEQUENCE[(sequenceIndex + 2) % BOIL_SEQUENCE.length];
      const inkStyle = getInkStrokeStyle(request.settings);

      ctx.save();
      ctx.translate(sceneLayout.x, sceneLayout.y);
      if (
        request.mode === "path" ||
        request.mode === "region-grow" ||
        request.mode === "color-grow" ||
        request.mode === "color-boundary" ||
        request.mode === "contour" ||
        request.mode === "wave-contour" ||
        request.mode === "wave-shape" ||
        request.mode === "rubber-contour"
      ) {
        const contourThicknessScale =
          constrain(Number(request.settings.contourStrokeThickness || 100) / 100, 0.2, 4) *
          constrain(Number(request.settings.lineWidthScale || 100) / 100, 0.2, 4);
        drawStrokePathsToContext(
          ctx,
          request.strokePaths,
          activeVariant,
          sceneScale.x,
          sceneScale.y,
          sceneScale.unit,
          inkStyle,
          contourThicknessScale
        );
      } else {
        const globalLineWidthScale = constrain(Number(request.settings.lineWidthScale || 100) / 100, 0.2, 4);
        drawEdgeLayerToContext(
          ctx,
          request.edgeSamples,
          sceneLayout,
          activeVariant,
          echoVariant,
          sceneScale.unit,
          false,
          inkStyle,
          globalLineWidthScale
        );
        drawEdgeLayerToContext(
          ctx,
          request.hatchSamples,
          sceneLayout,
          activeVariant,
          echoVariant,
          sceneScale.unit,
          true,
          inkStyle,
          globalLineWidthScale
        );
      }
      ctx.restore();
    }

    if (request.textureBitmap) {
      ctx.save();
      ctx.globalAlpha = Number.isFinite(request.textureOpacity) ? request.textureOpacity : 1;
      ctx.drawImage(request.textureBitmap, 0, 0, request.width, request.height);
      ctx.restore();
    }

    return canvas.transferToImageBitmap();
  } finally {
    request.sourceBitmap?.close?.();
    request.textureBitmap?.close?.();
    distortionBitmap?.close?.();
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    const bitmap = request.kind === "render-frame" ? await renderFrame(request) : await composeFrame(request);
    const response: WorkerSuccessResponse = {
      id: request.id,
      kind: request.kind,
      ok: true,
      bitmap
    };

    self.postMessage(response, [bitmap]);
  } catch (error) {
    const response: WorkerFailureResponse = {
      id: request.id,
      kind: request.kind,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };

    self.postMessage(response);
  }
};
