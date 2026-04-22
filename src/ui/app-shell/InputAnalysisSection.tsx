import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

interface InputAnalysisSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
  imageName: string;
  importExportLocked: boolean;
}

export function InputAnalysisSection({
  snapshot,
  actions,
  imageName,
  importExportLocked
}: InputAnalysisSectionProps) {
  const { copy } = useAppLocale();
  const fileButtonClassName = `file-button${importExportLocked ? " is-disabled" : ""}`;
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title={copy.input.title}
        tooltip={copy.input.tooltip}
      />

      <div className="control-block">
        <label className="control-label" htmlFor="render-mode">
          {copy.input.renderMode}
        </label>
        <select
          id="render-mode"
          value={String(controlValue("render-mode"))}
          onChange={(event) => actions.updateSelect("render-mode", event.currentTarget.value)}
        >
          <option value="edge-fill">{copy.input.renderModes["edge-fill"]}</option>
          <option value="distortion">{copy.input.renderModes.distortion}</option>
          <option value="edge">{copy.input.renderModes.edge}</option>
          <option value="path">{copy.input.renderModes.path}</option>
          <option value="color-boundary">{copy.input.renderModes["color-boundary"]}</option>
          <option value="contour">{copy.input.renderModes.contour}</option>
        </select>
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "contour" })}
        data-modes="contour"
      >
        <label className="control-label" htmlFor="contour-variant">
          {copy.input.contourVariant}
        </label>
        <select
          id="contour-variant"
          value={String(controlValue("contour-variant"))}
          onChange={(event) => actions.updateSelect("contour-variant", event.currentTarget.value)}
        >
          <option value="contour">{copy.input.contourVariants.contour}</option>
          <option value="wave-contour">{copy.input.contourVariants["wave-contour"]}</option>
          <option value="wave-shape">{copy.input.contourVariants["wave-shape"]}</option>
          <option value="rubber-contour">{copy.input.contourVariants["rubber-contour"]}</option>
        </select>
      </div>

      <div className={getVisibilityClassName(snapshot, "control-note", { modes: "edge" })} data-modes="edge">
        {copy.input.notes.edge}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "edge-fill" })}
        data-modes="edge-fill"
      >
        {copy.input.notes["edge-fill"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "region-grow" })}
        data-modes="region-grow"
      >
        {copy.input.notes["region-grow"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "color-grow" })}
        data-modes="color-grow"
      >
        {copy.input.notes["color-grow"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "color-boundary" })}
        data-modes="color-boundary"
      >
        {copy.input.notes["color-boundary"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "distortion" })}
        data-modes="distortion"
      >
        {copy.input.notes.distortion}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", { modes: "contour-variant-contour" })}
        data-modes="contour-variant-contour"
      >
        {copy.input.notes["contour-variant-contour"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", {
          modes: "contour-variant-wave-contour"
        })}
        data-modes="contour-variant-wave-contour"
      >
        {copy.input.notes["contour-variant-wave-contour"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", {
          modes: "contour-variant-wave-shape"
        })}
        data-modes="contour-variant-wave-shape"
      >
        {copy.input.notes["contour-variant-wave-shape"]}
      </div>
      <div
        className={getVisibilityClassName(snapshot, "control-note", {
          modes: "contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-rubber-contour"
      >
        {copy.input.notes["contour-variant-rubber-contour"]}
      </div>
      <div className={getVisibilityClassName(snapshot, "control-note", { modes: "path" })} data-modes="path">
        {copy.input.notes.path}
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="image-upload">
          {copy.input.image}
        </label>
        <div className="upload-row">
          <label
            className={fileButtonClassName}
            htmlFor="image-upload"
            aria-disabled={importExportLocked ? "true" : "false"}
          >
            {copy.input.selectFile}
          </label>
        </div>
        <input
          id="image-upload"
          type="file"
          accept="image/avif,image/png,image/jpeg,image/webp,image/gif"
          disabled={importExportLocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              actions.updateFile("image-upload", file);
              event.currentTarget.value = "";
            }
          }}
        />
        <div className="image-name" id="image-name">
          {imageName}
        </div>
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill region-grow color-grow color-boundary contour path"
        })}
        data-modes="edge edge-fill region-grow color-grow color-boundary contour path"
      >
        <label className="control-label" htmlFor="reference-overlay">
          {copy.input.overlay}
        </label>
        <select
          id="reference-overlay"
          value={String(controlValue("reference-overlay"))}
          onChange={(event) => actions.updateSelect("reference-overlay", event.currentTarget.value)}
        >
          <option value="off">{copy.input.overlayOptions.off}</option>
          <option value="on">{copy.input.overlayOptions.on}</option>
        </select>
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill region-grow color-grow color-boundary contour path",
          requiresOverlay: true
        })}
        data-modes="edge edge-fill region-grow color-grow color-boundary contour path"
        data-requires-overlay="true"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="reference-overlay-opacity">
            {copy.input.overlayOpacity}
          </label>
          <span className="range-value" data-readout-for="reference-overlay-opacity">
            {rangeReadout("reference-overlay-opacity")}
          </span>
        </div>
        <input
          id="reference-overlay-opacity"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(controlValue("reference-overlay-opacity"))}
          onInput={(event) =>
            actions.updateRange("reference-overlay-opacity", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("reference-overlay-opacity", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill region-grow color-grow color-boundary contour path"
        })}
        data-modes="edge edge-fill region-grow color-grow color-boundary contour path"
      >
        <label className="control-label" htmlFor="analysis-quality">
          {copy.input.quality}
        </label>
        <select
          id="analysis-quality"
          value={String(controlValue("analysis-quality"))}
          onChange={(event) => actions.updateSelect("analysis-quality", event.currentTarget.value)}
        >
          <option value="low">{copy.input.qualityOptions.low}</option>
          <option value="medium">{copy.input.qualityOptions.medium}</option>
          <option value="high">{copy.input.qualityOptions.high}</option>
        </select>
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-scale">
            {copy.input.sceneScale}
          </label>
          <span className="range-value" data-readout-for="scene-scale">
            {rangeReadout("scene-scale")}
          </span>
        </div>
        <input
          id="scene-scale"
          type="range"
          min="20"
          max="240"
          step="1"
          value={Number(controlValue("scene-scale"))}
          onInput={(event) => actions.updateRange("scene-scale", Number(event.currentTarget.value), "input")}
          onChange={(event) => actions.updateRange("scene-scale", Number(event.currentTarget.value), "change")}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-offset-x">
            {copy.input.sceneOffsetX}
          </label>
          <span className="range-value" data-readout-for="scene-offset-x">
            {rangeReadout("scene-offset-x")}
          </span>
        </div>
        <input
          id="scene-offset-x"
          type="range"
          min="-80"
          max="80"
          step="1"
          value={Number(controlValue("scene-offset-x"))}
          onInput={(event) => actions.updateRange("scene-offset-x", Number(event.currentTarget.value), "input")}
          onChange={(event) => actions.updateRange("scene-offset-x", Number(event.currentTarget.value), "change")}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-offset-y">
            {copy.input.sceneOffsetY}
          </label>
          <span className="range-value" data-readout-for="scene-offset-y">
            {rangeReadout("scene-offset-y")}
          </span>
        </div>
        <input
          id="scene-offset-y"
          type="range"
          min="-80"
          max="80"
          step="1"
          value={Number(controlValue("scene-offset-y"))}
          onInput={(event) => actions.updateRange("scene-offset-y", Number(event.currentTarget.value), "input")}
          onChange={(event) => actions.updateRange("scene-offset-y", Number(event.currentTarget.value), "change")}
        />
      </div>
    </section>
  );
}
