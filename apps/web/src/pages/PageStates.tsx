import { useTranslation } from 'react-i18next'

export function LoadingList() {
  const { t } = useTranslation()
  return (
    <div className="skeleton-list" aria-busy="true" aria-label={t('app.loading')}>
      {[0, 1, 2].map((index) => (
        <div key={index} className="skeleton" />
      ))}
    </div>
  )
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="load-error" role="alert">
      <p>
        {t('tasks.loadError')} <span className="muted">{message}</span>
      </p>
      <button type="button" className="button button--ghost" onClick={onRetry}>
        {t('app.retry')}
      </button>
    </div>
  )
}
