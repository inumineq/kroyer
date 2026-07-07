/// <reference types="@figma/plugin-typings" />

import type { UiToPluginMessage, Caption, ColorStyle, MoodBoardItem } from '../ui/messages'

figma.showUI(__html__, { width: 360, height: 600, themeColors: true })

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
  const history = await readStorageKey('history')
  // Legacy pre-v2 key; kept as rollback insurance and migrated UI-side
  const collections = await readStorageKey('collections')
  const collectionsV2 = await readStorageKey('collections.v2')
  const provider = await readStorageKey('provider')
  const windowSize = await readStorageKey('window-size')

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
}

// Only keys the UI legitimately persists; anything else is dropped.
const ALLOWED_STORAGE_KEYS = ['history', 'collections.v2', 'window-size', 'provider']

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
        await figma.clientStorage.setAsync(msg.key, msg.value)
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
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Plugin error'
    figma.notify(message, { error: true })
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

  const image = figma.createImage(item.imageBytes)
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
