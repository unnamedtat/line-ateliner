# Fixed-Timeline Export Experiment

## Goal

试图把动画导出从实时录制改成两条实验路径：

- 离屏逐帧渲染
- 固定时间轴编码

目标是：

- 后台标签页也能继续导出
- 前台继续调参数时不污染导出结果
- 视频时间戳不再依赖真实墙钟时间

## Implemented Ideas

实验里做过这些改动：

- 在导出开始时冻结一份 export snapshot
  - 包括 `settings`
  - `edgeSamples / hatchSamples / strokePaths`
  - 贴图、source asset、起始帧值
- 新增 `render-frame` export worker
  - 不再只做 `compose-frame`
  - 可以直接根据冻结的几何和设置离屏重建整帧
- 接入 `WebCodecs + mp4-muxer`
  - 使用固定 `timestamp / duration`
  - 试图避免 `MediaRecorder` 的实时录制限制

## Why It Was Removed

这套实验在当前项目里没有稳定达到预期，主要问题有：

- 手机端和部分浏览器上不具有 `WebCodecs` / H.264 
- 即使 API 存在，也不代表支持需要的编码配置
- GIF 和 MP4 的节奏与 `main` 分支现有渲染链难以对齐，不如直接录制效果好
- 前台预览、导出 worker、固定时间轴编码三条链同时存在后，问题定位成本明显升高
- 用户侧最直观的体验回归是：
  - MP4 导出时间变长
  - MP4 播放速度变慢
  - GIF 速度偏快或偏慢

## Current Decision

当前先回退到 `main` 分支的稳定导出模式：

- MP4：`MediaRecorder`
- GIF：`gif.js`
- 导出渲染：跟随现有主画布导出链

这样做的目的是先恢复：

- 和 `main` 一致的速度感
- 更可预测的兼容性
- 更低的维护复杂度

## If We Retry Later

下次如果要重做，建议按这个顺序：

1. 先只做“导出快照冻结”，不要同时改编码器
2. 再让 GIF 与 MP4 共用同一条离屏渲染链
3. 最后再引入固定时间轴编码
4. 手机端能力探测必须更保守，不能只看 API 是否存在
5. 前台导出和后台导出最好拆成两种明确模式，而不是一条链兼顾所有目标
