import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { CLASSIC_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";
import { AppShell } from "./ui/AppShell";

declare global {
  interface Window {
    __lineAtelierBootPromise?: Promise<void>;
    __lineAtelierImageWorkerUrl?: string;
    __lineAtelierRenderWorkerUrl?: string;
    __lineAtelierExportWorkerUrl?: string;
    __lineAtelierMp4Muxer?: {
      ArrayBufferTarget: typeof ArrayBufferTarget;
      Muxer: typeof Muxer;
    };
    __lineAtelierTestMode?: boolean;
    __forceLegacyImageFallback?: boolean;
    __forceLegacyRenderFallback?: boolean;
  }
}

window.__lineAtelierImageWorkerUrl = new URL("./workers/legacy-image.worker.ts", import.meta.url).toString();
window.__lineAtelierRenderWorkerUrl = new URL("./workers/legacy-render.worker.ts", import.meta.url).toString();
window.__lineAtelierExportWorkerUrl = new URL("./workers/legacy-export.worker.ts", import.meta.url).toString();
window.__lineAtelierMp4Muxer = {
  ArrayBufferTarget,
  Muxer
};
window.__lineAtelierTestMode = typeof navigator !== "undefined" && navigator.webdriver === true;

// Shows a boot failure message.
function showBootFailure(message: string) {
  const exportStatus = document.getElementById("export-status");
  if (exportStatus) {
    exportStatus.textContent = `应用启动失败：${message}`;
  }
}

// Bootstraps the legacy app scripts.
async function bootstrapLegacyApp() {
  if (!window.__lineAtelierBootPromise) {
    window.__lineAtelierBootPromise = loadClassicScripts(CLASSIC_SCRIPT_PATHS)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showBootFailure(message);
        throw error;
      });
  }

  return window.__lineAtelierBootPromise;
}

function renderAppShell() {
  const mountNode = document.getElementById("app");
  if (!mountNode) {
    throw new Error("Missing #app mount node");
  }

  const root = createRoot(mountNode);
  // Ensures legacy scripts can query all UI nodes immediately after render.
  flushSync(() => {
    root.render(createElement(AppShell));
  });
}

async function startApp() {
  try {
    renderAppShell();
    await bootstrapLegacyApp();
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
