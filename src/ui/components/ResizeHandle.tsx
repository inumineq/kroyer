import { postToPlugin } from '../messages'

const MIN_WIDTH = 280
const MIN_HEIGHT = 360
const MAX_WIDTH = 900
const MAX_HEIGHT = 1000

export function ResizeHandle() {
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const startW = window.innerWidth
    const startH = window.innerHeight
    let lastW = startW
    let lastH = startH

    function handleMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      lastW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + dx))
      lastH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + dy))
      postToPlugin({ type: 'resize', width: lastW, height: lastH })
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      postToPlugin({ type: 'resize-commit', width: lastW, height: lastH })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown}
      role="separator"
      aria-label="Resize plugin window"
      title="Drag to resize"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M11 5L5 11 M11 8L8 11 M11 11"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
