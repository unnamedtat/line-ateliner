import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { CLASSIC_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";
import { AppShell } from "./ui/AppShell";
import legacyImageWorkerUrl from "./workers/legacy-image.worker?worker&url";
import legacyRenderWorkerUrl from "./workers/legacy-render.worker?worker&url";

declare global {
  interface Window {
    __lineAtelierBootPromise?: Promise<void>;
    __lineAtelierImageWorkerUrl?: string;
    __lineAtelierLoadExportRuntime?: () => Promise<void>;
    __lineAtelierP5Instance?: unknown;
    __lineAtelierP5BootPromise?: Promise<void>;
    __lineAtelierRenderWorkerUrl?: string;
    p5?: typeof import("p5");
  }
}

window.__lineAtelierImageWorkerUrl = legacyImageWorkerUrl;
window.__lineAtelierRenderWorkerUrl = legacyRenderWorkerUrl;
window.__lineAtelierLoadExportRuntime = () => {
  return import("./boot/legacy-export-runtime").then((module) => module.loadLegacyExportRuntime());
};

// Shows a boot failure message.
function showBootFailure(message: string) {
  const exportStatus = document.getElementById("export-status");
  if (exportStatus) {
    exportStatus.textContent = `应用启动失败：${message}`;
  }
}

function scheduleP5Boot() {
  if (window.__lineAtelierP5BootPromise) {
    return window.__lineAtelierP5BootPromise;
  }

  window.__lineAtelierP5BootPromise = new Promise<void>((resolve, reject) => {
    requestAnimationFrame(() => {
      const p5ModuleStartedAt = performance.now();
      void import("p5")
        .then(({ default: p5 }) => {
          window.p5 = p5;
          console.info(`[boot] import p5 module: ${(performance.now() - p5ModuleStartedAt).toFixed(1)}ms`);

          const p5StartedAt = performance.now();
          if (!window.__lineAtelierP5Instance) {
            window.__lineAtelierP5Instance = new (p5 as unknown as { new (): unknown })();
          }
          console.info(`[boot] p5 global init: ${(performance.now() - p5StartedAt).toFixed(1)}ms`);
          resolve();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          showBootFailure(message);
          reject(error);
        });
    });
  });

  return window.__lineAtelierP5BootPromise;
}

// Bootstraps the legacy app scripts.
async function bootstrapLegacyApp() {
  if (!window.__lineAtelierBootPromise) {
    const startedAt = performance.now();
    window.__lineAtelierBootPromise = loadClassicScripts(CLASSIC_SCRIPT_PATHS)
      .then(() => {
        void scheduleP5Boot();
        console.info(`[boot] bootstrapLegacyApp: ${(performance.now() - startedAt).toFixed(1)}ms`);
      })
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
