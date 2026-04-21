import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { CLASSIC_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";
import { AppShell } from "./ui/AppShell";

declare global {
  interface Window {
    __lineAtelierBootPromise?: Promise<void>;
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
    window.__lineAtelierBootPromise = loadClassicScripts(CLASSIC_SCRIPT_PATHS)
      .then(() => {
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
