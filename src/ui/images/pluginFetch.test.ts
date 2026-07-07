import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// pluginFetch posts through postToPlugin and listens on `window` for the
// controller's reply — stub both since vitest runs these tests in a plain
// node environment with no DOM.
const sent: { url: string; requestId: number }[] = []
vi.mock('../messages', () => ({
  postToPlugin: (msg: { type: string; url: string; requestId: number }) => {
    if (msg.type === 'fetch-image') sent.push({ url: msg.url, requestId: msg.requestId })
  },
}))

type Listener = (e: { data: unknown }) => void
let listeners: Listener[] = []

function installWindowStub() {
  listeners = []
  ;(globalThis as { window?: unknown }).window = {
    addEventListener: (type: string, listener: Listener) => {
      if (type === 'message') listeners.push(listener)
    },
    removeEventListener: () => {},
  }
}

function reply(msg: { type: 'fetch-image-result'; requestId: number; bytes?: Uint8Array; error?: string }) {
  for (const l of listeners) l({ data: { pluginMessage: msg } })
}

describe('fetchImageViaPlugin', () => {
  beforeEach(() => {
    installWindowStub()
    sent.length = 0
    vi.resetModules()
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('resolves with bytes when the controller replies for the matching requestId', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    const promise = fetchImageViaPlugin('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg')
    expect(sent).toHaveLength(1)
    const { requestId } = sent[0]

    reply({ type: 'fetch-image-result', requestId, bytes: new Uint8Array([1, 2, 3]) })

    await expect(promise).resolves.toEqual(new Uint8Array([1, 2, 3]))
  })

  it('rejects when the controller replies with an error for the matching requestId', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    const promise = fetchImageViaPlugin('https://www.artic.edu/iiif/2/bad/full/400,/0/default.jpg')
    const { requestId } = sent[0]

    reply({ type: 'fetch-image-result', requestId, error: 'Host not allowed: evil.example' })

    await expect(promise).rejects.toThrow('Host not allowed: evil.example')
  })

  it('drops replies for an unknown requestId instead of resolving/rejecting anything', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    const promise = fetchImageViaPlugin('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg')
    const { requestId } = sent[0]

    // A reply for some other, unrelated requestId must be silently ignored.
    reply({ type: 'fetch-image-result', requestId: requestId + 999, bytes: new Uint8Array([9]) })

    reply({ type: 'fetch-image-result', requestId, bytes: new Uint8Array([4, 5]) })
    await expect(promise).resolves.toEqual(new Uint8Array([4, 5]))
  })

  it('rejects immediately for an already-aborted signal without sending a request', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchImageViaPlugin('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg', controller.signal),
    ).rejects.toThrow('Aborted')
    expect(sent).toHaveLength(0)
  })

  it('cleans up on abort after the request was sent — a later reply is dropped', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    const controller = new AbortController()
    const promise = fetchImageViaPlugin(
      'https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg',
      controller.signal,
    )
    const { requestId } = sent[0]

    controller.abort()
    await expect(promise).rejects.toThrow('Aborted')

    // The controller doesn't know about the abort and may still reply late;
    // that reply must not resolve/reject an already-settled promise or throw.
    expect(() =>
      reply({ type: 'fetch-image-result', requestId, bytes: new Uint8Array([1]) }),
    ).not.toThrow()
  })

  it('queues requests beyond MAX_INFLIGHT and sends the next once one settles', async () => {
    const { fetchImageViaPlugin } = await import('./pluginFetch')
    // MAX_INFLIGHT is 4 — the 5th request should not be sent until one of
    // the first 4 resolves or rejects.
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetchImageViaPlugin(`https://www.artic.edu/iiif/2/img${i}/full/400,/0/default.jpg`),
    )
    expect(sent).toHaveLength(4)

    reply({ type: 'fetch-image-result', requestId: sent[0].requestId, bytes: new Uint8Array([0]) })
    await promises[0]

    expect(sent).toHaveLength(5)
    reply({ type: 'fetch-image-result', requestId: sent[4].requestId, bytes: new Uint8Array([1]) })
    await expect(promises[4]).resolves.toEqual(new Uint8Array([1]))
  })
})
