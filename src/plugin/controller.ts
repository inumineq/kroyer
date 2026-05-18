/// <reference types="@figma/plugin-typings" />

import type { UiToPluginMessage, Caption, ColorStyle, MoodBoardItem } from '../ui/messages'

figma.showUI(__html__, { width: 360, height: 600, themeColors: true })

bootstrap().catch((err) => {
  console.error('[Krøyer] bootstrap failed:', err)
  // Send an empty init so the UI still becomes interactive
  figma.ui.postMessage({ type: 'init', history: [], collections: [] })
  figma.notify('Could not load saved state: ' + (err?.message ?? String(err)), { error: true })
})

async function bootstrap() {
  let history: unknown = []
  let collections: unknown = []
  let windowSize: unknown = null
  try {
    history = await figma.clientStorage.getAsync('history')
  } catch (err) {
    console.warn('[Krøyer] could not read history:', err)
  }
  try {
    collections = await figma.clientStorage.getAsync('collections')
  } catch (err) {
    console.warn('[Krøyer] could not read collections:', err)
  }
  try {
    windowSize = await figma.clientStorage.getAsync('window-size')
  } catch (err) {
    console.warn('[Krøyer] could not read window-size:', err)
  }

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
  })
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

async function insertImage(
  bytes: Uint8Array,
  width: number,
  height: number,
  layerName: string,
  caption: Caption | undefined,
) {
  const image = figma.createImage(bytes)
  const rect = figma.createRectangle()
  rect.name = layerName
  rect.resize(width, height)
  rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }]

  const center = figma.viewport.center
  rect.x = Math.round(center.x - width / 2)
  rect.y = Math.round(center.y - height / 2)

  const nodes: SceneNode[] = [rect]

  if (caption) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
    const text = figma.createText()
    text.fontName = { family: 'Inter', style: 'Regular' }
    text.fontSize = 12
    text.characters = formatCaption(caption)
    text.x = rect.x
    text.y = rect.y + height + 8
    text.textAutoResize = 'WIDTH_AND_HEIGHT'
    nodes.push(text)
  }

  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  figma.notify(`Inserted: ${layerName}`)
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
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  ])

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

  for (const item of items) {
    const card = createMoodBoardCard(item, CARD_W)
    frame.appendChild(card)
  }

  const center = figma.viewport.center
  frame.x = Math.round(center.x - frame.width / 2)
  frame.y = Math.round(center.y - frame.height / 2)

  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  figma.notify(`Mood board created — ${items.length} works`)
}

function createMoodBoardCard(item: MoodBoardItem, width: number): FrameNode {
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

  const titleNode = figma.createText()
  titleNode.fontName = { family: 'Inter', style: 'Medium' }
  titleNode.fontSize = 12
  titleNode.characters = item.title || 'Untitled'
  titleNode.textAutoResize = 'HEIGHT'
  titleNode.resize(width, titleNode.height)
  card.appendChild(titleNode)

  const artistNode = figma.createText()
  artistNode.fontName = { family: 'Inter', style: 'Regular' }
  artistNode.fontSize = 11
  artistNode.characters = item.artist || 'Unknown'
  artistNode.fills = [{ type: 'SOLID', color: { r: 0.42, g: 0.42, b: 0.42 } }]
  artistNode.textAutoResize = 'HEIGHT'
  artistNode.resize(width, artistNode.height)
  card.appendChild(artistNode)

  return card
}

function formatCaption(caption: Caption): string {
  const parts = [caption.artist, caption.title]
  if (caption.year) parts.push(`(${caption.year})`)
  return parts.filter(Boolean).join(' — ')
}
