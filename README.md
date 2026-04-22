# ✦ Line Atelier ✦

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

[![boiling lines效果](./docs/1.gif)](https://www.xiaohongshu.com/explore/69df8871000000001a021d82?xsec_token=ABEcXg2CVkIw_I7xrh9S-m6ygZZLktwDyM7eC2382_DGk=&xsec_source=pc_user&m_source=mingfenghuohu)

Line Atelier 是一个浏览器里的线稿实验台。

它把一张输入图片转成可调参数的线性表达：边缘线、轮廓描摹、路径化线稿、纸张肌理、boiling lines的动态笔触，以及可导出的动画输出。


## 🌻解决什么

做“图片转线稿 / 转动效”这类工具时，常见的问题通常是：

1. 只能出静态结果，缺少动态线条和时间维度。
2. 线稿风格单一，边缘、轮廓、路径往往不能自由切换。
3. 背景和纸张表现太薄，做不出纸面、颗粒、压印那种感觉。
4. 调参过程割裂，输入分析、纸面、笔触、导出分散在不同工具链里。
5. 导出结果不方便，尤其是 GIF / MP4 这类适合分享的格式。

Line Atelier 的方向，就是把这些环节放进同一个浏览器工作台里完成。

## 🦜目前能做什么

当前版本已经支持：

1. 上传图片并在浏览器中生成线稿结果。
2. 在多种分析模式之间切换，包括 `edge`、`contour`、`path` 以及若干扩张类模式。
3. 调整不同轮廓变体，例如标准轮廓、波浪轮廓、橡皮轮廓。
4. 叠加纸面填充、渐变、纹理、颜色和自定义纹理上传。
5. 控制线条宽度、阈值、笔触动态等参数，实时预览结果。
6. 导出动画结果，目前支持 `MP4` 和 `GIF`。

## 🤔快速开始

环境要求：

- Node.js `22.12` 或更高
- 推荐 Node.js `24` 以和 CI 保持一致
- npm `10` 或更高

安装并启动：

```bash
npm install
npm run dev
```

启动后打开：`http://127.0.0.1:5173`

## 😊开发脚本

- `npm run dev`：启动本地 Vite 开发服务器
- `npm run build`：构建生产版本
- `npm run preview`：本地预览生产构建
- `npm run typecheck`：运行 TypeScript 检查
- `npm run lint`：运行 ESLint
- `npm run format:check`：检查 Prettier 格式
- `npm run test`：运行单元测试
- `npm run test:e2e`：运行 Playwright 冒烟测试

## 🏃‍♂️项目结构

```text
src/
  boot/              TypeScript bootstrap for the legacy app
  ui/                React shell and bridge components
public/
  figure.avif        Default demo input image
  legacy/
    core/            Shared constants and small helpers
    ui/              Layout, theme, state, and control bindings
    scene/           Canvas lifecycle, upload flow, overlays, and drawing
    analysis/        Analysis caches, sync/async maps, and mask builders
    edge/            Edge-mode generation and rendering helpers
    path/            Centerline tracing and path variant helpers
    export/          Export state, assets, rendering, and save actions
  styles/
    base/            Root tokens, resets, and global theme variables
    controls/        Shared control shell and field styling
    layout/          Workspace structure, panels, and responsive rules
    retro/           Retro-specific layout and controls skin
    scene/           Canvas stage and overlay presentation
  vendor/            Browser vendor assets copied from node_modules on install
scripts/
  sync-vendor.mjs    Copies runtime browser bundles into public/vendor
tests/
  unit/              Fast checks for boot and manifest logic
  e2e/               Browser smoke tests
```

## 贡献

- 提交 PR 之前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)
- Bug report 和 feature request 可以使用 `.github/ISSUE_TEMPLATE` 中的模板
- CI 会在每次 push 和 pull request 时运行 lint、typecheck、unit tests、e2e smoke tests 和 production build

## License

[GPL-3.0](./LICENSE)
