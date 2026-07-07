import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './async'

describe('mapWithConcurrency', () => {
  it('preserves input order in results', async () => {
    const delays = [30, 10, 20]
    const result = await mapWithConcurrency(delays, 3, async (ms) => {
      await new Promise((r) => setTimeout(r, ms))
      return ms
    })
    expect(result).toEqual([30, 10, 20])
  })

  it('turns rejections into null entries without sinking the batch', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom')
      return n * 10
    })
    expect(result).toEqual([10, null, 30])
  })

  it('never runs more than the concurrency limit at once', async () => {
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
    })
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('reports progress via onSettled for successes and failures', async () => {
    let settled = 0
    await mapWithConcurrency(
      [1, 2, 3],
      2,
      async (n) => {
        if (n === 1) throw new Error('x')
        return n
      },
      () => settled++,
    )
    expect(settled).toBe(3)
  })

  it('handles empty input', async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([])
  })
})
