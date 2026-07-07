/**
 * figma.clientStorage allows roughly 5MB per plugin. Guard writes so users
 * get warned before hitting the limit instead of silently losing data.
 */
export const QUOTA_WARN_BYTES = 3_500_000
export const QUOTA_MAX_BYTES = 4_500_000

export function estimateBytes(value: unknown): number {
  const json = JSON.stringify(value)
  if (!json) return 0
  return new TextEncoder().encode(json).length
}

export type QuotaStatus = 'ok' | 'warn' | 'full'

export function quotaStatus(value: unknown): QuotaStatus {
  const bytes = estimateBytes(value)
  if (bytes >= QUOTA_MAX_BYTES) return 'full'
  if (bytes >= QUOTA_WARN_BYTES) return 'warn'
  return 'ok'
}
