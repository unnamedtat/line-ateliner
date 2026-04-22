import { OverlayLayers } from "./OverlayLayers";
import { useAppLocale } from "../i18n";

interface CanvasShellProps {
  canvasEmptyVisible: boolean;
  previewBooting: boolean;
  processingVisible: boolean;
  processingBadge: string;
  processingCopy: string;
  processingActionsVisible: boolean;
  toolbarExportVideoLabel: string;
  importExportLocked: boolean;
  exportLocked: boolean;
  onExportVideo(): void;
  onContinueAnalysisWait(): void;
  onCancelAnalysisWait(): void;
}

export function CanvasShell({
  canvasEmptyVisible,
  previewBooting,
  processingVisible,
  processingBadge,
  processingCopy,
  processingActionsVisible,
  toolbarExportVideoLabel,
  importExportLocked,
  exportLocked,
  onExportVideo,
  onContinueAnalysisWait,
  onCancelAnalysisWait
}: CanvasShellProps) {
  const { copy } = useAppLocale();
  const toolbarLabelClassName = `toolbar-label mobile-only-control${importExportLocked ? " is-disabled" : ""}`;

  return (
    <section className="canvas-shell">
      <div className="canvas-stage">
        <div className="canvas-stage-grid" aria-hidden="true"></div>
        <div className={`canvas-preview-boot${previewBooting ? "" : " is-hidden"}`} id="canvas-preview-boot">
          <img
            className="canvas-preview-boot-image"
            src="/figure.png"
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <div className="canvas-preview-boot-copy">{processingCopy}</div>
        </div>
        <div
          className={`canvas-empty-state${canvasEmptyVisible ? "" : " is-hidden"}`}
          id="canvas-empty-state"
        >
          <div className="canvas-empty-icon" aria-hidden="true">
            <svg width="108" height="92" viewBox="0 0 108 92" fill="none">
              <path d="M28 24h23l9 9h20v39H28V24Z" stroke="currentColor" strokeWidth="4" />
              <path d="M28 38h52" stroke="currentColor" strokeWidth="4" />
              <path d="M38 52h30" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
              <path d="M38 68h24" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
            </svg>
          </div>
          <div className="canvas-empty-copy">{copy.canvas.emptyCopy}</div>
          <div className="canvas-empty-types">{copy.canvas.emptyTypes}</div>
        </div>
        <div
          className={`canvas-processing-state${processingVisible ? "" : " is-hidden"}`}
          id="canvas-processing-state"
          aria-live="polite"
        >
          <div className="canvas-processing-badge" id="canvas-processing-badge">
            {processingBadge}
          </div>
          <div className="canvas-processing-copy" id="canvas-processing-copy">
            {processingCopy}
          </div>
          <div
            className={`canvas-processing-actions${processingActionsVisible ? "" : " is-hidden"}`}
            id="canvas-processing-actions"
          >
            <button
              className="canvas-processing-button"
              id="analysis-continue-wait"
              type="button"
              onClick={onContinueAnalysisWait}
            >
              {copy.canvas.continueWait}
            </button>
            <button
              className="canvas-processing-button is-secondary"
              id="analysis-stop-wait"
              type="button"
              onClick={onCancelAnalysisWait}
            >
              {copy.canvas.stopWait}
            </button>
          </div>
        </div>
        <div className="canvas-mount" id="canvas-mount"></div>
        <OverlayLayers />
      </div>
      <div className="toolbar">
        <button
          className="toolbar-button toolbar-icon-button mobile-only-control"
          id="toolbar-export-video"
          type="button"
          disabled={exportLocked}
          onClick={onExportVideo}
        >
          {toolbarExportVideoLabel}
        </button>
        <label
          className={toolbarLabelClassName}
          htmlFor="image-upload"
          aria-disabled={importExportLocked ? "true" : "false"}
        >
          {copy.canvas.selectFile}
        </label>
      </div>
    </section>
  );
}
