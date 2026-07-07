# Tech Notes — SMK API findings

## AIC images — permanently blocked, verified 2026-07-07

The Art Institute of Chicago's image host (`www.artic.edu`) sits behind a
Cloudflare **managed challenge** that returns 403 for every sandboxed/
null-origin context the plugin can route bytes through: the UI iframe
(`sandbox="allow-scripts"`, `fetch()` from origin `'null'`), the plugin
**main-thread** `fetch()` sandbox (also origin `'null'` in Figma's
implementation — confirmed by live probe, not just the iframe case), and
`figma.createImageAsync()`, which itself proxies through
`https://cors-image-proxy.figma.com` and is 403'd there too. There is no
viable byte route for AIC images from within a Figma plugin. AIC search and
metadata are unaffected — only image bytes are blocked. Per the pre-planned
Step 9 fallback: AIC works stay searchable, images render as their inline
`lqip` placeholder with a permanent "Preview unavailable" state and an
"Open on artic.edu" link (`open-url`), and byte-consuming features (insert,
palette extraction, mood-board export) are disabled/skipped for AIC works
specifically, with honest skip counts reported via the existing notify
mechanism. The switch is `imageLoading: 'blocked'` on `aicProvider` in
`src/ui/providers/aic/provider.ts` — flipping it back to `'main-thread'` is
a one-word change if AIC's Cloudflare rule is ever relaxed; the main-thread
fetch machinery (`pluginFetch.ts`, `imageCache.ts`, the plugin controller's
`fetch-image` handler, and the `'main-thread'` code path in
`useArtworkImage.ts`) is kept intact and under test for that day.

## Rijksmuseum — keyless Data Services API, verified 2026-07-08

The old keyed `www.rijksmuseum.nl/api` is **dead (HTTP 410 Gone)**. The
provider uses the keyless `data.rijksmuseum.nl` instead — no API key, CORS
`*`. Its search endpoint (`/search/collection`) has **no free-text param**
(unknown params → 400), only field params (`title`, `creator`,
`description`, `imageAvailable`, …), so free text fans out client-side to
up to three parallel field searches whose ID streams are merged and
deduped (see `src/ui/providers/rijks/provider.ts`). Hydration is one call
per object via the EDM-framed JSON-LD profile
(`/{id}?_profile=edm-framed&_media_type=application/ld+json`), which
returns title, creator, object number, date, medium, rights URI, website
link, and IIIF image/service URLs in a single document. Images come from
`iiif.micr.io` (IIIF Image API v3, level2), which serves sandboxed
requests openly — CORS `*`, no Cloudflare challenge (unlike AIC) — so the
provider uses the default `imageLoading: 'iframe'`. V1 caps each query's
reachable universe at the first page (100 ids) per stream; `pageToken`
continuation is the documented later extension.

Validated against live API on 2026-05-18. All four critical assumptions from the original plan resolved during Phase 0; remaining items have been confirmed during Phase 1-4 implementation.

## 1. CORS — open ✅

Both `api.smk.dk` and `iip.smk.dk` return `Access-Control-Allow-Origin: *`. The plugin calls SMK directly from the UI iframe — no proxy needed.

```
$ curl -sI "https://api.smk.dk/api/v1/art/search/?keys=test"
Access-Control-Allow-Origin: *
```

`networkAccess.allowedDomains` in `manifest.json` is still required (Figma's separate plugin-permission system).

## 2. Filter syntax — confirmed ✅

```
filters=[public_domain:true],[has_image:true],[creator:Hammershøi,V.]
```

URL-encoded on the wire:
```
filters=%5Bpublic_domain%3Atrue%5D%2C%5Bhas_image%3Atrue%5D%2C%5Bcreator%3AHammersh%C3%B8i%2CV.%5D
```

`[public_domain:true]` returned **147,524** works — far more than the ~39k mentioned in early research. The PD-as-default decision is even better grounded than expected.

Period filter `[production_dates_period:1880-1920]` is supported but **the exact syntax was not validated under load** — works in casual testing.

`URLSearchParams` handles encoding correctly. Build the filter as a literal string (`[a:b],[c:d]`), then set it as a `URLSearchParams` value.

## 3. Image URLs — two patterns observed ✅

Each `Artwork` response carries `image_thumbnail` and `image_native` URLs directly — no need to construct IIIF URLs from scratch. Format varies:

| Pattern | Example | Resizable? |
|---------|---------|-----------|
| IIIF (`iip-thumb.smk.dk`) | `https://iip-thumb.smk.dk/iiif/jp2/{file}.tif.jp2/full/!1024,/0/default.jpg` | Yes — replace the `!1024,` segment |
| Plain thumbnail (`api.smk.dk`) | `https://api.smk.dk/api/v1/thumbnail/{uuid}.jpg` | No — fixed size |

`iiifClient.ts`'s `resizeImage(url, size)` handles both: it resizes IIIF URLs and returns the plain-thumbnail ones unchanged.

`iiif_manifest` (URL pointing to a full IIIF manifest) is also present on every artwork. Not used in v1 but is the right hook for high-res deep-zoom features later.

## 4. Rate limits — undocumented, mitigated client-side ✅

No `X-RateLimit-*` headers seen; SMK doesn't publish limits. The plugin implements good-citizen behaviour anyway:

- 300ms debounce on the search input (`useSearch.ts`)
- Single in-flight request per query — `AbortController` cancels the previous on every input change
- Pagination throttled — `rows=30` default; no auto-load-more
- Mood board export fetches images sequentially (one at a time) with per-image error tolerance

## Useful fields discovered

Beyond the basics, each artwork carries:

- `frontend_url` — direct link to the SMK Open page (`open.smk.dk/artwork/image/...`)
- `similar_images_url` — built-in similar-works endpoint. **Used in production** for the "Related works" feature in `DetailPanel`. More accurate than the originally planned "same creator/period" heuristic.
- `enrichment_url` — Wikidata-style enrichment; not used in v1 but available.
- `credit_line[]` — properly-formatted attribution string. Currently shown in `DetailPanel`; could be used for auto-captioning instead of the constructed "Artist — Title" string.
- `corrections` (search response) — spelling-correction suggestions. Surfaced as did-you-mean chips in the no-results state.
- `has_3d_file` — some works have 3D scans. Out of scope for v1.

## Example queries used in production code

```
# Search by free text + PD + has image (default user flow)
https://api.smk.dk/api/v1/art/search/?keys=hammershøi&filters=[has_image:true],[public_domain:true]&rows=30

# Lookup a specific work
https://api.smk.dk/api/v1/art?object_number=KMS3352

# Similar works for a given object (used by RelatedWorks component)
https://similar.api.smk.dk/similar/?object_number=KMS3352
```

## Open items for future versions

See [ROADMAP.md](./ROADMAP.md) for the full codebase analysis and the phased plan (provider abstraction, additional museums, correctness fixes) that supersedes this list.

- **Period filter under load** — verify deep history queries (`[production_dates_period:1500-1900]` etc.) don't time out.
- **Deep pagination** — `offset=5000+` performance is untested.
- **3D file support** — possible v2 feature, would need a Figma 3D embed strategy.
- **Hosted IIIF deep-zoom viewer** — leverage `iiif_manifest` for a tile-based image viewer inside the detail panel.
- **Caching strategy** — currently in-memory only per session. Consider a more durable cache (IndexedDB) for offline browsing.
