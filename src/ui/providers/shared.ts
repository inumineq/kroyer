/** Helpers shared by provider implementations. */

export async function fetchJson<T>(label: string, url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`)
  return res.json() as Promise<T>
}

/** hasMore for offset-paginated APIs. */
export function offsetHasMore(
  page: number,
  pageSize: number,
  pageCount: number,
  total: number,
): boolean {
  return page * pageSize + pageCount < total
}
