// UI layout helpers: retro shell creation, tabs, status text, and panel visibility.
const RENDER_MODE_LABELS = {
  edge: "边缘采样",
  "edge-fill": "边缘线填充",
  "region-grow": "亮度扩张",
  "color-grow": "颜色扩张",
  "color-boundary": "色块边界",
  distortion: "SVG 形变",
  contour: "轮廓描摹",
  path: "中心线路径"
};

const CONTOUR_VARIANT_LABELS = {
  contour: "标准轮廓",
  "wave-contour": "波浪轮廓",
  "wave-shape": "波浪形变",
  "rubber-contour": "橡皮轮廓"
};

const CONTROL_TAB_ORDER = ["input", "paper", "stroke", "input", "stroke", "export"];

let activeControlTab = "input";

function ensureRetroLayout() {
  const panel = document.getElementById("ui-shell");
  const controlsHeader = panel?.querySelector(".controls-header");
  const controlsBody = panel?.querySelector(".controls-body");
  if (!panel || !controlsHeader || !controlsBody || panel.dataset.retroReady === "1") {
    return;
  }

  document.body.classList.add("is-retro-layout");
  panel.classList.add("app-window");

  if (!panel.parentElement?.classList.contains("workspace-shell")) {
    const shell = document.createElement("div");
    shell.className = "workspace-shell";
    panel.parentElement?.insertBefore(shell, panel);
    shell.appendChild(panel);
  }

  controlsHeader.classList.add("window-chrome");
  controlsHeader.innerHTML = buildWindowChromeMarkup();

  const workspaceMain = document.createElement("div");
  workspaceMain.className = "workspace-main";

  const canvasShell = document.createElement("section");
  canvasShell.className = "canvas-shell";
  canvasShell.innerHTML = buildCanvasShellMarkup();

  const controlPanel = document.createElement("aside");
  controlPanel.id = "ui-control-panel";
  controlPanel.className = "control-panel";
  controlPanel.innerHTML = buildControlPanelMarkup();
  controlPanel.appendChild(controlsBody);

  workspaceMain.append(canvasShell, controlPanel);
  controlsHeader.insertAdjacentElement("afterend", workspaceMain);
  workspaceMain.insertAdjacentElement("afterend", buildStatusBarNode());

  attachOverlayNodes(canvasShell.querySelector(".canvas-stage"));
  assignControlTabs(controlsBody);
  panel.dataset.retroReady = "1";
}

function buildWindowChromeMarkup() {
  return `
    <div class="window-meta">
      <div class="window-dots" aria-hidden="true"></div>
      <div class="window-title-band">
        <span class="title-ornament" aria-hidden="true"></span>
        <div class="window-title-wrap">
          <div class="window-title">✦Line Atelier✦</div>
        </div>
        <span class="title-ornament" aria-hidden="true"></span>
      </div>
    </div>
    <div class="window-actions">
      <button
        class="window-toggle window-corner-button"
        id="ui-toggle"
        data-panel-toggle
        data-label-open="◂"
        data-label-open-mobile="▾"
        data-label-close="x"
        type="button"
      ></button>
    </div>
  `;
}

function buildCanvasShellMarkup() {
  return `
    <div class="canvas-stage">
      <div class="canvas-stage-grid" aria-hidden="true"></div>
      <div class="canvas-empty-state" id="canvas-empty-state">
        <div class="canvas-empty-icon" aria-hidden="true">
          <svg width="108" height="92" viewBox="0 0 108 92" fill="none">
            <path d="M28 24h23l9 9h20v39H28V24Z" stroke="currentColor" stroke-width="4"/>
            <path d="M28 38h52" stroke="currentColor" stroke-width="4"/>
            <path d="M38 52h30" stroke="currentColor" stroke-width="3" stroke-dasharray="6 6"/>
            <path d="M38 68h24" stroke="currentColor" stroke-width="3" stroke-dasharray="6 6"/>
          </svg>
        </div>
        <div class="canvas-empty-copy">或点击下方「选择文件」按钮</div>
        <div class="canvas-empty-types">支持 PNG / JPG / WebP / GIF</div>
      </div>
      <div class="canvas-processing-state is-hidden" id="canvas-processing-state" aria-live="polite">
        <div class="canvas-processing-badge" id="canvas-processing-badge">上传后正分析</div>
        <div class="canvas-processing-copy" id="canvas-processing-copy">正在读取图片并重建预览，请稍候。</div>
        <div class="canvas-processing-actions is-hidden" id="canvas-processing-actions">
          <button class="canvas-processing-button" id="analysis-continue-wait" type="button">继续等待</button>
          <button class="canvas-processing-button is-secondary" id="analysis-stop-wait" type="button">停止并提示失败</button>
        </div>
      </div>
      <div class="canvas-mount" id="canvas-mount"></div>
    </div>
    <div class="toolbar">
      <button class="toolbar-button toolbar-icon-button mobile-only-control" id="toolbar-export-video" type="button">导出 MP4</button>
      <label class="toolbar-label mobile-only-control" for="image-upload">选择文件</label>
    </div>
  `;
}

function buildControlPanelMarkup() {
  return `
    <div class="panel-header">
      <div class="panel-header-top">
        <div class="panel-title">控制面板</div>
        <button class="action-button panel-reset-button" id="reset-settings" type="button">重置全部参数</button>
      </div>
      <div class="tab-strip">
        <button class="tab-button is-active" data-tab="input" type="button"><span class="tab-icon">📥</span><span>输入</span></button>
        <button class="tab-button" data-tab="paper" type="button"><span class="tab-icon">📄</span><span>纸张</span></button>
        <button class="tab-button" data-tab="stroke" type="button"><span class="tab-icon">✏️</span><span>笔触</span></button>
        <button class="tab-button" data-tab="export" type="button"><span class="tab-icon">💾</span><span>导出</span></button>
      </div>
    </div>
  `;
}

function buildStatusBarNode() {
  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = `
    <div class="status-section status-section-left">
      <span class="status-pen">✎</span>
      <span class="status-value" data-mode-summary>边缘采样模式</span>
    </div>
    <div class="status-section status-section-center">
      <span class="status-value" data-file-summary>figure.png - 800×600</span>
    </div>
  `;
  return statusBar;
}

function attachOverlayNodes(stage) {
  if (!stage) {
    return;
  }

  const distortionOverlay = document.getElementById("distortion-overlay");
  const textureOverlay = document.getElementById("paper-texture-overlay");

  if (distortionOverlay) {
    distortionOverlay.style.position = "absolute";
    distortionOverlay.style.inset = "0";
    distortionOverlay.style.width = "100%";
    distortionOverlay.style.height = "100%";
    distortionOverlay.style.pointerEvents = "none";
    distortionOverlay.style.zIndex = "2";
    stage.appendChild(distortionOverlay);
  }

  if (textureOverlay) {
    textureOverlay.style.position = "absolute";
    textureOverlay.style.inset = "0";
    textureOverlay.style.width = "100%";
    textureOverlay.style.height = "100%";
    textureOverlay.style.pointerEvents = "none";
    textureOverlay.style.zIndex = "3";
    stage.appendChild(textureOverlay);
  }
}

function assignControlTabs(controlsBody) {
  const groups = controlsBody.querySelectorAll(".control-group");
  groups.forEach((group, index) => {
    group.dataset.tabPanel = CONTROL_TAB_ORDER[index] || "input";
  });
}

function getCurrentModeLabel() {
  if (settings.renderMode === "contour") {
    return CONTOUR_VARIANT_LABELS[settings.contourVariant] || RENDER_MODE_LABELS.contour;
  }

  return RENDER_MODE_LABELS[settings.renderMode] || settings.renderMode;
}

function syncStatusSummary() {
  const modeLabel = `${getCurrentModeLabel()}模式`;
  const dimensionsLabel = appStatusState.analysisFailed
    ? `${sourceImageLabel} - 分析失败`
    : appStatusState.analysisActive
      ? `${sourceImageLabel} - 正在分析中`
    : sourceImage && sourceImage.width && sourceImage.height
      ? `${sourceImageLabel} - ${sourceImage.width}×${sourceImage.height}`
      : sourceImageLabel;

  document.querySelectorAll("[data-mode-summary]").forEach((node) => {
    node.textContent = modeLabel;
  });
  document.querySelectorAll("[data-image-summary]").forEach((node) => {
    node.textContent = sourceImageLabel;
  });
  document.querySelectorAll("[data-file-summary]").forEach((node) => {
    node.textContent = dimensionsLabel;
  });
}

function applyActiveTab() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === activeControlTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("is-tab-hidden", panel.dataset.tabPanel !== activeControlTab);
  });
}

function setActiveControlTab(tab) {
  activeControlTab = tab || "input";
  applyActiveTab();

  if (activeControlTab === "export" && typeof preloadGifLibrary === "function") {
    preloadGifLibrary();
  }
}

function syncCanvasEmptyState() {
  const emptyState = document.getElementById("canvas-empty-state");
  const processingState = document.getElementById("canvas-processing-state");
  const processingBadge = document.getElementById("canvas-processing-badge");
  const processingCopy = document.getElementById("canvas-processing-copy");
  const processingActions = document.getElementById("canvas-processing-actions");
  if (!emptyState) {
    return;
  }

  let hasOutput = false;
  if (typeof hasDrawableOutput === "function") {
    try {
      hasOutput = Boolean(hasDrawableOutput());
    } catch (error) {
      hasOutput = false;
    }
  }

  const isAnalyzing = Boolean(appStatusState.analysisActive);
  const hasFailure = Boolean(appStatusState.analysisFailed);
  emptyState.classList.toggle("is-hidden", hasOutput || isAnalyzing || hasFailure);

  if (processingState) {
    processingState.classList.toggle("is-hidden", !isAnalyzing && !hasFailure);
  }
  if (processingBadge) {
    processingBadge.textContent = hasFailure ? "分析失败" : "上传后正分析";
  }
  if (processingCopy) {
    processingCopy.textContent = hasFailure
      ? appStatusState.analysisFailureMessage || "当前这次分析没有完成，请调整参数后重试。"
      : appStatusState.analysisMessage || "正在读取图片并重建预览，请稍候。";
  }
  if (processingActions) {
    processingActions.classList.toggle("is-hidden", !isAnalyzing || !appStatusState.analysisPromptVisible);
  }
}

function applyUiVisibility() {
  const panel = document.getElementById("ui-shell");
  if (!panel) {
    return;
  }

  const expanded = !settings.uiHidden;
  const isMobile = window.matchMedia("(max-width: 960px)").matches;

  panel.classList.toggle("is-collapsed", settings.uiHidden);
  panel.classList.toggle("is-panel-open", expanded);

  document.querySelectorAll("[data-panel-toggle]").forEach((toggle) => {
    const openLabelMobile = toggle.dataset.labelOpenMobile || toggle.dataset.labelOpen || "展开面板";
    const openLabelDesktop = toggle.dataset.labelOpen || "展开面板";
    const openLabel = isMobile ? openLabelMobile : openLabelDesktop;
    const closeLabel = toggle.dataset.labelClose || "收起面板";
    toggle.textContent = settings.uiHidden ? openLabel : closeLabel;
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.classList.toggle("is-active", expanded);
  });
}
