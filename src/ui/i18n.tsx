import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { LegacyRecoveryAction, LegacyUiSnapshot } from "./legacy-ui-bridge";

export type AppLocale = "zh-CN" | "en";

const LOCALE_STORAGE_KEY = "line-atelier-locale";

export const AUTHOR_HOMEPAGE_URL = "https://unnamedtat.com/";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "zh-CN": "中文",
  en: "English"
};

const MODE_LABELS_EN: Record<string, string> = {
  "边缘采样": "Edge sampling",
  "边缘线填充": "Edge fill",
  "亮度扩张": "Luma grow",
  "颜色扩张": "Color grow",
  "色块边界": "Color boundary",
  "SVG 形变": "SVG distortion",
  "轮廓描摹": "Contour trace",
  "中心线路径": "Centerline path",
  "标准轮廓": "Classic contour",
  "波浪轮廓": "Wave contour",
  "波浪形变": "Wave distortion",
  "橡皮轮廓": "Rubber contour"
};

const messages = {
  "zh-CN": {
    document: {
      lang: "zh-CN",
      title: "Line Atelier | boiling lines生成器",
      description:
        "Line Atelier 是一个浏览器线稿与纸张肌理实验台，支持图片转线稿、动态笔触、参数调节，并导出 GIF 与 MP4。"
    },
    header: {
      authorButton: "作者主页",
      authorAriaLabel: "打开作者个人主页",
      authorTooltip: "工具版本更新会在这里哦",
      localeToggleAriaLabel: "切换界面语言",
      localeToggleTooltip: "切换界面语言 / Switch interface language",
      collapsePanelAriaLabel: "收起控制面板",
      expandPanelAriaLabel: "展开控制面板"
    },
    controls: {
      panelTitle: "控制面板",
      resetAll: "重置全部参数",
      tabs: {
        input: "输入",
        paper: "纸张",
        stroke: "笔触",
        export: "导出"
      }
    },
    canvas: {
      emptyCopy: "或点击下方「选择文件」按钮",
      emptyTypes: "支持 PNG / JPG / WebP / GIF",
      continueWait: "继续等待",
      stopWait: "停止并提示失败",
      selectFile: "选择文件"
    },
    input: {
      title: "输入与分析",
      tooltip: "选择算法、上传原图、查看叠加参考，并决定原图分析时使用的采样精度。",
      renderMode: "算法",
      renderModes: {
        "edge-fill": "边缘线填充",
        distortion: "SVG 形变",
        edge: "边缘采样",
        path: "中心线路径",
        "color-boundary": "色块边界",
        contour: "轮廓描摹"
      },
      contourVariant: "轮廓风格",
      contourVariants: {
        contour: "标准轮廓",
        "wave-contour": "波浪轮廓",
        "wave-shape": "波浪形变",
        "rubber-contour": "橡皮轮廓"
      },
      notes: {
        edge: "沿局部边缘撒短线，抖动感最明显。",
        "edge-fill": "先找两侧边缘，再补成一条线。",
        "region-grow": "从暗线往外扩，适合补浅线和断线。",
        "color-grow": "按颜色差往外扩，适合彩色线和偏色稿。",
        "color-boundary": "直接找色块交界，适合上色图。",
        distortion: "不做线稿提取，直接对原图做 SVG 位移形变。",
        "contour-variant-contour": "直接沿笔画外轮廓走线。",
        "contour-variant-wave-contour": "先提取外轮廓，再沿法线做连续波浪位移，适合日式起伏线效果。",
        "contour-variant-wave-shape": "用整张共享位移场推动轮廓和内部结构，整体更像整块形体在起伏。",
        "contour-variant-rubber-contour": "轮廓像软橡皮一样被拖拽，形变更圆润、更有弹性。",
        path: "先抽中心线，再按粗细去画。"
      },
      image: "图片",
      selectFile: "选择文件",
      overlay: "原图叠加",
      overlayOptions: {
        off: "关闭",
        on: "显示"
      },
      overlayOpacity: "叠加透明度",
      quality: "图像采样质量",
      qualityOptions: {
        low: "低",
        medium: "中",
        high: "高"
      },
      sceneScale: "主体缩放",
      sceneOffsetX: "水平偏移",
      sceneOffsetY: "垂直偏移"
    },
    paper: {
      title: "纸张与背景",
      tooltip: "控制纸张底色、渐变和纹理层。它们只影响画面表现，不会改变原图提取结果。",
      preset: "背景预设",
      presets: {
        warm: "暖纸",
        white: "白纸",
        sketchbook: "速写本",
        blue: "浅蓝纸",
        grey: "灰底纸"
      },
      fillMode: "纸张底色",
      fillModes: {
        solid: "纯色",
        gradient: "渐变"
      },
      gradientAngle: "渐变角度",
      paperColors: "纸张颜色",
      texture: "纸张纹理",
      textures: {
        none: "无纹理",
        grain: "细颗粒",
        speckle: "散点噪声",
        cloud: "云雾噪声",
        crosshatch: "交织纤维",
        upload: "上传纹理"
      },
      textureColors: "纹理颜色",
      textureImage: "纹理图片",
      uploadTexture: "上传纹理",
      textureStrength: "纹理强度",
      textureOpacity: "纹理透明度",
      textureScale: "纹理尺度"
    },
    linework: {
      title: "轮廓与线稿",
      tooltip: "调节生成线条的整体颜色和透明度，适合做更轻盈或更浓重的描边气质。",
      inkColor: "线稿颜色",
      inkOpacity: "线稿透明度",
      lineWidth: "线条宽度",
      note: "会同时作用在 edge、path、contour 以及扩张类线稿模式。"
    },
    extraction: {
      title: "提取与配对",
      tooltip: "这里控制线条提取阈值，以及 edge-fill 模式里两侧边缘如何配对成一条填充线。",
      lineThreshold: "线亮度阈值",
      edgeThreshold: "边缘阈值",
      fillThreshold: "填充配对阈值",
      cellSize: "配对搜索网格",
      minNormalGap: "最小法线间距",
      maxNormalGap: "最大法线间距",
      maxTangentGap: "最大切线偏移",
      minTangentDot: "最小切线一致性",
      maxNormalDot: "最大法线同向性",
      smoothness: "边缘平滑",
      inkThreshold: "墨线阈值",
      contrastThreshold: "局部对比阈值",
      colorThreshold: "颜色差阈值"
    },
    motion: {
      title: "动态与笔触",
      tooltip: "控制沸腾感、边缘抖动和路径笔触粗细变化。它们主要影响绘制表现，不改原图分析。",
      boilHoldFrames: "抖动速度",
      edgeJitterNormal: "轮廓法线抖动",
      edgeJitterTangent: "轮廓切线抖动",
      waveAmplitude: "波浪振幅",
      waveFrequency: "波浪频率",
      waveSpeed: "波浪速度",
      contourThickness: "轮廓粗细",
      distortionScale: "形变强度",
      distortionFrequency: "噪声尺度",
      distortionOctaves: "噪声层级",
      distortionSpeed: "形变速度",
      pathJitterNormal: "路径法线抖动",
      pathJitterTangent: "路径切线抖动",
      widthJitter: "线宽抖动"
    },
    export: {
      title: "导出",
      tooltip: "导出当前动画。MP4 更适合常规交付，GIF 会逐帧编码，所以等待时间通常更长。",
      duration: "导出时长",
      frameRate: "导出帧率",
      resolution: "导出清晰度"
    }
  },
  en: {
    document: {
      lang: "en",
      title: "Line Atelier | boiling lines generator",
      description:
        "Line Atelier is a browser-based line art and paper texture playground for image-to-linework, animated strokes, live parameter tuning, and GIF or MP4 export."
    },
    header: {
      authorButton: "Author",
      authorAriaLabel: "Open the author's homepage",
      authorTooltip: "Tool updates will be posted here.",
      localeToggleAriaLabel: "Switch interface language",
      localeToggleTooltip: "Switch the interface language.",
      collapsePanelAriaLabel: "Collapse control panel",
      expandPanelAriaLabel: "Expand control panel"
    },
    controls: {
      panelTitle: "Control Panel",
      resetAll: "Reset All",
      tabs: {
        input: "Input",
        paper: "Paper",
        stroke: "Stroke",
        export: "Export"
      }
    },
    canvas: {
      emptyCopy: 'or use the "Select file" button below',
      emptyTypes: "Supports PNG / JPG / WebP / GIF",
      continueWait: "Keep Waiting",
      stopWait: "Stop and Fail",
      selectFile: "Select File"
    },
    input: {
      title: "Input & Analysis",
      tooltip: "Choose an algorithm, upload a source image, preview the overlay reference, and set the sampling quality used for analysis.",
      renderMode: "Algorithm",
      renderModes: {
        "edge-fill": "Edge Fill",
        distortion: "SVG Distortion",
        edge: "Edge Sampling",
        path: "Centerline Path",
        "color-boundary": "Color Boundary",
        contour: "Contour Trace"
      },
      contourVariant: "Contour Style",
      contourVariants: {
        contour: "Classic Contour",
        "wave-contour": "Wave Contour",
        "wave-shape": "Wave Distortion",
        "rubber-contour": "Rubber Contour"
      },
      notes: {
        edge: "Scatters short strokes along local edges for the strongest boil effect.",
        "edge-fill": "Finds both sides of an edge pair, then fills them into a single stroke.",
        "region-grow": "Expands outward from dark lines, useful for faint or broken strokes.",
        "color-grow": "Expands by color difference, useful for colored lines and tinted scans.",
        "color-boundary": "Detects color block boundaries directly, which works well for illustrated art.",
        distortion: "Skips line extraction and applies SVG displacement directly to the source image.",
        "contour-variant-contour": "Draws directly along the outer contour of each stroke.",
        "contour-variant-wave-contour":
          "Extracts the outer contour first, then offsets it continuously along the normal for a Japanese-style wavy line feel.",
        "contour-variant-wave-shape":
          "Pushes both contour and internal structure with one shared displacement field, so the whole form feels like it undulates together.",
        "contour-variant-rubber-contour":
          "Makes the contour feel like soft rubber being pulled, with rounder and more elastic deformation.",
        path: "Extracts a centerline first, then redraws it with width-aware strokes."
      },
      image: "Image",
      selectFile: "Select File",
      overlay: "Image Overlay",
      overlayOptions: {
        off: "Off",
        on: "Show"
      },
      overlayOpacity: "Overlay Opacity",
      quality: "Sampling Quality",
      qualityOptions: {
        low: "Low",
        medium: "Medium",
        high: "High"
      },
      sceneScale: "Subject Scale",
      sceneOffsetX: "Horizontal Offset",
      sceneOffsetY: "Vertical Offset"
    },
    paper: {
      title: "Paper & Background",
      tooltip: "Controls the paper base, gradients, and texture layers. They change presentation only and do not affect image extraction.",
      preset: "Paper Preset",
      presets: {
        warm: "Warm Paper",
        white: "White Paper",
        sketchbook: "Sketchbook",
        blue: "Blue Paper",
        grey: "Gray Paper"
      },
      fillMode: "Paper Fill",
      fillModes: {
        solid: "Solid",
        gradient: "Gradient"
      },
      gradientAngle: "Gradient Angle",
      paperColors: "Paper Colors",
      texture: "Paper Texture",
      textures: {
        none: "None",
        grain: "Fine Grain",
        speckle: "Speckle Noise",
        cloud: "Cloud Noise",
        crosshatch: "Crosshatched Fibers",
        upload: "Upload Texture"
      },
      textureColors: "Texture Colors",
      textureImage: "Texture Image",
      uploadTexture: "Upload Texture",
      textureStrength: "Texture Strength",
      textureOpacity: "Texture Opacity",
      textureScale: "Texture Scale"
    },
    linework: {
      title: "Linework",
      tooltip: "Adjust the overall line color and opacity to make the result feel lighter or more ink-heavy.",
      inkColor: "Ink Color",
      inkOpacity: "Ink Opacity",
      lineWidth: "Line Width",
      note: "Applies to edge, path, contour, and growth-based linework modes at the same time."
    },
    extraction: {
      title: "Extraction & Pairing",
      tooltip: "Controls line extraction thresholds, plus how edge-fill pairs both sides of an edge into a filled line.",
      lineThreshold: "Line Luma Threshold",
      edgeThreshold: "Edge Threshold",
      fillThreshold: "Fill Pair Threshold",
      cellSize: "Pair Search Grid",
      minNormalGap: "Min Normal Gap",
      maxNormalGap: "Max Normal Gap",
      maxTangentGap: "Max Tangent Offset",
      minTangentDot: "Min Tangent Alignment",
      maxNormalDot: "Max Normal Alignment",
      smoothness: "Edge Smoothing",
      inkThreshold: "Ink Threshold",
      contrastThreshold: "Local Contrast Threshold",
      colorThreshold: "Color Delta Threshold"
    },
    motion: {
      title: "Motion & Stroke",
      tooltip: "Controls the boil feel, edge jitter, and path stroke variation. These affect rendering expression rather than source analysis.",
      boilHoldFrames: "Boil Speed",
      edgeJitterNormal: "Normal Jitter",
      edgeJitterTangent: "Tangent Jitter",
      waveAmplitude: "Wave Amplitude",
      waveFrequency: "Wave Frequency",
      waveSpeed: "Wave Speed",
      contourThickness: "Contour Thickness",
      distortionScale: "Distortion Strength",
      distortionFrequency: "Noise Scale",
      distortionOctaves: "Noise Octaves",
      distortionSpeed: "Distortion Speed",
      pathJitterNormal: "Path Normal Jitter",
      pathJitterTangent: "Path Tangent Jitter",
      widthJitter: "Width Jitter"
    },
    export: {
      title: "Export",
      tooltip: "Export the current animation. MP4 is better for standard delivery, while GIF encodes frame by frame and usually takes longer.",
      duration: "Duration",
      frameRate: "Frame Rate",
      resolution: "Resolution"
    }
  }
} as const;

type AppCopy = (typeof messages)[AppLocale];

interface LocaleContextValue {
  locale: AppLocale;
  copy: AppCopy;
  setLocale(locale: AppLocale): void;
  toggleLocale(): void;
  nextLocaleLabel: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "zh-CN" || value === "en";
}

function resolveInitialLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isAppLocale(savedLocale)) {
    return savedLocale;
  }

  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function AppLocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>(() => resolveInitialLocale());

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    (window as Window & { __lineAtelierAppLocale?: AppLocale; refreshUiState?: () => void }).__lineAtelierAppLocale =
      locale;

    const copy = messages[locale];
    document.documentElement.lang = copy.document.lang;
    document.title = copy.document.title;

    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", copy.document.description);
    (window as Window & { refreshUiState?: () => void }).refreshUiState?.();
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const nextLocale = locale === "zh-CN" ? "en" : "zh-CN";

    return {
      locale,
      copy: messages[locale],
      setLocale,
      toggleLocale: () => setLocale(nextLocale),
      nextLocaleLabel: LOCALE_LABELS[nextLocale]
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useAppLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useAppLocale must be used within AppLocaleProvider");
  }

  return context;
}

function translateTimeUnits(text: string) {
  return text.replace(/(\d+(?:\.\d+)?-\d+(?:\.\d+)?) 秒/g, "$1 sec").replace(/(\d+(?:\.\d+)?-\d+(?:\.\d+)?) 分钟/g, "$1 min");
}

function replaceWithRules(text: string, rules: Array<[RegExp, string]>) {
  for (const [pattern, replacement] of rules) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  return text;
}

function toEnglishLegacyText(text: string) {
  const exactMatches: Record<string, string> = {
    "边缘线填充模式": "Edge fill mode",
    "未选择纹理": "No texture selected",
    "上传后正分析": "Analyzing upload",
    "分析失败": "Analysis failed",
    "正在读取图片并重建预览，请稍候。": "Reading image and rebuilding preview. Please wait.",
    "当前这次分析没有完成，请调整参数后重试。":
      "This analysis did not finish. Adjust parameters and try again.",
    "当前支持 MP4 和 GIF 导出。": "MP4 and GIF export are currently available.",
    "正在计算预计耗时...": "Calculating estimated export time...",
    "导出 MP4": "Export MP4",
    "导出 GIF": "Export GIF",
    "导出中...": "Exporting...",
    "当前没有可导出的画面。": "There is no drawable output to export right now.",
    "正在初始化预览...": "Initializing preview...",
    "已收到图片，正在读取文件...": "Image received. Reading file...",
    "上传成功，正在分析图片并重建线稿预览...":
      "Upload complete. Analyzing image and rebuilding the line preview...",
    "纹理已更新，正在重建预览...": "Texture updated. Rebuilding preview...",
    "正在重建预览，请稍候...": "Rebuilding preview. Please wait...",
    "正在重算当前算法输出，请稍候...": "Recomputing the current algorithm output. Please wait...",
    "正在生成纸面与布局...": "Generating paper surface and layout...",
    "正在准备分析任务...": "Preparing analysis task...",
    "正在生成笔触与沸腾帧缓存...": "Generating stroke and boil-frame cache...",
    "仍在整理最终笔触...": "Finalizing stroke output...",
    "分析失败，请重试。": "Analysis failed. Please try again.",
    "重算失败，请重试。": "Recompute failed. Please try again.",
    "正在准备当前算法输出...": "Preparing the current algorithm output...",
    "正在创建分析缓存...": "Creating analysis cache...",
    "正在细化当前抖动变体...": "Refining the current jitter variant...",
    "正在计算亮度图...": "Computing luma map...",
    "正在平滑图像采样...": "Smoothing image samples...",
    "正在计算局部对比...": "Computing local contrast...",
    "正在读取颜色通道...": "Reading color channels...",
    "正在提取墨线区域...": "Extracting ink regions...",
    "正在检测色块边界...": "Detecting color block boundaries...",
    "正在整理边缘配对...": "Organizing edge pairs...",
    "正在匹配双侧边缘...": "Matching both edge sides...",
    "正在生成边缘抖动变体...": "Generating edge jitter variants...",
    "正在扫描边缘候选...": "Scanning edge candidates...",
    "正在扩张线条区域...": "Expanding line regions...",
    "正在收缩线条区域...": "Shrinking line regions...",
    "正在计算笔触宽度场...": "Computing stroke width field...",
    "正在传播距离场...": "Propagating distance field...",
    "正在回填距离场...": "Backfilling distance field...",
    "正在细化骨架像素...": "Refining skeleton pixels...",
    "正在提交骨架裁剪...": "Applying skeleton pruning...",
    "正在统计骨架连通度...": "Measuring skeleton connectivity...",
    "正在追踪开放路径...": "Tracing open paths...",
    "正在追踪闭环路径...": "Tracing closed paths...",
    "正在生成路径抖动变体...": "Generating path jitter variants...",
    "正在细化路径抖动...": "Refining path jitter...",
    "参数已更新，正在重建预览...": "Parameters updated. Rebuilding preview...",
    "参数已更新，正在重算当前笔触...": "Parameters updated. Recomputing current stroke output...",
    "参数已更新，当前输出结束后会自动重算。":
      "Parameters updated. Output will recompute automatically when the current pass finishes.",
    "参数已更新，当前分析结束后会自动重算。":
      "Parameters updated. Recompute will start automatically after the current analysis finishes.",
    "继续等待中，仍在分析当前图片...": "Still analyzing the current image. Continuing to wait...",
    "已停止这次分析。你可以调整图片或算法后重新尝试。":
      "This analysis was stopped. Adjust the image or algorithm and try again.",
    "这次分析没有在限定时间内完成，请调整图片尺寸或算法后重试。":
      "This analysis did not finish within the allowed time. Try a smaller image or a lighter algorithm.",
    "分析超过 30 秒仍未完成，已自动停止。请先降低图像采样质量或切换更轻量的算法。":
      "Analysis exceeded 30 seconds and was stopped automatically. Lower sampling quality or switch to a lighter algorithm.",
    "这次分析时间较长。你可以继续等待，也可以停止并提示失败。":
      "This analysis is taking a while. You can keep waiting or stop and show a failure state.",
    "分析失败，请调整参数后重试": "Analysis failed. Adjust parameters and try again.",
    "正在分析图片...": "Analyzing image...",
    "MP4 导出完成。": "MP4 export complete.",
    "GIF 导出完成。": "GIF export complete.",
    "正在导出 PNG 快照...": "Exporting PNG snapshot...",
    "PNG 快照导出完成。": "PNG snapshot export complete.",
    "改导出 GIF": "Try GIF Export",
    "导出 PNG 快照": "Export PNG Snapshot",
    "改导出 MP4": "Try MP4 Export",
    "当前浏览器不支持 MP4 导出": "This browser does not support MP4 export.",
    "当前浏览器不支持固定时间轴 MP4 编码。": "This browser does not support fixed-timeline MP4 encoding."
  };

  if (!text) {
    return text;
  }

  if (exactMatches[text]) {
    return exactMatches[text];
  }

  const matchedMode = text.match(/^(.+)模式$/);
  if (matchedMode) {
    return `${MODE_LABELS_EN[matchedMode[1]] || matchedMode[1]} mode`;
  }

  const translated = replaceWithRules(text, [
    [/^当前图片: (.+) · 正在分析\.\.\.$/, "Current image: $1 · analyzing..."],
    [/^当前图片: (.+)$/, "Current image: $1"],
    [/^(.+) - 分析失败$/, "$1 - analysis failed"],
    [/^(.+) - 正在分析中$/, "$1 - analyzing"],
    [/^(.+) \(读取中\.\.\.\)$/, "$1 (reading...)"],
    [/^正在细化中心线\.\.\. (\d+)\/(\d+)$/, "Refining centerline... $1/$2"],
    [/^正在准备 MP4\.\.\. (\d+)s \/ (\d+) 帧，预计 (.+)$/, "Preparing MP4... $1s / $2 frames, estimated $3"],
    [/^正在导出 MP4\.\.\. (\d+)\/(\d+)$/, "Exporting MP4... $1/$2"],
    [/^正在准备 GIF\.\.\. (\d+)s \/ (\d+) 帧，预计 (.+)$/, "Preparing GIF... $1s / $2 frames, estimated $3"],
    [/^正在采集 GIF 帧\.\.\. (\d+)\/(\d+)$/, "Capturing GIF frames... $1/$2"],
    [/^正在编码 GIF\.\.\. (\d+)%$/, "Encoding GIF... $1%"],
    [/^PNG 快照导出失败：(.+)$/, "PNG snapshot export failed: $1"],
    [
      /^MP4 导出失败：(.+)。建议先改导出 GIF；如果只需要先交付一张静态图，可以直接导出 PNG 快照。$/,
      "MP4 export failed: $1. Try GIF export first, or export a PNG snapshot for a quick static fallback."
    ],
    [
      /^GIF 导出失败：(.+)。建议改导出 MP4；如果想先拿到一个稳定结果，可以直接导出 PNG 快照。$/,
      "GIF export failed: $1. Try MP4 export instead, or export a PNG snapshot for a stable fallback."
    ],
    [
      /^GIF 导出失败：(.+)。当前浏览器不适合继续做动画导出，建议先导出 PNG 快照兜底。$/,
      "GIF export failed: $1. This browser is not a good fit for further animation export, so a PNG snapshot is the safest fallback."
    ],
    [
      /^预计耗时：MP4 (.+)，GIF (.+)。当前 (\d+)% 清晰度 \/ (\d+) 帧，高清导出会明显更慢，内存占用也更高。$/,
      "Estimated time: MP4 $1, GIF $2. Current setting: $3% resolution / $4 frames. High-resolution export will take longer and use more memory."
    ],
    [
      /^预计耗时：MP4 (.+)，GIF (.+)。当前 (\d+)% 清晰度 \/ (\d+) 帧，适合常规导出。$/,
      "Estimated time: MP4 $1, GIF $2. Current setting: $3% resolution / $4 frames. Suitable for standard exports."
    ]
  ]);

  return translateTimeUnits(translated);
}

function localizeRecoveryAction(
  action: LegacyRecoveryAction | null,
  locale: AppLocale
): LegacyRecoveryAction | null {
  if (!action || locale === "zh-CN") {
    return action;
  }

  return {
    ...action,
    label: toEnglishLegacyText(action.label)
  };
}

export function localizeLegacySnapshot(snapshot: LegacyUiSnapshot, locale: AppLocale): LegacyUiSnapshot {
  if (locale === "zh-CN") {
    return snapshot;
  }

  return {
    ...snapshot,
    modeSummary: toEnglishLegacyText(snapshot.modeSummary),
    fileSummary: toEnglishLegacyText(snapshot.fileSummary),
    imageName: toEnglishLegacyText(snapshot.imageName),
    textureUploadSummary: toEnglishLegacyText(snapshot.textureUploadSummary),
    processingBadge: toEnglishLegacyText(snapshot.processingBadge),
    processingCopy: toEnglishLegacyText(snapshot.processingCopy),
    exportVideoLabel: toEnglishLegacyText(snapshot.exportVideoLabel),
    exportGifLabel: toEnglishLegacyText(snapshot.exportGifLabel),
    exportStatus: toEnglishLegacyText(snapshot.exportStatus),
    exportEstimate: toEnglishLegacyText(snapshot.exportEstimate),
    recoveryPrimary: localizeRecoveryAction(snapshot.recoveryPrimary, locale),
    recoverySecondary: localizeRecoveryAction(snapshot.recoverySecondary, locale)
  };
}
