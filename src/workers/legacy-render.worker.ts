type AnalysisInput = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type BuildOutputRequest = {
  id: number;
  kind: "build-output";
  mode: string;
  settings: Record<string, number | string | boolean>;
  analysis: AnalysisInput;
};

type RebuildVariantsRequest = {
  id: number;
  kind: "rebuild-variants";
  mode: string;
  settings: Record<string, number | string | boolean>;
  analysisSize: {
    width: number;
    height: number;
  };
  edgeSamples: EdgeSample[];
  hatchSamples: EdgeSample[];
  strokePaths: StrokePath[];
};

type WorkerRequest = BuildOutputRequest | RebuildVariantsRequest;

type WorkerSuccessResponse = {
  id: number;
  kind: WorkerRequest["kind"];
  ok: true;
  edgeSamples: EdgeSample[];
  hatchSamples: EdgeSample[];
  strokePaths: StrokePath[];
  geometryKey: string;
};

type WorkerFailureResponse = {
  id: number;
  kind: WorkerRequest["kind"];
  ok: false;
  error: string;
};

type RgbMaps = {
  rMap: Uint8Array;
  gMap: Uint8Array;
  bMap: Uint8Array;
};

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
  sampleX?: number;
  sampleY?: number;
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
  seed: number;
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
  drawScore: number;
  seed: number;
  variants: PathVariant[];
};

type AnalysisCache = {
  brightnessMap: Float32Array | null;
  filteredBrightnessMaps: Map<number, Float32Array>;
  localContrastMaps: Map<number, Float32Array>;
  rgbMaps: RgbMaps | null;
  colorDeltaMaps: Map<number, Float32Array>;
  inkMask: Uint8Array | null;
};

type WorkerContext = {
  mode: string;
  settings: Record<string, number | string | boolean>;
  analysisWidth: number;
  analysisHeight: number;
  pixels: Uint8ClampedArray;
  cache: AnalysisCache;
};

const BOIL_VARIANTS = 4;
const MORPH_CLOSE_PASSES = 1;
const THINNING_MAX_ITERATIONS = 28;
const MIN_PATH_PIXELS = 6;
const MIN_PATH_DRAW_LENGTH = 8;
const PATH_RESAMPLE_SPACING = 1.2;
const WIDTH_RESPONSE = 1.18;
const MAX_STROKE_PATHS = 2200;
const MAX_EDGE_SAMPLES = 7200;
const MAX_HATCH_SAMPLES = 1800;
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
const NEIGHBOR_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 }
] as const;

const PERLIN_SIZE = 4095;
const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SEED = 1337;
let perlinOctaves = 4;
let perlinAmpFalloff = 0.5;
let perlin: number[] | null = null;

function abs(value: number) {
  return Math.abs(value);
}

function min(...values: number[]) {
  return Math.min(...values);
}

function max(...values: number[]) {
  return Math.max(...values);
}

function floor(value: number) {
  return Math.floor(value);
}

function round(value: number) {
  return Math.round(value);
}

function sqrt(value: number) {
  return Math.sqrt(value);
}

function sin(value: number) {
  return Math.sin(value);
}

function cos(value: number) {
  return Math.cos(value);
}

function atan2(y: number, x: number) {
  return Math.atan2(y, x);
}

function lerp(start: number, stop: number, amount: number) {
  return start + (stop - start) * amount;
}

function constrain(value: number, lower: number, upper: number) {
  return Math.min(Math.max(value, lower), upper);
}

function mapValue(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number
) {
  if (stop1 === start1) {
    return start2;
  }

  return start2 + ((value - start1) / (stop1 - start1)) * (stop2 - start2);
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return sqrt(dx * dx + dy * dy);
}

function getTenthsSetting(settings: Record<string, number | string | boolean>, key: string) {
  return Number(settings[key] || 0) / 10;
}

function getHundredthsSetting(settings: Record<string, number | string | boolean>, key: string) {
  return Number(settings[key] || 0) / 100;
}

function scaledCosine(value: number) {
  return 0.5 * (1.0 - Math.cos(value * Math.PI));
}

function seededRandomFactory(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ensurePerlin() {
  if (perlin) {
    return perlin;
  }

  const random = seededRandomFactory(PERLIN_SEED);
  perlin = new Array(PERLIN_SIZE + 1);
  for (let i = 0; i < PERLIN_SIZE + 1; i += 1) {
    perlin[i] = random();
  }

  return perlin;
}

function noise(x: number, y = 0, z = 0) {
  const noiseTable = ensurePerlin();
  if (x < 0) x = -x;
  if (y < 0) y = -y;
  if (z < 0) z = -z;

  let xi = floor(x);
  let yi = floor(y);
  let zi = floor(z);
  let xf = x - xi;
  let yf = y - yi;
  let zf = z - zi;
  let result = 0;
  let amplitude = 0.5;

  for (let octave = 0; octave < perlinOctaves; octave += 1) {
    let offset = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
    const rxf = scaledCosine(xf);
    const ryf = scaledCosine(yf);

    let n1 = noiseTable[offset & PERLIN_SIZE];
    n1 += rxf * (noiseTable[(offset + 1) & PERLIN_SIZE] - n1);
    let n2 = noiseTable[(offset + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (noiseTable[(offset + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);

    offset += PERLIN_ZWRAP;
    n2 = noiseTable[offset & PERLIN_SIZE];
    n2 += rxf * (noiseTable[(offset + 1) & PERLIN_SIZE] - n2);
    let n3 = noiseTable[(offset + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (noiseTable[(offset + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);

    n1 += scaledCosine(zf) * (n2 - n1);
    result += n1 * amplitude;
    amplitude *= perlinAmpFalloff;

    xi <<= 1;
    xf *= 2;
    yi <<= 1;
    yf *= 2;
    zi <<= 1;
    zf *= 2;

    if (xf >= 1.0) {
      xi += 1;
      xf -= 1;
    }
    if (yf >= 1.0) {
      yi += 1;
      yf -= 1;
    }
    if (zf >= 1.0) {
      zi += 1;
      zf -= 1;
    }
  }

  return result;
}

function createContext(request: BuildOutputRequest): WorkerContext {
  return {
    mode: request.mode,
    settings: request.settings,
    analysisWidth: request.analysis.width,
    analysisHeight: request.analysis.height,
    pixels: request.analysis.pixels,
    cache: {
      brightnessMap: null,
      filteredBrightnessMaps: new Map(),
      localContrastMaps: new Map(),
      rgbMaps: null,
      colorDeltaMaps: new Map(),
      inkMask: null
    }
  };
}

function buildBrightnessMap(ctx: WorkerContext) {
  if (ctx.cache.brightnessMap) {
    return ctx.cache.brightnessMap;
  }

  const { analysisWidth: w, analysisHeight: h, pixels } = ctx;
  const brightnessMap = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 4;
      brightnessMap[y * w + x] = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
    }
  }

  ctx.cache.brightnessMap = brightnessMap;
  return brightnessMap;
}

function blurScalarMap(sourceMap: Float32Array, w: number, h: number) {
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

function getFilteredBrightnessMap(ctx: WorkerContext) {
  const smoothPasses = max(0, floor(Number(ctx.settings.edgeSmoothness || 0)));
  if (ctx.cache.filteredBrightnessMaps.has(smoothPasses)) {
    return ctx.cache.filteredBrightnessMaps.get(smoothPasses)!;
  }

  let brightnessMap = buildBrightnessMap(ctx);
  for (let pass = 0; pass < smoothPasses; pass += 1) {
    brightnessMap = blurScalarMap(brightnessMap, ctx.analysisWidth, ctx.analysisHeight);
  }

  ctx.cache.filteredBrightnessMaps.set(smoothPasses, brightnessMap);
  return brightnessMap;
}

function getLocalContrastMap(ctx: WorkerContext) {
  const smoothPasses = max(0, floor(Number(ctx.settings.edgeSmoothness || 0)));
  if (ctx.cache.localContrastMaps.has(smoothPasses)) {
    return ctx.cache.localContrastMaps.get(smoothPasses)!;
  }

  const brightnessMap = getFilteredBrightnessMap(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
  const contrastMap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const neighborhoodMean =
        (brightnessMap[idx - 1] + brightnessMap[idx + 1] + brightnessMap[idx - w] + brightnessMap[idx + w]) * 0.25;
      contrastMap[idx] = neighborhoodMean - brightnessMap[idx];
    }
  }

  ctx.cache.localContrastMaps.set(smoothPasses, contrastMap);
  return contrastMap;
}

function getRgbMaps(ctx: WorkerContext) {
  if (ctx.cache.rgbMaps) {
    return ctx.cache.rgbMaps;
  }

  const { analysisWidth: w, analysisHeight: h, pixels } = ctx;
  const rMap = new Uint8Array(w * h);
  const gMap = new Uint8Array(w * h);
  const bMap = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const pixelIndex = idx * 4;
      rMap[idx] = pixels[pixelIndex];
      gMap[idx] = pixels[pixelIndex + 1];
      bMap[idx] = pixels[pixelIndex + 2];
    }
  }

  ctx.cache.rgbMaps = { rMap, gMap, bMap };
  return ctx.cache.rgbMaps;
}

function getColorDeltaMap(ctx: WorkerContext) {
  const smoothPasses = max(0, floor(Number(ctx.settings.edgeSmoothness || 0)));
  if (ctx.cache.colorDeltaMaps.has(smoothPasses)) {
    return ctx.cache.colorDeltaMaps.get(smoothPasses)!;
  }

  const { rMap, gMap, bMap } = getRgbMaps(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
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

  ctx.cache.colorDeltaMaps.set(smoothPasses, colorDeltaMap);
  return colorDeltaMap;
}

function getInkMask(ctx: WorkerContext) {
  if (ctx.cache.inkMask) {
    return ctx.cache.inkMask;
  }

  const brightnessMap = getFilteredBrightnessMap(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
  const mask = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
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

      const center = brightnessMap[idx];
      const localMean = localTotal / localCount;
      if (
        center < Number(ctx.settings.inkBrightnessThreshold || 0) ||
        center + Number(ctx.settings.localContrastThreshold || 0) < localMean
      ) {
        mask[idx] = 1;
      }
    }
  }

  ctx.cache.inkMask = mask;
  return mask;
}

function colorDistanceBetween(rMap: Uint8Array, gMap: Uint8Array, bMap: Uint8Array, indexA: number, indexB: number) {
  const dr = rMap[indexA] - rMap[indexB];
  const dg = gMap[indexA] - gMap[indexB];
  const db = bMap[indexA] - bMap[indexB];
  return sqrt(dr * dr + dg * dg + db * db);
}

function buildColorBoundaryMask(ctx: WorkerContext) {
  const brightnessMap = getFilteredBrightnessMap(ctx);
  const contrastMap = getLocalContrastMap(ctx);
  const { rMap, gMap, bMap } = getRgbMaps(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
  const mask = new Uint8Array(w * h);
  const colorThreshold = Number(ctx.settings.colorDistanceThreshold || 0);
  const contrastThreshold = max(1, Number(ctx.settings.localContrastThreshold || 0) * 0.55);
  const brightnessGuard = Number(ctx.settings.lineBrightnessThreshold || 0) + 18;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const strongestDelta = max(
        colorDistanceBetween(rMap, gMap, bMap, idx - 1, idx + 1),
        colorDistanceBetween(rMap, gMap, bMap, idx - w, idx + w),
        colorDistanceBetween(rMap, gMap, bMap, idx - w - 1, idx + w + 1),
        colorDistanceBetween(rMap, gMap, bMap, idx - w + 1, idx + w - 1)
      );

      if (strongestDelta >= colorThreshold && (contrastMap[idx] >= contrastThreshold || brightnessMap[idx] <= brightnessGuard)) {
        mask[idx] = 1;
      }
    }
  }

  return mask;
}

function buildRegionGrowMask(ctx: WorkerContext) {
  const brightnessMap = getFilteredBrightnessMap(ctx);
  const contrastMap = getLocalContrastMap(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seedThreshold = Number(ctx.settings.lineBrightnessThreshold || 0);
  const expandThreshold = min(255, seedThreshold + 18);
  const contrastThreshold = max(2, Number(ctx.settings.localContrastThreshold || 0));
  const neighborDriftLimit = 34;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (brightnessMap[idx] < seedThreshold && contrastMap[idx] > contrastThreshold * 0.42) {
        queued[idx] = 1;
        queue[tail++] = idx;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head++];
    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentContrast = contrastMap[idx];
    if (!(currentBrightness <= expandThreshold || currentContrast >= contrastThreshold)) {
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
        (neighborBrightness <= expandThreshold || neighborContrast >= contrastThreshold * 0.75) &&
        abs(neighborBrightness - currentBrightness) <= neighborDriftLimit
      ) {
        queued[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }
  }

  return mask;
}

function buildColorGrowMask(ctx: WorkerContext) {
  const brightnessMap = getFilteredBrightnessMap(ctx);
  const contrastMap = getLocalContrastMap(ctx);
  const { rMap, gMap, bMap } = getRgbMaps(ctx);
  const colorDeltaMap = getColorDeltaMap(ctx);
  const { analysisWidth: w, analysisHeight: h } = ctx;
  const mask = new Uint8Array(w * h);
  const queued = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const seedBrightnessThreshold = Number(ctx.settings.lineBrightnessThreshold || 0);
  const expandBrightnessThreshold = min(255, seedBrightnessThreshold + 26);
  const contrastThreshold = max(2, Number(ctx.settings.localContrastThreshold || 0));
  const colorThreshold = Number(ctx.settings.colorDistanceThreshold || 0);
  const colorDriftLimit = max(10, colorThreshold * 1.35);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        brightnessMap[idx] < seedBrightnessThreshold ||
        (colorDeltaMap[idx] > colorThreshold && contrastMap[idx] > contrastThreshold * 0.35)
      ) {
        queued[idx] = 1;
        queue[tail++] = idx;
      }
    }
  }

  while (head < tail) {
    const idx = queue[head++];
    if (mask[idx]) {
      continue;
    }

    const currentBrightness = brightnessMap[idx];
    const currentColorDelta = colorDeltaMap[idx];
    if (
      !(
        currentBrightness <= expandBrightnessThreshold ||
        currentColorDelta >= colorThreshold * 0.72 ||
        contrastMap[idx] >= contrastThreshold
      )
    ) {
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
        queue[tail++] = nIdx;
      }
    }
  }

  return mask;
}

function dilateMask(mask: Uint8Array, w: number, h: number) {
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

function erodeMask(mask: Uint8Array, w: number, h: number) {
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

function closeBinaryMask(mask: Uint8Array, w: number, h: number, passes: number) {
  let current = mask.slice();
  for (let pass = 0; pass < passes; pass += 1) {
    current = dilateMask(current, w, h);
    current = erodeMask(current, w, h);
  }
  return current;
}

function computeDistanceField(mask: Uint8Array, w: number, h: number) {
  const distanceField = new Float32Array(mask.length);
  const largeValue = 1e6;
  for (let i = 0; i < mask.length; i += 1) {
    distanceField[i] = mask[i] ? largeValue : 0;
  }

  for (let y = 1; y < h; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
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
      if (!mask[idx]) continue;
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

function thinningPass(mask: Uint8Array, w: number, h: number, firstStep: boolean) {
  const toDelete: number[] = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      const p2 = mask[(y - 1) * w + x];
      const p3 = mask[(y - 1) * w + x + 1];
      const p4 = mask[y * w + x + 1];
      const p5 = mask[(y + 1) * w + x + 1];
      const p6 = mask[(y + 1) * w + x];
      const p7 = mask[(y + 1) * w + x - 1];
      const p8 = mask[y * w + x - 1];
      const p9 = mask[(y - 1) * w + x - 1];
      const neighborSum = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
      if (neighborSum < 2 || neighborSum > 6) continue;
      const transitions =
        Number(!p2 && p3) +
        Number(!p3 && p4) +
        Number(!p4 && p5) +
        Number(!p5 && p6) +
        Number(!p6 && p7) +
        Number(!p7 && p8) +
        Number(!p8 && p9) +
        Number(!p9 && p2);
      if (transitions !== 1) continue;
      const keepCondition = firstStep
        ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
        : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;
      if (keepCondition) {
        toDelete.push(idx);
      }
    }
  }

  for (const idx of toDelete) {
    mask[idx] = 0;
  }

  return toDelete.length > 0;
}

function thinMask(mask: Uint8Array, w: number, h: number, maxIterations: number) {
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

function buildConstantDistanceField(mask: Uint8Array, radiusValue: number) {
  const field = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      field[i] = radiusValue;
    }
  }
  return field;
}

function extractBoundaryMask(mask: Uint8Array, w: number, h: number) {
  const boundaryMask = new Uint8Array(mask.length);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      if (!mask[idx - 1] || !mask[idx + 1] || !mask[idx - w] || !mask[idx + w]) {
        boundaryMask[idx] = 1;
      }
    }
  }
  return boundaryMask;
}

function getSkeletonNeighbors(idx: number, mask: Uint8Array, w: number, h: number) {
  const x = idx % w;
  const y = floor(idx / w);
  const neighbors: number[] = [];
  for (const dir of NEIGHBOR_DIRS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const nIdx = ny * w + nx;
    if (mask[nIdx]) {
      neighbors.push(nIdx);
    }
  }
  return neighbors;
}

function getEdgeKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function chooseNextNeighbor(prev: number, current: number, candidates: number[], w: number) {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const prevX = prev % w;
  const prevY = floor(prev / w);
  const currentX = current % w;
  const currentY = floor(current / w);
  const dirX = currentX - prevX;
  const dirY = currentY - prevY;
  let bestCandidate = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const nextX = candidate % w;
    const nextY = floor(candidate / w);
    const stepX = nextX - currentX;
    const stepY = nextY - currentY;
    const stepLength = max(0.0001, sqrt(stepX * stepX + stepY * stepY));
    const score = (dirX * stepX + dirY * stepY) / stepLength;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function tracePath(
  startIdx: number,
  nextIdx: number,
  mask: Uint8Array,
  degrees: Uint8Array,
  w: number,
  h: number,
  visitedEdges: Set<string>,
  allowLoop: boolean
) {
  const path = [startIdx];
  let prev = startIdx;
  let current = nextIdx;

  while (true) {
    visitedEdges.add(getEdgeKey(prev, current));
    path.push(current);
    if (allowLoop && current === startIdx) break;
    if (degrees[current] !== 2 && current !== startIdx) break;

    const neighbors = getSkeletonNeighbors(current, mask, w, h).filter((candidate) => candidate !== prev);
    const candidates = neighbors.filter((candidate) => !visitedEdges.has(getEdgeKey(current, candidate)));
    if (!candidates.length) {
      if (allowLoop) {
        const loopCandidate = neighbors.find((candidate) => candidate === startIdx);
        if (loopCandidate !== undefined && !visitedEdges.has(getEdgeKey(current, loopCandidate))) {
          prev = current;
          current = loopCandidate;
          continue;
        }
      }
      break;
    }

    const next = chooseNextNeighbor(prev, current, candidates, w);
    prev = current;
    current = next;
  }

  return path;
}

function copyPoint(point: PathPoint) {
  return {
    x: point.x,
    y: point.y,
    radius: point.radius
  };
}

function resamplePath(points: PathPoint[], spacing: number, closed: boolean) {
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
    if (segmentLength === 0) continue;

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
      if (segmentLength === 0) break;
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

function smoothPath(points: PathPoint[], closed: boolean) {
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

function measurePathLength(points: PathPoint[], closed: boolean) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }
  if (closed && points.length > 2) {
    total += dist(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y);
  }
  return total;
}

function finalizePath(indexPath: number[], distanceField: Float32Array, w: number, h: number) {
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
    drawScore: pathLength * (0.8 + (radiusTotal / max(1, smoothed.length)) * 0.35),
    seed: smoothed[0].x * 0.173 + smoothed[0].y * 0.291 + pathLength * 0.07,
    variants: []
  };
}

function buildStrokePaths(skeletonMask: Uint8Array, distanceField: Float32Array, w: number, h: number) {
  const degrees = new Uint8Array(skeletonMask.length);
  const visitedEdges = new Set<string>();
  const paths: StrokePath[] = [];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!skeletonMask[idx]) continue;
      degrees[idx] = getSkeletonNeighbors(idx, skeletonMask, w, h).length;
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx] || degrees[idx] === 2 || degrees[idx] === 0) continue;
    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) continue;
      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, false);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx]) continue;
    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) continue;
      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, true);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function buildPathsFromMask(mask: Uint8Array, w: number, h: number, options: { closePasses?: number; boundaryOnly?: boolean } = {}) {
  const closePasses = options.closePasses ?? MORPH_CLOSE_PASSES;
  const boundaryOnly = options.boundaryOnly ?? false;
  const closedMask = closeBinaryMask(mask, w, h, closePasses);
  const traceMask = boundaryOnly ? extractBoundaryMask(closedMask, w, h) : thinMask(closedMask, w, h, THINNING_MAX_ITERATIONS);
  const distanceField = boundaryOnly ? buildConstantDistanceField(traceMask, 1.05) : computeDistanceField(closedMask, w, h);

  return buildStrokePaths(traceMask, distanceField, w, h)
    .sort((a, b) => b.drawScore - a.drawScore)
    .slice(0, MAX_STROKE_PATHS);
}

function buildCumulativeLengths(points: PathPoint[]) {
  const lengths = new Float32Array(points.length);
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    lengths[i] = total;
  }
  return lengths;
}

function getPathTangent(points: PathPoint[], index: number, closed: boolean) {
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

function sampleSharedWaveField(
  settings: Record<string, number | string | boolean>,
  analysisWidth: number,
  analysisHeight: number,
  x: number,
  y: number,
  variantIndex: number,
  seed: number
) {
  const longestSide = max(1, analysisWidth, analysisHeight);
  const spatialScale = (getTenthsSetting(settings, "waveFrequency") * TWO_PI) / longestSide;
  const speedMix = Number(settings.waveSpeed || 0) / 100;
  const phase = variantIndex * TWO_PI * lerp(0.06, 1.1, speedMix);
  const wobblePhase = variantIndex * TWO_PI * lerp(0.03, 0.72, speedMix);
  const nx = x * spatialScale;
  const ny = y * spatialScale;

  return {
    dx:
      sin(nx * 1.02 + ny * 0.34 + phase + seed * 0.0009) * 0.72 +
      sin(nx * 0.41 - ny * 0.88 + wobblePhase + seed * 0.0004) * 0.28,
    dy:
      sin(ny * 0.97 - nx * 0.29 + phase * 0.92 + seed * 0.0007) * 0.7 +
      sin(nx * 0.76 + ny * 0.23 + wobblePhase * 1.07 + seed * 0.0003) * 0.3
  };
}

function preparePathVariants(
  settings: Record<string, number | string | boolean>,
  analysisWidth: number,
  analysisHeight: number,
  paths: StrokePath[],
  variantMode = "default"
) {
  const waveContour = variantMode === "wave-contour";
  const waveShape = variantMode === "wave-shape";
  const rubberContour = variantMode === "rubber-contour";

  for (const path of paths) {
    path.variants = [];
    const totalLength = max(0.0001, measurePathLength(path.points, path.closed));
    const cumulativeLengths = buildCumulativeLengths(path.points);

    for (let variantIndex = 0; variantIndex < BOIL_VARIANTS; variantIndex += 1) {
      const points: PathPoint[] = [];
      for (let i = 0; i < path.points.length; i += 1) {
        const basePoint = path.points[i];
        const progress = cumulativeLengths[i] / totalLength;
        const tangent = getPathTangent(path.points, i, path.closed);
        const normal = { x: -tangent.y, y: tangent.x };
        const radiusScale = constrain(basePoint.radius / 2.4, 0.65, 1.25);
        let normalNoise: number;
        let tangentNoise: number;
        let shapeField: { dx: number; dy: number } | null = null;

        if (waveContour) {
          const waveCycles = max(0.1, getTenthsSetting(settings, "waveFrequency"));
          const wavePhase = variantIndex * TWO_PI * lerp(0.08, 1.15, Number(settings.waveSpeed || 0) / 100);
          const harmonicPhase = variantIndex * TWO_PI * lerp(0.03, 0.48, Number(settings.waveSpeed || 0) / 100);
          const wavePrimary = sin(progress * TWO_PI * waveCycles + wavePhase);
          const waveSecondary = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.75) + harmonicPhase);
          const waveNoise = mapValue(noise(progress * 2.6 + variantIndex * 1.7, path.seed * 0.23 + 60), 0, 1, -1, 1);
          normalNoise = wavePrimary * 0.72 + waveSecondary * 0.2 + waveNoise * 0.08;
          tangentNoise = mapValue(noise(progress * 2.1 + variantIndex * 2.3, path.seed * 0.17 + 120), 0, 1, -1, 1) * 0.22;
        } else if (waveShape) {
          shapeField = sampleSharedWaveField(settings, analysisWidth, analysisHeight, basePoint.x, basePoint.y, variantIndex, path.seed);
          normalNoise = shapeField.dx * normal.x + shapeField.dy * normal.y;
          tangentNoise = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
        } else if (rubberContour) {
          shapeField = sampleSharedWaveField(
            settings,
            analysisWidth,
            analysisHeight,
            basePoint.x,
            basePoint.y,
            variantIndex,
            path.seed * 0.61 + 37
          );
          const waveCycles = max(0.1, getTenthsSetting(settings, "waveFrequency") * 0.72);
          const softPhase = variantIndex * TWO_PI * lerp(0.05, 0.78, Number(settings.waveSpeed || 0) / 100);
          const bounce = sin(progress * TWO_PI * waveCycles + softPhase + path.seed * 0.004);
          const squeeze = sin(progress * TWO_PI * (waveCycles * 0.5 + 0.55) - softPhase * 0.7);
          const fieldNormal = shapeField.dx * normal.x + shapeField.dy * normal.y;
          const fieldTangent = shapeField.dx * tangent.x + shapeField.dy * tangent.y;
          normalNoise = bounce * 0.46 + fieldNormal * 0.54;
          tangentNoise = squeeze * 0.16 + fieldTangent * 0.34;
        } else {
          normalNoise =
            mapValue(noise(progress * 3.6 + variantIndex * 11.3, path.seed * 0.19), 0, 1, -1, 1) * 0.75 +
            mapValue(noise(progress * 8.4 + variantIndex * 4.7, path.seed * 0.31 + 80), 0, 1, -1, 1) * 0.25;
          tangentNoise = mapValue(noise(progress * 4.3 + variantIndex * 9.1, path.seed * 0.27 + 140), 0, 1, -1, 1);
        }

        const widthNoise = mapValue(
          noise(progress * 5.7 + variantIndex * 7.9, path.seed * 0.13 + 220),
          0,
          1,
          1 - getHundredthsSetting(settings, "widthJitter"),
          1 + getHundredthsSetting(settings, "widthJitter") * (rubberContour ? 1.18 : 1)
        );

        const normalAmplitude = waveContour
          ? getTenthsSetting(settings, "waveAmplitude")
          : waveShape
            ? getTenthsSetting(settings, "waveAmplitude") * 1.12
            : rubberContour
              ? getTenthsSetting(settings, "waveAmplitude") * 0.92
              : getTenthsSetting(settings, "pathJitterNormal");
        const tangentAmplitude = waveContour
          ? getTenthsSetting(settings, "edgeJitterTangent")
          : waveShape
            ? getTenthsSetting(settings, "edgeJitterTangent") * 0.72
            : rubberContour
              ? getTenthsSetting(settings, "edgeJitterTangent") * 0.9
              : getTenthsSetting(settings, "pathJitterTangent");

        points.push({
          x:
            basePoint.x +
            normal.x * normalNoise * normalAmplitude * radiusScale +
            tangent.x * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dx || 0) * getTenthsSetting(settings, "waveAmplitude") * 0.34 * radiusScale : 0),
          y:
            basePoint.y +
            normal.y * normalNoise * normalAmplitude * radiusScale +
            tangent.y * tangentNoise * tangentAmplitude +
            (waveShape ? (shapeField?.dy || 0) * getTenthsSetting(settings, "waveAmplitude") * 0.34 * radiusScale : 0),
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

function createPairedEdgeSample(a: EdgeSample, b: EdgeSample, w: number, h: number) {
  const tangentAlignment = a.tx * b.tx + a.ty * b.ty < 0 ? -1 : 1;
  const tx = a.tx + b.tx * tangentAlignment;
  const ty = a.ty + b.ty * tangentAlignment;
  const tangentLength = max(0.0001, sqrt(tx * tx + ty * ty));
  const mergedTx = tx / tangentLength;
  const mergedTy = ty / tangentLength;
  const centerX = ((a.sampleX || 0) + (b.sampleX || 0)) * 0.5;
  const centerY = ((a.sampleY || 0) + (b.sampleY || 0)) * 0.5;
  const dx = (b.sampleX || 0) - (a.sampleX || 0);
  const dy = (b.sampleY || 0) - (a.sampleY || 0);
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
    pairMerged: true,
    variants: []
  };
}

function pairNearbyEdges(settings: Record<string, number | string | boolean>, samples: EdgeSample[], w: number, h: number, pairThreshold: number) {
  const buckets = new Map<string, number[]>();
  const used = new Uint8Array(samples.length);
  const pairedSamples: EdgeSample[] = [];
  const pairCellSize = max(1, floor(Number(settings.edgeFillCellSize || 0)));
  const minNormalGap = min(getTenthsSetting(settings, "edgeFillMinNormalGap"), getTenthsSetting(settings, "edgeFillMaxNormalGap"));
  const maxNormalGap = max(getTenthsSetting(settings, "edgeFillMinNormalGap"), getTenthsSetting(settings, "edgeFillMaxNormalGap"));
  const maxTangentGap = max(0, getTenthsSetting(settings, "edgeFillMaxTangentGap"));
  const minTangentDot = constrain(getHundredthsSetting(settings, "edgeFillMinTangentDot"), 0, 1);
  const maxNormalDot = constrain(getHundredthsSetting(settings, "edgeFillMaxNormalDot"), -1, 1);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const cellX = floor((sample.sampleX || 0) / pairCellSize);
    const cellY = floor((sample.sampleY || 0) / pairCellSize);
    const key = `${cellX},${cellY}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(i);
  }

  for (let i = 0; i < samples.length; i += 1) {
    if (used[i]) continue;
    const sample = samples[i];
    const cellX = floor((sample.sampleX || 0) / pairCellSize);
    const cellY = floor((sample.sampleY || 0) / pairCellSize);
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const bucket = buckets.get(`${cellX + offsetX},${cellY + offsetY}`);
        if (!bucket) continue;
        for (const candidateIndex of bucket) {
          if (candidateIndex === i || used[candidateIndex]) continue;
          const other = samples[candidateIndex];
          const tangentDot = abs(sample.tx * other.tx + sample.ty * other.ty);
          if (tangentDot < minTangentDot) continue;
          const normalDot = sample.nx * other.nx + sample.ny * other.ny;
          if (normalDot > maxNormalDot) continue;
          const dx = (other.sampleX || 0) - (sample.sampleX || 0);
          const dy = (other.sampleY || 0) - (sample.sampleY || 0);
          const tangentGap = abs(dx * sample.tx + dy * sample.ty);
          const normalGap = abs(dx * sample.nx + dy * sample.ny);
          if (normalGap < minNormalGap || normalGap > maxNormalGap || tangentGap > maxTangentGap) continue;
          const score =
            tangentDot * 2.1 +
            -normalDot * 1.4 -
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

function prepareEdgeVariants(settings: Record<string, number | string | boolean>, samples: EdgeSample[], isHatch: boolean) {
  for (const sample of samples) {
    const gridX = floor(sample.nxPos * 28);
    const gridY = floor(sample.nyPos * 42);
    sample.variants = [];
    for (let variant = 0; variant < BOIL_VARIANTS; variant += 1) {
      const clusterNormal = mapValue(noise(gridX * 0.23 + variant * 3.1, gridY * 0.17 + (isHatch ? 50 : 0)), 0, 1, -1, 1);
      const clusterTangent = mapValue(
        noise(gridX * 0.19 + variant * 4.3, gridY * 0.21 + 80 + (isHatch ? 50 : 0)),
        0,
        1,
        -1,
        1
      );
      const localNormal = mapValue(noise(sample.seed * 0.31 + variant * 7.3, 10), 0, 1, -1, 1);
      const localTangent = mapValue(noise(sample.seed * 0.27 + variant * 6.1, 40), 0, 1, -1, 1);
      sample.variants.push({
        normalOffset: (clusterNormal * 0.72 + localNormal * 0.28) * getTenthsSetting(settings, "edgeJitterNormal"),
        tangentOffset: (clusterTangent * 0.65 + localTangent * 0.35) * getTenthsSetting(settings, "edgeJitterTangent"),
        lengthScale: lerp(0.9, 1.08, noise(sample.seed * 0.23 + variant * 8.1, 90)),
        alphaScale: lerp(0.88, 1.06, noise(sample.seed * 0.17 + variant * 5.9, 140)),
        weightScale: lerp(0.86, 1.14, noise(sample.seed * 0.11 + variant * 9.7, 180)),
        echoDrift: mapValue(noise(sample.seed * 0.07 + variant * 4.7, 220), 0, 1, -1, 1),
        visible: isHatch
          ? noise(sample.seed * 0.13 + variant * 5.1, 260) > 0.24
          : noise(sample.seed * 0.09 + variant * 3.7, 260) > 0.05
      });
    }
  }
}

function buildEdgeField(settings: Record<string, number | string | boolean>, ctx: WorkerContext, useFillMerge: boolean) {
  const w = ctx.analysisWidth;
  const h = ctx.analysisHeight;
  const brightnessMap = getFilteredBrightnessMap(ctx);
  const candidateEdges: EdgeSample[] = [];
  const candidateHatches: EdgeSample[] = [];

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
      const isDarkCenter = center < Number(settings.lineBrightnessThreshold || 0) && center + 6 < neighborhoodMean;
      const support = Number(left < 236) + Number(right < 236) + Number(up < 236) + Number(down < 236);
      if (!isDarkCenter && edgeStrength < Number(settings.edgeThreshold || 0)) continue;
      if (support < 2 && darkness < 24 && edgeStrength < Number(settings.edgeThreshold || 0) * 1.3) continue;

      const keepChance = constrain(
        mapValue(edgeStrength + darkness * 0.65, Number(settings.edgeThreshold || 0), 210, 0.18, 0.92),
        0.14,
        0.92
      );
      if (noise(x * 0.034, y * 0.034) > keepChance) continue;

      const tangentAngle = atan2(sobelY, sobelX) + HALF_PI;
      const tx = cos(tangentAngle);
      const ty = sin(tangentAngle);
      const nx = -ty;
      const ny = tx;
      const strength = constrain(mapValue(edgeStrength, Number(settings.edgeThreshold || 0), 160, 0, 1), 0, 1);
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
        alphaValue: lerp(42, 110, constrain(strength * 0.8 + (darkness / 255) * 0.6, 0, 1)),
        seed: x * 0.173 + y * 0.291,
        pairMerged: false,
        variants: []
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
          pairMerged: false,
          variants: []
        });
      }
    }
  }

  candidateEdges.sort((a, b) => b.strength + b.darkness * 0.4 - (a.strength + a.darkness * 0.4));
  candidateHatches.sort((a, b) => b.darkness - a.darkness);
  const edgeSamples = useFillMerge
    ? pairNearbyEdges(settings, candidateEdges, w, h, getTenthsSetting(settings, "edgeFillThreshold")).slice(0, MAX_EDGE_SAMPLES)
    : candidateEdges.slice(0, MAX_EDGE_SAMPLES);
  const hatchSamples = useFillMerge ? [] : candidateHatches.slice(0, MAX_HATCH_SAMPLES);
  prepareEdgeVariants(settings, edgeSamples, false);
  prepareEdgeVariants(settings, hatchSamples, true);
  return {
    edgeSamples,
    hatchSamples
  };
}

function getGeometryKeyForMode(mode: string) {
  if (mode === "edge" || mode === "edge-fill") {
    return mode;
  }
  if (mode === "path" || mode === "region-grow" || mode === "color-grow" || mode === "color-boundary") {
    return mode;
  }
  if (mode === "contour" || mode === "wave-contour" || mode === "wave-shape" || mode === "rubber-contour") {
    return "contour";
  }
  return "";
}

function buildStrokeModeOutput(
  settings: Record<string, number | string | boolean>,
  ctx: WorkerContext,
  mode: string
) {
  let strokePaths: StrokePath[] = [];
  if (mode === "path") {
    const mask = getInkMask(ctx);
    const closedMask = closeBinaryMask(mask, ctx.analysisWidth, ctx.analysisHeight, MORPH_CLOSE_PASSES);
    const distanceField = computeDistanceField(closedMask, ctx.analysisWidth, ctx.analysisHeight);
    const skeletonMask = thinMask(closedMask, ctx.analysisWidth, ctx.analysisHeight, THINNING_MAX_ITERATIONS);
    strokePaths = buildStrokePaths(skeletonMask, distanceField, ctx.analysisWidth, ctx.analysisHeight)
      .sort((a, b) => b.drawScore - a.drawScore)
      .slice(0, MAX_STROKE_PATHS);
    preparePathVariants(settings, ctx.analysisWidth, ctx.analysisHeight, strokePaths);
  } else if (mode === "region-grow") {
    strokePaths = buildPathsFromMask(buildRegionGrowMask(ctx), ctx.analysisWidth, ctx.analysisHeight, {
      boundaryOnly: false,
      closePasses: MORPH_CLOSE_PASSES + 1
    });
    preparePathVariants(settings, ctx.analysisWidth, ctx.analysisHeight, strokePaths);
  } else if (mode === "color-grow") {
    strokePaths = buildPathsFromMask(buildColorGrowMask(ctx), ctx.analysisWidth, ctx.analysisHeight, {
      boundaryOnly: false,
      closePasses: MORPH_CLOSE_PASSES + 1
    });
    preparePathVariants(settings, ctx.analysisWidth, ctx.analysisHeight, strokePaths);
  } else if (mode === "color-boundary") {
    strokePaths = buildPathsFromMask(buildColorBoundaryMask(ctx), ctx.analysisWidth, ctx.analysisHeight, {
      boundaryOnly: false,
      closePasses: MORPH_CLOSE_PASSES
    });
    preparePathVariants(settings, ctx.analysisWidth, ctx.analysisHeight, strokePaths);
  } else {
    strokePaths = buildPathsFromMask(getInkMask(ctx), ctx.analysisWidth, ctx.analysisHeight, {
      boundaryOnly: true,
      closePasses: MORPH_CLOSE_PASSES
    });
    preparePathVariants(settings, ctx.analysisWidth, ctx.analysisHeight, strokePaths, mode === "contour" ? "default" : mode);
  }

  return {
    strokePaths
  };
}

function handleBuildOutput(request: BuildOutputRequest): WorkerSuccessResponse {
  const ctx = createContext(request);
  let edgeSamples: EdgeSample[] = [];
  let hatchSamples: EdgeSample[] = [];
  let strokePaths: StrokePath[] = [];

  if (request.mode === "edge" || request.mode === "edge-fill") {
    const result = buildEdgeField(request.settings, ctx, request.mode === "edge-fill");
    edgeSamples = result.edgeSamples;
    hatchSamples = result.hatchSamples;
  } else {
    strokePaths = buildStrokeModeOutput(request.settings, ctx, request.mode).strokePaths;
  }

  return {
    id: request.id,
    kind: request.kind,
    ok: true,
    edgeSamples,
    hatchSamples,
    strokePaths,
    geometryKey: getGeometryKeyForMode(request.mode)
  };
}

function handleRebuildVariants(request: RebuildVariantsRequest): WorkerSuccessResponse {
  const edgeSamples = request.edgeSamples || [];
  const hatchSamples = request.hatchSamples || [];
  const strokePaths = request.strokePaths || [];

  if (request.mode === "edge" || request.mode === "edge-fill") {
    prepareEdgeVariants(request.settings, edgeSamples, false);
    prepareEdgeVariants(request.settings, hatchSamples, true);
  } else {
    preparePathVariants(
      request.settings,
      request.analysisSize.width,
      request.analysisSize.height,
      strokePaths,
      request.mode === "contour" ? "default" : request.mode
    );
  }

  return {
    id: request.id,
    kind: request.kind,
    ok: true,
    edgeSamples,
    hatchSamples,
    strokePaths,
    geometryKey: getGeometryKeyForMode(request.mode)
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    const response = request.kind === "build-output" ? handleBuildOutput(request) : handleRebuildVariants(request);
    self.postMessage(response);
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
