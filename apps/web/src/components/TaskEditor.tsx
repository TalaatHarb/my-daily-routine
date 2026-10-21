import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTaskActions } from '../hooks/queries'
import { normalizeLabel } from '../lib/colors'
import { formatTime } from '../lib/dates'
import { useToast } from '../lib/toast-context'
import type { DurationUnit, Task, TaskStatus, UpdateTaskRequest } from '../types/api'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { CategoryInput, TagInput } from './LabelInputs'

const STATUSES: TaskStatus[] = ['todo', 'inProgress', 'done']
const UNITS: DurationUnit[] = ['minutes', 'hours', 'days', 'weeks']
const UNIT_MINUTES: Record<DurationUnit, number> = { minutes: 1, hours: 60, days: 1440, weeks: 10080 }

interface MetadataRow {
  id: number
  key: string
  value: string
}

interface TaskEditorProps {
  task: Task
  focus?: 'name' | 'category'
  onClose: () => void
}

/** Full editor for all task attributes. */
export function TaskEditor({ task, focus = 'name', onClose }: TaskEditorProps) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { update } = useTaskActions()
  const titleId = useId()
  const fieldId = useId()
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description ?? '')
  const [plannedDate, setPlannedDate] = useState(task.plannedDate)
  const [startTime, setStartTime] = useState(task.startTime ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [category, setCategory] = useState(task.category?.name ?? '')
  const [tags, setTags] = useState(task.tags.map((tag) => tag.name))
  const [duration, setDuration] = useState(String(task.duration))
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(task.durationUnit)
  const [impact, setImpact] = useState(task.impact)
  const [resources, setResources] = useState(String(task.resources))
  const [metadata, setMetadata] = useState<MetadataRow[]>(() =>
    Object.entries(task.metadata).map(([key, value], index) => ({ id: index, key, value })),
  )
  const [nameError, setNameError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tagColors = useMemo(
    () => Object.fromEntries(task.tags.map((tag) => [normalizeLabel(tag.name), tag.color])),
    [task.tags],
  )
  const hasAdvancedValues =
    task.duration > 0 || task.impact > 0 || task.resources > 0 || Object.keys(task.metadata).length > 0

  useEffect(() => {
    if (focus === 'category') document.getElementById(`${fieldId}-category`)?.focus()
  }, [focus, fieldId])

  const endTime = useMemo(() => {
    const amount = Number(duration)
    if (!startTime || !amount || durationUnit === 'days' || durationUnit === 'weeks') return null
    const [hours, minutes] = startTime.split(':').map(Number)
    const total = hours * 60 + minutes + amount * UNIT_MINUTES[durationUnit]
    if (total >= 24 * 60) return null
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }, [duration, durationUnit, startTime])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setNameError(true)
      document.getElementById(`${fieldId}-name`)?.focus()
      return
    }
    const body: UpdateTaskRequest = {
      name: name.trim(),
      description: description.trim() || null,
      plannedDate,
      startTime: startTime || null,
      duration: Math.max(0, Number(duration) || 0),
      durationUnit,
      status,
      impact,
      resources: Math.max(0, Number(resources) || 0),
      category: category.trim() || null,
      tags,
      metadata: Object.fromEntries(
        metadata.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
      ),
    }
    setError(null)
    update.mutate(
      { id: task.id, body },
      {
        onSuccess: () => {
          toast.show({ message: t('tasks.saved'), tone: 'success' })
          onClose()
        },
        onError: (mutationError) => setError(mutationError.message),
      },
    )
  }

  return (
    <Dialog labelledBy={titleId} onClose={onClose} className="dialog--editor">
      <form className="editor" onSubmit={submit} noValidate>
        <header className="dialog__header">
          <h2 id={titleId}>{t('editor.title')}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('editor.close')}>
            <Icon name="close" />
          </button>
        </header>

        <div className="dialog__body">
          <div className="field">
            <label htmlFor={`${fieldId}-name`}>{t('editor.name')}</label>
            <input
              id={`${fieldId}-name`}
              value={name}
              maxLength={200}
              required
              autoFocus={focus === 'name'}
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
              onChange={(event) => {
                setName(event.target.value)
                if (event.target.value.trim()) setNameError(false)
              }}
            />
            {nameError ? (
              <p id={`${fieldId}-name-error`} className="field-error" role="alert">
                {t('editor.nameRequired')}
              </p>
            ) : null}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor={`${fieldId}-date`}>{t('editor.date')}</label>
              <input
                id={`${fieldId}-date`}
                type="date"
                value={plannedDate}
                required
                onChange={(event) => event.target.value && setPlannedDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`${fieldId}-time`}>{t('editor.startTime')}</label>
              <input
                id={`${fieldId}-time`}
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`${fieldId}-status`}>{t('editor.status')}</label>
              <select
                id={`${fieldId}-status`}
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor={`${fieldId}-category`}>{t('editor.category')}</label>
            <CategoryInput
              id={`${fieldId}-category`}
              value={category}
              onChange={setCategory}
              knownColor={task.category}
            />
          </div>

          <div className="field">
            <label htmlFor={`${fieldId}-tags`}>{t('editor.tags')}</label>
            <TagInput id={`${fieldId}-tags`} value={tags} onChange={setTags} colors={tagColors} />
          </div>

          <div className="field">
            <label htmlFor={`${fieldId}-description`}>{t('editor.description')}</label>
            <textarea
              id={`${fieldId}-description`}
              rows={3}
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <details className="editor__advanced" open={hasAdvancedValues}>
            <summary>{t('editor.advanced')}</summary>
            <div className="field-row">
              <div className="field">
                <label htmlFor={`${fieldId}-duration`}>{t('editor.duration')}</label>
                <input
                  id={`${fieldId}-duration`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`${fieldId}-unit`}>{t('editor.durationUnit')}</label>
                <select
                  id={`${fieldId}-unit`}
                  value={durationUnit}
                  onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                >
                  {UNITS.map((value) => (
                    <option key={value} value={value}>
                      {t(`units.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${fieldId}-resources`}>{t('editor.resources')}</label>
                <input
                  id={`${fieldId}-resources`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={resources}
                  onChange={(event) => setResources(event.target.value)}
                />
              </div>
            </div>
            {endTime ? (
              <p className="field-hint">{t('editor.ends', { time: formatTime(endTime, i18n.language) })}</p>
            ) : null}

            <div className="field">
              <label htmlFor={`${fieldId}-impact`}>
                {t('editor.impact')} <output>{t('editor.impactValue', { value: impact })}</output>
              </label>
              <input
                id={`${fieldId}-impact`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={impact}
                onChange={(event) => setImpact(Number(event.target.value))}
              />
            </div>

            <fieldset className="metadata">
              <legend>{t('editor.metadata')}</legend>
              {metadata.map((row) => (
                <div className="metadata__row" key={row.id}>
                  <input
                    aria-label={t('editor.metadataKey')}
                    placeholder={t('editor.metadataKey')}
                    value={row.key}
                    maxLength={100}
                    onChange={(event) =>
                      setMetadata((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    aria-label={t('editor.metadataValue')}
                    placeholder={t('editor.metadataValue')}
                    value={row.value}
                    maxLength={1000}
                    onChange={(event) =>
                      setMetadata((rows) =>
                        rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('editor.removeMetadata', { key: row.key })}
                    onClick={() => setMetadata((rows) => rows.filter((item) => item.id !== row.id))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button button--ghost"
                onClick={() =>
                  setMetadata((rows) => [...rows, { id: Math.max(0, ...rows.map((r) => r.id)) + 1, key: '', value: '' }])
                }
              >
                <Icon name="plus" size={18} /> {t('editor.addMetadata')}
              </button>
            </fieldset>
          </details>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="dialog__footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t('editor.cancel')}
          </button>
          <button type="submit" className="button button--primary" disabled={update.isPending}>
            {t('editor.save')}
          </button>
        </footer>
      </form>
    </Dialog>
  )
}

interface MoveDialogProps {
  task: Task
  onMove: (date: string) => void
  onClose: () => void
}

export function MoveDateDialog({ task, onMove, onClose }: MoveDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const [date, setDate] = useState(task.plannedDate)

  return (
    <Dialog labelledBy={titleId} onClose={onClose} className="dialog--small">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (date) onMove(date)
          onClose()
        }}
      >
        <header className="dialog__header">
          <h2 id={titleId}>{t('moveDialog.title')}</h2>
        </header>
        <div className="dialog__body">
          <div className="field">
            <label htmlFor={`${titleId}-date`}>{t('moveDialog.date')}</label>
            <input
              id={`${titleId}-date`}
              type="date"
              value={date}
              required
              autoFocus
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>
        <footer className="dialog__footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t('editor.cancel')}
          </button>
          <button type="submit" className="button button--primary">
            {t('moveDialog.move')}
          </button>
        </footer>
      </form>
    </Dialog>
  )
}
