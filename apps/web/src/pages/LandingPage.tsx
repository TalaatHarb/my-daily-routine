import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import { SUPPORTED_LANGUAGES, currentLanguage } from '../i18n'

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const uiLocales = currentLanguage()

  return (
    <main className="landing">
      <div className="landing__card">
        <img src="/pwa-192x192.png" alt="" width="96" height="96" className="landing__logo" />
        <h1>{t('app.name')}</h1>
        <p className="landing__tagline">{t('app.tagline')}</p>
        <div className="landing__actions">
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => void auth.signinRedirect({ ui_locales: uiLocales })}
          >
            {t('app.signIn')}
          </button>
          <button
            type="button"
            className="button button--ghost button--large"
            onClick={() => void auth.signinRedirect({ ui_locales: uiLocales, prompt: 'create' })}
          >
            {t('app.signUp')}
          </button>
        </div>
        <div className="landing__languages">
          {SUPPORTED_LANGUAGES.filter((locale) => locale !== uiLocales).map((locale) => (
            <button key={locale} type="button" className="link-button" lang={locale} onClick={() => void i18n.changeLanguage(locale)}>
              {t(`languages.${locale}`)}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

export function SplashScreen({ message }: { message: string }) {
  return (
    <main className="splash" aria-busy="true">
      <img src="/favicon.svg" alt="" width="64" height="64" className="splash__logo" />
      <p>{message}</p>
    </main>
  )
}
