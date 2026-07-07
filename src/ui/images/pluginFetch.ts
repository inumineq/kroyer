import { postToPlugin } from '../messages'

/**
 * Fetches image bytes via the plugin main thread instead of the UI iframe.
 * Used for providers whose image host blocks sandboxed null-origin iframe
 * requests (AIC — see providers/aic/provider.ts). One module-scope
 * `message` listener multiplexes every in-flight request by requestId, and
 * a FIFO queue caps how many are actually sent to the plugin at once so a
 * page of thumbnails doesn't flood postMessage.
 */

/** Mirrors the mapWithConcurrency convention used elsewhere for image work. */
const MAX_INFLIGHT = 4

let nextRequestId = 1
let inflightCount = 0
const queue: (() => void)[] = []

const pending = new Map<
  number,
  { resolve: (bytes: Uint8Array) => void; reject: (err: Error) => void }
>()

let listenerInstalled = false

function ensureListener() {
  if (listenerInstalled) return
  listenerInstalled = true
  window.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data?.pluginMessage
    if (msg?.type !== 'fetch-image-result') return
    const entry = pending.get(msg.requestId)
    // Unknown requestId (e.g. a stale message after reload) — drop it.
    if (!entry) return
    pending.delete(msg.requestId)
    inflightCount--
    if (msg.error) {
      entry.reject(new Error(msg.error))
    } else {
      entry.resolve(msg.bytes ?? new Uint8Array())
    }
    runNext()
  })
}

function runNext() {
  while (inflightCount < MAX_INFLIGHT && queue.length > 0) {
    const job = queue.shift()!
    inflightCount++
    job()
  }
}

/**
 * Requests `url` from the plugin main thread. Resolves with the raw image
 * bytes, or rejects with the controller's error message / an abort error.
 * Safe to call with an already-aborted signal.
 */
export function fetchImageViaPlugin(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  ensureListener()

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const requestId = nextRequestId++
    let queuedJob: (() => void) | null = null

    function onAbort() {
      // Queued (never sent): just drop the job, nothing was ever counted
      // as in-flight so the counter doesn't move.
      if (queuedJob && removeFromQueue(queuedJob)) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      // Already sent to the plugin: the controller has no cancellation and
      // may still reply, but deleting the requestId here means that reply
      // is silently dropped by the listener above (`if (!entry) return`).
      if (pending.delete(requestId)) {
        inflightCount--
        runNext()
      }
      reject(new DOMException('Aborted', 'AbortError'))
    }

    function send() {
      pending.set(requestId, { resolve, reject })
      postToPlugin({ type: 'fetch-image', url, requestId })
    }

    signal?.addEventListener('abort', onAbort, { once: true })

    if (inflightCount < MAX_INFLIGHT) {
      inflightCount++
      send()
    } else {
      queuedJob = send
      queue.push(send)
    }
  })
}

function removeFromQueue(job: () => void): boolean {
  const idx = queue.indexOf(job)
  if (idx === -1) return false
  queue.splice(idx, 1)
  return true
}
