import { ControlGroupHeading } from "./ControlGroupHeading";

export function ExtractionPairingSection() {
  return (
    <section className="control-group">
      <ControlGroupHeading
        title="提取与配对"
        tooltip="这里控制线条提取阈值，以及 edge-fill 模式里两侧边缘如何配对成一条填充线。"
      />

      <div className="control-block" data-modes="edge edge-fill region-grow color-grow">
        <div className="range-head">
          <label className="control-label" htmlFor="line-threshold">
            线亮度阈值
          </label>
          <span className="range-value" data-readout-for="line-threshold">
            228
          </span>
        </div>
        <input id="line-threshold" type="range" min="96" max="254" step="1" defaultValue="228" />
      </div>

      <div className="control-block" data-modes="edge edge-fill contour">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-threshold">
            边缘阈值
          </label>
          <span className="range-value" data-readout-for="edge-threshold">
            42
          </span>
        </div>
        <input id="edge-threshold" type="range" min="4" max="180" step="1" defaultValue="42" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-threshold">
            填充配对阈值
          </label>
          <span className="range-value" data-readout-for="edge-fill-threshold">
            21
          </span>
        </div>
        <input id="edge-fill-threshold" type="range" min="0" max="55" step="1" defaultValue="21" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-cell-size">
            配对搜索网格
          </label>
          <span className="range-value" data-readout-for="edge-fill-cell-size">
            6
          </span>
        </div>
        <input id="edge-fill-cell-size" type="range" min="1" max="24" step="1" defaultValue="6" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-min-normal-gap">
            最小法线间距
          </label>
          <span className="range-value" data-readout-for="edge-fill-min-normal-gap">
            11
          </span>
        </div>
        <input id="edge-fill-min-normal-gap" type="range" min="0" max="80" step="1" defaultValue="11" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-normal-gap">
            最大法线间距
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-normal-gap">
            62
          </span>
        </div>
        <input id="edge-fill-max-normal-gap" type="range" min="1" max="240" step="1" defaultValue="62" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-tangent-gap">
            最大切线偏移
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-tangent-gap">
            36
          </span>
        </div>
        <input id="edge-fill-max-tangent-gap" type="range" min="0" max="180" step="1" defaultValue="36" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-min-tangent-dot">
            最小切线一致性
          </label>
          <span className="range-value" data-readout-for="edge-fill-min-tangent-dot">
            88
          </span>
        </div>
        <input id="edge-fill-min-tangent-dot" type="range" min="0" max="100" step="1" defaultValue="88" />
      </div>

      <div className="control-block" data-modes="edge-fill">
        <div className="range-head">
          <label className="control-label" htmlFor="edge-fill-max-normal-dot">
            最大法线同向性
          </label>
          <span className="range-value" data-readout-for="edge-fill-max-normal-dot">
            -35
          </span>
        </div>
        <input id="edge-fill-max-normal-dot" type="range" min="-100" max="100" step="1" defaultValue="-35" />
      </div>

      <div
        className="control-block"
        data-modes="edge edge-fill contour region-grow color-grow color-boundary path"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-smoothness">
            边缘平滑
          </label>
          <span className="range-value" data-readout-for="edge-smoothness">
            1
          </span>
        </div>
        <input id="edge-smoothness" type="range" min="0" max="6" step="1" defaultValue="1" />
      </div>

      <div className="control-block" data-modes="path contour">
        <div className="range-head">
          <label className="control-label" htmlFor="ink-threshold">
            墨线阈值
          </label>
          <span className="range-value" data-readout-for="ink-threshold">
            242
          </span>
        </div>
        <input id="ink-threshold" type="range" min="96" max="254" step="1" defaultValue="242" />
      </div>

      <div className="control-block" data-modes="path contour region-grow color-grow color-boundary">
        <div className="range-head">
          <label className="control-label" htmlFor="contrast-threshold">
            局部对比阈值
          </label>
          <span className="range-value" data-readout-for="contrast-threshold">
            8
          </span>
        </div>
        <input id="contrast-threshold" type="range" min="0" max="80" step="1" defaultValue="8" />
      </div>

      <div className="control-block" data-modes="color-grow color-boundary">
        <div className="range-head">
          <label className="control-label" htmlFor="color-threshold">
            颜色差阈值
          </label>
          <span className="range-value" data-readout-for="color-threshold">
            24
          </span>
        </div>
        <input id="color-threshold" type="range" min="1" max="160" step="1" defaultValue="24" />
      </div>
    </section>
  );
}
