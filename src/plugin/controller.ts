/// <reference types="@figma/plugin-typings" />

import type { UiToPluginMessage, Caption, ColorStyle, MoodBoardItem } from '../ui/messages'
import { ALLOWED_STORAGE_KEYS, STORAGE_KEYS } from '../shared/storageKeys'

figma.showUI(__html__, { width: 360, height: 600, themeColors: true })

/** Hosts `fetchImageForUi` is willing to fetch — never become an open proxy. */
const IMAGE_FETCH_ALLOWLIST = ['www.artic.edu']

bootstrap().catch((err) => {
  console.error('[Krøyer] bootstrap failed:', err)
  // Send an empty init so the UI still becomes interactive
  figma.ui.postMessage({ type: 'init', history: [], collections: [] })
  figma.notify('Could not load saved state: ' + (err?.message ?? String(err)), { error: true })
})

async function readStorageKey(key: string): Promise<unknown> {
  try {
    return await figma.clientStorage.getAsync(key)
  } catch (err) {
    console.warn(`[Krøyer] could not read ${key}:`, err)
    return undefined
  }
}

async function bootstrap() {
  // Legacy pre-v2 collections key is kept as rollback insurance, migrated UI-side
  const [history, collections, collectionsV2, provider, windowSize] = await Promise.all([
    readStorageKey(STORAGE_KEYS.history),
    readStorageKey(STORAGE_KEYS.legacyCollections),
    readStorageKey(STORAGE_KEYS.collectionsV2),
    readStorageKey(STORAGE_KEYS.provider),
    readStorageKey(STORAGE_KEYS.windowSize),
  ])

  if (
    windowSize &&
    typeof (windowSize as { width?: unknown }).width === 'number' &&
    typeof (windowSize as { height?: unknown }).height === 'number'
  ) {
    const { width, height } = windowSize as { width: number; height: number }
    figma.ui.resize(width, height)
  }

  figma.ui.postMessage({
    type: 'init',
    history: Array.isArray(history) ? history : [],
    collections: Array.isArray(collections) ? collections : [],
    collectionsV2,
    provider,
  })

  // TODO(probe): TEMPORARY — REMOVE BEFORE MERGE
  // Decision-gate probe for the AIC Cloudflare fix (see plan.md Step 1).
  // Confirms main-thread fetch() of a live AIC IIIF URL — and
  // figma.createImageAsync of the same URL — actually succeed from the
  // plugin sandbox, in both Figma desktop and browser dev mode. Remove this
  // whole block once the probe has been run and the result is known.
  {
    const probeUrl =
      'https://www.artic.edu/iiif/2/2d484387-2509-5e8e-2c43-22f9981972eb/full/400,/0/default.jpg'
    try {
      const res = await fetch(probeUrl)
      const buf = await res.arrayBuffer()
      console.log(
        '[Krøyer][probe] main-thread fetch() status:',
        res.status,
        'bytes:',
        buf.byteLength,
      )
    } catch (err) {
      console.log('[Krøyer][probe] main-thread fetch() threw:', err)
    }
    try {
      const image = await figma.createImageAsync(probeUrl)
      const bytes = await image.getBytesAsync()
      console.log('[Krøyer][probe] figma.createImageAsync bytes:', bytes.byteLength)
    } catch (err) {
      console.log('[Krøyer][probe] figma.createImageAsync threw:', err)
    }
  }
  // END TODO(probe)
}


figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  try {
    switch (msg.type) {
      case 'insert-image':
        await insertImage(msg.imageBytes, msg.width, msg.height, msg.layerName, msg.caption)
        break
      case 'create-color-styles':
        createColorStyles(msg.baseName, msg.styles)
        break
      case 'create-mood-board':
        await createMoodBoard(msg.items, msg.title)
        break
      case 'open-url':
        figma.openExternal(msg.url)
        break
      case 'close':
        figma.closePlugin()
        break
      case 'notify':
        figma.notify(msg.message, { error: msg.error ?? false })
        break
      case 'storage-set':
        if (ALLOWED_STORAGE_KEYS.indexOf(msg.key) === -1) {
          console.warn('[Krøyer] ignoring storage-set for unknown key:', msg.key)
          break
        }
        try {
          await figma.clientStorage.setAsync(msg.key, msg.value)
        } catch (err) {
          // A large legacy collections copy can leave no quota headroom for
          // the v2 envelope. Rollback insurance is moot if v2 can't persist —
          // free the legacy key and retry once.
          if (msg.key === STORAGE_KEYS.collectionsV2) {
            await figma.clientStorage.deleteAsync(STORAGE_KEYS.legacyCollections)
            await figma.clientStorage.setAsync(msg.key, msg.value)
          } else {
            throw err
          }
        }
        break
      case 'resize':
        figma.ui.resize(msg.width, msg.height)
        break
      case 'resize-commit':
        figma.ui.resize(msg.width, msg.height)
        await figma.clientStorage.setAsync('window-size', {
          width: msg.width,
          height: msg.height,
        })
        break
      case 'fetch-image':
        // Errors are caught inside fetchImageForUi and always resolved as a
        // {error} result — never rethrown — so a bad image URL can't hit the
        // outer catch-all here (no toast spam, no hung UI-side promise).
        await fetchImageForUi(msg.url, msg.requestId)
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Plugin error'
    figma.notify(message, { error: true })
  }
}

/**
 * Fetches image bytes from the main thread on behalf of the UI iframe.
 * Some museum image hosts (AIC's Cloudflare-fronted IIIF host) block
 * sandboxed null-origin iframe fetches but allow normal page-context
 * requests — the plugin main thread runs in the latter. Host-restricted via
 * IMAGE_FETCH_ALLOWLIST so this can never become an open fetch proxy.
 */
async function fetchImageForUi(url: string, requestId: number) {
  try {
    const host = new URL(url).hostname
    if (IMAGE_FETCH_ALLOWLIST.indexOf(host) === -1) {
      throw new Error(`Host not allowed: ${host}`)
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
    const buf = await res.arrayBuffer()
    figma.ui.postMessage({
      type: 'fetch-image-result',
      requestId,
      bytes: new Uint8Array(buf),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image fetch failed'
    figma.ui.postMessage({ type: 'fetch-image-result', requestId, error: message })
  }
}

/**
 * Not every Figma install has Inter (org fonts, offline). Try a fallback
 * chain and finally the first available font; null means "no text possible".
 */
async function loadTextFont(style: string): Promise<FontName | null> {
  const candidates: FontName[] = [
    { family: 'Inter', style },
    { family: 'Roboto', style },
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
  ]
  for (const font of candidates) {
    try {
      await figma.loadFontAsync(font)
      return font
    } catch {
      // try the next candidate
    }
  }
  try {
    const first = (await figma.listAvailableFontsAsync())[0]?.fontName
    if (first) {
      await figma.loadFontAsync(first)
      return first
    }
  } catch {
    // fall through
  }
  return null
}

async function insertImage(
  bytes: Uint8Array,
  width: number,
  height: number,
  layerName: string,
  caption: Caption | undefined,
) {
  // Load the font BEFORE creating any nodes so a font failure can't leave
  // an orphaned rectangle behind.
  const captionFont = caption ? await loadTextFont('Regular') : null

  const image = figma.createImage(bytes)
  const rect = figma.createRectangle()
  rect.name = layerName
  rect.resize(width, height)
  rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }]

  const center = figma.viewport.center
  rect.x = Math.round(center.x - width / 2)
  rect.y = Math.round(center.y - height / 2)

  const nodes: SceneNode[] = [rect]

  if (caption && captionFont) {
    const text = figma.createText()
    text.fontName = captionFont
    text.fontSize = 12
    text.characters = formatCaption(caption)
    text.x = rect.x
    text.y = rect.y + height + 8
    // Wrap to the image width instead of running past it
    text.textAutoResize = 'HEIGHT'
    text.resize(width, text.height)
    nodes.push(text)
  }

  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  if (caption && !captionFont) {
    figma.notify(`Inserted without caption (no font available): ${layerName}`)
  } else {
    figma.notify(`Inserted: ${layerName}`)
  }
}

function createColorStyles(baseName: string, styles: ColorStyle[]) {
  for (const s of styles) {
    const style = figma.createPaintStyle()
    style.name = `${baseName} / ${s.name}`
    style.paints = [{ type: 'SOLID', color: { r: s.r, g: s.g, b: s.b } }]
  }
  figma.notify(`Created ${styles.length} color ${styles.length === 1 ? 'style' : 'styles'}`)
}

async function createMoodBoard(items: MoodBoardItem[], title: string) {
  const regularFont = await loadTextFont('Regular')
  const mediumFont = (await loadTextFont('Medium')) ?? regularFont

  const CARD_W = 280
  const COLS = 3

  const frame = figma.createFrame()
  frame.name = `Mood board — ${title}`
  frame.layoutMode = 'HORIZONTAL'
  frame.layoutWrap = 'WRAP'
  frame.primaryAxisSizingMode = 'FIXED'
  frame.counterAxisSizingMode = 'AUTO'
  frame.itemSpacing = 16
  frame.counterAxisSpacing = 24
  frame.paddingLeft = 24
  frame.paddingRight = 24
  frame.paddingTop = 24
  frame.paddingBottom = 24
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
  frame.resize(COLS * CARD_W + (COLS - 1) * 16 + 48, frame.height)

  let added = 0
  for (const item of items) {
    // One bad image must not abort the whole board
    try {
      const card = createMoodBoardCard(item, CARD_W, mediumFont, regularFont)
      frame.appendChild(card)
      added++
    } catch (err) {
      console.warn('[Krøyer] skipped mood board card:', item.title, err)
    }
  }

  if (added === 0) {
    frame.remove()
    figma.notify('Could not create any mood board cards', { error: true })
    return
  }

  const center = figma.viewport.center
  frame.x = Math.round(center.x - frame.width / 2)
  frame.y = Math.round(center.y - frame.height / 2)

  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  const skipped = items.length - added
  figma.notify(
    skipped > 0
      ? `Mood board created — ${added} works (${skipped} skipped)`
      : `Mood board created — ${added} works`,
  )
}

function createMoodBoardCard(
  item: MoodBoardItem,
  width: number,
  titleFont: FontName | null,
  bodyFont: FontName | null,
): FrameNode {
  // createImage first: if the bytes are bad it throws before any node
  // exists, so the per-card catch never leaves an orphaned frame behind.
  const image = figma.createImage(item.imageBytes)

  const card = figma.createFrame()
  card.name = `${item.artist} — ${item.title}`
  card.layoutMode = 'VERTICAL'
  card.itemSpacing = 6
  card.primaryAxisSizingMode = 'AUTO'
  card.counterAxisSizingMode = 'FIXED'
  card.resize(width, 100)
  card.fills = []

  const aspect = item.width > 0 && item.height > 0 ? item.width / item.height : 1
  const imgH = Math.max(60, Math.round(width / aspect))

  const rect = figma.createRectangle()
  rect.resize(width, imgH)
  rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }]
  rect.cornerRadius = 4
  rect.name = 'Image'
  card.appendChild(rect)

  if (titleFont) {
    const titleNode = figma.createText()
    titleNode.fontName = titleFont
    titleNode.fontSize = 12
    titleNode.characters = item.title || 'Untitled'
    titleNode.textAutoResize = 'HEIGHT'
    titleNode.resize(width, titleNode.height)
    card.appendChild(titleNode)
  }

  if (bodyFont) {
    const artistNode = figma.createText()
    artistNode.fontName = bodyFont
    artistNode.fontSize = 11
    artistNode.characters = item.artist || 'Unknown'
    artistNode.fills = [{ type: 'SOLID', color: { r: 0.42, g: 0.42, b: 0.42 } }]
    artistNode.textAutoResize = 'HEIGHT'
    artistNode.resize(width, artistNode.height)
    card.appendChild(artistNode)
  }

  return card
}

function formatCaption(caption: Caption): string {
  const parts = [caption.artist, caption.title]
  if (caption.year) parts.push(`(${caption.year})`)
  return parts.filter(Boolean).join(' — ')
}
