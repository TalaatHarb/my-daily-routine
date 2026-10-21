import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useMediaQuery, useOnlineStatus } from '../hooks/useBrowser'
import { Icon } from './Icon'
import { Sidebar } from './Sidebar'

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const online = useOnlineStatus()
  const isNarrow = useMediaQuery('(max-width: 900px)')
  // The drawer is tied to the route it was opened on, so navigating closes it.
  const routeKey = `${location.pathname}${location.search}`
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === routeKey
  const setOpen = (value: boolean | ((current: boolean) => boolean)) =>
    setOpenOn((typeof value === 'function' ? value(open) : value) ? routeKey : null)
  const drawerOpen = isNarrow && open

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      <header className="topbar">
        {isNarrow ? (
          <button
            type="button"
            className="icon-button"
            aria-expanded={drawerOpen}
            aria-controls="sidebar"
            aria-label={drawerOpen ? t('app.closeMenu') : t('app.openMenu')}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={drawerOpen ? 'close' : 'menu'} />
          </button>
        ) : null}
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>{t('app.name')}</span>
        </Link>
      </header>
      {!online ? (
        <p className="offline-banner" role="status">
          {t('app.offline')}
        </p>
      ) : null}
      <div className="layout">
        {drawerOpen ? (
          <button type="button" className="scrim" aria-label={t('app.closeMenu')} onClick={() => setOpen(false)} />
        ) : null}
        <nav
          id="sidebar"
          className={drawerOpen ? 'sidebar sidebar--open' : 'sidebar'}
          aria-label={t('nav.views')}
          inert={isNarrow && !open}
        >
          <Sidebar />
        </nav>
        <main id="main" className="content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
