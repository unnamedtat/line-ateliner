import { useAppLocale } from "../i18n";

interface ShellHeaderProps {
  uiHidden: boolean;
  onTogglePanel(): void;
}

export function ShellHeader({ uiHidden, onTogglePanel }: ShellHeaderProps) {
  const { copy } = useAppLocale();
  const togglePanelLabel = uiHidden
    ? copy.header.expandPanelAriaLabel
    : copy.header.collapsePanelAriaLabel;

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
          aria-label={togglePanelLabel}
          title={togglePanelLabel}
          onClick={onTogglePanel}
        >
          {uiHidden ? "◂" : "x"}
        </button>
      </div>
    </div>
  );
}
