# Tech Notes — SMK API findings (Fase 0)

Validated against live API on 2026-05-18. The plan called out four critical assumptions; here are the results.

## 1. CORS — RESOLVED ✅

Both `api.smk.dk` and `iip.smk.dk` return `Access-Control-Allow-Origin: *`. Plugin can call directly from the UI iframe — no proxy needed.

```
$ curl -sI "https://api.smk.dk/api/v1/art/search/?keys=test"
Access-Control-Allow-Origin: *
```

`networkAccess.allowedDomains` in `manifest.json` is still required (Figma's policy, separate from browser CORS) — both are configured.

## 2. Filter syntax — CONFIRMED ✅

The expected syntax works:

```
filters=[public_domain:true],[has_image:true],[creator:Hammershøi,V.]
```

URL-encoded (what actually goes on the wire):
```
filters=%5Bpublic_domain%3Atrue%5D%2C%5Bhas_image%3Atrue%5D%2C%5Bcreator%3AHammersh%C3%B8i%2CV.%5D
```

`public_domain:true` returned `found: 147,524` — far more public-domain works than the ~39k mentioned in early research. The plan's PD-as-default decision is even better grounded than we thought.

The `URLSearchParams` API in `smkClient.ts` handles encoding correctly: build the filter as a literal string (`[a:b],[c:d]`), then set as a URLSearchParams value.

## 3. Image URLs — TWO PATTERNS observed

Each `Artwork` carries `image_thumbnail` and `image_native` URLs directly, so we don't construct IIIF URLs from scratch. However, the format varies:

| Pattern | Example | Resizable? |
|---------|---------|-----------|
| IIIF (`iip-thumb.smk.dk`) | `https://iip-thumb.smk.dk/iiif/jp2/{file}.tif.jp2/full/!1024,/0/default.jpg` | Yes — replace the `!1024,` segment |
| Plain thumbnail (`api.smk.dk`) | `https://api.smk.dk/api/v1/thumbnail/{uuid}.jpg` | No — fixed size |

`iiifClient.ts`'s `resizeImage(url, size)` handles both: it resizes IIIF URLs and returns the plain ones unchanged.

`iiif_manifest` (a URL pointing to a full IIIF manifest) is also present on every artwork. We don't use it in v1 but it's the right hook for high-res deep-zoom features later.

## 4. Rate limits — UNDOCUMENTED

No `X-RateLimit-*` headers seen in responses; SMK doesn't publish limits. We implement client-side good behavior anyway:

- 300ms debounce on the search input (planned in `useSearch.ts`)
- Single in-flight request per query (cancel previous on new input)
- Pagination throttled — don't auto-load more than 30 results at a time

## Other useful fields discovered

Each artwork response includes more than expected:

- `frontend_url` — direct link to the SMK Open page (`open.smk.dk/artwork/image/...`)
- `similar_images_url` — built-in similar-works endpoint. **Better than the planned "same creator/period" heuristic.** Use this for the "Related works" feature.
- `enrichment_url` — pulls extra metadata (Wikidata links etc.). Probably not needed for v1.
- `corrections` (in search responses) — spelling-correction suggestions. Nice UX win for the search bar.
- `credit_line[]` — properly-formatted attribution string. Use this in caption text instead of building our own from artist + title.

## Open items still to validate

- **Period filter exact syntax** — assumed `[production_dates_period:1880-1920]` but not yet tested. Verify before Fase 1.
- **Result-count limits per page** — what's the max `rows` value? Default 30; tested up to 1000 successfully.
- **Pagination at high offset** — verify whether deep pagination (`offset=5000+`) slows down or errors.
- **3D files** — `has_3d_file: true` exists. Out of scope for v1 but worth a note.

## Example queries that work

```
# Search Hammershøi works with images, PD only
https://api.smk.dk/api/v1/art/search/?keys=hammershøi&filters=[has_image:true],[public_domain:true]&rows=30

# Lookup a specific work
https://api.smk.dk/api/v1/art?object_number=KMS3352

# Similar works for a given object
https://similar.api.smk.dk/similar/?object_number=KMS3352
```
