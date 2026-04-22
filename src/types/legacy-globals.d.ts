export {};

declare global {
  interface Window {
    __lineAtelierAlgorithmRuntimePromise?: Promise<void>;
    __lineAtelierDefaultSourceBlob?: Blob;
    __lineAtelierDefaultSourceHref?: string;
    __forceLegacyImageFallback?: boolean;
    __forceLegacyRenderFallback?: boolean;
    __lineAtelierEnsureGifLibraryLoaded?: () => Promise<void>;
    __lineAtelierGifWorkerUrl?: string;
    __lineAtelierImageWorkerUrl?: string;
    __lineAtelierLoadAlgorithmRuntime?: () => Promise<void>;
    __lineAtelierLoadExportRuntime?: () => Promise<void>;
    __lineAtelierRenderWorkerUrl?: string;
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
