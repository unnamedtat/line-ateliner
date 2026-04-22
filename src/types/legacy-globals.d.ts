export {};

declare global {
  interface Window {
    __lineAtelierAlgorithmRuntimePromise?: Promise<void>;
    __lineAtelierBridgeBootPromise?: Promise<void>;
    __lineAtelierDefaultSourceBlob?: Blob;
    __lineAtelierDefaultSourceHref?: string;
    __lineAtelierEnsurePreviewEngineBoot?: () => Promise<void>;
    __forceLegacyImageFallback?: boolean;
    __forceLegacyRenderFallback?: boolean;
    __lineAtelierEnsureGifLibraryLoaded?: () => Promise<void>;
    __lineAtelierGifWorkerUrl?: string;
    __lineAtelierImageWorkerUrl?: string;
    __lineAtelierIsPreviewEngineReady?: () => boolean;
    __lineAtelierLoadExportRuntime?: () => Promise<void>;
    __lineAtelierMarkPreviewEngineReady?: () => void;
    __lineAtelierP5BootPromise?: Promise<void>;
    __lineAtelierPreviewBootPromise?: Promise<void>;
    __lineAtelierPreviewEngineFailureMessage?: string;
    __lineAtelierPreviewEngineStatus?: "idle" | "booting" | "ready" | "failed";
    __lineAtelierPreviewReadyPromise?: Promise<void>;
    __lineAtelierRenderWorkerUrl?: string;
    ensureLegacyUiBridge?: () => unknown;
    refreshUiState?: () => void;
  }

  function canUseLegacyImageWorker(): boolean;
  function canUseLegacyRenderWorker(): boolean;
  function clearSceneAssetImage(kind?: string): void;
  function clearRenderFrameCache(): void;
  function restoreSceneAfterBackgroundPause(force?: boolean): Promise<boolean> | boolean;
  function hasDrawableOutput(): boolean;

  let sourceImage:
    | {
        width?: number;
        height?: number;
      }
    | null
    | undefined;
  let edgeSamples: unknown[];
  let strokePaths: unknown[];
}
