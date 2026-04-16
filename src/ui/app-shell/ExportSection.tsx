import { ControlGroupHeading } from "./ControlGroupHeading";

export function ExportSection() {
  return (
    <section className="control-group">
      <ControlGroupHeading
        title="导出"
        tooltip="导出当前动画。MP4 更适合常规交付，GIF 会逐帧编码，所以等待时间通常更长。"
      />

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-duration-seconds">
            导出时长
          </label>
          <span className="range-value" data-readout-for="export-duration-seconds">
            3s
          </span>
        </div>
        <input id="export-duration-seconds" type="range" min="1" max="8" step="1" defaultValue="3" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-frame-rate">
            导出帧率
          </label>
          <span className="range-value" data-readout-for="export-frame-rate">
            18fps
          </span>
        </div>
        <input id="export-frame-rate" type="range" min="8" max="30" step="1" defaultValue="18" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="export-resolution-scale">
            导出清晰度
          </label>
          <span className="range-value" data-readout-for="export-resolution-scale">
            200%
          </span>
        </div>
        <input
          id="export-resolution-scale"
          type="range"
          min="100"
          max="400"
          step="25"
          defaultValue="200"
        />
      </div>

      <div className="action-row action-row-export">
        <button className="action-button" id="export-video" type="button">
          导出 MP4
        </button>
        <button className="action-button" id="export-gif" type="button">
          导出 GIF
        </button>
      </div>

      <div className="control-note export-estimate" id="export-estimate">
        正在计算预计耗时...
      </div>
      <div className="control-note export-status" id="export-status">
        当前支持 MP4 和 GIF 导出。
      </div>
      <div className="action-row action-row-export action-row-recovery is-hidden" id="export-recovery-actions">
        <button className="action-button" id="export-recovery-primary" type="button"></button>
        <button className="action-button" id="export-recovery-secondary" type="button"></button>
      </div>
    </section>
  );
}
