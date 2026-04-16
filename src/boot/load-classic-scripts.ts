function findExistingScript(src: string): HTMLScriptElement | undefined {
  return Array.from(document.querySelectorAll<HTMLScriptElement>("script[data-legacy-src]")).find(
    (script) => script.dataset.legacySrc === src
  );
}

function loadClassicScript(src: string): Promise<void> {
  const existingScript = findExistingScript(src);
  if (existingScript?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existingScript ?? document.createElement("script");

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      script.dataset.loaded = "true";
      cleanup();
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

export async function loadClassicScripts(sources: readonly string[]): Promise<void> {
  for (const source of sources) {
    await loadClassicScript(source);
  }
}
