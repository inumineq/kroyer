import { useState } from 'react'
import type { Artwork } from '../api/smkClient'
import { extractPalette, rgbToHex, type PaletteColor } from '../utils/palette'
import { pickImageUrl } from '../api/iiifClient'
import { postToPlugin } from '../messages'

type Props = {
  work: Artwork
}

export function PaletteSection({ work }: Props) {
  const [colors, setColors] = useState<PaletteColor[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  async function extract() {
    const url = pickImageUrl(work, 'thumbnail')
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const palette = await extractPalette(url, 6)
      setColors(palette)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed')
    } finally {
      setLoading(false)
    }
  }

  function createStyles() {
    if (!colors) return
    const artist = work.artist?.[0] ?? 'Artwork'
    const title = work.titles?.[0]?.title ?? work.object_number
    const baseName = `SMK / ${artist} / ${title}`
    postToPlugin({
      type: 'create-color-styles',
      baseName,
      styles: colors.map((c, i) => ({
        name: `Color ${String(i + 1).padStart(2, '0')}`,
        r: c.r / 255,
        g: c.g / 255,
        b: c.b / 255,
      })),
    })
    setCreated(true)
    setTimeout(() => setCreated(false), 2000)
  }

  if (!work.image_thumbnail) return null

  return (
    <div className="palette">
      <div className="palette__header">
        <h3 className="palette__heading">Color palette</h3>
        {!colors && (
          <button
            type="button"
            className="palette__extract"
            onClick={extract}
            disabled={loading}
          >
            {loading ? 'Extracting…' : 'Extract'}
          </button>
        )}
      </div>

      {colors && (
        <>
          <div className="palette__swatches">
            {colors.map((c, i) => (
              <div
                key={i}
                className="palette__swatch"
                style={{
                  background: `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`,
                }}
                title={rgbToHex(c.r, c.g, c.b)}
              >
                <span className="palette__swatch-label">
                  {rgbToHex(c.r, c.g, c.b).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <button type="button" className="palette__create" onClick={createStyles}>
            {created ? '✓ Color styles created' : 'Add as Figma color styles'}
          </button>
        </>
      )}

      {error && <p className="palette__error">{error}</p>}
    </div>
  )
}
