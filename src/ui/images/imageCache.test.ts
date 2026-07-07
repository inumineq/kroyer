import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// imageCache fetches through pluginFetch and calls the browser's
// URL.createObjectURL/revokeObjectURL — mock the former to control what
// resolves, and stub the latter since vitest runs in a plain node
// environment with no real Blob/object-URL registry.
let fetchImpl: (url: string) => Promise<Uint8Array>
vi.mock('./pluginFetch', () => ({
  fetchImageViaPlugin: (url: string) => fetchImpl(url),
}))

let nextObjectUrl = 0
let createObjectURLSpy: ReturnType<typeof vi.fn>
let revokeObjectURLSpy: ReturnType<typeof vi.fn>

function installUrlStub() {
  nextObjectUrl = 0
  createObjectURLSpy = vi.fn(() => `blob:mock-${nextObjectUrl++}`)
  revokeObjectURLSpy = vi.fn()
  ;(globalThis as { URL: typeof URL }).URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
  ;(globalThis as { URL: typeof URL }).URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL
}

describe('getCachedImageUrl', () => {
  beforeEach(() => {
    installUrlStub()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and caches a blob url on a miss, then serves the cache on a hit', async () => {
    fetchImpl = vi.fn(async () => new Uint8Array([1, 2, 3]))
    const { getCachedImageUrl } = await import('./imageCache')

    const first = await getCachedImageUrl('https://www.artic.edu/a.jpg')
    expect(first).toBe('blob:mock-0')
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)

    const second = await getCachedImageUrl('https://www.artic.edu/a.jpg')
    expect(second).toBe('blob:mock-0')
    // No second fetch or object URL creation for a cache hit.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
  })

  it('dedups concurrent in-flight requests for the same url into one fetch', async () => {
    let resolveFetch: (bytes: Uint8Array) => void
    fetchImpl = vi.fn(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resolveFetch = resolve
        }),
    )
    const { getCachedImageUrl } = await import('./imageCache')

    const p1 = getCachedImageUrl('https://www.artic.edu/b.jpg')
    const p2 = getCachedImageUrl('https://www.artic.edu/b.jpg')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    resolveFetch!(new Uint8Array([9]))

    const [url1, url2] = await Promise.all([p1, p2])
    expect(url1).toBe(url2)
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
  })

  it('evicts the least-recently-used entry once the cache exceeds ~48 entries, revoking its object URL', async () => {
    fetchImpl = vi.fn(async (url: string) => new Uint8Array([url.length]))
    const { getCachedImageUrl } = await import('./imageCache')

    // Fill the cache to capacity (48), then add one more to force an eviction.
    for (let i = 0; i < 48; i++) {
      await getCachedImageUrl(`https://www.artic.edu/img${i}.jpg`)
    }
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()

    await getCachedImageUrl('https://www.artic.edu/img48.jpg')

    // The oldest entry (img0 -> blob:mock-0) must be evicted and revoked.
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-0')
  })

  it('does not revoke an object URL when it is simply re-requested (cache hit)', async () => {
    fetchImpl = vi.fn(async () => new Uint8Array([1]))
    const { getCachedImageUrl } = await import('./imageCache')

    await getCachedImageUrl('https://www.artic.edu/c.jpg')
    await getCachedImageUrl('https://www.artic.edu/c.jpg')
    await getCachedImageUrl('https://www.artic.edu/c.jpg')

    expect(revokeObjectURLSpy).not.toHaveBeenCalled()
  })

  it('moving a re-requested entry to most-recently-used protects it from the next eviction', async () => {
    fetchImpl = vi.fn(async (url: string) => new Uint8Array([url.length]))
    const { getCachedImageUrl } = await import('./imageCache')

    for (let i = 0; i < 48; i++) {
      await getCachedImageUrl(`https://www.artic.edu/img${i}.jpg`)
    }
    // Touch img0 (the current LRU head) so img1 becomes the new head instead.
    await getCachedImageUrl('https://www.artic.edu/img0.jpg')

    await getCachedImageUrl('https://www.artic.edu/img48.jpg')

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-1')
  })

  it('propagates a fetch rejection without caching', async () => {
    fetchImpl = vi.fn(async () => {
      throw new Error('Host not allowed')
    })
    const { getCachedImageUrl } = await import('./imageCache')

    await expect(getCachedImageUrl('https://evil.example/x.jpg')).rejects.toThrow('Host not allowed')
    expect(createObjectURLSpy).not.toHaveBeenCalled()
  })
})
