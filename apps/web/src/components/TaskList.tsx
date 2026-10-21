import { useTranslation } from 'react-i18next'
import { useToday } from '../hooks/useBrowser'
import { addDays, formatDayTitle } from '../lib/dates'
import type { Task } from '../types/api'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  emptyMessage: string
  /** Group tasks by planned date (multi-day views). */
  grouped?: boolean
  /** Show finished tasks in a collapsible "Completed" section. */
  splitCompleted?: boolean
}

export function TaskList({ tasks, emptyMessage, grouped = false, splitCompleted = true }: TaskListProps) {
  const { t } = useTranslation()

  if (!tasks.length) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="var(--color-accent-soft)" />
          <path d="M22 33l7 7 14-15" fill="none" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  if (grouped) {
    const groups = new Map<string, Task[]>()
    for (const task of tasks) groups.set(task.plannedDate, [...(groups.get(task.plannedDate) ?? []), task])
    return (
      <div className="task-groups">
        {[...groups.entries()].map(([date, items]) => (
          <section key={date} className="task-group" aria-labelledby={`group-${date}`}>
            <GroupHeading id={`group-${date}`} date={date} />
            <ul className="task-list">
              {items.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  const active = splitCompleted ? tasks.filter((task) => task.status !== 'done') : tasks
  const completed = splitCompleted ? tasks.filter((task) => task.status === 'done') : []

  return (
    <>
      {active.length ? (
        <ul className="task-list">
          {active.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <p className="all-done">{t('day.allDone')}</p>
      )}
      {completed.length ? (
        <details className="completed-section" open>
          <summary>{t('tasks.completed', { count: completed.length })}</summary>
          <ul className="task-list task-list--completed">
            {completed.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  )
}

function GroupHeading({ id, date }: { id: string; date: string }) {
  const { t, i18n } = useTranslation()
  const today = useToday()
  const relative = date === today ? t('nav.today') : date === addDays(today, 1) ? t('nav.tomorrow') : null
  return (
    <h2 id={id} className="task-group__heading">
      {relative ? <span className="task-group__relative">{relative}</span> : null}
      <span>{formatDayTitle(date, i18n.language, today)}</span>
    </h2>
  )
}
