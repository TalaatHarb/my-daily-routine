import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTaskActions } from '../hooks/queries'
import { useToast } from '../lib/toast-context'
import { Icon } from './Icon'

interface QuickAddProps {
  plannedDate: string
}

/** The one-line "add a task" form, with an optional start time. */
export function QuickAdd({ plannedDate }: QuickAddProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { create } = useTaskActions()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [time, setTime] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    create.mutate(
      { name: trimmed, plannedDate, startTime: time || null },
      { onError: (error) => toast.show({ message: error.message, tone: 'error' }) },
    )
    setName('')
    setTime('')
    inputRef.current?.focus()
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <label htmlFor={`${id}-name`} className="visually-hidden">
        {t('quickAdd.label')}
      </label>
      <Icon name="plus" className="quick-add__icon" />
      <input
        ref={inputRef}
        id={`${id}-name`}
        className="quick-add__input"
        type="text"
        placeholder={t('quickAdd.placeholder')}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={200}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label className="quick-add__time" title={t('quickAdd.time')}>
        <span className="visually-hidden">{t('quickAdd.time')}</span>
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      </label>
      <button type="submit" className="button button--primary quick-add__submit" disabled={!name.trim()}>
        {t('quickAdd.add')}
      </button>
    </form>
  )
}
