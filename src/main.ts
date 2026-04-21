import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import p5 from "p5";
import { CLASSIC_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";
import { AppShell } from "./ui/AppShell";

declare global {
  interface Window {
    __lineAtelierBootPromise?: Promise<void>;
    __lineAtelierP5Instance?: p5;
    p5?: typeof p5;
  }
}

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
    const startedAt = performance.now();
    window.p5 = p5;
    window.__lineAtelierBootPromise = loadClassicScripts(CLASSIC_SCRIPT_PATHS)
      .then(() => {
        const p5StartedAt = performance.now();
        if (!window.__lineAtelierP5Instance) {
          window.__lineAtelierP5Instance = new (p5 as unknown as { new (): p5 })();
        }
        console.info(`[boot] p5 global init: ${(performance.now() - p5StartedAt).toFixed(1)}ms`);
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
