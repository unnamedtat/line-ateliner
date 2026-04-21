import exportActionsSource from "../../public/legacy/export/actions.js?raw";
import exportAssetsSource from "../../public/legacy/export/assets.js?raw";
import exportRenderSource from "../../public/legacy/export/render.js?raw";
import exportStateSource from "../../public/legacy/export/state.js?raw";

declare global {
  interface Window {
    __lineAtelierExportRuntimePromise?: Promise<void>;
    __lineAtelierEnsureGifLibraryLoaded?: () => Promise<void>;
  }
}

function executeGlobalScript(source: string, label: string) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.text = `${source}\n//# sourceURL=${label}`;
  document.head.appendChild(script);
  script.remove();
}

export async function loadLegacyExportRuntime() {
  if (!window.__lineAtelierExportRuntimePromise) {
    window.__lineAtelierExportRuntimePromise = (async () => {
      window.__lineAtelierEnsureGifLibraryLoaded = async () => {
        const { ensureLegacyGifLibraryLoaded } = await import("./legacy-gif-runtime");
        await ensureLegacyGifLibraryLoaded();
      };

      executeGlobalScript(exportStateSource, "legacy-export-state.js");
      executeGlobalScript(exportAssetsSource, "legacy-export-assets.js");
      executeGlobalScript(exportRenderSource, "legacy-export-render.js");
      executeGlobalScript(exportActionsSource, "legacy-export-actions.js");
    })();
  }

  await window.__lineAtelierExportRuntimePromise;
}
