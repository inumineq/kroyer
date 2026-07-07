import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Artwork } from '../../shared/model'
import { hasDisplayableImage } from '../../shared/model'
import { SIZE_PIXELS } from './sizing'
import { iframeImageUrlFor, useArtworkImage } from './useArtworkImage'

// ---------------------------------------------------------------------------
// Hook test harness. Vitest runs in a plain node environment (no DOM, no
// react renderer installed — same constraint as pluginFetch.test.ts), so
// react is mocked with a minimal useState/useEffect implementation: state
// lives in `slots`, effects are collected per render and run only when the
// test says so. That is exactly enough to observe the two things the blocked
// path must guarantee: the state exposed to consumers, and that no fetch is
// ever fired.
// ---------------------------------------------------------------------------
const harness = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
  beginRender() {
    this.cursor = 0
    this.effects = []
  },
  reset() {
    this.slots = []
    this.beginRender()
  },
  runEffects() {
    for (const fn of this.effects) fn()
  },
}))

vi.mock('react', () => ({
  useState: (init: unknown) => {
    const i = harness.cursor++
    if (harness.slots.length <= i) {
      harness.slots.push(typeof init === 'function' ? (init as () => unknown)() : init)
    }
    return [
      harness.slots[i],
      (v: unknown) => {
        harness.slots[i] =
          typeof v === 'function' ? (v as (prev: unknown) => unknown)(harness.slots[i]) : v
      },
    ]
  },
  useEffect: (fn: () => void | (() => void)) => {
    harness.effects.push(fn)
  },
}))

// The registry mock lets each test pick the imageLoading strategy directly —
// registry.test.ts separately locks in which strategy each real provider
// declares (AIC = 'blocked').
const imageLoadingMode = vi.hoisted(() => ({
  current: 'iframe' as 'iframe' | 'main-thread' | 'blocked',
}))

vi.mock('../providers/registry', () => ({
  getProvider: () => ({ id: 'aic', shortLabel: 'AIC', imageLoading: imageLoadingMode.current }),
}))

const { getCachedImageUrl } = vi.hoisted(() => ({ getCachedImageUrl: vi.fn() }))
vi.mock('./imageCache', () => ({ getCachedImageUrl }))

const IIIF_BASE = 'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2'
const LQIP = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='

function makeWork(image: Artwork['image']): Artwork {
  return {
    v: 1,
    provider: 'smk',
    id: 'KMS3352',
    key: 'smk:KMS3352',
    title: 'T',
    artist: 'A',
    rights: 'cc0',
    image,
  }
}

describe('iframeImageUrlFor', () => {
  // Regression test: grid/related/collections cards used to render
  // work.image.thumbnailUrl directly. Once they moved onto useArtworkImage,
  // the thumbnail size started rebuilding a forced-300px IIIF URL from
  // iiifBase instead of the provider API's own thumbnail (e.g. SMK's
  // image_thumbnail), silently changing the URL. Iframe providers must stay
  // byte-identical to pre-hook behavior.
  it('prefers the provider-supplied thumbnailUrl at thumbnail size, even when iiifBase is present', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(iframeImageUrlFor(work, 'thumbnail')).toBe('https://api.smk.dk/image_thumbnail.jpg')
  })

  it('falls back to imageUrlFor at thumbnail size when thumbnailUrl is absent', () => {
    const work = makeWork({ iiifBase: IIIF_BASE })
    expect(iframeImageUrlFor(work, 'thumbnail')).toBe(
      `${IIIF_BASE}/full/!${SIZE_PIXELS.thumbnail},/0/default.jpg`,
    )
  })

  it('uses imageUrlFor (exact-size IIIF) for non-thumbnail sizes, same as before', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(iframeImageUrlFor(work, 'medium')).toBe(
      `${IIIF_BASE}/full/!${SIZE_PIXELS.medium},/0/default.jpg`,
    )
  })

  it('returns undefined when the work has no displayable image', () => {
    expect(iframeImageUrlFor(makeWork({}), 'thumbnail')).toBeUndefined()
  })
})

// Regression test for ResultCard's "blocked" state: `useArtworkImage`
// reports status 'error' whenever there's no URL to render — including the
// ordinary case of a work with no image at all, not just a blocked provider
// or failed main-thread fetch. Consumers (ResultCard, DetailPanel) must
// additionally gate on hasDisplayableImage(work) so a no-image work renders
// the neutral "No image" state instead of "Preview unavailable". This locks
// in the inputs to that gate: an image-less work is both status-'error' AND
// hasDisplayableImage() === false, so `status === 'error' &&
// hasDisplayableImage(work)` correctly evaluates to false for it.
describe('no-image works never look "blocked"', () => {
  it('a work with no image URL is both error-status and not hasDisplayableImage', () => {
    const work = makeWork({})
    expect(iframeImageUrlFor(work, 'thumbnail')).toBeUndefined()
    expect(hasDisplayableImage(work)).toBe(false)
  })

  it('a work with a thumbnailUrl is hasDisplayableImage, so a real fetch error can be "blocked"', () => {
    const work = makeWork({ thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(hasDisplayableImage(work)).toBe(true)
  })
})

describe('useArtworkImage', () => {
  beforeEach(() => {
    harness.reset()
    getCachedImageUrl.mockReset()
  })

  function render(work: Artwork) {
    harness.beginRender()
    // The whole point of the harness is calling the hook outside React —
    // react itself is mocked above, so rules-of-hooks doesn't apply here.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useArtworkImage(work, 'thumbnail')
  }

  describe("blocked providers (AIC — imageLoading: 'blocked')", () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://x.example/t.jpg', lqip: LQIP })

    beforeEach(() => {
      imageLoadingMode.current = 'blocked'
    })

    it('exposes lqip and status error immediately, with no src', () => {
      const state = render(work)
      expect(state).toEqual({ lqip: LQIP, status: 'error' })
    })

    it('never fires a fetch — not even after effects run', () => {
      render(work)
      harness.runEffects()
      expect(getCachedImageUrl).not.toHaveBeenCalled()

      // Re-render after effects: still the same terminal lqip/error state.
      const state = render(work)
      expect(state).toEqual({ lqip: LQIP, status: 'error' })
    })

    it('stays in the terminal error state even without an lqip (pre-fix collection snapshots)', () => {
      const bare = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://x.example/t.jpg' })
      const state = render(bare)
      harness.runEffects()
      expect(state).toEqual({ lqip: undefined, status: 'error' })
      expect(getCachedImageUrl).not.toHaveBeenCalled()
    })
  })

  describe("main-thread providers (the flip-back path — kept intact)", () => {
    beforeEach(() => {
      imageLoadingMode.current = 'main-thread'
    })

    it('exposes lqip while loading, then the cached blob URL once the plugin fetch resolves', async () => {
      getCachedImageUrl.mockResolvedValue('blob:cached')
      const work = makeWork({ iiifBase: IIIF_BASE, lqip: LQIP })

      const first = render(work)
      expect(first).toEqual({ lqip: LQIP, status: 'loading' })

      harness.runEffects()
      expect(getCachedImageUrl).toHaveBeenCalledTimes(1)
      expect(getCachedImageUrl.mock.calls[0][0]).toBe(
        `${IIIF_BASE}/full/!${SIZE_PIXELS.thumbnail},/0/default.jpg`,
      )

      await new Promise((r) => setTimeout(r, 0))
      const second = render(work)
      expect(second).toEqual({ src: 'blob:cached', lqip: LQIP, status: 'ready' })
    })

    it('falls back to lqip + error when the plugin fetch rejects', async () => {
      getCachedImageUrl.mockRejectedValue(new Error('403'))
      const work = makeWork({ iiifBase: IIIF_BASE, lqip: LQIP })

      render(work)
      harness.runEffects()
      await new Promise((r) => setTimeout(r, 0))

      const state = render(work)
      expect(state).toEqual({ lqip: LQIP, status: 'error' })
    })
  })

  describe('iframe providers (SMK/Met/CMA — zero behavior change)', () => {
    beforeEach(() => {
      imageLoadingMode.current = 'iframe'
    })

    it('returns the direct URL immediately and never touches the cache', () => {
      const work = makeWork({ thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
      const state = render(work)
      expect(state).toEqual({ src: 'https://api.smk.dk/image_thumbnail.jpg', status: 'ready' })

      harness.runEffects()
      expect(getCachedImageUrl).not.toHaveBeenCalled()
    })
  })
})
