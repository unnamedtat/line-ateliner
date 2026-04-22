import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { LEGACY_BRIDGE_SCRIPT_PATHS, LEGACY_PREVIEW_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";
import { AppShell } from "./ui/AppShell";
import legacyImageWorkerUrl from "./workers/legacy-image.worker?worker&url";
import legacyRenderWorkerUrl from "./workers/legacy-render.worker?worker&url";

type PreviewEngineStatus = "idle" | "booting" | "ready" | "failed";

declare global {
  interface Window {
    __lineAtelierAlgorithmRuntimePromise?: Promise<void>;
    __lineAtelierBridgeBootPromise?: Promise<void>;
    __lineAtelierDefaultSourceBlob?: Blob;
    __lineAtelierDefaultSourceHref?: string;
    __lineAtelierEnsurePreviewEngineBoot?: () => Promise<void>;
    __lineAtelierImageWorkerUrl?: string;
    __lineAtelierIsPreviewEngineReady?: () => boolean;
    __lineAtelierLoadExportRuntime?: () => Promise<void>;
    __lineAtelierMarkPreviewEngineReady?: () => void;
    __lineAtelierP5Instance?: unknown;
    __lineAtelierP5BootPromise?: Promise<void>;
    __lineAtelierPreviewBootPromise?: Promise<void>;
    __lineAtelierPreviewEngineFailureMessage?: string;
    __lineAtelierPreviewEngineStatus?: PreviewEngineStatus;
    __lineAtelierPreviewReadyPromise?: Promise<void>;
    __lineAtelierRenderWorkerUrl?: string;
    ensureLegacyUiBridge?: () => unknown;
    p5?: typeof import("p5");
    refreshUiState?: () => void;
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }
}

let resolvePreviewReady: (() => void) | null = null;
let rejectPreviewReady: ((reason?: unknown) => void) | null = null;
let previewReadySettled = false;

window.__lineAtelierImageWorkerUrl = legacyImageWorkerUrl;
window.__lineAtelierRenderWorkerUrl = legacyRenderWorkerUrl;
window.__lineAtelierPreviewEngineStatus = window.__lineAtelierPreviewEngineStatus || "idle";
window.__lineAtelierLoadExportRuntime = () => {
  return import("./boot/legacy-export-runtime").then((module) => module.loadLegacyExportRuntime());
};

window.__lineAtelierEnsurePreviewEngineBoot = () => {
  return bootstrapPreviewEngine();
};

window.__lineAtelierIsPreviewEngineReady = () => {
  return window.__lineAtelierPreviewEngineStatus === "ready";
};

window.__lineAtelierMarkPreviewEngineReady = () => {
  if (previewReadySettled) {
    return;
  }

  previewReadySettled = true;
  window.__lineAtelierPreviewEngineStatus = "ready";
  window.__lineAtelierPreviewEngineFailureMessage = "";
  resolvePreviewReady?.();
  syncLegacyUiState();
};

// Shows a boot failure message.
function showBootFailure(message: string) {
  const exportStatus = document.getElementById("export-status");
  if (exportStatus) {
    exportStatus.textContent = `应用启动失败：${message}`;
  }
}

function syncLegacyUiState() {
  if (typeof window.refreshUiState === "function") {
    window.refreshUiState();
    return;
  }

  window.dispatchEvent(new CustomEvent("lineatelier:uistate"));
}

function setPreviewEngineStatus(status: PreviewEngineStatus, failureMessage = "") {
  window.__lineAtelierPreviewEngineStatus = status;
  window.__lineAtelierPreviewEngineFailureMessage = failureMessage;
  syncLegacyUiState();
}

function ensurePreviewReadyPromise() {
  if (window.__lineAtelierPreviewEngineStatus === "ready") {
    return Promise.resolve();
  }

  if (!window.__lineAtelierPreviewReadyPromise) {
    previewReadySettled = false;
    window.__lineAtelierPreviewReadyPromise = new Promise<void>((resolve, reject) => {
      resolvePreviewReady = resolve;
      rejectPreviewReady = reject;
    });
  }

  return window.__lineAtelierPreviewReadyPromise;
}

function failPreviewEngineBoot(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (!previewReadySettled) {
    previewReadySettled = true;
    rejectPreviewReady?.(error);
  }
  setPreviewEngineStatus("failed", message);
  showBootFailure(message);
}

async function primeDefaultSourceAsset() {
  if (window.__lineAtelierDefaultSourceBlob && window.__lineAtelierDefaultSourceHref) {
    return;
  }

  const response = await fetch("/figure.avif", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`默认示例资源加载失败 (${response.status})`);
  }

  const blob = await response.blob();
  window.__lineAtelierDefaultSourceBlob = blob;
  window.__lineAtelierDefaultSourceHref = URL.createObjectURL(blob);
}

function scheduleP5Boot() {
  if (window.__lineAtelierP5BootPromise) {
    return window.__lineAtelierP5BootPromise;
  }

  const previewReadyPromise = ensurePreviewReadyPromise();
  window.__lineAtelierP5BootPromise = new Promise<void>((resolve, reject) => {
    requestAnimationFrame(() => {
      const p5ModuleStartedAt = performance.now();
      void import("p5")
        .then(async ({ default: p5 }) => {
          window.p5 = p5;
          console.info(`[boot] import p5 module: ${(performance.now() - p5ModuleStartedAt).toFixed(1)}ms`);

          const p5StartedAt = performance.now();
          if (!window.__lineAtelierP5Instance) {
            window.__lineAtelierP5Instance = new (p5 as unknown as { new (): unknown })();
          }
          console.info(`[boot] p5 global init: ${(performance.now() - p5StartedAt).toFixed(1)}ms`);
          await previewReadyPromise;
          resolve();
        })
        .catch((error: unknown) => {
          failPreviewEngineBoot(error);
          reject(error);
        });
    });
  });

  return window.__lineAtelierP5BootPromise;
}

function initializeLegacyUiBridge() {
  if (typeof window.ensureLegacyUiBridge === "function") {
    window.ensureLegacyUiBridge();
  }
  syncLegacyUiState();
}

// Bootstraps the legacy bridge scripts without starting the preview engine.
async function bootstrapLegacyBridge() {
  if (!window.__lineAtelierBridgeBootPromise) {
    const startedAt = performance.now();
    window.__lineAtelierBridgeBootPromise = loadClassicScripts(LEGACY_BRIDGE_SCRIPT_PATHS)
      .then(() => {
        initializeLegacyUiBridge();
        console.info(`[boot] bootstrapLegacyBridge: ${(performance.now() - startedAt).toFixed(1)}ms`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showBootFailure(message);
        throw error;
      });
  }

  return window.__lineAtelierBridgeBootPromise;
}

// Bootstraps the deferred preview engine after UI is already interactive.
async function bootstrapPreviewEngine() {
  if (!window.__lineAtelierPreviewBootPromise) {
    const startedAt = performance.now();
    setPreviewEngineStatus("booting");
    ensurePreviewReadyPromise();

    window.__lineAtelierPreviewBootPromise = Promise.resolve()
      .then(() => loadClassicScripts(LEGACY_PREVIEW_SCRIPT_PATHS))
      .then(async () => {
        await primeDefaultSourceAsset();
        const algorithmRuntimeStartedAt = performance.now();
        await import("./boot/legacy-algorithm-runtime").then((module) => module.loadLegacyAlgorithmRuntime());
        console.info(
          `[boot] legacy algorithm runtime: ${(performance.now() - algorithmRuntimeStartedAt).toFixed(1)}ms`
        );
        await scheduleP5Boot();
        console.info(`[boot] bootstrapPreviewEngine: ${(performance.now() - startedAt).toFixed(1)}ms`);
      })
      .catch((error: unknown) => {
        failPreviewEngineBoot(error);
        throw error;
      });
  }

  return window.__lineAtelierPreviewBootPromise;
}

function waitForFullPageLoad() {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForBrowserIdle(timeoutMs = 2000) {
  return new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), {
        timeout: timeoutMs
      });
      return;
    }

    window.setTimeout(resolve, 250);
  });
}

function scheduleDeferredPreviewBoot() {
  void waitForFullPageLoad()
    .then(() => waitForBrowserIdle())
    .then(() => {
      return window.__lineAtelierEnsurePreviewEngineBoot?.();
    })
    .catch((error: unknown) => {
      failPreviewEngineBoot(error);
    });
}

function renderAppShell() {
  const mountNode = document.getElementById("app");
  if (!mountNode) {
    throw new Error("Missing #app mount node");
  }

  const startedAt = performance.now();
  const root = createRoot(mountNode);
  // Ensures legacy scripts can query all UI nodes immediately after render.
  flushSync(() => {
    root.render(createElement(AppShell));
  });
  console.info(`[boot] renderAppShell: ${(performance.now() - startedAt).toFixed(1)}ms`);
}

async function startApp() {
  try {
    renderAppShell();
    await bootstrapLegacyBridge();
    scheduleDeferredPreviewBoot();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    showBootFailure(message);
    throw error;
  }
}

void startApp();

if (import.meta.hot) {
  import.meta.hot.accept();
}
