import { useTranslation } from 'react-i18next'
import { useAuth } from 'react-oidc-context'
import { NavLink, useLocation } from 'react-router-dom'
import { useLabels, useMe, useTasks } from '../hooks/queries'
import { useToday } from '../hooks/useBrowser'
import { addDays } from '../lib/dates'
import { Icon, type IconName } from './Icon'

interface NavItem {
  to: string
  label: string
  icon: IconName
  count?: number
  isActive?: boolean
}

export function Sidebar() {
  const { t } = useTranslation()
  const auth = useAuth()
  const location = useLocation()
  const today = useToday()
  const tomorrow = addDays(today, 1)
  const { data: me } = useMe()
  const { data: overdue = [] } = useTasks({ overdue: true })
  const { data: categories = [] } = useLabels('categories', '')

  const views: NavItem[] = [
    {
      to: '/',
      label: t('nav.today'),
      icon: 'sun',
      isActive: location.pathname === '/' || location.pathname === `/day/${today}`,
    },
    { to: `/day/${tomorrow}`, label: t('nav.tomorrow'), icon: 'sunrise' },
    { to: '/upcoming', label: t('nav.upcoming'), icon: 'calendar' },
    { to: '/overdue', label: t('nav.overdue'), icon: 'alert', count: overdue.length },
    { to: '/all', label: t('nav.all'), icon: 'list' },
  ]
  const organize: NavItem[] = [
    { to: '/categories', label: t('nav.categories'), icon: 'folder' },
    { to: '/tags', label: t('nav.tags'), icon: 'tag' },
    { to: '/settings', label: t('nav.settings'), icon: 'settings' },
  ]
  const topCategories = [...categories]
    .filter((category) => category.taskCount > 0)
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 6)
  const displayName = me?.displayName || me?.username || auth.user?.profile.preferred_username || ''

  const renderItem = (item: NavItem) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          (item.isActive ?? isActive) ? 'nav-link nav-link--active' : 'nav-link'
        }
        aria-current={item.isActive ? 'page' : undefined}
      >
        <Icon name={item.icon} />
        <span className="nav-link__label">{item.label}</span>
        {item.count ? <span className="nav-link__count">{item.count}</span> : null}
      </NavLink>
    </li>
  )

  return (
    <div className="sidebar__inner">
      <h2 className="sidebar__heading">{t('nav.views')}</h2>
      <ul className="nav-list">{views.map(renderItem)}</ul>

      {topCategories.length ? (
        <>
          <h2 className="sidebar__heading">{t('nav.topCategories')}</h2>
          <ul className="nav-list">
            {topCategories.map((category) => (
              <li key={category.id}>
                <NavLink
                  to={`/all?categoryId=${category.id}`}
                  className={() =>
                    location.pathname === '/all' && location.search.includes(category.id)
                      ? 'nav-link nav-link--active'
                      : 'nav-link'
                  }
                >
                  <span className="color-dot" style={{ backgroundColor: category.color }} aria-hidden="true" />
                  <span className="nav-link__label">{category.name}</span>
                  <span className="nav-link__count nav-link__count--muted">{category.taskCount}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="sidebar__heading">{t('nav.organize')}</h2>
      <ul className="nav-list">{organize.map(renderItem)}</ul>

      <div className="sidebar__user">
        <span className="avatar" aria-hidden="true">
          {displayName.slice(0, 1).toUpperCase() || '?'}
        </span>
        <span className="sidebar__user-name">{displayName}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={t('app.signOut')}
          title={t('app.signOut')}
          onClick={() => void auth.signoutRedirect()}
        >
          <Icon name="logout" />
        </button>
      </div>
    </div>
  )
}
