# Contributing

Thanks for your interest in Krøyer. The project is small and unopinionated — most contributions are welcome.

## Development setup

```bash
git clone <repo-url>
cd smk-figma-plugin
npm install
npm run dev
```

`npm run dev` watches both the UI and the plugin sandbox in parallel. In Figma desktop:

1. **Plugins → Development → Import plugin from manifest…**
2. Select `manifest.json`
3. **Plugins → Development → Krøyer** to launch

Changes to source files trigger rebuilds. Re-run the plugin in Figma to pick up the changes.

## Project conventions

- **TypeScript strict mode.** No `any`, no `@ts-ignore` unless documented.
- **No `console.log`** in committed code (except inside `ErrorBoundary`'s `componentDidCatch`).
- **CSS** lives in `src/ui/styles/global.css`. Use BEM-ish class names (`.block__element--modifier`).
- **Figma theme variables** (`var(--figma-color-*)`) where possible — keep dark mode automatic.
- **No new dependencies** unless the gain is significant. The UI bundle is loaded fresh every time the plugin opens; size matters.
- **Messages** between UI and plugin go through `src/ui/messages.ts`. Add new message types there with TypeScript discriminated unions.

## Testing changes

Before committing:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests run with vitest (`npm test`). Provider mappers are tested against fixtures in `src/ui/providers/*/`; a build-time test asserts every provider domain is declared in `manifest.json`. Component snapshot tests with React Testing Library are still a welcome addition.

When validating in Figma, walk through the smoke path:

1. Search "hammershøi" → expect a grid with at least one image
2. Click a result → expect detail panel
3. Insert (via Insert button and via drag) → expect rectangle with image at viewport center, layer name "Artist — Title"
4. Toggle ★ → expect work to appear in Collections tab
5. Extract palette → expect 6 swatches → create color styles → expect new PaintStyles in Figma
6. Create a second collection, add 3+ works → export mood board → expect a Figma frame with auto-layout

## Pull requests

- Branch from `main`. Keep PRs focused — one feature or fix per PR.
- Include a short rationale in the PR description.
- For UI changes, describe what to look for in Figma since the plugin can't be previewed in a regular browser.

## Reporting bugs

Please open an issue with:

- Figma version (Help → About Figma)
- Operating system
- Steps to reproduce
- Expected vs. actual behaviour
- If possible: the `object_number` of the artwork involved (in DetailPanel under "Object no.")

## Architecture cheat-sheet

- `src/shared/model.ts` — normalized `Artwork`/`Collection` model shared by both bundles
- `src/ui/App.tsx` — single orchestrator; manages tab state, search state, collections, history, selected work, museum picker
- `src/ui/hooks/useSearch.ts` — debounced, abortable, paginated search against the selected `ArtProvider`
- `src/ui/hooks/useInsertImage.ts` — fetches image bytes + dimensions (with >4096px downscale), posts insert message
- `src/ui/providers/` — one directory per museum (`smk`, `aic`, `cma`, `met`): raw API types, mapper to the normalized model, and an `ArtProvider` implementation; `registry.ts` lists them
- `src/ui/images/sizing.ts` — per-provider IIIF sizing dialects and the 4096px clamp
- `src/ui/storage/` — collections v2 envelope, legacy migration, quota guard
- `src/plugin/controller.ts` — entire plugin sandbox; no React, just message router + Figma node creation

See [TECH-NOTES.md](./TECH-NOTES.md) for SMK API specifics and [ROADMAP.md](./ROADMAP.md) for the plan.
