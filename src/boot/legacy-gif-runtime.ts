import gifLibrarySource from "../../node_modules/gif.js.optimized/dist/gif.js?raw";
import gifWorkerUrl from "../../node_modules/gif.js.optimized/dist/gif.worker.js?url";

declare global {
  interface Window {
    GIF?: new (options: Record<string, unknown>) => {
      addFrame(frame: unknown, options?: Record<string, unknown>): void;
      on(event: string, handler: (...args: unknown[]) => void): void;
      render(): void;
    };
    __lineAtelierGifWorkerUrl?: string;
    __lineAtelierGifLibraryPromise?: Promise<void>;
  }
}

function executeGlobalScript(source: string, label: string) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.text = `${source}\n//# sourceURL=${label}`;
  document.head.appendChild(script);
  script.remove();
}

export async function ensureLegacyGifLibraryLoaded() {
  if (typeof window.GIF === "function") {
    return;
  }

  if (!window.__lineAtelierGifLibraryPromise) {
    window.__lineAtelierGifLibraryPromise = Promise.resolve().then(() => {
      window.__lineAtelierGifWorkerUrl = gifWorkerUrl;
      executeGlobalScript(gifLibrarySource, "legacy-gif-library.js");

      if (typeof window.GIF !== "function") {
        throw new Error("GIF 编码器模块初始化失败。");
      }
    });
  }

  await window.__lineAtelierGifLibraryPromise;
}
