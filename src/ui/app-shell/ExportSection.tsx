import type { ChangeEvent, FormEvent } from "react";
import { ControlGroupHeading } from "./ControlGroupHeading";
import type {
  LegacyRecoveryAction,
  LegacyUiActions,
  LegacyUiSnapshot
} from "../legacy-ui-bridge";
import { getControlValue, getRangeReadout } from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

interface ExportSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
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
  snapshot,
  actions,
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
  const { copy } = useAppLocale();
  const recoveryVisible = Boolean(recoveryPrimary || recoverySecondary);
  const bindRange = (id: string) => ({
    value: Number(getControlValue(snapshot, id)),
    onInput: (event: FormEvent<HTMLInputElement>) =>
      actions.updateRange(id, Number(event.currentTarget.value), "input"),
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      actions.updateRange(id, Number(event.currentTarget.value), "change")
  });

  return (
    <section className="control-group">
      <ControlGroupHeading
        title={copy.export.title}
        tooltip={copy.export.tooltip}
      />

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-duration-seconds">
            {copy.export.duration}
          </label>
          <span className="range-value" data-readout-for="export-duration-seconds">
            {getRangeReadout(snapshot, "export-duration-seconds")}
          </span>
        </div>
        <input id="export-duration-seconds" type="range" min="1" max="8" step="1" {...bindRange("export-duration-seconds")} />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-frame-rate">
            {copy.export.frameRate}
          </label>
          <span className="range-value" data-readout-for="export-frame-rate">
            {getRangeReadout(snapshot, "export-frame-rate")}
          </span>
        </div>
        <input id="export-frame-rate" type="range" min="8" max="30" step="1" {...bindRange("export-frame-rate")} />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-resolution-scale">
            {copy.export.resolution}
          </label>
          <span className="range-value" data-readout-for="export-resolution-scale">
            {getRangeReadout(snapshot, "export-resolution-scale")}
          </span>
        </div>
        <input
          id="export-resolution-scale"
          type="range"
          min="100"
          max="400"
          step="25"
          {...bindRange("export-resolution-scale")}
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

      <div className="control-note export-foreground-warning" role="alert" aria-live="polite">
        {copy.export.foregroundWarning}
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
