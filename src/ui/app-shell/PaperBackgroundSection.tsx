import { ControlGroupHeading } from "./ControlGroupHeading";

export function PaperBackgroundSection() {
  return (
    <section className="control-group">
      <ControlGroupHeading
        title="纸张与背景"
        tooltip="控制纸张底色、渐变和纹理层。它们只影响画面表现，不会改变原图提取结果。"
      />

      <div className="control-block">
        <label className="control-label" htmlFor="background-preset">
          背景预设
        </label>
        <select id="background-preset">
          <option value="warm">暖纸</option>
          <option value="white">白纸</option>
          <option value="sketchbook">速写本</option>
          <option value="blue">浅蓝纸</option>
          <option value="grey">灰底纸</option>
        </select>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="paper-fill-mode">
          纸张底色
        </label>
        <select id="paper-fill-mode">
          <option value="solid">纯色</option>
          <option value="gradient">渐变</option>
        </select>
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-gradient-angle">
            渐变角度
          </label>
          <span className="range-value" data-readout-for="paper-gradient-angle">
            18
          </span>
        </div>
        <input id="paper-gradient-angle" type="range" min="0" max="360" step="1" defaultValue="18" />
      </div>

      <div className="control-block">
        <div className="control-label">纸张颜色</div>
        <div className="swatch-row">
          <input id="paper-color" type="color" defaultValue="#f6f0e5" />
          <input id="paper-accent-color" type="color" defaultValue="#efe3cd" />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="paper-texture">
          纸张纹理
        </label>
        <select id="paper-texture">
          <option value="none">无纹理</option>
          <option value="grain">细颗粒</option>
          <option value="speckle">散点噪声</option>
          <option value="cloud">云雾噪声</option>
          <option value="crosshatch">交织纤维</option>
          <option value="upload">上传纹理</option>
        </select>
      </div>

      <div className="control-block">
        <div className="control-label">纹理颜色</div>
        <div className="swatch-row">
          <input id="texture-color" type="color" defaultValue="#d8c8b0" />
          <input id="texture-accent-color" type="color" defaultValue="#fff7ea" />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="texture-upload">
          纹理图片
        </label>
        <div className="upload-row">
          <label className="file-button" htmlFor="texture-upload">
            上传纹理
          </label>
          <div className="file-summary" id="texture-upload-summary">
            未选择纹理
          </div>
        </div>
        <input id="texture-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-strength">
            纹理强度
          </label>
          <span className="range-value" data-readout-for="paper-texture-strength">
            44
          </span>
        </div>
        <input id="paper-texture-strength" type="range" min="0" max="100" step="1" defaultValue="44" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-opacity">
            纹理透明度
          </label>
          <span className="range-value" data-readout-for="paper-texture-opacity">
            78%
          </span>
        </div>
        <input id="paper-texture-opacity" type="range" min="0" max="100" step="1" defaultValue="78" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-scale">
            纹理尺度
          </label>
          <span className="range-value" data-readout-for="paper-texture-scale">
            42
          </span>
        </div>
        <input id="paper-texture-scale" type="range" min="10" max="100" step="1" defaultValue="42" />
      </div>
    </section>
  );
}
