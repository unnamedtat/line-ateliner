import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";

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
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title="提取与配对"
        tooltip="这里控制线条提取阈值，以及 edge-fill 模式里两侧边缘如何配对成一条填充线。"
      />

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill region-grow color-grow"
        })}
        data-modes="edge edge-fill region-grow color-grow"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="line-threshold">
            线亮度阈值
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
            边缘阈值
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
            填充配对阈值
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
            配对搜索网格
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
            最小法线间距
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
            最大法线间距
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
            最大切线偏移
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
            最小切线一致性
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
            最大法线同向性
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
            边缘平滑
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
            墨线阈值
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
            局部对比阈值
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
            颜色差阈值
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
