import { describe, expect, it } from 'vitest'
import { buildStreamParams, mergeIdStreams, needsMoreForPage } from './provider'

describe('mergeIdStreams', () => {
  it('preserves stream order: first stream first, then later streams', () => {
    expect(mergeIdStreams([['a', 'b'], ['c'], ['d']])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('dedups across streams, keeping the first occurrence', () => {
    expect(
      mergeIdStreams([
        ['1', '2'],
        ['2', '3'],
        ['3', '1', '4'],
      ]),
    ).toEqual(['1', '2', '3', '4'])
  })

  it('dedups within a single stream', () => {
    expect(mergeIdStreams([['1', '1', '2']])).toEqual(['1', '2'])
  })

  it('tolerates empty streams', () => {
    expect(mergeIdStreams([[], ['1'], []])).toEqual(['1'])
    expect(mergeIdStreams([])).toEqual([])
  })
})

describe('buildStreamParams', () => {
  const strings = (streams: URLSearchParams[]) => streams.map((p) => p.toString())

  it('fans free text out to title, creator, and description streams', () => {
    expect(strings(buildStreamParams('zonnebloemen'))).toEqual([
      'title=zonnebloemen&imageAvailable=true',
      'creator=zonnebloemen&imageAvailable=true',
      'description=zonnebloemen&imageAvailable=true',
    ])
  })

  it('drops the text-to-creator stream when the artist filter is set', () => {
    // The creator param can't hold both the artist filter and the free text.
    expect(strings(buildStreamParams('zonnebloemen', 'Vincent van Gogh'))).toEqual([
      'title=zonnebloemen&creator=Vincent+van+Gogh&imageAvailable=true',
      'description=zonnebloemen&creator=Vincent+van+Gogh&imageAvailable=true',
    ])
  })

  it('collapses empty text to a single browse stream', () => {
    expect(strings(buildStreamParams(''))).toEqual(['imageAvailable=true'])
  })

  it('collapses empty text with an artist filter to a single creator stream', () => {
    expect(strings(buildStreamParams('', 'Rembrandt'))).toEqual([
      'creator=Rembrandt&imageAvailable=true',
    ])
  })
})

describe('needsMoreForPage', () => {
  it('mid-universe: keeps hydrating when the page is short and ids remain', () => {
    expect(needsMoreForPage(5, 20, 100, 0, 10)).toBe(true)
  })

  it('universe-exhausted: stops once every id has been tried, even if the page is short', () => {
    expect(needsMoreForPage(5, 100, 100, 0, 10)).toBe(false)
  })

  it('exact-boundary: stops as soon as collected works exactly fill the page', () => {
    expect(needsMoreForPage(10, 50, 100, 0, 10)).toBe(false)
  })

  it('out-of-range page: never spins forever once the universe runs dry', () => {
    expect(needsMoreForPage(50, 50, 50, 1000, 10)).toBe(false)
  })
})
