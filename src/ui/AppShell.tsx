import { ExportSection } from "./app-shell/ExportSection";
import { ExtractionPairingSection } from "./app-shell/ExtractionPairingSection";
import { InputAnalysisSection } from "./app-shell/InputAnalysisSection";
import { LineworkSection } from "./app-shell/LineworkSection";
import { MotionStrokeSection } from "./app-shell/MotionStrokeSection";
import { OverlayLayers } from "./app-shell/OverlayLayers";
import { PaperBackgroundSection } from "./app-shell/PaperBackgroundSection";
import { ShellHeader } from "./app-shell/ShellHeader";

export function AppShell() {
  return (
    <>
      <div className="controls" id="ui-shell">
        <ShellHeader />
        <div className="controls-body">
          <InputAnalysisSection />
          <PaperBackgroundSection />
          <LineworkSection />
          <ExtractionPairingSection />
          <MotionStrokeSection />
          <ExportSection />
        </div>
      </div>
      <OverlayLayers />
    </>
  );
}
