export {};

const workerScope = self as typeof self & {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void | Promise<void>) | null;
};

type WorkerRequest =
  | {
      id: number;
      kind: "prepare-upload";
      source: Blob;
      maxDimension: number;
    }
  | {
      id: number;
      kind: "prepare-analysis";
      source: Blob;
      maxDimension: number;
    };

type WorkerSuccessResponse =
  | {
      id: number;
      kind: "prepare-upload";
      ok: true;
      width: number;
      height: number;
      resized: boolean;
      blob: Blob;
      bitmap: ImageBitmap;
    }
  | {
      id: number;
      kind: "prepare-analysis";
      ok: true;
      width: number;
      height: number;
      resized: boolean;
      pixelBuffer: ArrayBuffer;
    };

type WorkerFailureResponse = {
  id: number;
  kind: WorkerRequest["kind"];
  ok: false;
  error: string;
};

function getSafeDimensions(width: number, height: number, maxDimension: number) {
  const safeMax = Math.max(1, Math.floor(maxDimension || 1));
  const longestSide = Math.max(width, height);

  if (longestSide <= safeMax) {
    return {
      width: Math.max(1, Math.floor(width)),
      height: Math.max(1, Math.floor(height)),
      resized: false
    };
  }

  const scale = safeMax / longestSide;
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    resized: true
  };
}

async function renderSourceToCanvas(source: Blob, maxDimension: number) {
  const bitmap = await createImageBitmap(source);

  try {
    const targetSize = getSafeDimensions(bitmap.width, bitmap.height, maxDimension);
    const canvas = new OffscreenCanvas(targetSize.width, targetSize.height);
    const ctx = canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: true
    });

    if (!ctx) {
      throw new Error("无法创建离屏画布上下文。");
    }

    ctx.clearRect(0, 0, targetSize.width, targetSize.height);
    ctx.drawImage(bitmap, 0, 0, targetSize.width, targetSize.height);

    return {
      canvas,
      width: targetSize.width,
      height: targetSize.height,
      resized: targetSize.resized
    };
  } finally {
    bitmap.close();
  }
}

async function handlePrepareUpload(request: Extract<WorkerRequest, { kind: "prepare-upload" }>) {
  const rendered = await renderSourceToCanvas(request.source, request.maxDimension);
  const blob = await rendered.canvas.convertToBlob({
    type: "image/png"
  });
  const bitmap = rendered.canvas.transferToImageBitmap();

  const response: WorkerSuccessResponse = {
    id: request.id,
    kind: request.kind,
    ok: true,
    width: rendered.width,
    height: rendered.height,
    resized: rendered.resized,
    blob,
    bitmap
  };

  workerScope.postMessage(response, [bitmap]);
}

async function handlePrepareAnalysis(request: Extract<WorkerRequest, { kind: "prepare-analysis" }>) {
  const rendered = await renderSourceToCanvas(request.source, request.maxDimension);
  const ctx = rendered.canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true
  });

  if (!ctx) {
    throw new Error("无法读取分析像素。");
  }

  const pixelBuffer = ctx.getImageData(0, 0, rendered.width, rendered.height).data.buffer;
  const response: WorkerSuccessResponse = {
    id: request.id,
    kind: request.kind,
    ok: true,
    width: rendered.width,
    height: rendered.height,
    resized: rendered.resized,
    pixelBuffer
  };

  workerScope.postMessage(response, [pixelBuffer]);
}

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.kind === "prepare-upload") {
      await handlePrepareUpload(request);
      return;
    }

    await handlePrepareAnalysis(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: WorkerFailureResponse = {
      id: request.id,
      kind: request.kind,
      ok: false,
      error: message
    };

    workerScope.postMessage(response);
  }
};
