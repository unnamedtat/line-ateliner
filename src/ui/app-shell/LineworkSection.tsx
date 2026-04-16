import { ControlGroupHeading } from "./ControlGroupHeading";

export function LineworkSection() {
  return (
    <section
      className="control-group"
      data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
    >
      <ControlGroupHeading
        title="轮廓与线稿"
        tooltip="调节生成线条的整体颜色和透明度，适合做更轻盈或更浓重的描边气质。"
      />

      <div className="control-block">
        <label className="control-label" htmlFor="ink-color">
          线稿颜色
        </label>
        <input id="ink-color" type="color" defaultValue="#2c2b28" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="ink-opacity">
            线稿透明度
          </label>
          <span className="range-value" data-readout-for="ink-opacity">
            100%
          </span>
        </div>
        <input id="ink-opacity" type="range" min="0" max="100" step="1" defaultValue="100" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="line-width-scale">
            线条宽度
          </label>
          <span className="range-value" data-readout-for="line-width-scale">
            100
          </span>
        </div>
        <input id="line-width-scale" type="range" min="40" max="260" step="1" defaultValue="100" />
      </div>

      <div className="control-note">会同时作用在 edge、path、contour 以及扩张类线稿模式。</div>
    </section>
  );
}
