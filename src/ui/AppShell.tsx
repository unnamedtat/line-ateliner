import type { ControlTab } from "./legacy-ui-bridge";
import { useLegacyUiBridge } from "./legacy-ui-bridge";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
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
import { AppLocaleProvider, localizeLegacySnapshot, useAppLocale } from "./i18n";

function getTabPanelClassName(activeTab: ControlTab, panelTab: ControlTab) {
  return activeTab === panelTab ? "" : " is-tab-hidden";
}

function AppShellContent() {
  const { locale } = useAppLocale();
  const { snapshot, actions } = useLegacyUiBridge();
  const localizedSnapshot = localizeLegacySnapshot(snapshot, locale);
  const controlsClassName = `controls app-window${localizedSnapshot.uiHidden ? " is-collapsed" : " is-panel-open"}`;

  return (
    <div className="workspace-shell">
      <div
        className={controlsClassName}
        id="ui-shell"
        data-retro-ready={localizedSnapshot.ready ? "1" : "0"}
      >
        <ShellHeader uiHidden={localizedSnapshot.uiHidden} onTogglePanel={actions.togglePanel} />
        <div className="workspace-main">
          <CanvasShell
            canvasEmptyVisible={localizedSnapshot.canvasEmptyVisible}
            previewBooting={!localizedSnapshot.previewReady}
            processingVisible={localizedSnapshot.processingVisible}
            processingBadge={localizedSnapshot.processingBadge}
            processingCopy={localizedSnapshot.processingCopy}
            processingActionsVisible={localizedSnapshot.processingActionsVisible}
            toolbarExportVideoLabel={localizedSnapshot.exportVideoLabel}
            importExportLocked={localizedSnapshot.importExportLocked}
            exportLocked={localizedSnapshot.exportLocked}
            onExportVideo={actions.startVideoExport}
            onContinueAnalysisWait={actions.continueAnalysisWait}
            onCancelAnalysisWait={actions.cancelAnalysisWait}
          />
          <aside id="ui-control-panel" className="control-panel">
            <ControlPanelHeader
              activeControlTab={localizedSnapshot.activeControlTab}
              resetLocked={localizedSnapshot.resetLocked}
              onSelectTab={actions.setActiveControlTab}
              onReset={actions.resetAllSettings}
            />
            <div className="controls-body">
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "input")}
                data-tab-panel="input"
              >
                <InputAnalysisSection
                  snapshot={localizedSnapshot}
                  actions={actions}
                  imageName={localizedSnapshot.imageName}
                  importExportLocked={localizedSnapshot.importExportLocked}
                />
              </div>
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "paper")}
                data-tab-panel="paper"
              >
                <PaperBackgroundSection
                  snapshot={localizedSnapshot}
                  actions={actions}
                  importExportLocked={localizedSnapshot.importExportLocked}
                  textureUploadSummary={localizedSnapshot.textureUploadSummary}
                />
              </div>
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "stroke")}
                data-tab-panel="stroke"
              >
                <LineworkSection snapshot={localizedSnapshot} actions={actions} />
              </div>
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "input")}
                data-tab-panel="input"
              >
                <ExtractionPairingSection snapshot={localizedSnapshot} actions={actions} />
              </div>
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "stroke")}
                data-tab-panel="stroke"
              >
                <MotionStrokeSection snapshot={localizedSnapshot} actions={actions} />
              </div>
              <div
                className={getTabPanelClassName(localizedSnapshot.activeControlTab, "export")}
                data-tab-panel="export"
              >
                <ExportSection
                  snapshot={localizedSnapshot}
                  actions={actions}
                  exportLocked={localizedSnapshot.exportLocked}
                  exportVideoLabel={localizedSnapshot.exportVideoLabel}
                  exportGifLabel={localizedSnapshot.exportGifLabel}
                  exportStatus={localizedSnapshot.exportStatus}
                  exportEstimate={localizedSnapshot.exportEstimate}
                  exportEstimateLevel={localizedSnapshot.exportEstimateLevel}
                  recoveryPrimary={localizedSnapshot.recoveryPrimary}
                  recoverySecondary={localizedSnapshot.recoverySecondary}
                  onExportVideo={actions.startVideoExport}
                  onExportGif={actions.startGifExport}
                  onRecoveryAction={actions.runExportRecoveryAction}
                />
              </div>
            </div>
          </aside>
        </div>
        <StatusBar
          modeSummary={localizedSnapshot.modeSummary}
          fileSummary={localizedSnapshot.fileSummary}
        />
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export function AppShell() {
  return (
    <AppLocaleProvider>
      <AppShellContent />
    </AppLocaleProvider>
  );
}
