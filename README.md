# SMK Open

A Figma plugin for searching and inserting artworks from [Statens Museum for Kunst](https://www.smk.dk/) (SMK), Denmark's National Gallery.

Search the SMK collection of ~260,000 artworks, filter by rights (most importantly Public Domain / CC0), and drop images directly into your Figma designs with automatic attribution.

> **Status**: Alpha. Phase 0 complete — API validated, scaffold in place. See [`TECH-NOTES.md`](./TECH-NOTES.md) for findings.

## Features (planned for v1)

- Free-text search with progressive filters (artist, period, has-image, rights)
- Public Domain as default, toggle to include copyrighted works
- Drag-and-drop and click-to-insert
- Automatic attribution (artist + title as layer name, optional caption)
- Search history (last 5 searches, stored locally)
- Collections — save favorites across sessions via `figma.clientStorage`
- Color palette extraction → Figma color styles
- Related works via SMK's `similar_images_url`
- Mood board export — generate a frame from a collection

See [`/Users/inumineq/.claude/plans/vi-skal-lave-et-effervescent-lamport.md`](../../.claude/plans/vi-skal-lave-et-effervescent-lamport.md) for the full scope.

## Local development

```bash
npm install
npm run dev        # watches both UI and plugin
```

Then in Figma desktop: **Plugins → Development → Import plugin from manifest…** and select `manifest.json`.

## Stack

- TypeScript + React 18 + Vite
- Figma plugin manifest v1 API with `networkAccess.allowedDomains`
- No backend — direct API calls (CORS confirmed open)

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

Built on [SMK's Open API](https://www.smk.dk/article/smk-api/). All artwork data and images © SMK, served under their open license terms.
