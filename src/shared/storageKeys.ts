/**
 * Single source of truth for clientStorage keys, shared by the UI (writers)
 * and the plugin sandbox (bootstrap reads + storage-set allowlist) so the
 * two sides can't drift.
 */
export const STORAGE_KEYS = {
  history: 'history',
  collectionsV2: 'collections.v2',
  /** Pre-v2 raw collections — kept one release as rollback insurance */
  legacyCollections: 'collections',
  windowSize: 'window-size',
  provider: 'provider',
} as const

export const ALLOWED_STORAGE_KEYS: string[] = [
  STORAGE_KEYS.history,
  STORAGE_KEYS.collectionsV2,
  STORAGE_KEYS.windowSize,
  STORAGE_KEYS.provider,
]
