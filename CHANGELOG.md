# Changelog

All notable changes to this project are documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-18

Initial release. Implements all v1 features per the original scoping document.

### Search & insert
- Free-text search against SMK's `/art/search/` endpoint with debounce and request cancellation
- Progressive filter panel: artist, period range, has-image, rights
- Public Domain default + toggle to include copyrighted works
- Result grid with skeleton loading, lazy images, copyright badge on non-PD works
- Drag-and-drop a thumbnail or click "Insert" — inserts at viewport center
- Size selector (300/800/1600/native px) and optional caption toggle
- Automatic attribution: layer name = "Artist — Title"; caption (when enabled) reads "Artist — Title (Year)"
- Polished tom/indlæser/fejl/no-results states with did-you-mean correction chips

### Detail view
- Full metadata, public domain / copyright badges, external link to open.smk.dk
- Related works via SMK's `similar_images_url` — click navigates between artworks
- Esc dismisses; slide-in animation; ARIA dialog semantics

### Collections & persistence
- Multiple named collections via `figma.clientStorage`
- Default "Favorites" auto-created on first run
- Star button toggles a work in/out of the first (default) collection
- Rename inline; delete with confirmation; per-work removal
- Search history (last 5, deduped, persisted) shown as chips when input is empty
- Tab navigation between Search and Collections

### Advanced features
- **Color palette extraction**: bucketed quantization on a downsampled canvas, diversity-aware selection. Creates Figma `PaintStyles` named `SMK / {artist} / {title} / Color NN`.
- **Mood board export**: generates a Figma frame with auto-layout + wrap; each work becomes a child frame with image, Medium-weight title, and Regular artist line. Progress overlay during export.

### Polish & infrastructure
- TypeScript + React 18 + Vite, single-file UI bundle via `vite-plugin-singlefile`
- Figma plugin manifest v1 with `networkAccess.allowedDomains` for `api.smk.dk`, `iip.smk.dk`, `iip-thumb.smk.dk`, `similar.api.smk.dk`, `enrichment.api.smk.dk`
- Light/dark mode auto-adapt via Figma theme CSS variables (`themeColors: true`)
- React `ErrorBoundary` for UI crashes
- MIT license, open source, no backend

### Validated against live SMK API on 2026-05-18
- CORS confirmed open on `api.smk.dk` and `iip.smk.dk`
- `[public_domain:true]` filter syntax confirmed (147k+ works)
- `image_thumbnail` / `image_native` / `iiif_manifest` / `similar_images_url` all returned per-artwork
- See [TECH-NOTES.md](./TECH-NOTES.md) for details.
