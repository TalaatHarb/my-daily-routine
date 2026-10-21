import { useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ColorPicker } from '../components/ColorPicker'
import { Icon } from '../components/Icon'
import { LabelBadge } from '../components/LabelBadge'
import { useLabelActions, useLabels } from '../hooks/queries'
import type { LabelKind } from '../lib/api'
import { autoLabelColor } from '../lib/colors'
import { useToast } from '../lib/toast-context'
import type { LabelSummary } from '../types/api'
import { LoadError, LoadingList } from './PageStates'

/** Manage categories or tags: create, rename, recolor and delete. */
export function LabelsPage({ kind }: { kind: LabelKind }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: labels, isPending, error, refetch } = useLabels(kind, '')
  const actions = useLabelActions(kind)
  const [name, setName] = useState('')
  const isCategories = kind === 'categories'

  const add = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    actions.create.mutate(
      { name: trimmed },
      {
        onSuccess: () => setName(''),
        onError: (mutationError) => toast.show({ message: mutationError.message, tone: 'error' }),
      },
    )
  }

  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page__header">
        <div>
          <h1 id="page-title">{isCategories ? t('labels.categoriesTitle') : t('labels.tagsTitle')}</h1>
          <p className="page__subtitle">{isCategories ? t('labels.categoriesIntro') : t('labels.tagsIntro')}</p>
        </div>
      </header>

      <form className="quick-add" onSubmit={add}>
        <Icon name="plus" className="quick-add__icon" />
        <label className="visually-hidden" htmlFor="new-label">
          {isCategories ? t('labels.newCategory') : t('labels.newTag')}
        </label>
        <input
          id="new-label"
          className="quick-add__input"
          placeholder={isCategories ? t('labels.newCategory') : t('labels.newTag')}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {name.trim() ? <LabelBadge name={name.trim()} color={autoLabelColor(name)} variant={isCategories ? 'solid' : 'soft'} /> : null}
        <button type="submit" className="button button--primary quick-add__submit" disabled={!name.trim()}>
          {t('labels.add')}
        </button>
      </form>

      {isPending ? (
        <LoadingList />
      ) : error ? (
        <LoadError message={error.message} onRetry={() => void refetch()} />
      ) : labels?.length ? (
        <ul className="label-list">
          {labels.map((label) => (
            <LabelRow key={label.id} kind={kind} label={label} />
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <p>{t('labels.empty')}</p>
        </div>
      )}
    </section>
  )
}

function LabelRow({ kind, label }: { kind: LabelKind; label: LabelSummary }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { update, remove } = useLabelActions(kind)
  const [name, setName] = useState(label.name)

  const save = (body: { name: string; color: string }) =>
    update.mutate(
      { id: label.id, body },
      {
        onError: (error) => {
          setName(label.name)
          toast.show({ message: error.message, tone: 'error' })
        },
      },
    )

  const commitName = () => {
    const trimmed = name.trim()
    if (!trimmed) setName(label.name)
    else if (trimmed !== label.name) save({ name: trimmed, color: label.color })
  }

  const tasksLink = kind === 'categories' ? `/all?categoryId=${label.id}` : `/all?tag=${encodeURIComponent(label.name)}`

  return (
    <li className="label-row" style={{ '--badge-color': label.color } as CSSProperties}>
      <span className="label-row__dot" aria-hidden="true" />
      <div className="label-row__main">
        <input
          className="label-row__name"
          aria-label={t('labels.rename')}
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setName(label.name)
          }}
        />
        <Link to={tasksLink} className="label-row__count">
          {t('labels.taskCount', { count: label.taskCount })}
        </Link>
      </div>
      <ColorPicker label={t('labels.color')} value={label.color} onChange={(color) => save({ name: label.name, color })} />
      <button
        type="button"
        className="icon-button icon-button--danger"
        aria-label={t('labels.delete', { name: label.name })}
        title={t('labels.delete', { name: label.name })}
        onClick={() => {
          if (window.confirm(t('labels.deleteConfirm', { name: label.name }))) remove.mutate(label.id)
        }}
      >
        <Icon name="trash" size={18} />
      </button>
    </li>
  )
}
