import { useEffect, useState } from "react";

export type ControlTab = "input" | "paper" | "stroke" | "export";

export interface LegacyRecoveryAction {
  action: string;
  label: string;
}

export interface LegacyUiSnapshot {
  ready: boolean;
  activeControlTab: ControlTab;
  uiHidden: boolean;
  modeSummary: string;
  fileSummary: string;
  imageName: string;
  textureUploadSummary: string;
  importExportLocked: boolean;
  resetLocked: boolean;
  canvasEmptyVisible: boolean;
  processingVisible: boolean;
  processingBadge: string;
  processingCopy: string;
  processingActionsVisible: boolean;
  exportLocked: boolean;
  exportVideoLabel: string;
  exportGifLabel: string;
  exportStatus: string;
  exportEstimate: string;
  exportEstimateLevel: string;
  recoveryPrimary: LegacyRecoveryAction | null;
  recoverySecondary: LegacyRecoveryAction | null;
}

export interface LegacyUiActions {
  togglePanel(): void;
  setActiveControlTab(tab: ControlTab): void;
  resetAllSettings(): void;
  startVideoExport(): void;
  startGifExport(): void;
  continueAnalysisWait(): void;
  cancelAnalysisWait(): void;
  runExportRecoveryAction(action: string): void;
}

interface LegacyUiBridge {
  getSnapshot(): LegacyUiSnapshot;
  actions: LegacyUiActions;
}

declare global {
  interface Window {
    __lineAtelierUiBridge?: LegacyUiBridge;
  }
}

const LEGACY_UI_SYNC_EVENT = "lineatelier:uistate";
const LEGACY_UI_READY_EVENT = "lineatelier:bridge-ready";

const noop = () => {};

const fallbackActions: LegacyUiActions = {
  togglePanel: noop,
  setActiveControlTab: noop,
  resetAllSettings: noop,
  startVideoExport: noop,
  startGifExport: noop,
  continueAnalysisWait: noop,
  cancelAnalysisWait: noop,
  runExportRecoveryAction: noop
};

const defaultSnapshot: LegacyUiSnapshot = {
  ready: false,
  activeControlTab: "input",
  uiHidden: false,
  modeSummary: "边缘线填充模式",
  fileSummary: "figure.png",
  imageName: "当前图片: figure.png",
  textureUploadSummary: "未选择纹理",
  importExportLocked: false,
  resetLocked: false,
  canvasEmptyVisible: true,
  processingVisible: false,
  processingBadge: "上传后正分析",
  processingCopy: "正在读取图片并重建预览，请稍候。",
  processingActionsVisible: false,
  exportLocked: true,
  exportVideoLabel: "导出 MP4",
  exportGifLabel: "导出 GIF",
  exportStatus: "当前支持 MP4 和 GIF 导出。",
  exportEstimate: "正在计算预计耗时...",
  exportEstimateLevel: "normal",
  recoveryPrimary: null,
  recoverySecondary: null
};

function readSnapshot(): LegacyUiSnapshot {
  if (typeof window === "undefined") {
    return defaultSnapshot;
  }

  return window.__lineAtelierUiBridge?.getSnapshot() ?? defaultSnapshot;
}

function readActions(): LegacyUiActions {
  if (typeof window === "undefined") {
    return fallbackActions;
  }

  return window.__lineAtelierUiBridge?.actions ?? fallbackActions;
}

export function useLegacyUiBridge() {
  const [snapshot, setSnapshot] = useState<LegacyUiSnapshot>(() => readSnapshot());

  useEffect(() => {
    const handleUpdate = () => {
      setSnapshot(readSnapshot());
    };

    handleUpdate();
    window.addEventListener(LEGACY_UI_SYNC_EVENT, handleUpdate);
    window.addEventListener(LEGACY_UI_READY_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(LEGACY_UI_SYNC_EVENT, handleUpdate);
      window.removeEventListener(LEGACY_UI_READY_EVENT, handleUpdate);
    };
  }, []);

  return {
    snapshot,
    actions: readActions()
  };
}
