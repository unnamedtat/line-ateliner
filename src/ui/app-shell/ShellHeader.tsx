export function ShellHeader() {
  return (
    <div className="controls-header">
      <div className="controls-title-wrap">
        <div className="controls-title">Line Atelier</div>
        <div className="controls-subtitle">日系线稿工具箱</div>
      </div>
      <div className="controls-header-actions">
        <div className="controls-badge">toolbox</div>
        <button className="controls-toggle" id="ui-toggle" type="button">
          收起面板
        </button>
      </div>
    </div>
  );
}
