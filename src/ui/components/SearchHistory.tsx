type Props = {
  history: string[]
  onSelect: (query: string) => void
  onClear: () => void
}

export function SearchHistory({ history, onSelect, onClear }: Props) {
  if (history.length === 0) return null
  return (
    <div className="search-history">
      <div className="search-history__header">
        <span>Recent searches</span>
        <button type="button" className="search-history__clear" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="search-history__chips">
        {history.map((q) => (
          <button
            key={q}
            type="button"
            className="search-history__chip"
            onClick={() => onSelect(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
