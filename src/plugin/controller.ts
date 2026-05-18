/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 360, height: 560, themeColors: true })

type UiMessage =
  | { type: 'insert-image'; bytes: Uint8Array; name: string; width: number; height: number }
  | { type: 'close' }

figma.ui.onmessage = async (msg: UiMessage) => {
  if (msg.type === 'close') {
    figma.closePlugin()
    return
  }

  if (msg.type === 'insert-image') {
    const image = figma.createImage(msg.bytes)
    const rect = figma.createRectangle()
    rect.name = msg.name
    rect.resize(msg.width, msg.height)
    rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }]
    rect.x = figma.viewport.center.x - msg.width / 2
    rect.y = figma.viewport.center.y - msg.height / 2

    figma.currentPage.appendChild(rect)
    figma.currentPage.selection = [rect]
    figma.viewport.scrollAndZoomIntoView([rect])
  }
}
