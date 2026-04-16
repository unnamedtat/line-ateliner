import { ControlGroupHeading } from "./ControlGroupHeading";

export function MotionStrokeSection() {
  return (
    <section className="control-group">
      <ControlGroupHeading
        title="动态与笔触"
        tooltip="控制沸腾感、边缘抖动和路径笔触粗细变化。它们主要影响绘制表现，不改原图分析。"
      />

      <div className="control-block" data-modes="edge edge-fill contour region-grow color-grow color-boundary path">
        <div className="range-head">
          <label className="control-label" htmlFor="boil-hold-frames">
            抖动速度
          </label>
          <span className="range-value" data-readout-for="boil-hold-frames">
            5
          </span>
        </div>
        <input id="boil-hold-frames" type="range" min="2" max="12" step="1" defaultValue="5" />
      </div>

      <div
        className="control-block"
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-normal">
            轮廓法线抖动
          </label>
          <span className="range-value" data-readout-for="edge-jitter-normal">
            20
          </span>
        </div>
        <input id="edge-jitter-normal" type="range" min="0" max="200" step="1" defaultValue="20" />
      </div>

      <div
        className="control-block"
        data-modes="edge edge-fill contour region-grow color-grow color-boundary"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="edge-jitter-tangent">
            轮廓切线抖动
          </label>
          <span className="range-value" data-readout-for="edge-jitter-tangent">
            6
          </span>
        </div>
        <input id="edge-jitter-tangent" type="range" min="0" max="200" step="1" defaultValue="6" />
      </div>

      <div
        className="control-block"
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-amplitude">
            波浪振幅
          </label>
          <span className="range-value" data-readout-for="wave-amplitude">
            14
          </span>
        </div>
        <input id="wave-amplitude" type="range" min="0" max="60" step="1" defaultValue="14" />
      </div>

      <div
        className="control-block"
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-frequency">
            波浪频率
          </label>
          <span className="range-value" data-readout-for="wave-frequency">
            28
          </span>
        </div>
        <input id="wave-frequency" type="range" min="1" max="120" step="1" defaultValue="28" />
      </div>

      <div
        className="control-block"
        data-modes="contour-variant-wave-contour contour-variant-wave-shape contour-variant-rubber-contour"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="wave-speed">
            波浪速度
          </label>
          <span className="range-value" data-readout-for="wave-speed">
            45
          </span>
        </div>
        <input id="wave-speed" type="range" min="0" max="100" step="1" defaultValue="45" />
      </div>

      <div className="control-block" data-modes="contour">
        <div className="range-head">
          <label className="control-label" htmlFor="contour-stroke-thickness">
            轮廓粗细
          </label>
          <span className="range-value" data-readout-for="contour-stroke-thickness">
            100%
          </span>
        </div>
        <input id="contour-stroke-thickness" type="range" min="40" max="260" step="1" defaultValue="100" />
      </div>

      <div className="control-block" data-modes="distortion">
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-scale">
            形变强度
          </label>
          <span className="range-value" data-readout-for="distortion-scale">
            20
          </span>
        </div>
        <input id="distortion-scale" type="range" min="0" max="120" step="1" defaultValue="20" />
      </div>

      <div className="control-block" data-modes="distortion">
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-frequency">
            噪声尺度
          </label>
          <span className="range-value" data-readout-for="distortion-frequency">
            8
          </span>
        </div>
        <input id="distortion-frequency" type="range" min="1" max="30" step="1" defaultValue="8" />
      </div>

      <div className="control-block" data-modes="distortion">
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-octaves">
            噪声层级
          </label>
          <span className="range-value" data-readout-for="distortion-octaves">
            2
          </span>
        </div>
        <input id="distortion-octaves" type="range" min="1" max="5" step="1" defaultValue="2" />
      </div>

      <div className="control-block" data-modes="distortion">
        <div className="range-head">
          <label className="control-label" htmlFor="distortion-speed">
            形变速度
          </label>
          <span className="range-value" data-readout-for="distortion-speed">
            36
          </span>
        </div>
        <input id="distortion-speed" type="range" min="0" max="500" step="1" defaultValue="36" />
      </div>

      <div className="control-block" data-modes="path">
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-normal">
            路径法线抖动
          </label>
          <span className="range-value" data-readout-for="path-jitter-normal">
            13
          </span>
        </div>
        <input id="path-jitter-normal" type="range" min="0" max="80" step="1" defaultValue="13" />
      </div>

      <div className="control-block" data-modes="path">
        <div className="range-head">
          <label className="control-label" htmlFor="path-jitter-tangent">
            路径切线抖动
          </label>
          <span className="range-value" data-readout-for="path-jitter-tangent">
            4
          </span>
        </div>
        <input id="path-jitter-tangent" type="range" min="0" max="50" step="1" defaultValue="4" />
      </div>

      <div className="control-block" data-modes="path">
        <div className="range-head">
          <label className="control-label" htmlFor="width-jitter">
            线宽抖动
          </label>
          <span className="range-value" data-readout-for="width-jitter">
            8
          </span>
        </div>
        <input id="width-jitter" type="range" min="0" max="60" step="1" defaultValue="8" />
      </div>
    </section>
  );
}
