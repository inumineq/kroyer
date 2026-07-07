import type { ProviderId } from '../../shared/model'
import { getProvider, listProviders } from '../providers/registry'

type Props = {
  value: ProviderId
  onChange: (id: ProviderId) => void
}

export function ProviderPicker({ value, onChange }: Props) {
  const selected = getProvider(value)
  return (
    <div className="provider-picker-wrap">
      <label className="provider-picker">
        <span className="provider-picker__label">Museum</span>
        <select
          className="provider-picker__select"
          value={value}
          onChange={(e) => onChange(e.target.value as ProviderId)}
          aria-label="Museum to search"
        >
          {listProviders().map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.imageLoading === 'blocked' ? ' (previews unavailable)' : ''}
            </option>
          ))}
        </select>
      </label>
      {selected.imageLoading === 'blocked' && (
        <p className="provider-picker__hint">
          {selected.shortLabel} blocks image previews for embedded apps — search and metadata
          work, but you'll need to open works on their site to see them.
        </p>
      )}
    </div>
  )
}
