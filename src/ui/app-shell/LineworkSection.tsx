import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

interface LineworkSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
}

export function LineworkSection({ snapshot, actions }: LineworkSectionProps) {
  const { copy } = useAppLocale();
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section
      className={getVisibilityClassName(snapshot, "control-group", {
        modes: "edge edge-fill contour region-grow color-grow color-boundary path"
      })}
      data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
    >
      <ControlGroupHeading
        title={copy.linework.title}
        tooltip={copy.linework.tooltip}
      />

      <div className="control-block">
        <label className="control-label" htmlFor="ink-color">
          {copy.linework.inkColor}
        </label>
        <input
          id="ink-color"
          type="color"
          value={String(controlValue("ink-color"))}
          onInput={(event) => actions.updateColor("ink-color", event.currentTarget.value)}
          onChange={(event) => actions.updateColor("ink-color", event.currentTarget.value)}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="ink-opacity">
            {copy.linework.inkOpacity}
          </label>
          <span className="range-value" data-readout-for="ink-opacity">
            {rangeReadout("ink-opacity")}
          </span>
        </div>
        <input
          id="ink-opacity"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(controlValue("ink-opacity"))}
          onInput={(event) => actions.updateRange("ink-opacity", Number(event.currentTarget.value), "input")}
          onChange={(event) => actions.updateRange("ink-opacity", Number(event.currentTarget.value), "change")}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="line-width-scale">
            {copy.linework.lineWidth}
          </label>
          <span className="range-value" data-readout-for="line-width-scale">
            {rangeReadout("line-width-scale")}
          </span>
        </div>
        <input
          id="line-width-scale"
          type="range"
          min="40"
          max="260"
          step="1"
          value={Number(controlValue("line-width-scale"))}
          onInput={(event) =>
            actions.updateRange("line-width-scale", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("line-width-scale", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-note">{copy.linework.note}</div>
    </section>
  );
}
