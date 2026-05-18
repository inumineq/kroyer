import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  loading?: boolean
  placeholder?: string
}

export function SearchBar({ value, onChange, onSubmit, loading, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
        inputRef.current?.blur()
      }}
    >
      <svg
        className="search-bar__icon"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="search-bar__input"
        placeholder={placeholder ?? 'Search artist, title, period…'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {value && !loading && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
      {loading && <div className="search-bar__spinner" aria-label="Searching" />}
    </form>
  )
}
