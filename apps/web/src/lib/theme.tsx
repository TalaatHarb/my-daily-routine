import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemePreference } from '../types/api'
import { THEME_STORAGE_KEY, ThemeContext } from './theme-context'

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)

  useEffect(() => {
    const root = document.documentElement
    if (preference === 'system') {
      delete root.dataset.theme
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      root.dataset.theme = preference
      localStorage.setItem(THEME_STORAGE_KEY, preference)
    }
  }, [preference])

  const setPreference = useCallback((value: ThemePreference) => setPreferenceState(value), [])
  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
