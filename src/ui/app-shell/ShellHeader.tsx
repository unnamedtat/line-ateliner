interface ShellHeaderProps {
  uiHidden: boolean;
  onTogglePanel(): void;
}

export function ShellHeader({ uiHidden, onTogglePanel }: ShellHeaderProps) {
  return (
    <div className="controls-header window-chrome">
      <div className="window-meta">
        <div className="window-dots" aria-hidden="true"></div>
        <div className="window-title-band">
          <span className="title-ornament" aria-hidden="true"></span>
          <div className="window-title-wrap">
            <div className="window-title">✦Line Atelier✦</div>
          </div>
          <span className="title-ornament" aria-hidden="true"></span>
        </div>
      </div>
      <div className="window-actions">
        <button
          className={`window-toggle window-corner-button${uiHidden ? "" : " is-active"}`}
          id="ui-toggle"
          type="button"
          aria-expanded={uiHidden ? "false" : "true"}
          onClick={onTogglePanel}
        >
          {uiHidden ? "◂" : "x"}
        </button>
      </div>
    </div>
  );
}
