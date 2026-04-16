# Line Atelier

Line Atelier is a browser-based line art playground for turning an image into animated linework, contour studies, paper textures, and exportable motion output.

This repository is now set up as an open-source-friendly front-end project with Vite, TypeScript tooling, linting, tests, and CI. The rendering core is still running through the existing browser script architecture, bridged by a small TypeScript bootstrap so we can keep the app stable while we migrate the legacy code incrementally.

## Stack

- Vite for local development and production builds
- TypeScript for typed tooling and the new bootstrap layer
- p5.js for canvas rendering and animation
- gif.js.optimized for GIF export
- ESLint and Prettier for consistency
- Vitest for unit tests
- Playwright for end-to-end smoke coverage
- GitHub Actions for CI

## Requirements

- Node.js 22.12 or newer
- Node.js 24 is recommended for CI parity
- npm 10 or newer

## Getting Started

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` after the dev server starts.

## Scripts

- `npm run dev`: start the local Vite server
- `npm run build`: create a production build
- `npm run preview`: preview the production build locally
- `npm run typecheck`: run TypeScript checks
- `npm run lint`: run ESLint
- `npm run format:check`: check formatting with Prettier
- `npm run test`: run unit tests
- `npm run test:e2e`: run the Playwright smoke test

## Project Layout

```text
src/
  boot/              TypeScript bootstrap for the legacy app
public/
  figure.png         Default demo input image
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

## Migration Strategy

The current codebase still contains a large legacy surface in `public/legacy/`. That is intentional for the first open-source-ready pass.

Planned next steps:

1. Move settings and render mode constants into typed modules under `src/`.
2. Convert export logic into importable TypeScript utilities.
3. Split the p5 drawing core into `core`, `render`, `ui`, and `export` modules.
4. Expand unit tests around analysis and export configuration behavior.

## Open Source Workflow

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.
- Bug reports and feature requests can use the issue templates in `.github/ISSUE_TEMPLATE`.
- CI runs linting, type checking, unit tests, end-to-end smoke tests, and a production build on every push and pull request.

## License

[GPL-3.0](./LICENSE)
