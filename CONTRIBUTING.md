# Contributing

Thanks for helping improve Line Atelier.

## Local Setup

```bash
npm install
npm run dev
```

## Before Opening a Pull Request

Run the project checks locally:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run `npm run test:e2e` when you change boot flow, rendering startup, upload flow, or export behavior.

## Project Guidelines

- Keep changes focused and explain user-facing behavior in the pull request.
- Avoid large rewrites inside `public/legacy/` unless they are necessary to fix a bug.
- Prefer moving logic out of `public/legacy/` into typed modules under `src/` when touching stable areas.
- Do not add new CDN runtime dependencies. Add packages through `package.json` and keep browser assets synced through `scripts/sync-vendor.mjs`.
- Add or update tests when changing boot order, settings defaults, export behavior, or rendering output assumptions.

## Code Style

- Use `npm run format` for formatting when needed.
- ESLint and Prettier are the source of truth for code style.
- Keep comments short and only where they help future contributors understand a non-obvious decision.

## Reporting Issues

Use the GitHub issue templates for bugs and feature requests, and include reproduction steps when possible.
