import type { Artwork } from '../api/smkClient'
import { ResultCard } from './ResultCard'

type Props = {
  results: Artwork[]
  onSelect: (work: Artwork) => void
  onInsert: (work: Artwork) => void
  insertingId: string | null
  favoriteIds?: Set<string>
  onToggleFavorite?: (work: Artwork) => void
}

export function ResultGrid({
  results,
  onSelect,
  onInsert,
  insertingId,
  favoriteIds,
  onToggleFavorite,
}: Props) {
  return (
    <ul className="result-grid">
      {results.map((work) => (
        <ResultCard
          key={work.object_number}
          work={work}
          onSelect={() => onSelect(work)}
          onInsert={() => onInsert(work)}
          inserting={insertingId === work.object_number}
          isFavorite={favoriteIds?.has(work.object_number) ?? false}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(work) : undefined}
        />
      ))}
    </ul>
  )
}
