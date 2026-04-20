import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import {
  getControlValue,
  getRangeReadout,
  getVisibilityClassName
} from "../legacy-ui-bridge";
import { useAppLocale } from "../i18n";

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
  const { copy } = useAppLocale();
  const controlValue = (id: string) => getControlValue(snapshot, id);
  const rangeReadout = (id: string) => getRangeReadout(snapshot, id);

  return (
    <section className="control-group">
      <ControlGroupHeading
        title={copy.motion.title}
        tooltip={copy.motion.tooltip}
      />

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary path"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="boil-hold-frames">
            {copy.motion.boilHoldFrames}
          </label>
          <span className="range-value" data-readout-for="boil-hold-frames">
            {rangeReadout("boil-hold-frames")}
          </span>
        </div>
        {renderRangeInput(actions, "boil-hold-frames", controlValue("boil-hold-frames"), 2, 12, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-normal">
            {copy.motion.edgeJitterNormal}
          </label>
          <span className="range-value" data-readout-for="edge-jitter-normal">
            {rangeReadout("edge-jitter-normal")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-jitter-normal", controlValue("edge-jitter-normal"), 0, 200, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "edge edge-fill contour region-grow color-grow color-boundary"
        })}
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-tangent">
            {copy.motion.edgeJitterTangent}
          </label>
          <span className="range-value" data-readout-for="edge-jitter-tangent">
            {rangeReadout("edge-jitter-tangent")}
          </span>
        </div>
        {renderRangeInput(actions, "edge-jitter-tangent", controlValue("edge-jitter-tangent"), 0, 200, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-amplitude">
            {copy.motion.waveAmplitude}
          </label>
          <span className="range-value" data-readout-for="wave-amplitude">
            {rangeReadout("wave-amplitude")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-amplitude", controlValue("wave-amplitude"), 0, 60, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-frequency">
            {copy.motion.waveFrequency}
          </label>
          <span className="range-value" data-readout-for="wave-frequency">
            {rangeReadout("wave-frequency")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-frequency", controlValue("wave-frequency"), 1, 120, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", {
          modes: "contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
        })}
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-speed">
            {copy.motion.waveSpeed}
          </label>
          <span className="range-value" data-readout-for="wave-speed">
            {rangeReadout("wave-speed")}
          </span>
        </div>
        {renderRangeInput(actions, "wave-speed", controlValue("wave-speed"), 0, 100, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "contour" })}
        data-modes="contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="contour-stroke-thickness">
            {copy.motion.contourThickness}
          </label>
          <span className="range-value" data-readout-for="contour-stroke-thickness">
            {rangeReadout("contour-stroke-thickness")}
          </span>
        </div>
        {renderRangeInput(actions, "contour-stroke-thickness", controlValue("contour-stroke-thickness"), 40, 260, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-scale">
            {copy.motion.distortionScale}
          </label>
          <span className="range-value" data-readout-for="distortion-scale">
            {rangeReadout("distortion-scale")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-scale", controlValue("distortion-scale"), 0, 120, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-frequency">
            {copy.motion.distortionFrequency}
          </label>
          <span className="range-value" data-readout-for="distortion-frequency">
            {rangeReadout("distortion-frequency")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-frequency", controlValue("distortion-frequency"), 1, 30, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-octaves">
            {copy.motion.distortionOctaves}
          </label>
          <span className="range-value" data-readout-for="distortion-octaves">
            {rangeReadout("distortion-octaves")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-octaves", controlValue("distortion-octaves"), 1, 5, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "distortion" })}
        data-modes="distortion"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-speed">
            {copy.motion.distortionSpeed}
          </label>
          <span className="range-value" data-readout-for="distortion-speed">
            {rangeReadout("distortion-speed")}
          </span>
        </div>
        {renderRangeInput(actions, "distortion-speed", controlValue("distortion-speed"), 0, 500, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-normal">
            {copy.motion.pathJitterNormal}
          </label>
          <span className="range-value" data-readout-for="path-jitter-normal">
            {rangeReadout("path-jitter-normal")}
          </span>
        </div>
        {renderRangeInput(actions, "path-jitter-normal", controlValue("path-jitter-normal"), 0, 80, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-tangent">
            {copy.motion.pathJitterTangent}
          </label>
          <span className="range-value" data-readout-for="path-jitter-tangent">
            {rangeReadout("path-jitter-tangent")}
          </span>
        </div>
        {renderRangeInput(actions, "path-jitter-tangent", controlValue("path-jitter-tangent"), 0, 50, 1)}
      </div>

      <div
        className={getVisibilityClassName(snapshot, "control-block", { modes: "path" })}
        data-modes="path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="width-jitter">
            {copy.motion.widthJitter}
          </label>
          <span className="range-value" data-readout-for="width-jitter">
            {rangeReadout("width-jitter")}
          </span>
        </div>
        {renderRangeInput(actions, "width-jitter", controlValue("width-jitter"), 0, 60, 1)}
      </div>
    </section>
  );
}
