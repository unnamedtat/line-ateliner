// Finds a previously loaded classic script.
function findExistingScript(src: string): HTMLScriptElement | undefined {
  return Array.from(document.querySelectorAll<HTMLScriptElement>("script[data-legacy-src]")).find(
    (script) => script.dataset.legacySrc === src
  );
}

function logBootTiming(label: string, durationMs: number) {
  console.info(`[boot] ${label}: ${durationMs.toFixed(1)}ms`);
}

// Adds preload hints so browser can fetch dependent scripts earlier.
function primeScriptPreloads(sources: readonly string[]) {
  for (const src of sources) {
    const existingPreload = document.querySelector<HTMLLinkElement>(`link[rel="preload"][as="script"][href="${src}"]`);
    if (existingPreload) {
      continue;
    }

    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "script";
    preloadLink.href = src;
    document.head.appendChild(preloadLink);
  }
}

// Loads one classic script.
function loadClassicScript(src: string): Promise<void> {
  const existingScript = findExistingScript(src);
  if (existingScript?.dataset.loaded === "true") {
    logBootTiming(`cached ${src}`, 0);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existingScript ?? document.createElement("script");
    const startedAt = performance.now();

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      script.dataset.loaded = "true";
      cleanup();
      logBootTiming(src, performance.now() - startedAt);
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load classic script: ${src}`));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.src = src;
      script.async = false;
      script.defer = false;
      script.dataset.legacySrc = src;
      document.body.appendChild(script);
    }
  });
}

// Loads classic scripts sequentially.
export async function loadClassicScripts(sources: readonly string[]): Promise<void> {
  const startedAt = performance.now();
  primeScriptPreloads(sources);

  for (const source of sources) {
    await loadClassicScript(source);
  }

  logBootTiming("classic scripts total", performance.now() - startedAt);
}
