import type { ProviderId } from '../../shared/model'
import { listProviders } from '../providers/registry'

type Props = {
  value: ProviderId
  onChange: (id: ProviderId) => void
}

export function ProviderPicker({ value, onChange }: Props) {
  return (
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
          </option>
        ))}
      </select>
    </label>
  )
}
