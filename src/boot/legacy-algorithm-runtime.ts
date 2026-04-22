import analysisAsyncSource from "../../public/legacy/analysis/async.js?raw";
import analysisCacheSource from "../../public/legacy/analysis/cache.js?raw";
import analysisMaskBuildersSource from "../../public/legacy/analysis/mask-builders.js?raw";
import analysisSyncSource from "../../public/legacy/analysis/sync.js?raw";
import edgeAsyncSource from "../../public/legacy/edge/async.js?raw";
import edgeModesSource from "../../public/legacy/edge/modes.js?raw";
import edgeRenderSource from "../../public/legacy/edge/render.js?raw";
import pathProcessingSource from "../../public/legacy/path/processing.js?raw";
import pathTraceSource from "../../public/legacy/path/trace.js?raw";
import pathVariantsSource from "../../public/legacy/path/variants.js?raw";

declare global {
  interface Window {
    __lineAtelierAlgorithmRuntimePromise?: Promise<void>;
  }
}

function executeGlobalScript(source: string, label: string) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.text = `${source}\n//# sourceURL=${label}`;
  document.head.appendChild(script);
  script.remove();
}

const LEGACY_ALGORITHM_SOURCES = [
  ["legacy-analysis-cache.js", analysisCacheSource],
  ["legacy-analysis-async.js", analysisAsyncSource],
  ["legacy-analysis-sync.js", analysisSyncSource],
  ["legacy-analysis-mask-builders.js", analysisMaskBuildersSource],
  ["legacy-edge-modes.js", edgeModesSource],
  ["legacy-edge-async.js", edgeAsyncSource],
  ["legacy-edge-render.js", edgeRenderSource],
  ["legacy-path-processing.js", pathProcessingSource],
  ["legacy-path-trace.js", pathTraceSource],
  ["legacy-path-variants.js", pathVariantsSource]
] as const;

export async function loadLegacyAlgorithmRuntime() {
  if (!window.__lineAtelierAlgorithmRuntimePromise) {
    window.__lineAtelierAlgorithmRuntimePromise = Promise.resolve().then(() => {
      for (const [label, source] of LEGACY_ALGORITHM_SOURCES) {
        executeGlobalScript(source, label);
      }
    });
  }

  await window.__lineAtelierAlgorithmRuntimePromise;
}
