import { ControlGroupHeading } from "./ControlGroupHeading";

interface InputAnalysisSectionProps {
  imageName: string;
  importExportLocked: boolean;
}

export function InputAnalysisSection({ imageName, importExportLocked }: InputAnalysisSectionProps) {
  const fileButtonClassName = `file-button${importExportLocked ? " is-disabled" : ""}`;

  return (
    <section className="control-group">
      <ControlGroupHeading
        title="输入与分析"
        tooltip="选择算法、上传原图、查看叠加参考，并决定原图分析时使用的采样精度。"
      />

      <div className="control-block">
        <label className="control-label" htmlFor="render-mode">
          算法
        </label>
        <select id="render-mode">
          <option value="edge-fill">边缘线填充</option>
          <option value="distortion">SVG 形变</option>
          <option value="edge">边缘采样</option>
          <option value="path">中心线路径</option>
          <option value="color-boundary">色块边界</option>
          <option value="contour">轮廓描摹</option>
        </select>
      </div>

      <div className="control-block" data-modes="contour">
        <label className="control-label" htmlFor="contour-variant">
          轮廓风格
        </label>
        <select id="contour-variant">
          <option value="contour">标准轮廓</option>
          <option value="wave-contour">波浪轮廓</option>
          <option value="wave-shape">波浪形变</option>
          <option value="rubber-contour">橡皮轮廓</option>
        </select>
      </div>

      <div className="control-note" data-modes="edge">
        沿局部边缘撒短线，抖动感最明显。
      </div>
      <div className="control-note" data-modes="edge-fill">
        先找两侧边缘，再补成一条线。
      </div>
      <div className="control-note" data-modes="region-grow">
        从暗线往外扩，适合补浅线和断线。
      </div>
      <div className="control-note" data-modes="color-grow">
        按颜色差往外扩，适合彩色线和偏色稿。
      </div>
      <div className="control-note" data-modes="color-boundary">
        直接找色块交界，适合上色图。
      </div>
      <div className="control-note" data-modes="distortion">
        不做线稿提取，直接对原图做 SVG 位移形变。
      </div>
      <div className="control-note" data-modes="contour-variant-contour">
        直接沿笔画外轮廓走线。
      </div>
      <div className="control-note" data-modes="contour-variant-wave-contour">
        先提取外轮廓，再沿法线做连续波浪位移，适合日式起伏线效果。
      </div>
      <div className="control-note" data-modes="contour-variant-wave-shape">
        用整张共享位移场推动轮廓和内部结构，整体更像整块形体在起伏。
      </div>
      <div className="control-note" data-modes="contour-variant-rubber-contour">
        轮廓像软橡皮一样被拖拽，形变更圆润、更有弹性。
      </div>
      <div className="control-note" data-modes="path">
        先抽中心线，再按粗细去画。
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="image-upload">
          图片
        </label>
        <div className="upload-row">
          <label
            className={fileButtonClassName}
            htmlFor="image-upload"
            aria-disabled={importExportLocked ? "true" : "false"}
          >
            选择文件
          </label>
        </div>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={importExportLocked}
        />
        <div className="image-name" id="image-name">
          {imageName}
        </div>
      </div>

      <div className="control-block" data-modes="edge edge-fill region-grow color-grow color-boundary contour path">
        <label className="control-label" htmlFor="reference-overlay">
          原图叠加
        </label>
        <select id="reference-overlay">
          <option value="off">关闭</option>
          <option value="on">显示</option>
        </select>
      </div>

      <div
        className="control-block"
        data-modes="edge edge-fill region-grow color-grow color-boundary contour path"
        data-requires-overlay="true"
      >
        <div className="range-head">
          <label className="control-label" htmlFor="reference-overlay-opacity">
            叠加透明度
          </label>
          <span className="range-value" data-readout-for="reference-overlay-opacity">
            35%
          </span>
        </div>
        <input id="reference-overlay-opacity" type="range" min="0" max="100" step="1" defaultValue="35" />
      </div>

      <div className="control-block" data-modes="edge edge-fill region-grow color-grow color-boundary contour path">
        <label className="control-label" htmlFor="analysis-quality">
          图像采样质量
        </label>
        <select id="analysis-quality">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-scale">
            主体缩放
          </label>
          <span className="range-value" data-readout-for="scene-scale">
            100%
          </span>
        </div>
        <input id="scene-scale" type="range" min="20" max="240" step="1" defaultValue="100" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-offset-x">
            水平偏移
          </label>
          <span className="range-value" data-readout-for="scene-offset-x">
            0%
          </span>
        </div>
        <input id="scene-offset-x" type="range" min="-80" max="80" step="1" defaultValue="0" />
      </div>

      <div className="control-block">
        <div className="range-head">
          <label className="control-label" htmlFor="scene-offset-y">
            垂直偏移
          </label>
          <span className="range-value" data-readout-for="scene-offset-y">
            0%
          </span>
        </div>
        <input id="scene-offset-y" type="range" min="-80" max="80" step="1" defaultValue="0" />
      </div>
    </section>
  );
}
