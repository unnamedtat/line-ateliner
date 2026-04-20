import type { ControlTab } from "../legacy-ui-bridge";
import { AUTHOR_HOMEPAGE_URL, useAppLocale } from "../i18n";

interface ControlPanelHeaderProps {
  activeControlTab: ControlTab;
  resetLocked: boolean;
  onSelectTab(tab: ControlTab): void;
  onReset(): void;
}

const CONTROL_TABS: Array<{ tab: ControlTab; icon: string }> = [
  { tab: "input", icon: "📥" },
  { tab: "paper", icon: "📄" },
  { tab: "stroke", icon: "✏️" },
  { tab: "export", icon: "💾" }
];

export function ControlPanelHeader({
  activeControlTab,
  resetLocked,
  onSelectTab,
  onReset
}: ControlPanelHeaderProps) {
  const { copy, nextLocaleLabel, toggleLocale } = useAppLocale();

  return (
    <div className="panel-header">
      <div className="panel-header-top">
        <div className="panel-title">{copy.controls.panelTitle}</div>
        <button
          className="action-button panel-reset-button"
          id="reset-settings"
          type="button"
          disabled={resetLocked}
          aria-disabled={resetLocked ? "true" : "false"}
          onClick={onReset}
        >
          {copy.controls.resetAll}
        </button>
      </div>
      <div className="panel-utility-row">
        <button
          className="action-button panel-utility-button"
          type="button"
          aria-label={copy.header.localeToggleAriaLabel}
          onClick={toggleLocale}
        >
          {nextLocaleLabel}
        </button>
        <a
          className="action-button panel-utility-button"
          href={AUTHOR_HOMEPAGE_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.header.authorAriaLabel}
        >
          {copy.header.authorButton}
        </a>
      </div>
      <div className="tab-strip">
        {CONTROL_TABS.map(({ tab, icon }) => {
          const isActive = activeControlTab === tab;
          const label = copy.controls.tabs[tab];

          return (
            <button
              key={tab}
              className={`tab-button${isActive ? " is-active" : ""}`}
              data-tab={tab}
              type="button"
              aria-pressed={isActive ? "true" : "false"}
              onClick={() => onSelectTab(tab)}
            >
              <span className="tab-icon">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
