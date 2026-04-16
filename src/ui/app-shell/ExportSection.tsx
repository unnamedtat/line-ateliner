import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyRecoveryAction } from "../legacy-ui-bridge";

interface ExportSectionProps {
  exportLocked: boolean;
  exportVideoLabel: string;
  exportGifLabel: string;
  exportStatus: string;
  exportEstimate: string;
  exportEstimateLevel: string;
  recoveryPrimary: LegacyRecoveryAction | null;
  recoverySecondary: LegacyRecoveryAction | null;
  onExportVideo(): void;
  onExportGif(): void;
  onRecoveryAction(action: string): void;
}

export function ExportSection({
  exportLocked,
  exportVideoLabel,
  exportGifLabel,
  exportStatus,
  exportEstimate,
  exportEstimateLevel,
  recoveryPrimary,
  recoverySecondary,
  onExportVideo,
  onExportGif,
  onRecoveryAction
}: ExportSectionProps) {
  const recoveryVisible = Boolean(recoveryPrimary || recoverySecondary);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title="导出"
        tooltip="导出当前动画。MP4 更适合常规交付，GIF 会逐帧编码，所以等待时间通常更长。"
      />

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-duration-seconds">
            导出时长
          </label>
          <span className="range-value" data-readout-for="export-duration-seconds">
            3s
          </span>
        </div>
        <input id="export-duration-seconds" type="range" min="1" max="8" step="1" defaultValue="3" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-frame-rate">
            导出帧率
          </label>
          <span className="range-value" data-readout-for="export-frame-rate">
            18fps
          </span>
        </div>
        <input id="export-frame-rate" type="range" min="8" max="30" step="1" defaultValue="18" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-resolution-scale">
            导出清晰度
          </label>
          <span className="range-value" data-readout-for="export-resolution-scale">
            200%
          </span>
        </div>
        <input
          id="export-resolution-scale"
          type="range"
          min="100"
          max="400"
          step="25"
          defaultValue="200"
        />
      </div>

      <div className="action-row action-row-export">
        <button
          className="action-button"
          id="export-video"
          type="button"
          disabled={exportLocked}
          onClick={onExportVideo}
        >
          {exportVideoLabel}
        </button>
        <button
          className="action-button"
          id="export-gif"
          type="button"
          disabled={exportLocked}
          onClick={onExportGif}
        >
          {exportGifLabel}
        </button>
      </div>

      <div className="control-note export-estimate" id="export-estimate" data-level={exportEstimateLevel}>
        {exportEstimate}
      </div>
      <div className="control-note export-status" id="export-status">
        {exportStatus}
      </div>
      <div
        className={`action-row action-row-export action-row-recovery${recoveryVisible ? "" : " is-hidden"}`}
        id="export-recovery-actions"
      >
        <button
          className={`action-button${recoveryPrimary ? "" : " is-hidden"}`}
          id="export-recovery-primary"
          type="button"
          disabled={exportLocked || !recoveryPrimary}
          data-export-action={recoveryPrimary?.action || ""}
          onClick={() => recoveryPrimary && onRecoveryAction(recoveryPrimary.action)}
        >
          {recoveryPrimary?.label || ""}
        </button>
        <button
          className={`action-button${recoverySecondary ? "" : " is-hidden"}`}
          id="export-recovery-secondary"
          type="button"
          disabled={exportLocked || !recoverySecondary}
          data-export-action={recoverySecondary?.action || ""}
          onClick={() => recoverySecondary && onRecoveryAction(recoverySecondary.action)}
        >
          {recoverySecondary?.label || ""}
        </button>
      </div>
    </section>
  );
}
