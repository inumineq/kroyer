# Krøyer

A Figma plugin for searching and inserting public-domain artworks from major museum open-access collections: [Statens Museum for Kunst](https://www.smk.dk/) (Denmark's National Gallery), the [Art Institute of Chicago](https://www.artic.edu/), the [Cleveland Museum of Art](https://www.clevelandart.org/), [The Metropolitan Museum of Art](https://www.metmuseum.org/), and the [Rijksmuseum](https://www.rijksmuseum.nl/) (Amsterdam).

Named after [Peder Severin Krøyer](https://en.wikipedia.org/wiki/Peder_Severin_Kr%C3%B8yer) (1851–1909), one of the most beloved Skagen Painters.

Search across five museums' open-access collections — millions of artworks combined. Filter by rights — most importantly Public Domain. Drop images directly into your Figma designs with attribution. Save works into collections, extract color palettes, and generate mood boards.

**Status:** v0.2.0 (unreleased) — multi-museum release. All five providers behind a common `ArtProvider` abstraction; see [ROADMAP.md](./ROADMAP.md) for the phased plan and [CHANGELOG.md](./CHANGELOG.md) for what shipped in each phase.

**A note on Art Institute of Chicago images:** AIC's image host sits behind a Cloudflare managed challenge that blocks every sandboxed byte-fetch route available to a Figma plugin (the UI iframe, the plugin's main-thread `fetch`, and Figma's own image proxy — all verified live). AIC search and metadata work normally; image previews render as a blurred placeholder with an "Open on AIC" link, and Insert/palette/mood-board export are disabled for AIC works specifically. See [TECH-NOTES.md](./TECH-NOTES.md) for the full investigation.

## Features

### Museums
- Pick a museum from the picker next to the search bar (choice persisted); the filter panel adapts to show only the filters that museum's API supports
- **SMK** — artist, period, rights, has-image filters; related-works browsing via SMK's own similarity endpoint
- **Art Institute of Chicago** — rights filter only; images blocked upstream (see note above)
- **Cleveland Museum of Art** — artist, period, rights, has-image filters
- **The Met** — period filter; images are public-domain-only by construction (`hasImages=true` always sent)
- **Rijksmuseum** — artist and rights filters; rights filtering runs client-side (the API has no rights parameter) and fills result pages progressively as public-domain works are found

### Search & insert
- Free-text search with progressive filter disclosure
- Filter by artist, period (year range), rights, has-image — only where the selected museum supports it
- Public Domain as default — toggle to include copyrighted works
- Result grid with skeleton loading, lazy images, and "Load more" pagination
- Drag a thumbnail onto the canvas, or click "Insert" — inserted at viewport center
- Pick insertion size: 300px / 800px / 1600px / native resolution
- Optional automatic caption ("Artist — Title (Year)") placed next to the image
- Layer name is set to "Artist — Title" on every insert

### Detail view
- Full metadata: title, artist, period, technique, type, department, object number, credit line
- Public domain or copyright badge
- "Open on {museum}" link opens the source page externally
- Esc dismisses the panel
- Related works (SMK only, via its similarity endpoint) for jump-to-jump browsing

### Collections
- Multiple named collections, persisted via `figma.clientStorage`
- Star button in search results adds to the first (default) collection
- Rename inline, delete with confirmation
- Per-collection mood board export — generates a Figma frame with auto-layout, each work as a captioned card

### Color palette extraction
- Extract dominant colors from any artwork's image
- Bucketed quantization with diversity selection
- "Add as Figma color styles" creates `PaintStyles` under `{Museum} / {artist} / {title}`

### Polish
- Auto-adapts to Figma's light and dark mode via theme CSS variables
- Search history (last 5 searches) surfaced as chips when the search input is empty
- Spelling corrections ("Did you mean…") from SMK's API
- React `ErrorBoundary` catches UI crashes and offers a Try-Again

## Local development

```bash
npm install
npm run dev        # watches both UI and plugin in parallel
```

Then in Figma desktop: **Plugins → Development → Import plugin from manifest…** and select `manifest.json`.

Available scripts:

| Script | What it does |
|--------|--------------|
| `npm run dev` | Watch both UI and plugin sandbox builds |
| `npm run build` | One-shot production build |
| `npm run typecheck` | TypeScript validation without emit |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (125 tests) |
| `npm run build:ui` / `build:plugin` | Build only the UI or plugin half |

Before pushing: `npm run typecheck && npm run lint && npm run test && npm run build` — all four must pass (also enforced in CI).

## Project structure

```
kroyer-figma-plugin/
├── manifest.json              # Figma plugin manifest (networkAccess for all five museums' domains)
├── package.json
├── vite.config.ts             # dual-mode build (UI + sandbox)
├── tsconfig.json
├── src/
│   ├── shared/
│   │   ├── model.ts           # normalized Artwork type + ProviderId union — the
│   │   │                      # provider-agnostic contract every component reads
│   │   └── storageKeys.ts
│   ├── ui/                    # iframe-side: React UI
│   │   ├── App.tsx            # orchestrator + state
│   │   ├── components/        # SearchBar, FilterPanel, ProviderPicker, ResultGrid,
│   │   │                      # ResultCard, DetailPanel, TabBar, CollectionsTab, etc.
│   │   ├── providers/         # one ArtProvider implementation per museum
│   │   │   ├── types.ts       # ArtProvider interface, ProviderCapabilities
│   │   │   ├── registry.ts    # provider lookup + museum-picker order
│   │   │   ├── shared.ts      # fetchJson, offset/hasMore helpers shared across providers
│   │   │   ├── smk/           # provider.ts, mapper.ts, types.ts (+ tests, fixtures)
│   │   │   ├── aic/
│   │   │   ├── cma/
│   │   │   ├── met/
│   │   │   └── rijks/
│   │   ├── images/            # imageCache.ts (LRU blob-URL cache), pluginFetch.ts
│   │   │                      # (main-thread image transport for blocked hosts),
│   │   │                      # useArtworkImage.ts, sizing.ts (IIIF size helpers)
│   │   ├── hooks/              # useSearch, useInsertImage, useEscapeKey
│   │   ├── storage/            # migrate.ts, quota.ts (clientStorage guards)
│   │   ├── utils/               # collections, images (transport + decode), palette, async
│   │   ├── messages.ts          # UI ↔ plugin message types
│   │   └── styles/global.css
│   └── plugin/
│       └── controller.ts      # plugin sandbox — figma.* API calls, main-thread image fetch
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── ROADMAP.md                 # provider-abstraction analysis and phased plan
├── TECH-NOTES.md              # per-museum API discovery, design notes, the AIC investigation
└── LICENSE                    # MIT
```

## Architecture notes

- **No backend.** CORS is open on every museum's API and image hosts except one (see below), so the plugin calls museums directly from the UI iframe. `networkAccess.allowedDomains` in the manifest is the only allowlisting required.
- **Provider abstraction.** Every museum implements the `ArtProvider` interface (`src/ui/providers/types.ts`): `search()`, an optional `getSimilar()`, a `capabilities` object the filter panel reads to show only supported filters, and an `imageLoading` mode (`'iframe'` | `'main-thread'` | `'blocked'`). Components only ever read the normalized `Artwork` model (`src/shared/model.ts`) — no raw museum API fields leak past the provider's mapper.
- **Image transport.** Most providers load images as plain `<img>` tags in the UI iframe (`imageLoading: 'iframe'`). AIC's host blocks that route entirely (`imageLoading: 'blocked'`) — image bytes for hosts that block the sandboxed iframe but not a normal fetch would route through the plugin main thread instead (`imageLoading: 'main-thread'`; the transport is built and tested, currently unused by any provider — see TECH-NOTES.md).
- **Single-file UI.** The Vite build (`vite-plugin-singlefile`) inlines all JS, CSS, and fonts into one `dist/index.html` — required because Figma loads the UI as a self-contained document.
- **Message bus.** UI posts typed `UiToPluginMessage` objects to the sandbox via `parent.postMessage`. Sandbox posts `PluginToUiMessage` back via `figma.ui.postMessage`. All types live in `src/ui/messages.ts`.
- **Persistence.** Plugin sandbox reads `figma.clientStorage` on bootstrap and sends an `init` message. UI hydrates, then writes back via `storage-set` messages.
- **Image insertion.** UI fetches the image as `Uint8Array`, reads dimensions from a temporary `Image` element, and ships bytes + metadata to the sandbox. The sandbox calls `figma.createImage(bytes)` and places it at viewport center.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

Built on each museum's open-access API: [SMK's Open API](https://www.smk.dk/article/smk-api/), the [Art Institute of Chicago's API](https://api.artic.edu/docs/), the [Cleveland Museum of Art's Open Access API](https://openaccess-api.clevelandart.org/), [The Met's Collection API](https://metmuseum.github.io/), and the [Rijksmuseum's Data Services](https://data.rijksmuseum.nl/). All artwork data and images belong to their respective museums; rights vary by work and museum and are shown per-item in the plugin.

Built with TypeScript, React 18, and Vite.

---

<details>
<summary><strong>Figma Community submission copy</strong> (paste-ready)</summary>

**Short description (max 100 chars):**

> Insert public-domain artworks from five major museums directly into your Figma designs.

**Long description:**

> Krøyer brings five museums' open-access collections straight into Figma: Denmark's National Gallery (SMK), the Art Institute of Chicago, the Cleveland Museum of Art, The Metropolitan Museum of Art, and the Rijksmuseum in Amsterdam. Search millions of artworks combined — from Hammershøi to Rembrandt to medieval altarpieces — and drop images right onto your canvas with attribution.
>
> Named after the Danish painter Peder Severin Krøyer (1851–1909).
>
> Filter by rights — public domain works are free to use commercially, and the filter is on by default so you only see usable works where each museum supports it.
>
> **Features:**
> - Pick a museum, search artist, title, period, technique
> - Filter by rights (Public Domain by default, where supported)
> - Drag-and-drop or click to insert at viewport center
> - Pick insertion size — thumbnail (300px) to native resolution
> - Auto-fills layer names with "Artist — Title"; optional caption text below the image
> - Save works to named collections, mixing museums freely
> - Generate mood board frames from any collection
> - Extract color palettes from artworks straight into Figma color styles
> - Light and dark mode aware
>
> No account, no backend, no tracking. Open source and MIT-licensed.

**Tags:** art, museum, public domain, stock images, color palette, mood board, history

</details>
