import type { Tab } from '../types'

type Props = {
  tab: Tab
  onChange: (tab: Tab) => void
  collectionCount: number
}

export function TabBar({ tab, onChange, collectionCount }: Props) {
  return (
    <nav className="tab-bar" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'search'}
        className={`tab-bar__tab ${tab === 'search' ? 'tab-bar__tab--active' : ''}`}
        onClick={() => onChange('search')}
      >
        Search
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'collections'}
        className={`tab-bar__tab ${tab === 'collections' ? 'tab-bar__tab--active' : ''}`}
        onClick={() => onChange('collections')}
      >
        Collections
        {collectionCount > 0 && <span className="tab-bar__count">{collectionCount}</span>}
      </button>
    </nav>
  )
}
