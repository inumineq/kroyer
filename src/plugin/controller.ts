/// <reference types="@figma/plugin-typings" />

import type { UiToPluginMessage, Caption } from '../ui/messages'

figma.showUI(__html__, { width: 360, height: 600, themeColors: true })

figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  try {
    switch (msg.type) {
      case 'insert-image':
        await insertImage(msg.imageBytes, msg.width, msg.height, msg.layerName, msg.caption)
        break
      case 'close':
        figma.closePlugin()
        break
      case 'notify':
        figma.notify(msg.message, { error: msg.error ?? false })
        break
      case 'create-color-styles':
      case 'create-mood-board':
      case 'storage-set':
        // Wired up in later phases
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

function formatCaption(caption: Caption): string {
  const parts = [caption.artist, caption.title]
  if (caption.year) parts.push(`(${caption.year})`)
  return parts.filter(Boolean).join(' — ')
}
