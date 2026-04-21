// Shared constants, presets, tooltip copy, and mutable app state.
const INK = [44, 43, 40];
const SOURCE_IMAGE_PATH = "/figure.png";
const MAX_UPLOADED_SOURCE_DIMENSION = 2048;
const MAX_UPLOADED_TEXTURE_DIMENSION = 2048;
const BOIL_VARIANTS = 4;
const BOIL_SEQUENCE = [0, 0, 1, 1, 2, 2, 1, 1, 3, 3, 1, 1];
const ANALYSIS_LONG_WAIT_PROMPT_MS = 8000;
const ANALYSIS_TIMEOUT_MS = 30000;
const MAX_EDGE_SAMPLES = 7200;
const MAX_HATCH_SAMPLES = 1800;
const ANALYSIS_QUALITY_PRESETS = {
  low: 960,
  medium: 1600,
  high: 2400
};

const MORPH_CLOSE_PASSES = 1;
const THINNING_MAX_ITERATIONS = 28;
const MIN_PATH_PIXELS = 6;
const MIN_PATH_DRAW_LENGTH = 8;
const PATH_RESAMPLE_SPACING = 1.2;
const WIDTH_RESPONSE = 1.18;
const MAX_STROKE_PATHS = 2200;

const DEFAULT_SETTINGS = {
  renderMode: "edge-fill",
  contourVariant: "contour",
  analysisQuality: "medium",
  inkColor: "#2c2b28",
  inkOpacity: 100,
  sceneScale: 130,
  sceneOffsetX: 0,
  sceneOffsetY: 0,
  lineBrightnessThreshold: 228,
  edgeThreshold: 42,
  edgeFillThreshold: 21,
  edgeFillCellSize: 6,
  edgeFillMinNormalGap: 11,
  edgeFillMaxNormalGap: 62,
  edgeFillMaxTangentGap: 36,
  edgeFillMinTangentDot: 88,
  edgeFillMaxNormalDot: -35,
  edgeSmoothness: 1,
  inkBrightnessThreshold: 242,
  localContrastThreshold: 8,
  colorDistanceThreshold: 24,
  waveAmplitude: 14,
  waveFrequency: 28,
  waveSpeed: 45,
  distortionScale: 20,
  distortionFrequency: 8,
  distortionOctaves: 2,
  distortionSpeed: 36,
  backgroundPreset: "warm",
  referenceOverlay: true,
  referenceOverlayOpacity: 95,
  paperFillMode: "solid",
  paperColor: "#fff",
  paperAccentColor: "#efe3cd",
  paperGradientAngle: 18,
  paperTexture: "speckle",
  textureColor: "#000000",
  textureAccentColor: "#fff7ea",
  paperTextureStrength: 64,
  paperTextureOpacity: 78,
  paperTextureScale: 42,
  lineWidthScale: 100,
  exportDurationSeconds: 3,
  exportFrameRate: 18,
  exportResolutionScale: 200,
  boilHoldFrames: 5,
  edgeJitterNormal: 70,
  edgeJitterTangent: 70,
  contourStrokeThickness: 150,
  pathJitterNormal: 13,
  pathJitterTangent: 4,
  widthJitter: 8,
  uiHidden: false
};

const BACKGROUND_PRESETS = {
  warm: {
    label: "暖纸",
    paperColor: "#f6f0e5",
    paperAccentColor: "#efe3cd",
    texture: "grain"
  },
  white: {
    label: "白纸",
    paperColor: "#fafafa",
    paperAccentColor: "#f1f1f1",
    texture: "none"
  },
  sketchbook: {
    label: "速写本",
    paperColor: "#efe7da",
    paperAccentColor: "#e2d5bf",
    texture: "crosshatch"
  },
  blue: {
    label: "浅蓝纸",
    paperColor: "#e8f0f5",
    paperAccentColor: "#d6e8f1",
    texture: "cloud"
  },
  grey: {
    label: "灰底纸",
    paperColor: "#ece7df",
    paperAccentColor: "#dcd5cb",
    texture: "speckle"
  }
};

const CONTROL_TOOLTIPS = {
  "render-mode": "切换线条生成算法。不同算法适合不同原图类型和线稿风格。",
  "contour-variant": "轮廓描摹模式下选择具体风格。标准轮廓、波浪、形变和橡皮效果都会走同一套轮廓提取。",
  "image-upload": "上传新的原图。所有提取算法都会重新基于这张原图分析。",
  "reference-overlay": "在生成结果上叠加原图，方便对照线条位置是否贴合。",
  "reference-overlay-opacity": "控制原图叠加层的透明度。数值越高，参考图越清楚。",
  "analysis-quality": "控制原图分析分辨率。越高细节越多，但重建速度会更慢。",
  "scene-scale": "统一缩放画面主体，会同时影响原图叠加和生成的沸腾线条。",
  "scene-offset-x": "整体水平移动画面主体。正值向右，负值向左。",
  "scene-offset-y": "整体垂直移动画面主体。正值向下，负值向上。",
  "background-preset": "快速切换纸张背景预设，不影响原图提取结果。",
  "paper-fill-mode": "选择纯色纸面或渐变纸面。",
  "paper-gradient-angle": "控制纸张渐变方向。",
  "paper-color": "设置纸张主色。",
  "paper-accent-color": "设置纸张渐变或过渡的辅助颜色。",
  "paper-texture": "选择叠加在纸面上的纹理类型。",
  "ink-color": "设置线稿 / 轮廓的主颜色，会影响所有线条类模式。",
  "ink-opacity": "整体控制线稿 / 轮廓的透明度，方便做更轻或更浓的描边。",
  "texture-color": "设置纹理主色。",
  "texture-accent-color": "设置纹理辅助色。",
  "texture-upload": "上传自定义纸张纹理图片。",
  "paper-texture-strength": "控制纸张纹理的可见强度。",
  "paper-texture-opacity": "控制顶层纸张纹理整体覆盖在画面上的透明度。",
  "paper-texture-scale": "控制纸张纹理颗粒或图案的尺度。",
  "line-width-scale": "统一控制线条的整体宽度，会同时影响边缘线和路径线条。",
  "export-duration-seconds": "控制每次导出动画的总时长。",
  "export-frame-rate": "控制导出动画的采样帧率。越高越流畅，但文件通常也会更大。",
  "export-resolution-scale": "控制导出时的渲染分辨率倍率。越高越清晰，但导出也会更慢。",
  "line-threshold": "判断多暗的像素可以被视为线条种子。越高越容易把浅线也算进去。",
  "edge-threshold": "判断局部边缘强度是否足够明显。越低越容易保留弱边缘。",
  "edge-fill-threshold": "控制 edge-fill 候选配对的综合通过门槛。越低越容易填充，越高越严格。",
  "edge-fill-cell-size": "控制配对搜索时的网格大小。越大搜索范围越松，配对也更容易跨区域发生。",
  "edge-fill-min-normal-gap": "限制两侧边缘最小横向距离，避免过近的边缘被误配对。",
  "edge-fill-max-normal-gap": "限制两侧边缘最大横向距离。想补更粗的线，通常要把它调大。",
  "edge-fill-max-tangent-gap": "限制两侧边缘沿线方向允许错开的程度。越大越能容忍端点不齐和局部错位。",
  "edge-fill-min-tangent-dot": "要求两侧边缘方向足够一致。越低越宽松，越高越要求平行。",
  "edge-fill-max-normal-dot": "要求两侧法线不要太同向。越大越宽松，越小越要求像一对相对边缘。",
  "edge-smoothness": "在提取前对亮度图做平滑，减少噪声，但也会削弱细节。",
  "ink-threshold": "用于 path 和 contour 模式的墨线判断阈值。越高越容易抓到浅线。",
  "contrast-threshold": "判断局部亮暗反差是否足以构成线条或边界。",
  "color-threshold": "判断颜色差异是否足以形成边界或扩张依据。",
  "wave-amplitude": "控制轮廓风格里波浪 / 形变 / 橡皮效果的起伏幅度。",
  "wave-frequency": "控制轮廓风格里波浪 / 形变 / 橡皮效果的起伏密度或场频率。",
  "wave-speed": "控制轮廓风格里波浪 / 形变 / 橡皮效果在不同沸腾帧之间的相位变化速度。",
  "distortion-scale": "控制 SVG 位移滤镜把图像像素推开的幅度，越大越扭曲。",
  "distortion-frequency": "控制湍流噪声的尺度。越小越像大片起伏，越大越像细碎抖动。",
  "distortion-octaves": "控制噪声叠加层数。层数越高，形变细节越丰富。",
  "distortion-speed": "控制 SVG 形变随时间变化的速度。",
  "boil-hold-frames": "控制沸腾动画切换速度。数值越小，跳动越快。",
  "edge-jitter-normal": "控制轮廓沿法线方向的抖动幅度。",
  "edge-jitter-tangent": "控制轮廓沿切线方向的抖动幅度。",
  "contour-stroke-thickness": "控制轮廓描摹模式的线宽缩放。数值越大，轮廓越粗。",
  "path-jitter-normal": "控制中心线路径沿法线方向的抖动幅度。",
  "path-jitter-tangent": "控制中心线路径沿切线方向的抖动幅度。",
  "width-jitter": "控制路径模式下线宽随时间波动的幅度。"
};

const CONTROL_TOOLTIPS_EN = {
  "render-mode": "Switch the line-generation algorithm. Different algorithms suit different source images and line styles.",
  "contour-variant": "Choose the specific contour style. Classic, wave, distortion, and rubber variants all reuse the same contour extraction.",
  "image-upload": "Upload a new source image. All extraction algorithms will re-analyze from this image.",
  "reference-overlay": "Overlay the source image on top of the result so you can compare alignment.",
  "reference-overlay-opacity": "Control the opacity of the source overlay. Higher values make the reference image easier to see.",
  "analysis-quality": "Controls the analysis resolution used for the source image. Higher settings preserve more detail but rebuild more slowly.",
  "scene-scale": "Scale the whole subject uniformly. This affects both the reference overlay and the animated line result.",
  "scene-offset-x": "Move the subject horizontally. Positive moves right, negative moves left.",
  "scene-offset-y": "Move the subject vertically. Positive moves down, negative moves up.",
  "background-preset": "Quickly switch paper presets without changing the source-image extraction result.",
  "paper-fill-mode": "Choose between a solid paper base or a gradient paper base.",
  "paper-gradient-angle": "Control the direction of the paper gradient.",
  "paper-color": "Set the main paper color.",
  "paper-accent-color": "Set the supporting color used in paper gradients and transitions.",
  "paper-texture": "Choose the texture layered on top of the paper.",
  "ink-color": "Set the primary color for linework and contour rendering across all line-based modes.",
  "ink-opacity": "Control the overall opacity of the linework so it feels lighter or denser.",
  "texture-color": "Set the primary texture color.",
  "texture-accent-color": "Set the supporting texture color.",
  "texture-upload": "Upload a custom paper texture image.",
  "paper-texture-strength": "Control how strongly the paper texture appears.",
  "paper-texture-opacity": "Control the overall opacity of the top texture layer.",
  "paper-texture-scale": "Control the scale of the paper texture pattern or grain.",
  "line-width-scale": "Scale all line widths at once. This affects both edge lines and path-based lines.",
  "export-duration-seconds": "Set the total duration of each exported animation.",
  "export-frame-rate": "Set the sampling frame rate for export. Higher values look smoother but usually create larger files.",
  "export-resolution-scale": "Set the render resolution multiplier used during export. Higher values are sharper but slower.",
  "line-threshold": "Controls how dark a pixel must be to count as a line seed. Higher values include lighter lines more easily.",
  "edge-threshold": "Controls how strong a local edge must be before it is kept. Lower values preserve weaker edges.",
  "edge-fill-threshold": "Controls the overall pairing threshold for edge-fill. Lower values fill more aggressively, higher values stay stricter.",
  "edge-fill-cell-size": "Controls the grid size used during pair search. Larger values loosen the search range and make cross-region matches easier.",
  "edge-fill-min-normal-gap": "Sets the minimum sideways distance between two edges to avoid pairing edges that are too close together.",
  "edge-fill-max-normal-gap": "Sets the maximum sideways distance between two edges. Increase it if you want to fill thicker strokes.",
  "edge-fill-max-tangent-gap": "Sets how much two candidate edges may drift along their tangent direction. Larger values tolerate endpoint mismatch better.",
  "edge-fill-min-tangent-dot": "Requires the two candidate edges to point in a similar direction. Lower values are more tolerant, higher values demand stronger parallelism.",
  "edge-fill-max-normal-dot": "Requires the two edge normals to avoid pointing the same way too strongly. Lower values enforce a more opposite-edge pairing.",
  "edge-smoothness": "Smooth the luma map before extraction to reduce noise, at the cost of some detail.",
  "ink-threshold": "Ink threshold used by path and contour modes. Higher values pick up lighter lines more easily.",
  "contrast-threshold": "Controls how much local contrast is needed before something counts as a line or boundary.",
  "color-threshold": "Controls how much color difference is needed before something counts as a boundary or growth source.",
  "wave-amplitude": "Controls the amplitude of wave / distortion / rubber motion in contour styles.",
  "wave-frequency": "Controls the density or field frequency of wave / distortion / rubber motion in contour styles.",
  "wave-speed": "Controls how quickly the phase changes between boil states for wave / distortion / rubber contour styles.",
  "distortion-scale": "Controls how far the SVG displacement filter pushes image pixels. Higher values produce stronger distortion.",
  "distortion-frequency": "Controls the scale of the turbulence noise. Lower values create broader waves; higher values create finer jitter.",
  "distortion-octaves": "Controls how many layers of noise are combined. More layers create richer distortion detail.",
  "distortion-speed": "Controls how quickly the SVG distortion evolves over time.",
  "boil-hold-frames": "Controls how quickly the boil animation steps forward. Lower values produce faster flicker.",
  "edge-jitter-normal": "Controls edge jitter amplitude along the normal direction.",
  "edge-jitter-tangent": "Controls edge jitter amplitude along the tangent direction.",
  "contour-stroke-thickness": "Controls the stroke-width scale used in contour-trace modes.",
  "path-jitter-normal": "Controls centerline-path jitter along the normal direction.",
  "path-jitter-tangent": "Controls centerline-path jitter along the tangent direction.",
  "width-jitter": "Controls how much path-mode line width fluctuates over time."
};

function getCurrentAppLocale() {
  return window.__lineAtelierAppLocale === "en" ? "en" : "zh-CN";
}

function getLocalizedControlTooltips() {
  return getCurrentAppLocale() === "en" ? CONTROL_TOOLTIPS_EN : CONTROL_TOOLTIPS;
}

const NEIGHBOR_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 }
];

let sourceImage;
let sourceImageHref = SOURCE_IMAGE_PATH;
let sourceImageLabel = "figure.png";
let sourceImageBlob = null;
let sourceImageObjectUrl = "";
let uploadedTextureImage = null;
let uploadedTextureHref = "";
let uploadedTextureLabel = "未选择纹理";
let paperBaseLayer;
let paperLayer;
let sceneLayout = null;
let analysisState = null;
let settings = { ...DEFAULT_SETTINGS };
let edgeSamples = [];
let hatchSamples = [];
let strokePaths = [];
let rebuildTimer = null;
let distortionOverlay = null;
let distortionImageNode = null;
let distortionTurbulenceNode = null;
let distortionDisplacementNode = null;
let textureOverlayNode = null;
let appStatusState = {
  analysisActive: false,
  analysisMessage: "",
  analysisPromptVisible: false,
  analysisFailed: false,
  analysisFailureMessage: ""
};
let exportState = {
  active: false,
  format: "",
  status: "当前支持 MP4 和 GIF 导出。",
  recovery: null,
  renderFrameValue: null
};

