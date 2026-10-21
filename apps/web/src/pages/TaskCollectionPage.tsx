import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TaskList } from '../components/TaskList'
import { useLabels, useTaskActions, useTasks } from '../hooks/queries'
import { useDebouncedValue, useToday } from '../hooks/useBrowser'
import { addDays } from '../lib/dates'
import { useToast } from '../lib/toast-context'
import type { TaskQuery, TaskStatus } from '../types/api'
import { LoadError, LoadingList } from './PageStates'

type CollectionView = 'upcoming' | 'overdue' | 'all'

const STATUSES: TaskStatus[] = ['todo', 'inProgress', 'done']

/** Multi-day views: the next 7 days, overdue tasks, and all tasks with filters. */
export function TaskCollectionPage({ view }: { view: CollectionView }) {
  const { t } = useTranslation()
  const today = useToday()
  const toast = useToast()
  const { move } = useTaskActions()
  const [params, setParams] = useSearchParams()
  const [searchText, setSearchText] = useState(params.get('search') ?? '')
  const search = useDebouncedValue(searchText.trim(), 300)

  const status = STATUSES.find((value) => value === params.get('status'))
  const categoryId = params.get('categoryId') ?? undefined
  const tag = params.get('tag') ?? undefined

  const query: TaskQuery =
    view === 'upcoming'
      ? { from: addDays(today, 1), to: addDays(today, 7) }
      : view === 'overdue'
        ? { overdue: true }
        : { all: true, status, categoryId, tag, search: search || undefined }

  const { data: tasks, isPending, error, refetch } = useTasks(query)
  const { data: categories = [] } = useLabels('categories', '', view === 'all')
  const { data: tags = [] } = useLabels('tags', '', view === 'all')

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const hasFilters = Boolean(status || categoryId || tag || searchText)
  const titles: Record<CollectionView, string> = {
    upcoming: t('nav.upcoming'),
    overdue: t('nav.overdue'),
    all: t('nav.all'),
  }
  const emptyMessage =
    view === 'overdue' ? t('tasks.emptyOverdue') : hasFilters ? t('tasks.emptyFiltered') : t('tasks.empty')

  const moveAllToToday = () => {
    for (const task of tasks ?? []) move.mutate({ id: task.id, plannedDate: today })
    toast.show({ message: t('tasks.movedTo', { date: t('nav.today') }), tone: 'success' })
  }

  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page__header">
        <h1 id="page-title">{titles[view]}</h1>
        {view === 'overdue' && tasks?.length ? (
          <button type="button" className="button button--primary button--small" onClick={moveAllToToday}>
            <Icon name="sun" size={16} />
            {t('tasks.moveAllToToday')}
          </button>
        ) : null}
      </header>

      {view === 'all' ? (
        <div className="filters" role="search">
          <label className="filters__search">
            <Icon name="search" size={18} />
            <span className="visually-hidden">{t('filters.search')}</span>
            <input
              type="search"
              placeholder={t('filters.searchPlaceholder')}
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value)
                setFilter('search', event.target.value.trim())
              }}
            />
          </label>
          <label>
            <span className="visually-hidden">{t('filters.status')}</span>
            <select value={status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">{t('filters.anyStatus')}</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">{t('filters.category')}</span>
            <select value={categoryId ?? ''} onChange={(event) => setFilter('categoryId', event.target.value)}>
              <option value="">{t('filters.anyCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">{t('filters.tag')}</span>
            <select value={tag ?? ''} onChange={(event) => setFilter('tag', event.target.value)}>
              <option value="">{t('filters.anyTag')}</option>
              {tags.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                setSearchText('')
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              {t('filters.reset')}
            </button>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <LoadingList />
      ) : error ? (
        <LoadError message={error.message} onRetry={() => void refetch()} />
      ) : (
        <TaskList tasks={tasks ?? []} emptyMessage={emptyMessage} grouped splitCompleted={false} />
      )}
    </section>
  )
}
