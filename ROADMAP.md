# Roadmap — from Krøyer to the ultimate public-domain-art plugin for Figma

This document is a full analysis of the v0.1.0 codebase and a phased roadmap for evolving Krøyer from a single-museum (SMK) plugin into the definitive way to bring public domain art into Figma: many museums, millions of CC0 works, deep Figma integration, and licensing-correct attribution built in.

Structure: [current state](#a-current-state-assessment) → [known defects](#b-known-defects--correctness-gaps) → [target architecture](#c-target-architecture-the-provider-abstraction) → [phased roadmap](#d-phased-roadmap) → [feature backlog](#e-feature-backlog) → [risks](#f-risks).

---

## A. Current-state assessment

The v1 foundation is genuinely solid:

- **Clean two-world architecture.** UI iframe (React 18) and plugin sandbox communicate exclusively through typed, discriminated-union messages (`src/ui/messages.ts`). The sandbox controller is small and focused (`src/plugin/controller.ts`).
- **Strict TypeScript** (`noUnusedLocals`, `noImplicitReturns`, strict mode) and a tidy dual-bundle Vite build (single-file UI + ES2017 IIFE sandbox).
- **Real features already shipped**: search with filters and did-you-mean, drag-or-click insert with size presets and captions, detail view with related works, persisted collections, mood-board export with auto-layout, palette extraction into PaintStyles, theme awareness, resizable window.
- **Defensive sandbox bootstrap**: per-key try/catch on `clientStorage` reads, fallback `init` so the UI never hangs.

The structural limitation is equally clear: **everything is hardcoded to SMK.**

- The raw SMK API schema (`Artwork` in `src/ui/api/smkClient.ts`) is imported directly throughout the component tree — every component does its own `titles?.[0]?.title ?? 'Untitled'` style defaulting.
- SMK's bracket-filter query dialect, IIIF URL shape, response envelope (`data.item` / `data.items`), and domains are baked into `smkClient.ts`, `iiifClient.ts`, and `manifest.json`.
- No pagination, no result caching, no tests, no lint, no CI.

"Ultimate" requires exactly one big structural move — a **provider abstraction** — plus a set of correctness fixes and Figma-native power features. That's what the rest of this document lays out.

## B. Known defects & correctness gaps

Verified against the source (file references are to v0.1.0):

1. **Abort signal never wired to `fetch`.** `useSearch.ts:40-42` creates an `AbortController`, but `searchArtworks` (`smkClient.ts:92`) never receives the signal — it's used only as a stale-result guard. In-flight requests are never actually cancelled; every debounced keystroke's request runs to completion.
2. **No pagination.** `rows: 30` is hardcoded (`useSearch.ts:54`); `SearchParams.offset` exists (`smkClient.ts:60`) but is never passed. The UI advertises the full `found` count (often thousands) while only ever rendering the first 30 — a dead end with no "Load more".
3. **No 4096 px image guard.** `pickImageUrl(..., 'native')` (`iiifClient.ts:31-40`) passes the native URL through unclamped. Figma's `createImage` (`controller.ts:98`) throws on images over 4096 px per side, so "native" inserts of large works fail with a generic error.
4. **Caption font failure orphans the image.** In `insertImage` (`controller.ts:91-125`) the rectangle is created *before* `loadFontAsync({ family: 'Inter' })` runs (line 111). If Inter is unavailable (org fonts, offline), the insert errors after the rect exists — leaving an orphan rectangle and an error toast. Needs load-font-first plus a fallback chain.
5. **`clientStorage` quota unguarded.** Collections store full raw `Artwork` objects inline, and `storage-set` (`controller.ts:71-73`) writes any key/value with no validation or size check. `clientStorage` has roughly a 5 MB quota; large collections can silently fail to persist.
6. **Mood board fragility.** Cards are created incrementally, so one bad `imageBytes` aborts the whole board mid-loop (`controller.ts:187`) with earlier cards already on canvas. Export also fetches images sequentially (`App.tsx:111-147`) — slow for large collections.
7. **Dead code and over-fetching.** `getArtwork` (`smkClient.ts:98-105`) is exported but never used. No `fields=` param is sent, so every search over-fetches the full payload; many typed fields are never read (`iiif_manifest`, `on_display`, `rights`, `image_width/height`, …).
8. **Accessibility gaps.** `DetailPanel` is `role="dialog" aria-modal="true"` but has no focus trap or initial focus move; the collection options menu doesn't close on outside-click or Escape; delete uses native blocking `confirm()`; no `prefers-reduced-motion` handling anywhere in `global.css`; `ResizeHandle` is mouse-only; drag-to-insert has no keyboard equivalent; no live-region announcement of result counts.
9. **Captions don't wrap.** The caption text node uses `WIDTH_AND_HEIGHT` auto-resize (`controller.ts:118`), so a long "Artist — Title (Year)" extends past the image instead of wrapping to its width.

## C. Target architecture: the provider abstraction

The core of "ultimate" is supporting many museums behind one interface. The Figma-specific constraints shape the design:

- `networkAccess.allowedDomains` is a **fixed allowlist** — every provider's API *and image CDN* domains must be declared in the manifest up front, and changes trigger plugin re-review. So: one batched manifest update covering all planned providers.
- API keys can't be bundled — keyed providers need user-supplied keys stored in `clientStorage`. So: **ship keyless providers first.**

### Normalized model (`src/shared/model.ts`)

A `shared/` module imported by both bundles (today `messages.ts` drags UI types into the plugin bundle; this makes the boundary explicit):

```ts
type ProviderId = 'smk' | 'aic' | 'cma' | 'met' | 'rijks' | 'europeana' | 'wikimedia'
type Rights = 'public-domain' | 'cc0' | 'cc-by' | 'copyrighted' | 'unknown'

type Artwork = {
  v: 1                      // schema version for stored snapshots
  provider: ProviderId
  id: string                // provider-local id (SMK object_number, Met objectID, …)
  key: string               // `${provider}:${id}` — global identity used everywhere
  title: string             // mappers do defaulting ONCE ('Untitled', 'Unknown artist')
  artist: string
  dateText?: string         // display string ("1893", "c. 1660–65")
  yearStart?: number
  yearEnd?: number
  rights: Rights            // enum, not a boolean — users make licensing decisions on this
  creditLine?: string
  medium?: string
  sourceUrl?: string        // museum web page
  image: {
    thumbnailUrl?: string   // ~300px for grids
    nativeUrl?: string
    iiifBase?: string       // IIIF Image API base when available
    width?: number
    height?: number
  }
  similarUrl?: string       // SMK-only for now
  extra?: Record<string, string>  // provider-specific display-only metadata
}
```

Components stop reading raw SMK fields (`work.titles?.[0]?.title`, `work.public_domain`) — the per-provider **mapper** normalizes once. `key` replaces `object_number` as the identity in collections, insert tracking, and React keys.

### `ArtProvider` interface (`src/ui/providers/types.ts`)

```ts
type ProviderCapabilities = {
  supportsArtistFilter: boolean
  supportsPeriodFilter: boolean
  supportsPublicDomainFilter: boolean
  supportsSimilar: boolean
  supportsIIIF: boolean
  needsApiKey: boolean
  maxImageSizePx?: number
  maxPageSize: number
}

interface ArtProvider {
  readonly id: ProviderId
  readonly label: string          // "SMK — Copenhagen"
  readonly capabilities: ProviderCapabilities
  readonly domains: string[]      // asserted against manifest.json at build time
  search(q: SearchQuery, signal: AbortSignal): Promise<SearchPage>
  getById?(id: string, signal?: AbortSignal): Promise<Artwork>
  getSimilar?(work: Artwork, signal?: AbortSignal): Promise<Artwork[]>
  setApiKey?(key: string): void
}
```

Each provider lives in `src/ui/providers/<id>/{types,mapper,provider}.ts` with a central registry. Filter mapping stays inside each provider (SMK keeps its bracket dialect; AIC uses `is_public_domain`; CMA uses `cc0=1`; the Met uses `hasImages=true` + ID hydration). `FilterPanel` renders controls from `capabilities` — the period slider simply hides for providers that can't filter by date.

### Image sizing (`src/ui/images/`)

`sizing.ts` replaces the SMK-specific regex in `iiifClient.ts`: per-provider IIIF templates built from `image.iiifBase`, with `px = min(requested, 4096, capabilities.maxImageSizePx)`. For oversized non-IIIF images, `downscale.ts` does a canvas-based downscale in the iframe before bytes are posted — closing defect B.3 structurally.

### Collections v2 + migration

```ts
type StoredWork = { key: string; provider: ProviderId; id: string; snapshot: Artwork; savedAt: string }
type CollectionsEnvelope = { version: 2; collections: CollectionV2[] }
```

Stored under a **new** `collections.v2` key. On init, legacy collections (raw SMK objects) are migrated through the SMK mapper with per-work error tolerance; the legacy `collections` key is kept untouched for one release as rollback insurance. A quota guard warns around ~3.5 MB and refuses new adds past ~4.5 MB. Normalized snapshots are much smaller than the raw objects stored today, so migration itself frees space.

### Provider selection UI

**Per-provider search first; federated "All museums" deferred.** Cross-provider relevance scores aren't comparable, pagination semantics differ, and the Met needs an N+1 hydrate — naive interleaving would look broken. v1 of multi-museum is a compact `ProviderPicker` dropdown next to the search bar (persisted choice); "All museums" later becomes one more picker entry implemented as a fan-out with per-provider result sections and provider badges on cards.

### Museum candidates

| Provider | API key | Notes |
|----------|---------|-------|
| SMK (current) | No | ~260k works, 147k+ CC0, IIIF, similar-works endpoint |
| Art Institute of Chicago | No | Cleanest open API, real IIIF, `is_public_domain` — **best first addition** |
| Cleveland Museum of Art | No | ~37k CC0 works, `cc0=1` param, straightforward JSON |
| The Met | No | ~490k objects, but search returns bare IDs → needs capped-concurrency hydration |
| Rijksmuseum | Free key | Superb images (via googleusercontent CDN — verify manifest domain) |
| Europeana | Free key | Aggregator; arbitrary image hosts make it a poor fit for Figma's fixed allowlist — likely skip or thumbnails-only |
| Wikimedia Commons | No | Enormous, but messy metadata/rights — later, carefully |

Manifest domains to add in one batch: `api.artic.edu`, `www.artic.edu`, `openaccess-api.clevelandart.org`, `openaccess-cdn.clevelandart.org`, `collectionapi.metmuseum.org`, `images.metmuseum.org`, plus keyed-provider domains if/when committed. A build-time check asserts every registered `provider.domains` entry appears in `manifest.json`, so a provider can't ship with unfetchable images.

## D. Phased roadmap

### Phase 0 — Safety net
Vitest + ESLint + GitHub Actions CI (typecheck, lint, test, build). Unit tests for the pure functions that exist today (`buildFilters`, `resizeImage`/`pickImageUrl`, collections utils) and, later, mappers and migration. The repo has zero tests and the Phase 1 refactor touches every file that renders an artwork — this comes first.

### Phase 1 — Normalized model + SMK behind `ArtProvider` (behavior-preserving)
Create `shared/model.ts`, `providers/types.ts`, `providers/smk/*`, `images/sizing.ts`, and the registry with SMK as sole entry. Rewrite `useSearch` against the interface — **wiring the abort signal here** (fixes B.1). Convert all components/hooks off raw SMK fields; delete `src/ui/api/*`. Add SMK's `fields=` param to cut payloads (fixes B.7). Mapper tests against a captured SMK fixture. No visible change — manual QA is a side-by-side of search/insert/collections/mood-board.

### Phase 2 — Storage v2 + quota guard
`storage/migrate.ts` + `storage/quota.ts`; controller reads both storage keys at bootstrap; `storage-set` gets a key allowlist (fixes B.5). Fixture-tested migration of the current stored shape.

### Phase 3 — Remaining correctness
Independent, small once Phase 1 lands: load-more pagination (fixes B.2), 4096 px clamp + canvas downscale (B.3), font-fallback chain with load-before-create and caption-optional-on-failure (B.4), mood-board per-card tolerance + parallel throttled fetches (B.6), caption wrapping to image width (B.9).

### Phase 4 — New museums + picker
One-shot manifest domain update (single review cycle). AIC first (cleanest API — proves the abstraction), then CMA, then the Met (ID-list search + ~10-way capped concurrent hydrate with a small in-memory cache). `ProviderPicker`, capability-driven `FilterPanel`, provider badge on result cards, per-provider attribution formats. `DetailPanel` hides Related Works when `!capabilities.supportsSimilar`.

### Phase 5 — Federated search + keyed providers
"All museums" fan-out with per-provider result sections. Settings panel for Rijksmuseum (and optionally Europeana) API keys stored via `clientStorage` — never bundled.

## E. Feature backlog

Beyond the phases above — the features that make the plugin *ultimate* rather than merely multi-museum. Grouped, roughly prioritized within each group.

### Deep Figma integration
- **Fill selection** — insert an artwork as the image fill of the currently selected shape/frame (FILL/FIT scale modes). The single biggest designer-workflow win: pick a frame, click a painting, done.
- **Relaunch buttons** (`setRelaunchData`) on inserted nodes: "Swap artwork", "Find similar", "Show attribution" — the plugin stays reachable from the canvas, not just the menu.
- **Attribution as metadata** — store license, credit line, and source URL on inserted nodes via `setPluginData`, plus a "Generate credits" command that scans the page and emits a formatted attribution text block. Real licensing value, especially for CC-BY works, and no other plugin does it well.
- **FigJam and Slides support** (`editorType`) — mood boards belong in FigJam; art belongs in decks.
- **Plugin parameters** — quick-actions-bar search ("Krøyer: hammershøi ⏎") without opening the UI; menu commands like "Random artwork".
- **Palette as Figma variables** (not just PaintStyles), optional LAB-distance dedup for perceptually distinct swatches, palette extraction across a whole collection.

### Search & discovery
- Orientation / aspect-ratio filter — designers usually need art *for a specific frame shape*.
- Medium / object-type filter (painting, print, sculpture, photograph).
- Color-based search where providers expose it (SMK and AIC both do).
- Browse-without-query: curated highlights, departments, "on display now", random / "surprise me", artwork-of-the-day.
- Result + image caching — in-memory keyed by query first; durable IndexedDB later (already on the TECH-NOTES deferred list).

### Collections & boards
- Add-to-any-collection picker (today the star only targets the default collection).
- Drag-reorder within a collection.
- Mood-board layout options: masonry, column count, card size; export as an attribution-ready frame (images + credits block).

### Quality & polish
- The accessibility fixes from defect B.8: focus trap + initial focus in dialogs, Escape/outside-click handling with proper stacking, styled confirm dialogs, `prefers-reduced-motion`, keyboard-accessible resize and insert, live-region result announcements.
- i18n groundwork (en/da) — SMK returns Danish metadata; request `lang` where the API supports it and prepare UI strings for translation.

### Distribution & release
Two layers, cheap-to-turnkey:
- **Prebuilt GitHub Release (shipped).** `.github/workflows/release.yml` runs the CI gates on a `v*` tag, then attaches a `kroyer-<version>.zip` (manifest + compiled `dist/`) to an auto-generated release. Users import the manifest with no Node/npm/build step. This is the current recommended install path.
- **Figma Community listing (planned — true one-click).** The manifest already carries a registered plugin `id`, so the work is the publishing flow itself: cover art, description, category, and Figma's review. Cannot be automated in CI — it's a manual upload of a build per release — but it's the only path that gives non-technical users in-Figma **Install** and automatic updates. Target this as the public launch once the multi-museum release is stable.

## F. Risks

1. **Manifest re-review latency / missed image CDNs.** All domains must be declared up front, and a provider's *image* host often differs from its API host (Rijksmuseum serves via googleusercontent). Mitigation: the build-time domains-vs-manifest assertion, plus manual smoke-testing of each provider's real image URLs before submission.
2. **The Met's N+1 hydrate.** Search returns bare IDs; naive hydration is 30 sequential fetches per query. Needs a concurrency cap, abort propagation into the fan-out, and page slicing over the ID array. Ship AIC/CMA first so the interface is proven on simpler providers.
3. **Migration data loss.** Users' collections are irreplaceable. Mitigation: write to a new key, keep the legacy key one release, fixture-tested migration, per-work try/catch (skip unmappable works, never fail the whole migration).
4. **IIIF dialect divergence.** SMK's `!w,` rewrite doesn't generalize; every provider's image-URL scheme must be validated against real URLs — broken sizing means broken inserts, the plugin's core action.
5. **Rights heterogeneity.** "Public domain" vs CC0 vs "no known restrictions" differ per museum. Map conservatively (`unknown` when unsure) — users make licensing decisions on the badge.
6. **Big-bang Phase 1 conversion.** ~10 files change together in a repo with no tests today — hence Phase 0 first, and keeping Phase 1 strictly behavior-preserving so QA is a simple before/after comparison.
