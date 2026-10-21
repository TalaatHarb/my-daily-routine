import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useMe, useUpdateMe } from './hooks/queries'
import { browserTimeZone } from './lib/dates'
import { useTheme } from './lib/theme-context'
import { DayPage } from './pages/DayPage'
import { LabelsPage } from './pages/LabelsPage'
import { LandingPage, SplashScreen } from './pages/LandingPage'
import { SettingsPage } from './pages/SettingsPage'
import { TaskCollectionPage } from './pages/TaskCollectionPage'

export default function App() {
  const { t } = useTranslation()
  const auth = useAuth()

  if (auth.isLoading || auth.activeNavigator) return <SplashScreen message={t('app.signingIn')} />
  if (auth.error && !auth.isAuthenticated) {
    return (
      <main className="splash" role="alert">
        <p>{t('app.authError', { message: auth.error.message })}</p>
        <button type="button" className="button button--primary" onClick={() => void auth.signinRedirect()}>
          {t('app.retry')}
        </button>
      </main>
    )
  }
  if (!auth.isAuthenticated) return <LandingPage />
  return <AuthenticatedApp />
}

/** Loads the profile (GET /me, which provisions the user) before showing any task views. */
function AuthenticatedApp() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const { data: me, error, refetch } = useMe()
  const updateMe = useUpdateMe()
  const synced = useRef(false)

  useEffect(() => {
    if (!me || synced.current) return
    synced.current = true
    if (me.locale && me.locale !== i18n.resolvedLanguage) void i18n.changeLanguage(me.locale)
    if (me.theme !== theme.preference) theme.setPreference(me.theme)
    const zone = browserTimeZone()
    if (!me.timeZone && zone) updateMe.mutate({ timeZone: zone, locale: me.locale ?? (i18n.resolvedLanguage === 'ar' ? 'ar' : 'en') })
  }, [me, i18n, theme, updateMe])

  if (error) {
    return (
      <main className="splash" role="alert">
        <p>{t('errors.generic')}</p>
        <p className="muted">{error.message}</p>
        <button type="button" className="button button--primary" onClick={() => void refetch()}>
          {t('app.retry')}
        </button>
      </main>
    )
  }
  if (!me) return <SplashScreen message={t('app.loading')} />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DayPage />} />
        <Route path="/day/:date" element={<DayPage />} />
        <Route path="/upcoming" element={<TaskCollectionPage key="upcoming" view="upcoming" />} />
        <Route path="/overdue" element={<TaskCollectionPage key="overdue" view="overdue" />} />
        <Route path="/all" element={<TaskCollectionPage key="all" view="all" />} />
        <Route path="/categories" element={<LabelsPage key="categories" kind="categories" />} />
        <Route path="/tags" element={<LabelsPage key="tags" kind="tags" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/today" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="page empty-state">
      <h1>{t('errors.notFound')}</h1>
      <Link to="/" className="button button--primary">
        {t('errors.goHome')}
      </Link>
    </section>
  )
}
