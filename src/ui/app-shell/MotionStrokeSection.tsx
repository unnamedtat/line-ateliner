import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";

interface MotionStrokeSectionProps {
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

export function MotionStrokeSection({ snapshot, actions }: MotionStrokeSectionProps) {
  return (
    <section className="control-group">
      <ControlGroupHeading
        title="动态与笔触"
        tooltip="控制沸腾感、边缘抖动和路径笔触粗细变化。它们主要影响绘制表现，不改原图分析。"
      />

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary path"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="boil-hold-frames">
            抖动速度
          </label>
          <span className="range-value" data-readout-for="boil-hold-frames">
            {getRangeReadout(snapshot, "boil-hold-frames", "5")}
          </span>
        </div>
        {renderRangeInput(actions, "boil-hold-frames", getControlValue(snapshot, "boil-hold-frames", 5), 2, 12, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-normal">
            轮廓法线抖动
          </label>
          <span className="range-value" data-readout-for="edge-jitter-normal">
            {getRangeReadout(snapshot, "edge-jitter-normal", "20")}
          </span>
        </div>
        {renderRangeInput(
          actions,
          "edge-jitter-normal",
          getControlValue(snapshot, "edge-jitter-normal", 20),
          0,
          200,
          1
        )}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-tangent">
            轮廓切线抖动
          </label>
          <span className="range-value" data-readout-for="edge-jitter-tangent">
            {getRangeReadout(snapshot, "edge-jitter-tangent", "6")}
          </span>
        </div>
        {renderRangeInput(
          actions,
          "edge-jitter-tangent",
          getControlValue(snapshot, "edge-jitter-tangent", 6),
          0,
          200,
          1
        )}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-amplitude">
            波浪振幅
          </label>
          <span className="range-value" data-readout-for="wave-amplitude">
            {getRangeReadout(snapshot, "wave-amplitude", "14")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-amplitude", getControlValue(snapshot, "wave-amplitude", 14), 0, 60, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-frequency">
            波浪频率
          </label>
          <span className="range-value" data-readout-for="wave-frequency">
            {getRangeReadout(snapshot, "wave-frequency", "28")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-frequency", getControlValue(snapshot, "wave-frequency", 28), 1, 120, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-speed">
            波浪速度
          </label>
          <span className="range-value" data-readout-for="wave-speed">
            {getRangeReadout(snapshot, "wave-speed", "45")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-speed", getControlValue(snapshot, "wave-speed", 45), 0, 100, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "contour" })}
        data-modes="contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="contour-stroke-thickness">
            轮廓粗细
          </label>
          <span className="range-value" data-readout-for="contour-stroke-thickness">
            {getRangeReadout(snapshot, "contour-stroke-thickness", "100%")}
          </span>
        </div>
        {renderRangeInput(
          actions,
          "contour-stroke-thickness",
          getControlValue(snapshot, "contour-stroke-thickness", 100),
          40,
          260,
          1
        )}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-scale">
            形变强度
          </label>
          <span className="range-value" data-readout-for="distortion-scale">
            {getRangeReadout(snapshot, "distortion-scale", "20")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-scale", getControlValue(snapshot, "distortion-scale", 20), 0, 120, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-frequency">
            噪声尺度
          </label>
          <span className="range-value" data-readout-for="distortion-frequency">
            {getRangeReadout(snapshot, "distortion-frequency", "8")}
          </span>
        </div>
        {renderRangeInput(
          actions,
          "distortion-frequency",
          getControlValue(snapshot, "distortion-frequency", 8),
          1,
          30,
          1
        )}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-octaves">
            噪声层级
          </label>
          <span className="range-value" data-readout-for="distortion-octaves">
            {getRangeReadout(snapshot, "distortion-octaves", "2")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-octaves", getControlValue(snapshot, "distortion-octaves", 2), 1, 5, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-speed">
            形变速度
          </label>
          <span className="range-value" data-readout-for="distortion-speed">
            {getRangeReadout(snapshot, "distortion-speed", "36")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-speed", getControlValue(snapshot, "distortion-speed", 36), 0, 500, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-normal">
            路径法线抖动
          </label>
          <span className="range-value" data-readout-for="path-jitter-normal">
            {getRangeReadout(snapshot, "path-jitter-normal", "13")}
          </span>
        </div>
        {renderRangeInput(actions, "path-jitter-normal", getControlValue(snapshot, "path-jitter-normal", 13), 0, 80, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-tangent">
            路径切线抖动
          </label>
          <span className="range-value" data-readout-for="path-jitter-tangent">
            {getRangeReadout(snapshot, "path-jitter-tangent", "4")}
          </span>
        </div>
        {renderRangeInput(actions, "path-jitter-tangent", getControlValue(snapshot, "path-jitter-tangent", 4), 0, 50, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="width-jitter">
            线宽抖动
          </label>
          <span className="range-value" data-readout-for="width-jitter">
            {getRangeReadout(snapshot, "width-jitter", "8%")}
          </span>
        </div>
        {renderRangeInput(actions, "width-jitter", getControlValue(snapshot, "width-jitter", 8), 0, 60, 1)}
      </div>
    </section>
  );
}
