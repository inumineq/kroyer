/**
 * Map items through an async function with at most `concurrency` in flight,
 * preserving input order in the result. Rejections surface as `null` entries
 * so one failure doesn't sink the batch.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onSettled?: () => void,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      try {
        results[index] = await fn(items[index], index)
      } catch {
        results[index] = null
      }
      onSettled?.()
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker)
  await Promise.all(workers)
  return results
}
