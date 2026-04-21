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

type WorkerRequest = ComposeFrameRequest;

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

function createSizedCanvas(width: number, height: number) {
  return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
}

async function bitmapFromSvgMarkup(svgMarkup: string) {
  const blob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8"
  });
  return createImageBitmap(blob);
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    const bitmap = await composeFrame(request);
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
