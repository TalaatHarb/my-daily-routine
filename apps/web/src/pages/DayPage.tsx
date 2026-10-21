import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { QuickAdd } from '../components/QuickAdd'
import { TaskList } from '../components/TaskList'
import { useTasks } from '../hooks/queries'
import { useToday } from '../hooks/useBrowser'
import { addDays, formatDayTitle, isIsoDate } from '../lib/dates'
import { LoadError, LoadingList } from './PageStates'

function dayPath(date: string, today: string): string {
  return date === today ? '/' : `/day/${date}`
}

/** The home page: one day's tasks (today by default) with quick add. */
export function DayPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const today = useToday()
  const date = isIsoDate(params.date) ? params.date : today
  const { data: tasks, isPending, error, refetch } = useTasks({ date })

  const relative =
    date === today
      ? t('nav.today')
      : date === addDays(today, 1)
        ? t('nav.tomorrow')
        : null
  const total = tasks?.length ?? 0
  const done = tasks?.filter((task) => task.status === 'done').length ?? 0

  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page__header day-header">
        <div className="day-header__titles">
          <h1 id="page-title">{relative ?? formatDayTitle(date, i18n.language, today)}</h1>
          {relative ? <p className="page__subtitle">{formatDayTitle(date, i18n.language, today)}</p> : null}
        </div>
        <div className="day-header__nav">
          <Link to={dayPath(addDays(date, -1), today)} className="icon-button" aria-label={t('day.previous')} title={t('day.previous')}>
            <Icon name="chevronStart" />
          </Link>
          {date !== today ? (
            <Link to="/" className="button button--ghost button--small">
              {t('day.backToToday')}
            </Link>
          ) : null}
          <label className="icon-button date-jump" title={t('day.pickDate')}>
            <Icon name="calendar" />
            <span className="visually-hidden">{t('day.pickDate')}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => isIsoDate(event.target.value) && navigate(dayPath(event.target.value, today))}
            />
          </label>
          <Link to={dayPath(addDays(date, 1), today)} className="icon-button" aria-label={t('day.next')} title={t('day.next')}>
            <Icon name="chevronEnd" />
          </Link>
        </div>
      </header>

      {total > 0 ? (
        <div className="day-progress">
          <progress max={total} value={done} aria-label={t('day.progress', { done, total })} />
          <span>{t('day.progress', { done, total })}</span>
        </div>
      ) : null}

      <QuickAdd plannedDate={date} />

      {isPending ? (
        <LoadingList />
      ) : error ? (
        <LoadError message={error.message} onRetry={() => void refetch()} />
      ) : (
        <TaskList tasks={tasks ?? []} emptyMessage={t('tasks.empty')} />
      )}
    </section>
  )
}
