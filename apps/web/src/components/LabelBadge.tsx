import type { CSSProperties } from 'react'
import { Icon } from './Icon'

interface LabelBadgeProps {
  name: string
  color: string
  variant?: 'solid' | 'soft'
  onRemove?: () => void
  removeLabel?: string
}

/** A colored chip used for categories (solid) and tags (soft). */
export function LabelBadge({ name, color, variant = 'soft', onRemove, removeLabel }: LabelBadgeProps) {
  return (
    <span className={`badge badge--${variant}`} style={{ '--badge-color': color } as CSSProperties}>
      {variant === 'soft' ? <span className="badge__hash" aria-hidden="true">#</span> : null}
      <span className="badge__text">{name}</span>
      {onRemove ? (
        <button type="button" className="badge__remove" onClick={onRemove} aria-label={removeLabel}>
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </span>
  )
}
