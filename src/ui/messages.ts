export type Caption = {
  title: string
  artist: string
  year?: string
}

export type MoodBoardItem = {
  imageBytes: Uint8Array
  width: number
  height: number
  title: string
  artist: string
}

export type ColorStyle = {
  name: string
  r: number
  g: number
  b: number
}

export type UiToPluginMessage =
  | {
      type: 'insert-image'
      imageBytes: Uint8Array
      width: number
      height: number
      layerName: string
      caption?: Caption
    }
  | { type: 'create-color-styles'; baseName: string; styles: ColorStyle[] }
  | { type: 'create-mood-board'; items: MoodBoardItem[]; title: string }
  | { type: 'storage-set'; key: string; value: unknown }
  | { type: 'resize'; width: number; height: number }
  | { type: 'resize-commit'; width: number; height: number }
  | { type: 'open-url'; url: string }
  | { type: 'notify'; message: string; error?: boolean }
  | { type: 'close' }

export type PluginToUiMessage = {
  type: 'init'
  history: string[]
  /** Legacy pre-v2 raw storage value — migrated on the UI side */
  collections: unknown
  /** Versioned envelope from the collections.v2 key, when present */
  collectionsV2?: unknown
  /** Last selected provider id, when present */
  provider?: unknown
}

export function postToPlugin(msg: UiToPluginMessage) {
  parent.postMessage({ pluginMessage: msg }, '*')
}
