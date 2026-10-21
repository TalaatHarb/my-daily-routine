import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  tone?: 'info' | 'success' | 'error'
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue>({ show: () => undefined })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
