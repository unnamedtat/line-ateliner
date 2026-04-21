import { useEffect, useState } from "react";
import {
  getLegacyControlDefault,
  getLegacyRangeReadoutDefault,
  LEGACY_CONTROL_DEFAULTS,
  LEGACY_RANGE_READOUT_DEFAULTS
} from "./legacy-ui-defaults";

export type ControlTab = "input" | "paper" | "stroke" | "export";
export type RangeInputSource = "input" | "change";

export interface LegacyRecoveryAction {
  action: string;
  label: string;
}

export interface LegacyControlValues {
  [key: string]: string | number;
}

export interface LegacyRangeReadouts {
  [key: string]: string;
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
  controlValues: LegacyControlValues;
  rangeReadouts: LegacyRangeReadouts;
  visibleModes: string[];
  referenceOverlayEnabled: boolean;
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
  updateSelect(id: string, value: string): void;
  updateRange(id: string, value: number, source: RangeInputSource): void;
  updateColor(id: string, value: string): void;
  updateFile(id: string, file: File): void;
}

interface LegacyUiBridge {
  getSnapshot(): LegacyUiSnapshot;
  actions: LegacyUiActions;
}

declare global {
  interface Window {
    __lineAtelierLoadExportRuntime?: () => Promise<void>;
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
  runExportRecoveryAction: noop,
  updateSelect: noop,
  updateRange: noop,
  updateColor: noop,
  updateFile: noop
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
  recoverySecondary: null,
  controlValues: { ...LEGACY_CONTROL_DEFAULTS },
  rangeReadouts: { ...LEGACY_RANGE_READOUT_DEFAULTS },
  visibleModes: ["edge-fill"],
  referenceOverlayEnabled: true
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

export function getControlValue(snapshot: LegacyUiSnapshot, id: string, fallback: string | number = "") {
  return snapshot.controlValues[id] ?? getLegacyControlDefault(id, fallback);
}

export function getRangeReadout(snapshot: LegacyUiSnapshot, id: string, fallback = "") {
  return snapshot.rangeReadouts[id] ?? getLegacyRangeReadoutDefault(id, fallback);
}

export function isModeVisible(snapshot: LegacyUiSnapshot, modes?: string) {
  if (!modes) {
    return true;
  }

  const modeList = modes.split(/\s+/).filter(Boolean);
  if (!modeList.length) {
    return true;
  }

  return modeList.some((mode) => snapshot.visibleModes.includes(mode));
}

export function getVisibilityClassName(
  snapshot: LegacyUiSnapshot,
  baseClassName: string,
  options: {
    modes?: string;
    requiresOverlay?: boolean;
  } = {}
) {
  const visibleByMode = isModeVisible(snapshot, options.modes);
  const visibleByOverlay = !options.requiresOverlay || snapshot.referenceOverlayEnabled;

  return `${baseClassName}${visibleByMode && visibleByOverlay ? "" : " is-hidden"}`;
}
