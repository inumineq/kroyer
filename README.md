# Krøyer

A Figma plugin for searching and inserting public-domain artworks from major museum open-access collections: [Statens Museum for Kunst](https://www.smk.dk/) (Denmark's National Gallery), the [Art Institute of Chicago](https://www.artic.edu/), the [Cleveland Museum of Art](https://www.clevelandart.org/), and [The Metropolitan Museum of Art](https://www.metmuseum.org/).

Named after [Peder Severin Krøyer](https://en.wikipedia.org/wiki/Peder_Severin_Kr%C3%B8yer) (1851–1909), one of the most beloved Skagen Painters.

Search hundreds of thousands of artworks. Filter by rights — most importantly Public Domain (CC0). Drop images directly into your Figma designs with attribution. Save works into collections, extract color palettes, and generate mood boards.

**Status:** v0.1.0 — feature-complete v1, ready for Figma Community submission. See [ROADMAP.md](./ROADMAP.md) for the analysis and phased plan toward multi-museum support.

## Features

### Search & insert
- Free-text search with progressive filter disclosure
- Filter by artist, period (year range), rights, has-image
- Public Domain as default — toggle to include copyrighted works
- Result grid with skeleton loading and lazy images
- Drag a thumbnail onto the canvas, or click "Insert" — inserted at viewport center
- Pick insertion size: 300px / 800px / 1600px / native resolution
- Optional automatic caption ("Artist — Title (Year)") placed next to the image
- Layer name is set to "Artist — Title" on every insert

### Detail view
- Full metadata: title, artist, period, technique, type, department, object number, credit line
- Public domain or copyright badge
- "View on open.smk.dk" opens externally
- Esc dismisses the panel
- Related works (from SMK's own similarity endpoint) for jump-to-jump browsing

### Collections
- Multiple named collections, persisted via `figma.clientStorage`
- Star button in search results adds to the first (default) collection
- Rename inline, delete with confirmation
- Per-collection mood board export — generates a Figma frame with auto-layout, each work as a captioned card

### Color palette extraction
- Extract dominant colors from any artwork's image
- Bucketed quantization with diversity selection
- "Add as Figma color styles" creates `PaintStyles` under `SMK / {artist} / {title}`

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
| `npm run build:ui` / `build:plugin` | Build only the UI or plugin half |

## Project structure

```
smk-figma-plugin/
├── manifest.json              # Figma plugin manifest (networkAccess for SMK domains)
├── package.json
├── vite.config.ts             # dual-mode build (UI + sandbox)
├── tsconfig.json
├── src/
│   ├── ui/                    # iframe-side: React UI
│   │   ├── App.tsx            # orchestrator + state
│   │   ├── components/        # SearchBar, FilterPanel, ResultGrid, ResultCard,
│   │   │                      # DetailPanel, TabBar, CollectionsTab, etc.
│   │   ├── api/
│   │   │   ├── smkClient.ts   # SMK API client (search, getById, getSimilar)
│   │   │   └── iiifClient.ts  # IIIF size helpers
│   │   ├── hooks/             # useSearch, useInsertImage, useEscapeKey
│   │   ├── utils/             # collections, images, palette
│   │   ├── messages.ts        # UI ↔ plugin message types
│   │   ├── types.ts           # shared domain types
│   │   └── styles/global.css
│   └── plugin/
│       └── controller.ts      # plugin sandbox — figma.* API calls
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── TECH-NOTES.md              # API discovery and design notes
└── LICENSE                    # MIT
```

## Architecture notes

- **No backend.** CORS is open on both `api.smk.dk` and `iip.smk.dk`, so the plugin calls SMK directly from the UI iframe. `networkAccess.allowedDomains` in the manifest is the only allowlisting required.
- **Single-file UI.** The Vite build (`vite-plugin-singlefile`) inlines all JS, CSS, and fonts into one `dist/index.html` — required because Figma loads the UI as a self-contained document.
- **Message bus.** UI posts typed `UiToPluginMessage` objects to the sandbox via `parent.postMessage`. Sandbox posts `PluginToUiMessage` back via `figma.ui.postMessage`. All types live in `src/ui/messages.ts`.
- **Persistence.** Plugin sandbox reads `figma.clientStorage` on bootstrap and sends an `init` message. UI hydrates, then writes back via `storage-set` messages.
- **Image insertion.** UI fetches the image as `Uint8Array`, reads dimensions from a temporary `Image` element, and ships bytes + metadata to the sandbox. The sandbox calls `figma.createImage(bytes)` and places it at viewport center.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

Built on [SMK's Open API](https://www.smk.dk/article/smk-api/). All artwork data and images © SMK; public domain works are released under CC0 by the museum.

Built with TypeScript, React 18, and Vite.

---

<details>
<summary><strong>Figma Community submission copy</strong> (paste-ready)</summary>

**Short description (max 100 chars):**

> Insert public-domain artworks from the National Gallery of Denmark directly into your Figma designs.

**Long description:**

> Krøyer brings Denmark's National Gallery (Statens Museum for Kunst) straight into Figma. Search the museum's collection of ~260,000 artworks — from Hammershøi to Eckersberg to medieval altarpieces — and drop images right onto your canvas with attribution.
>
> Named after the Danish painter Peder Severin Krøyer (1851–1909).
>
> Most importantly: 147,000+ works are public domain (CC0) and free to use commercially. Filter is on by default so you only see usable works.
>
> **Features:**
> - Search artist, title, period, technique
> - Filter by rights (Public Domain on by default)
> - Drag-and-drop or click to insert at viewport center
> - Pick insertion size — thumbnail (300px) to native resolution
> - Auto-fills layer names with "Artist — Title"; optional caption text below the image
> - Save works to named collections
> - Generate mood board frames from any collection
> - Extract color palettes from artworks straight into Figma color styles
> - Light and dark mode aware
>
> No account, no backend, no tracking. Open source and MIT-licensed.

**Tags:** art, museum, public domain, stock images, color palette, mood board, Denmark, history

</details>
