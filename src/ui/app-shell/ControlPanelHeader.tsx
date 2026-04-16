import type { ControlTab } from "../legacy-ui-bridge";

interface ControlPanelHeaderProps {
  activeControlTab: ControlTab;
  resetLocked: boolean;
  onSelectTab(tab: ControlTab): void;
  onReset(): void;
}

const CONTROL_TABS: Array<{ tab: ControlTab; icon: string; label: string }> = [
  { tab: "input", icon: "📥", label: "输入" },
  { tab: "paper", icon: "📄", label: "纸张" },
  { tab: "stroke", icon: "✏️", label: "笔触" },
  { tab: "export", icon: "💾", label: "导出" }
];

export function ControlPanelHeader({
  activeControlTab,
  resetLocked,
  onSelectTab,
  onReset
}: ControlPanelHeaderProps) {
  return (
    <div className="panel-header">
      <div className="panel-header-top">
        <div className="panel-title">控制面板</div>
        <button
          className="action-button panel-reset-button"
          id="reset-settings"
          type="button"
          disabled={resetLocked}
          aria-disabled={resetLocked ? "true" : "false"}
          onClick={onReset}
        >
          重置全部参数
        </button>
      </div>
      <div className="tab-strip">
        {CONTROL_TABS.map(({ tab, icon, label }) => {
          const isActive = activeControlTab === tab;

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
