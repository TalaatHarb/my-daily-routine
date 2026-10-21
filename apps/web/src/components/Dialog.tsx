import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  labelledBy: string
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * Modal dialog rendered while mounted. Uses the native <dialog> (top layer, focus trap, Esc)
 * with light-dismiss via `closedby="any"` and a fallback for browsers without it.
 */
export function Dialog({ labelledBy, onClose, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    dialog.setAttribute('closedby', 'any')
    // A queued `close` event from an earlier close() (e.g. StrictMode remount) must not dismiss a reopened dialog.
    const handleClose = () => {
      if (!dialog.open) onCloseRef.current()
    }
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      if (!inside) dialog.close()
    }

    dialog.addEventListener('close', handleClose)
    const needsFallback = !('closedBy' in HTMLDialogElement.prototype)
    if (needsFallback) dialog.addEventListener('click', handleBackdropClick)
    if (!dialog.open) dialog.showModal()

    return () => {
      dialog.removeEventListener('close', handleClose)
      if (needsFallback) dialog.removeEventListener('click', handleBackdropClick)
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} className={['dialog', className].filter(Boolean).join(' ')}>
      {children}
    </dialog>
  )
}
