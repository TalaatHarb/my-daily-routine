import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useTaskActions } from '../hooks/queries'
import { usePrefersReducedMotion, useToday } from '../hooks/useBrowser'
import { addDays, formatShortDate, formatTime, nextWeekStart } from '../lib/dates'
import { useToast } from '../lib/toast-context'
import type { Task } from '../types/api'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'
import { Icon } from './Icon'
import { LabelBadge } from './LabelBadge'
import { MoveDateDialog, TaskEditor } from './TaskEditor'

const CELEBRATION_MS = 700
const BURST_PARTICLES = 10

interface TaskItemProps {
  task: Task
  showDate?: boolean
}

export function TaskItem({ task, showDate = false }: TaskItemProps) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const today = useToday()
  const reducedMotion = usePrefersReducedMotion()
  const actions = useTaskActions()
  const [celebrating, setCelebrating] = useState(false)
  const [editing, setEditing] = useState<null | 'name' | 'category'>(null)
  const [moving, setMoving] = useState(false)
  const pendingCompletion = useRef<number | null>(null)
  const completeRef = useRef<() => void>(() => undefined)

  const done = task.status === 'done'
  const isPlaceholder = task.id.startsWith('temp-')
  const isOverdue = !done && task.plannedDate < today

  const complete = () => {
    pendingCompletion.current = null
    actions.setStatus.mutate(
      { id: task.id, status: 'done' },
      { onError: (error) => toast.show({ message: error.message, tone: 'error' }) },
    )
    toast.show({
      message: t('tasks.completedToast', { name: task.name }),
      tone: 'success',
      actionLabel: t('tasks.undo'),
      onAction: () => actions.setStatus.mutate({ id: task.id, status: 'todo' }),
    })
  }

  useEffect(() => {
    completeRef.current = complete
  })

  // If the item unmounts mid-animation, still persist the completion.
  useEffect(
    () => () => {
      if (pendingCompletion.current !== null) {
        window.clearTimeout(pendingCompletion.current)
        completeRef.current()
      }
    },
    [],
  )

  const toggle = () => {
    if (pendingCompletion.current !== null) return
    if (done) {
      actions.setStatus.mutate({ id: task.id, status: 'todo' })
      return
    }
    if (reducedMotion) {
      complete()
      return
    }
    setCelebrating(true)
    navigator.vibrate?.(15)
    pendingCompletion.current = window.setTimeout(() => {
      setCelebrating(false)
      complete()
    }, CELEBRATION_MS)
  }

  const move = (plannedDate: string) =>
    actions.move.mutate(
      { id: task.id, plannedDate },
      {
        onSuccess: () => toast.show({ message: t('tasks.movedTo', { date: formatShortDate(plannedDate, i18n.language) }) }),
        onError: (error) => toast.show({ message: error.message, tone: 'error' }),
      },
    )

  const tomorrow = addDays(today, 1)
  const menuItems: ActionMenuItem[] = [
    { key: 'edit', label: t('menu.edit'), icon: 'edit', onSelect: () => setEditing('name') },
    { key: 'labels', label: t('menu.categoryTags'), icon: 'tag', onSelect: () => setEditing('category') },
    { key: 'today', label: t('menu.moveToday'), icon: 'sun', hidden: task.plannedDate === today, onSelect: () => move(today) },
    {
      key: 'tomorrow',
      label: t('menu.moveTomorrow'),
      icon: 'sunrise',
      hidden: task.plannedDate === tomorrow,
      onSelect: () => move(tomorrow),
    },
    {
      key: 'next-week',
      label: t('menu.moveNextWeek'),
      icon: 'arrowEnd',
      onSelect: () => move(nextWeekStart(task.plannedDate < today ? today : task.plannedDate)),
    },
    { key: 'pick', label: t('menu.pickDate'), icon: 'calendar', onSelect: () => setMoving(true) },
    {
      key: 'progress',
      label: task.status === 'inProgress' ? t('menu.stopProgress') : t('menu.startProgress'),
      icon: 'play',
      hidden: done,
      onSelect: () =>
        actions.setStatus.mutate({ id: task.id, status: task.status === 'inProgress' ? 'todo' : 'inProgress' }),
    },
    {
      key: 'done',
      label: done ? t('menu.reopen') : t('menu.markDone'),
      icon: done ? 'undo' : 'check',
      onSelect: toggle,
    },
    {
      key: 'duplicate',
      label: t('menu.duplicate'),
      icon: 'copy',
      onSelect: () => actions.duplicate.mutate(task.id, { onSuccess: () => toast.show({ message: t('tasks.duplicated') }) }),
    },
    {
      key: 'delete',
      label: t('menu.delete'),
      icon: 'trash',
      danger: true,
      onSelect: () => {
        if (window.confirm(t('tasks.deleteConfirm', { name: task.name }))) {
          actions.remove.mutate(task.id, { onSuccess: () => toast.show({ message: t('tasks.deleted') }) })
        }
      },
    },
  ]

  const classes = ['task']
  if (done) classes.push('task--done')
  if (celebrating) classes.push('task--celebrating')
  if (isPlaceholder) classes.push('task--pending')
  if (task.status === 'inProgress') classes.push('task--in-progress')
  const checkboxId = `task-${task.id}`

  return (
    <li className={classes.join(' ')} style={task.category ? { '--task-accent': task.category.color } as CSSProperties : undefined}>
      <span className="task__check">
        <input
          id={checkboxId}
          type="checkbox"
          className="task__checkbox"
          checked={done || celebrating}
          disabled={isPlaceholder}
          onChange={toggle}
          aria-label={done ? t('tasks.markNotDone', { name: task.name }) : t('tasks.markDone', { name: task.name })}
        />
        <span className="task__burst" aria-hidden="true">
          {Array.from({ length: BURST_PARTICLES }, (_, index) => (
            <span key={index} style={{ '--i': index } as CSSProperties} />
          ))}
        </span>
      </span>

      <div className="task__body">
        <button type="button" className="task__name" disabled={isPlaceholder} onClick={() => setEditing('name')}>
          <span className="task__title">{task.name}</span>
        </button>
        <div className="task__meta">
          {showDate || isOverdue ? (
            <span className={isOverdue ? 'meta meta--overdue' : 'meta'}>
              <Icon name="calendar" size={14} />
              {formatShortDate(task.plannedDate, i18n.language)}
            </span>
          ) : null}
          {task.status === 'inProgress' ? <span className="meta meta--progress">{t('tasks.inProgress')}</span> : null}
          {task.duration > 0 ? (
            <span className="meta">{t(`units.short.${task.durationUnit}`, { count: task.duration })}</span>
          ) : null}
          {task.category ? <LabelBadge name={task.category.name} color={task.category.color} variant="solid" /> : null}
          {task.tags.map((tag) => (
            <LabelBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
        {task.description ? <p className="task__description">{task.description}</p> : null}
      </div>

      {task.startTime ? (
        <time className="task__time" dateTime={task.startTime}>
          <Icon name="clock" size={14} />
          {formatTime(task.startTime, i18n.language)}
        </time>
      ) : null}

      {isPlaceholder ? <span className="icon-button-placeholder" /> : <ActionMenu label={t('tasks.moreActions', { name: task.name })} items={menuItems} />}

      {editing ? <TaskEditor task={task} focus={editing} onClose={() => setEditing(null)} /> : null}
      {moving ? <MoveDateDialog task={task} onMove={move} onClose={() => setMoving(false)} /> : null}
    </li>
  )
}
