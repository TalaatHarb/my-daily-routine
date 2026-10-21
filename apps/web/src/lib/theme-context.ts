import { createContext, useContext } from 'react'
import type { ThemePreference } from '../types/api'

export interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (value: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: () => undefined,
})

export const THEME_STORAGE_KEY = 'mdr.theme'

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
