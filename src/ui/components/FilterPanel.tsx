import { useState } from 'react'
import type { ProviderCapabilities } from '../providers/types'
import type { Filters } from '../types'

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
  capabilities: ProviderCapabilities
  resultCount?: number
}

export function FilterPanel({ filters, onChange, capabilities, resultCount }: Props) {
  const [expanded, setExpanded] = useState(false)

  const activeCount = countActiveFilters(filters, capabilities)
  const hasExpandableFilters =
    capabilities.supportsArtistFilter ||
    capabilities.supportsPeriodFilter ||
    capabilities.supportsHasImageFilter

  return (
    <div className="filter-panel">
      <div className="filter-panel__row">
        {hasExpandableFilters && (
        <button
          type="button"
          className="filter-panel__toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d={expanded ? 'M2 4l3 3 3-3' : 'M4 2l3 3-3 3'}
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-panel__badge">{activeCount}</span>}
        </button>
        )}

        {capabilities.supportsPublicDomainFilter && (
          <label className="filter-panel__pd-toggle" title="Show only public-domain works">
            <input
              type="checkbox"
              checked={filters.publicDomainOnly}
              onChange={(e) => onChange({ ...filters, publicDomainOnly: e.target.checked })}
            />
            <span>Public domain only</span>
          </label>
        )}
      </div>

      {expanded && hasExpandableFilters && (
        <div className="filter-panel__body">
          {capabilities.supportsArtistFilter && (
            <FilterField
              label="Artist"
              placeholder="e.g. Hammershøi, V."
              value={filters.creator ?? ''}
              onChange={(value) =>
                onChange({ ...filters, creator: value.trim() ? value : undefined })
              }
            />
          )}

          {capabilities.supportsPeriodFilter && (
            <div className="filter-panel__field-row">
              <FilterField
                label="From year"
                type="number"
                placeholder="1800"
                value={filters.periodStart?.toString() ?? ''}
                onChange={(value) =>
                  onChange({ ...filters, periodStart: value ? Number(value) : undefined })
                }
              />
              <FilterField
                label="To year"
                type="number"
                placeholder="1900"
                value={filters.periodEnd?.toString() ?? ''}
                onChange={(value) =>
                  onChange({ ...filters, periodEnd: value ? Number(value) : undefined })
                }
              />
            </div>
          )}

          {capabilities.supportsHasImageFilter && (
            <label className="filter-panel__checkbox">
              <input
                type="checkbox"
                checked={filters.hasImage}
                onChange={(e) => onChange({ ...filters, hasImage: e.target.checked })}
              />
              <span>Only works with images</span>
            </label>
          )}

          {activeCount > 0 && (
            <button
              type="button"
              className="filter-panel__reset"
              onClick={() =>
                onChange({ publicDomainOnly: filters.publicDomainOnly, hasImage: true })
              }
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {resultCount !== undefined && (
        <p className="filter-panel__count">
          {resultCount.toLocaleString('en-US')} works
        </p>
      )}
    </div>
  )
}

function countActiveFilters(filters: Filters, capabilities: ProviderCapabilities): number {
  let count = 0
  if (capabilities.supportsArtistFilter && filters.creator) count++
  if (capabilities.supportsPeriodFilter && filters.periodStart != null) count++
  if (capabilities.supportsPeriodFilter && filters.periodEnd != null) count++
  return count
}

type FilterFieldProps = {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
}

function FilterField({ label, placeholder, value, onChange, type = 'text' }: FilterFieldProps) {
  return (
    <label className="filter-field">
      <span className="filter-field__label">{label}</span>
      <input
        type={type}
        className="filter-field__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
