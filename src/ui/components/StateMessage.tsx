type Props = {
  variant: 'empty' | 'no-results' | 'error' | 'first-load'
  message?: string
  hint?: string
  corrections?: string[]
  onCorrectionClick?: (correction: string) => void
}

export function StateMessage({ variant, message, hint, corrections, onCorrectionClick }: Props) {
  const defaults = DEFAULTS[variant]

  return (
    <div className={`state-message state-message--${variant}`}>
      <div className="state-message__icon" aria-hidden="true">
        {ICONS[variant]}
      </div>
      <p className="state-message__title">{message ?? defaults.title}</p>
      {(hint ?? defaults.hint) && <p className="state-message__hint">{hint ?? defaults.hint}</p>}
      {corrections && corrections.length > 0 && (
        <div className="state-message__corrections">
          <span>Did you mean</span>
          {corrections.slice(0, 3).map((c) => (
            <button
              key={c}
              type="button"
              className="state-message__correction"
              onClick={() => onCorrectionClick?.(c)}
            >
              {c}
            </button>
          ))}
          ?
        </div>
      )}
    </div>
  )
}

const DEFAULTS: Record<Props['variant'], { title: string; hint?: string }> = {
  'first-load': {
    title: 'Search the SMK collection',
    hint: 'Try a name like “Hammershøi” or a period.',
  },
  'no-results': {
    title: 'No results',
    hint: 'Try a broader search or remove filters.',
  },
  empty: { title: 'Nothing here yet' },
  error: { title: 'Something went wrong', hint: 'Check your connection and try again.' },
}

const ICONS: Record<Props['variant'], string> = {
  'first-load': '🔎',
  'no-results': '∅',
  empty: '∅',
  error: '⚠',
}
