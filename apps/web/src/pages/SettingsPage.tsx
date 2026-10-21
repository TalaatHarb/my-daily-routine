import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import { useMe, useUpdateMe } from '../hooks/queries'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { browserTimeZone } from '../lib/dates'
import { environment } from '../lib/environment'
import { useTheme } from '../lib/theme-context'
import { useToast } from '../lib/toast-context'
import type { Locale, ThemePreference } from '../types/api'

const THEMES: ThemePreference[] = ['system', 'light', 'dark']

function timeZones(current: string | null): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  const zones = new Set([...supported, 'UTC'])
  if (current) zones.add(current)
  const detected = browserTimeZone()
  if (detected) zones.add(detected)
  return [...zones].sort()
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const toast = useToast()
  const theme = useTheme()
  const { data: me } = useMe()
  const updateMe = useUpdateMe()
  const [displayName, setDisplayName] = useState(me?.displayName ?? '')
  const [timeZone, setTimeZone] = useState(me?.timeZone ?? browserTimeZone() ?? 'UTC')
  const zones = useMemo(() => timeZones(me?.timeZone ?? null), [me?.timeZone])

  const persist = (body: Parameters<typeof updateMe.mutate>[0], message = t('settings.saved')) =>
    updateMe.mutate(body, {
      onSuccess: () => toast.show({ message, tone: 'success' }),
      onError: (error) => toast.show({ message: error.message, tone: 'error' }),
    })

  const changeLanguage = (locale: Locale) => {
    void i18n.changeLanguage(locale)
    persist({ locale })
  }

  const changeTheme = (value: ThemePreference) => {
    theme.setPreference(value)
    persist({ theme: value })
  }

  const saveProfile = (event: FormEvent) => {
    event.preventDefault()
    persist({ displayName: displayName.trim() || null, timeZone })
  }

  return (
    <section className="page page--narrow" aria-labelledby="page-title">
      <header className="page__header">
        <h1 id="page-title">{t('settings.title')}</h1>
      </header>

      <div className="card">
        <h2>{t('settings.preferences')}</h2>
        <div className="field">
          <span className="field__label" id="language-label">
            {t('settings.language')}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="language-label">
            {SUPPORTED_LANGUAGES.map((locale) => (
              <label key={locale} className="segmented__option">
                <input
                  type="radio"
                  name="language"
                  value={locale}
                  checked={i18n.resolvedLanguage === locale}
                  onChange={() => changeLanguage(locale)}
                />
                <span lang={locale}>{t(`languages.${locale}`)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label" id="theme-label">
            {t('settings.theme')}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((value) => (
              <label key={value} className="segmented__option">
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme.preference === value}
                  onChange={() => changeTheme(value)}
                />
                <span>{t(`settings.theme${value[0].toUpperCase()}${value.slice(1)}`)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <form className="card" onSubmit={saveProfile}>
        <h2>{t('settings.profile')}</h2>
        <div className="field">
          <label className="field__label" htmlFor="display-name">
            {t('settings.displayName')}
          </label>
          <input
            id="display-name"
            className="input"
            maxLength={100}
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        {me?.email ? (
          <div className="field">
            <span className="field__label">{t('settings.email')}</span>
            <span dir="ltr">{me.email}</span>
          </div>
        ) : null}
        <div className="field">
          <label className="field__label" htmlFor="time-zone">
            {t('settings.timeZone')}
          </label>
          <select id="time-zone" className="input" value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <span className="field__hint">{t('settings.timeZoneHint')}</span>
        </div>
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={updateMe.isPending}>
            {t('settings.save')}
          </button>
        </div>
      </form>

      <div className="card">
        <h2>{t('settings.account')}</h2>
        <div className="form-actions form-actions--start">
          <a className="button button--ghost" href={`${environment.oidcAuthority}/account`} target="_blank" rel="noreferrer">
            {t('settings.manageAccount')}
          </a>
          <button type="button" className="button button--danger" onClick={() => void auth.signoutRedirect()}>
            {t('app.signOut')}
          </button>
        </div>
      </div>
    </section>
  )
}
