import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import { getControlValue, getRangeReadout } from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

interface PaperBackgroundSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
  importExportLocked: boolean;
  textureUploadSummary: string;
}

export function PaperBackgroundSection({
  snapshot,
  actions,
  importExportLocked,
  textureUploadSummary
}: PaperBackgroundSectionProps) {
  const { copy } = useAppLocale();
  const fileButtonClassName = `file-button${importExportLocked ? " is-disabled" : ""}`;
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title={copy.paper.title}
        tooltip={copy.paper.tooltip}
      />

      <div className="control-block">
        <label className="control-label" htmlFor="background-preset">
          {copy.paper.preset}
        </label>
        <select
          id="background-preset"
          value={String(controlValue("background-preset"))}
          onChange={(event) => actions.updateSelect("background-preset", event.currentTarget.value)}
        >
          <option value="warm">{copy.paper.presets.warm}</option>
          <option value="white">{copy.paper.presets.white}</option>
          <option value="sketchbook">{copy.paper.presets.sketchbook}</option>
          <option value="blue">{copy.paper.presets.blue}</option>
          <option value="grey">{copy.paper.presets.grey}</option>
        </select>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="paper-fill-mode">
          {copy.paper.fillMode}
        </label>
        <select
          id="paper-fill-mode"
          value={String(controlValue("paper-fill-mode"))}
          onChange={(event) => actions.updateSelect("paper-fill-mode", event.currentTarget.value)}
        >
          <option value="solid">{copy.paper.fillModes.solid}</option>
          <option value="gradient">{copy.paper.fillModes.gradient}</option>
        </select>
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-gradient-angle">
            {copy.paper.gradientAngle}
          </label>
          <span className="range-value" data-readout-for="paper-gradient-angle">
            {rangeReadout("paper-gradient-angle")}
          </span>
        </div>
        <input
          id="paper-gradient-angle"
          type="range"
          min="0"
          max="360"
          step="1"
          value={Number(controlValue("paper-gradient-angle"))}
          onInput={(event) =>
            actions.updateRange("paper-gradient-angle", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-gradient-angle", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="control-label">{copy.paper.paperColors}</div>
        <div className="swatch-row">
          <input
            id="paper-color"
            type="color"
            value={String(controlValue("paper-color"))}
            onInput={(event) => actions.updateColor("paper-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("paper-color", event.currentTarget.value)}
          />
          <input
            id="paper-accent-color"
            type="color"
            value={String(controlValue("paper-accent-color"))}
            onInput={(event) => actions.updateColor("paper-accent-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("paper-accent-color", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="paper-texture">
          {copy.paper.texture}
        </label>
        <select
          id="paper-texture"
          value={String(controlValue("paper-texture"))}
          onChange={(event) => actions.updateSelect("paper-texture", event.currentTarget.value)}
        >
          <option value="none">{copy.paper.textures.none}</option>
          <option value="grain">{copy.paper.textures.grain}</option>
          <option value="speckle">{copy.paper.textures.speckle}</option>
          <option value="cloud">{copy.paper.textures.cloud}</option>
          <option value="crosshatch">{copy.paper.textures.crosshatch}</option>
          <option value="upload">{copy.paper.textures.upload}</option>
        </select>
      </div>

      <div className="control-block">
        <div className="control-label">{copy.paper.textureColors}</div>
        <div className="swatch-row">
          <input
            id="texture-color"
            type="color"
            value={String(controlValue("texture-color"))}
            onInput={(event) => actions.updateColor("texture-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("texture-color", event.currentTarget.value)}
          />
          <input
            id="texture-accent-color"
            type="color"
            value={String(controlValue("texture-accent-color"))}
            onInput={(event) => actions.updateColor("texture-accent-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("texture-accent-color", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="texture-upload">
          {copy.paper.textureImage}
        </label>
        <div className="upload-row">
          <label
            className={fileButtonClassName}
            htmlFor="texture-upload"
            aria-disabled={importExportLocked ? "true" : "false"}
          >
            {copy.paper.uploadTexture}
          </label>
          <div className="file-summary" id="texture-upload-summary">
            {textureUploadSummary}
          </div>
        </div>
        <input
          id="texture-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={importExportLocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              actions.updateFile("texture-upload", file);
              event.currentTarget.value = "";
            }
          }}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-strength">
            {copy.paper.textureStrength}
          </label>
          <span className="range-value" data-readout-for="paper-texture-strength">
            {rangeReadout("paper-texture-strength")}
          </span>
        </div>
        <input
          id="paper-texture-strength"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(controlValue("paper-texture-strength"))}
          onInput={(event) =>
            actions.updateRange("paper-texture-strength", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-strength", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-opacity">
            {copy.paper.textureOpacity}
          </label>
          <span className="range-value" data-readout-for="paper-texture-opacity">
            {rangeReadout("paper-texture-opacity")}
          </span>
        </div>
        <input
          id="paper-texture-opacity"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(controlValue("paper-texture-opacity"))}
          onInput={(event) =>
            actions.updateRange("paper-texture-opacity", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-opacity", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-scale">
            {copy.paper.textureScale}
          </label>
          <span className="range-value" data-readout-for="paper-texture-scale">
            {rangeReadout("paper-texture-scale")}
          </span>
        </div>
        <input
          id="paper-texture-scale"
          type="range"
          min="10"
          max="100"
          step="1"
          value={Number(controlValue("paper-texture-scale"))}
          onInput={(event) =>
            actions.updateRange("paper-texture-scale", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-scale", Number(event.currentTarget.value), "change")
          }
        />
      </div>
    </section>
  );
}
