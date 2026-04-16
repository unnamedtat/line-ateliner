import { ControlGroupHeading } from "./ControlGroupHeading";
import type { LegacyUiActions, LegacyUiSnapshot } from "../legacy-ui-bridge";
import { getControlValue, getRangeReadout } from "../legacy-ui-bridge";

interface PaperBackgroundSectionProps {
  snapshot: LegacyUiSnapshot;
  actions: LegacyUiActions;
  importExportLocked: boolean;
  textureUploadSummary: string;
}

export function PaperBackgroundSection({
  snapshot,
  actions,
  importExportLocked,
  textureUploadSummary
}: PaperBackgroundSectionProps) {
  const fileButtonClassName = `file-button${importExportLocked ? " is-disabled" : ""}`;

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
        <select
          id="background-preset"
          value={String(getControlValue(snapshot, "background-preset", "warm"))}
          onChange={(event) => actions.updateSelect("background-preset", event.currentTarget.value)}
        >
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
        <select
          id="paper-fill-mode"
          value={String(getControlValue(snapshot, "paper-fill-mode", "solid"))}
          onChange={(event) => actions.updateSelect("paper-fill-mode", event.currentTarget.value)}
        >
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
            {getRangeReadout(snapshot, "paper-gradient-angle", "18")}
          </span>
        </div>
        <input
          id="paper-gradient-angle"
          type="range"
          min="0"
          max="360"
          step="1"
          value={Number(getControlValue(snapshot, "paper-gradient-angle", 18))}
          onInput={(event) =>
            actions.updateRange("paper-gradient-angle", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-gradient-angle", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="control-label">纸张颜色</div>
        <div className="swatch-row">
          <input
            id="paper-color"
            type="color"
            value={String(getControlValue(snapshot, "paper-color", "#f6f0e5"))}
            onInput={(event) => actions.updateColor("paper-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("paper-color", event.currentTarget.value)}
          />
          <input
            id="paper-accent-color"
            type="color"
            value={String(getControlValue(snapshot, "paper-accent-color", "#efe3cd"))}
            onInput={(event) => actions.updateColor("paper-accent-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("paper-accent-color", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="paper-texture">
          纸张纹理
        </label>
        <select
          id="paper-texture"
          value={String(getControlValue(snapshot, "paper-texture", "speckle"))}
          onChange={(event) => actions.updateSelect("paper-texture", event.currentTarget.value)}
        >
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
          <input
            id="texture-color"
            type="color"
            value={String(getControlValue(snapshot, "texture-color", "#d8c8b0"))}
            onInput={(event) => actions.updateColor("texture-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("texture-color", event.currentTarget.value)}
          />
          <input
            id="texture-accent-color"
            type="color"
            value={String(getControlValue(snapshot, "texture-accent-color", "#fff7ea"))}
            onInput={(event) => actions.updateColor("texture-accent-color", event.currentTarget.value)}
            onChange={(event) => actions.updateColor("texture-accent-color", event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="texture-upload">
          纹理图片
        </label>
        <div className="upload-row">
          <label
            className={fileButtonClassName}
            htmlFor="texture-upload"
            aria-disabled={importExportLocked ? "true" : "false"}
          >
            上传纹理
          </label>
          <div className="file-summary" id="texture-upload-summary">
            {textureUploadSummary}
          </div>
        </div>
        <input
          id="texture-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={importExportLocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              actions.updateFile("texture-upload", file);
              event.currentTarget.value = "";
            }
          }}
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-strength">
            纹理强度
          </label>
          <span className="range-value" data-readout-for="paper-texture-strength">
            {getRangeReadout(snapshot, "paper-texture-strength", "44")}
          </span>
        </div>
        <input
          id="paper-texture-strength"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(getControlValue(snapshot, "paper-texture-strength", 44))}
          onInput={(event) =>
            actions.updateRange("paper-texture-strength", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-strength", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-opacity">
            纹理透明度
          </label>
          <span className="range-value" data-readout-for="paper-texture-opacity">
            {getRangeReadout(snapshot, "paper-texture-opacity", "78%")}
          </span>
        </div>
        <input
          id="paper-texture-opacity"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number(getControlValue(snapshot, "paper-texture-opacity", 78))}
          onInput={(event) =>
            actions.updateRange("paper-texture-opacity", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-opacity", Number(event.currentTarget.value), "change")
          }
        />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="paper-texture-scale">
            纹理尺度
          </label>
          <span className="range-value" data-readout-for="paper-texture-scale">
            {getRangeReadout(snapshot, "paper-texture-scale", "42")}
          </span>
        </div>
        <input
          id="paper-texture-scale"
          type="range"
          min="10"
          max="100"
          step="1"
          value={Number(getControlValue(snapshot, "paper-texture-scale", 42))}
          onInput={(event) =>
            actions.updateRange("paper-texture-scale", Number(event.currentTarget.value), "input")
          }
          onChange={(event) =>
            actions.updateRange("paper-texture-scale", Number(event.currentTarget.value), "change")
          }
        />
      </div>
    </section>
  );
}
