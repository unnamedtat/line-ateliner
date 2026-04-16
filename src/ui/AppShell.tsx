import type { ControlTab } from "./legacy-ui-bridge";
import { useLegacyUiBridge } from "./legacy-ui-bridge";
import { CanvasShell } from "./app-shell/CanvasShell";
import { ControlPanelHeader } from "./app-shell/ControlPanelHeader";
import { ExportSection } from "./app-shell/ExportSection";
import { ExtractionPairingSection } from "./app-shell/ExtractionPairingSection";
import { InputAnalysisSection } from "./app-shell/InputAnalysisSection";
import { LineworkSection } from "./app-shell/LineworkSection";
import { MotionStrokeSection } from "./app-shell/MotionStrokeSection";
import { PaperBackgroundSection } from "./app-shell/PaperBackgroundSection";
import { ShellHeader } from "./app-shell/ShellHeader";
import { StatusBar } from "./app-shell/StatusBar";

function getTabPanelClassName(activeTab: ControlTab, panelTab: ControlTab) {
  return activeTab === panelTab ? "" : " is-tab-hidden";
}

export function AppShell() {
  const { snapshot, actions } = useLegacyUiBridge();
  const controlsClassName = `controls app-window${snapshot.uiHidden ? " is-collapsed" : " is-panel-open"}`;

  return (
    <div className="workspace-shell">
      <div className={controlsClassName} id="ui-shell" data-retro-ready={snapshot.ready ? "1" : "0"}>
        <ShellHeader uiHidden={snapshot.uiHidden} onTogglePanel={actions.togglePanel} />
        <div className="workspace-main">
          <CanvasShell
            canvasEmptyVisible={snapshot.canvasEmptyVisible}
            processingVisible={snapshot.processingVisible}
            processingBadge={snapshot.processingBadge}
            processingCopy={snapshot.processingCopy}
            processingActionsVisible={snapshot.processingActionsVisible}
            toolbarExportVideoLabel={snapshot.exportVideoLabel}
            importExportLocked={snapshot.importExportLocked}
            exportLocked={snapshot.exportLocked}
            onExportVideo={actions.startVideoExport}
            onContinueAnalysisWait={actions.continueAnalysisWait}
            onCancelAnalysisWait={actions.cancelAnalysisWait}
          />
          <aside id="ui-control-panel" className="control-panel">
            <ControlPanelHeader
              activeControlTab={snapshot.activeControlTab}
              resetLocked={snapshot.resetLocked}
              onSelectTab={actions.setActiveControlTab}
              onReset={actions.resetAllSettings}
            />
            <div className="controls-body">
              <div className={getTabPanelClassName(snapshot.activeControlTab, "input")} data-tab-panel="input">
              <InputAnalysisSection
                snapshot={snapshot}
                actions={actions}
                imageName={snapshot.imageName}
                importExportLocked={snapshot.importExportLocked}
              />
            </div>
            <div className={getTabPanelClassName(snapshot.activeControlTab, "paper")} data-tab-panel="paper">
              <PaperBackgroundSection
                snapshot={snapshot}
                actions={actions}
                importExportLocked={snapshot.importExportLocked}
                textureUploadSummary={snapshot.textureUploadSummary}
              />
            </div>
            <div className={getTabPanelClassName(snapshot.activeControlTab, "stroke")} data-tab-panel="stroke">
              <LineworkSection snapshot={snapshot} actions={actions} />
            </div>
            <div className={getTabPanelClassName(snapshot.activeControlTab, "input")} data-tab-panel="input">
              <ExtractionPairingSection snapshot={snapshot} actions={actions} />
            </div>
            <div className={getTabPanelClassName(snapshot.activeControlTab, "stroke")} data-tab-panel="stroke">
              <MotionStrokeSection snapshot={snapshot} actions={actions} />
            </div>
            <div className={getTabPanelClassName(snapshot.activeControlTab, "export")} data-tab-panel="export">
              <ExportSection
                snapshot={snapshot}
                actions={actions}
                exportLocked={snapshot.exportLocked}
                exportVideoLabel={snapshot.exportVideoLabel}
                exportGifLabel={snapshot.exportGifLabel}
                  exportStatus={snapshot.exportStatus}
                  exportEstimate={snapshot.exportEstimate}
                  exportEstimateLevel={snapshot.exportEstimateLevel}
                  recoveryPrimary={snapshot.recoveryPrimary}
                  recoverySecondary={snapshot.recoverySecondary}
                  onExportVideo={actions.startVideoExport}
                  onExportGif={actions.startGifExport}
                  onRecoveryAction={actions.runExportRecoveryAction}
                />
              </div>
            </div>
          </aside>
        </div>
        <StatusBar modeSummary={snapshot.modeSummary} fileSummary={snapshot.fileSummary} />
      </div>
    </div>
  );
}
