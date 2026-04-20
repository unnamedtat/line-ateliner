import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

interface ExtractionPairingSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
}

function renderRangeInput(
  actions: LegacyUiActions,
  id: string,
  value: string | number,
  min: number,
  max: number,
  step: number
) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={Number(value)}
      onInput={(event) => actions.updateRange(id, Number(event.currentTarget.value), "input")}
      onChange={(event) => actions.updateRange(id, Number(event.currentTarget.value), "change")}
    />
  );
}

export function ExtractionPairingSection({ snapshot, actions }: ExtractionPairingSectionProps) {
  const { copy } = useAppLocale();
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title={copy.extraction.title}
        tooltip={copy.extraction.tooltip}
      />

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill region-grow color-grow"
        })}
        data-modes="edge edge-fill region-grow color-grow"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="line-threshold">
            {copy.extraction.lineThreshold}
          </label>
          <span className="range-value" data-readout-for="line-threshold">
            {rangeReadout("line-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "line-threshold", controlValue("line-threshold"), 96, 254, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour"
        })}
        data-modes="edge edge-fill contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-threshold">
            {copy.extraction.edgeThreshold}
          </label>
          <span className="range-value" data-readout-for="edge-threshold">
            {rangeReadout("edge-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-threshold", controlValue("edge-threshold"), 4, 180, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-threshold">
            {copy.extraction.fillThreshold}
          </label>
          <span className="range-value" data-readout-for="edge-fill-threshold">
            {rangeReadout("edge-fill-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-threshold", controlValue("edge-fill-threshold"), 0, 55, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-cell-size">
            {copy.extraction.cellSize}
          </label>
          <span className="range-value" data-readout-for="edge-fill-cell-size">
            {rangeReadout("edge-fill-cell-size")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-cell-size", controlValue("edge-fill-cell-size"), 1, 24, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-min-normal-gap">
            {copy.extraction.minNormalGap}
          </label>
          <span className="range-value" data-readout-for="edge-fill-min-normal-gap">
            {rangeReadout("edge-fill-min-normal-gap")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-min-normal-gap", controlValue("edge-fill-min-normal-gap"), 0, 80, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-normal-gap">
            {copy.extraction.maxNormalGap}
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-normal-gap">
            {rangeReadout("edge-fill-max-normal-gap")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-max-normal-gap", controlValue("edge-fill-max-normal-gap"), 1, 240, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-tangent-gap">
            {copy.extraction.maxTangentGap}
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-tangent-gap">
            {rangeReadout("edge-fill-max-tangent-gap")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-max-tangent-gap", controlValue("edge-fill-max-tangent-gap"), 0, 180, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-min-tangent-dot">
            {copy.extraction.minTangentDot}
          </label>
          <span className="range-value" data-readout-for="edge-fill-min-tangent-dot">
            {rangeReadout("edge-fill-min-tangent-dot")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-min-tangent-dot", controlValue("edge-fill-min-tangent-dot"), 0, 100, 1)}
      </div>

      <div className={getVisibilityClassName(snapshot, "control-block", { modes: "edge-fill" })} data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-normal-dot">
            {copy.extraction.maxNormalDot}
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-normal-dot">
            {rangeReadout("edge-fill-max-normal-dot")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-fill-max-normal-dot", controlValue("edge-fill-max-normal-dot"), -100, 100, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary path"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-smoothness">
            {copy.extraction.smoothness}
          </label>
          <span className="range-value" data-readout-for="edge-smoothness">
            {rangeReadout("edge-smoothness")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-smoothness", controlValue("edge-smoothness"), 0, 6, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path contour" })}
        data-modes="path contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="ink-threshold">
            {copy.extraction.inkThreshold}
          </label>
          <span className="range-value" data-readout-for="ink-threshold">
            {rangeReadout("ink-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "ink-threshold", controlValue("ink-threshold"), 96, 254, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "path contour region-grow color-grow color-boundary"
        })}
        data-modes="path contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="contrast-threshold">
            {copy.extraction.contrastThreshold}
          </label>
          <span className="range-value" data-readout-for="contrast-threshold">
            {rangeReadout("contrast-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "contrast-threshold", controlValue("contrast-threshold"), 0, 80, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "color-grow color-boundary"
        })}
        data-modes="color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="color-threshold">
            {copy.extraction.colorThreshold}
          </label>
          <span className="range-value" data-readout-for="color-threshold">
            {rangeReadout("color-threshold")}
          </span>
        </div>
        {renderRangeInput(actions, "color-threshold", controlValue("color-threshold"), 1, 160, 1)}
      </div>
    </section>
  );
}
