import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { Icon, type IconName } from './Icon'

export interface ActionMenuItem {
  key: string
  label: string
  icon?: IconName
  danger?: boolean
  hidden?: boolean
  onSelect: () => void
}

interface ActionMenuProps {
  label: string
  items: ActionMenuItem[]
}

/**
 * A "three dots" button revealing a group of actions in a popover (top layer + light dismiss).
 * Positioned with JS because CSS anchor positioning is not yet broadly available.
 */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const visibleItems = items.filter((item) => !item.hidden)

  useEffect(() => {
    const panel = panelRef.current
    const trigger = triggerRef.current
    if (!panel || !trigger) return

    const position = () => {
      const rect = trigger.getBoundingClientRect()
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const gap = 4
      const isRtl = getComputedStyle(trigger).direction === 'rtl'
      let left = isRtl ? rect.left : rect.right - width
      left = Math.min(Math.max(8, left), window.innerWidth - width - 8)
      let top = rect.bottom + gap
      if (top + height > window.innerHeight - 8 && rect.top - height - gap > 8) top = rect.top - height - gap
      panel.style.left = `${left}px`
      panel.style.top = `${Math.max(8, top)}px`
    }

    let isOpen = false
    const handleToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === 'open'
      isOpen = open
      trigger.setAttribute('aria-expanded', String(open))
      if (open) {
        position()
        panel.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
      } else {
        window.removeEventListener('resize', close)
        window.removeEventListener('scroll', close, true)
      }
    }
    const close = () => {
      if (isOpen) panel.hidePopover()
    }

    panel.addEventListener('toggle', handleToggle)
    return () => {
      panel.removeEventListener('toggle', handleToggle)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      buttons[(index + delta + buttons.length) % buttons.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      buttons[event.key === 'Home' ? 0 : buttons.length - 1]?.focus()
    }
  }

  const select = (item: ActionMenuItem) => {
    panelRef.current?.hidePopover()
    triggerRef.current?.focus()
    item.onSelect()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        popoverTarget={id}
        aria-label={label}
        aria-expanded="false"
        title={label}
      >
        <Icon name="dots" />
      </button>
      <div ref={panelRef} id={id} popover="auto" className="action-menu" onKeyDown={handleKeyDown}>
        {visibleItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.danger ? 'action-menu__item action-menu__item--danger' : 'action-menu__item'}
            onClick={() => select(item)}
          >
            {item.icon ? <Icon name={item.icon} size={18} /> : <span className="action-menu__spacer" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
