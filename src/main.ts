import { CLASSIC_SCRIPT_PATHS } from "./boot/legacy-manifest";
import { loadClassicScripts } from "./boot/load-classic-scripts";

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
    window.__lineAtelierBootPromise = loadClassicScripts(CLASSIC_SCRIPT_PATHS)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showBootFailure(message);
        throw error;
      });
  }

  return window.__lineAtelierBootPromise;
}

void bootstrapLegacyApp();

if (import.meta.hot) {
  import.meta.hot.accept();
}
