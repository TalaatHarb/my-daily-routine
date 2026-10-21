import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLabels } from '../hooks/queries'
import { useDebouncedValue } from '../hooks/useBrowser'
import type { LabelKind } from '../lib/api'
import { autoLabelColor, normalizeLabel } from '../lib/colors'
import { Icon } from './Icon'
import { LabelBadge } from './LabelBadge'

interface Suggestion {
  key: string
  name: string
  color: string
  isNew: boolean
}

/** Suggestions for a label kind: existing labels matching the text, plus a "create" entry. */
function useSuggestions(kind: LabelKind, text: string, exclude: string[], active: boolean) {
  const search = useDebouncedValue(text.trim(), 150)
  const { data = [] } = useLabels(kind, search, active)

  return useMemo<Suggestion[]>(() => {
    const excluded = new Set(exclude.map(normalizeLabel))
    const typed = normalizeLabel(text)
    const existing = data
      .filter((label) => !excluded.has(normalizeLabel(label.name)))
      .filter((label) => !typed || normalizeLabel(label.name).includes(typed))
      .slice(0, 8)
      .map((label) => ({ key: label.id, name: label.name, color: label.color, isNew: false }))
    const exact = data.some((label) => normalizeLabel(label.name) === typed)
    if (typed && !exact && !excluded.has(typed)) {
      existing.push({ key: `new:${typed}`, name: text.trim(), color: autoLabelColor(text), isNew: true })
    }
    return existing
  }, [data, exclude, text])
}

interface ComboboxFieldProps {
  id: string
  kind: LabelKind
  text: string
  onTextChange: (value: string) => void
  onPick: (name: string) => void
  exclude?: string[]
  placeholder?: string
  describedBy?: string
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>, hasActiveOption: boolean) => void
  before?: ReactNode
}

/** Text input with an accessible (ARIA 1.2 combobox) suggestion listbox. */
function ComboboxField({
  id,
  kind,
  text,
  onTextChange,
  onPick,
  exclude = [],
  placeholder,
  describedBy,
  onKeyDown,
  before,
}: ComboboxFieldProps) {
  const { t } = useTranslation()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const suggestions = useSuggestions(kind, text, exclude, open)
  const expanded = open && suggestions.length > 0

  const pick = (suggestion: Suggestion) => {
    onPick(suggestion.name)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (suggestions.length ? (index + 1) % suggestions.length : -1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (suggestions.length ? (index - 1 + suggestions.length) % suggestions.length : -1))
      return
    }
    if (event.key === 'Escape' && expanded) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'Enter' && expanded && activeIndex >= 0) {
      event.preventDefault()
      pick(suggestions[activeIndex])
      return
    }
    onKeyDown?.(event, expanded && activeIndex >= 0)
  }

  return (
    <div className="combobox">
      <div className="combobox__control">
        {before}
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          value={text}
          onChange={(event) => {
            onTextChange(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          className="combobox__input"
        />
      </div>
      <ul id={listId} role="listbox" className="combobox__list" hidden={!expanded}>
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.key}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={index === activeIndex ? 'combobox__option combobox__option--active' : 'combobox__option'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(suggestion)}
          >
            <span className="color-dot" style={{ backgroundColor: suggestion.color }} aria-hidden="true" />
            <span>{suggestion.isNew ? t('editor.newLabel', { name: suggestion.name }) : suggestion.name}</span>
            {suggestion.isNew ? <Icon name="plus" size={16} className="combobox__new" /> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface CategoryInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  knownColor?: { name: string; color: string } | null
}

function useLabelColor(kind: LabelKind) {
  const { data = [] } = useLabels(kind, '')
  return useMemo(() => {
    const map = new Map(data.map((label) => [normalizeLabel(label.name), label.color]))
    return (name: string, fallback?: string) => map.get(normalizeLabel(name)) ?? fallback ?? autoLabelColor(name)
  }, [data])
}

export function CategoryInput({ id, value, onChange, knownColor }: CategoryInputProps) {
  const { t } = useTranslation()
  const colorOf = useLabelColor('categories')
  const known = knownColor && normalizeLabel(knownColor.name) === normalizeLabel(value) ? knownColor.color : undefined
  const swatch = value.trim() ? (
    <span className="color-dot combobox__swatch" style={{ backgroundColor: colorOf(value, known) }} aria-hidden="true" />
  ) : null

  return (
    <ComboboxField
      id={id}
      kind="categories"
      text={value}
      onTextChange={onChange}
      onPick={onChange}
      placeholder={t('editor.categoryPlaceholder')}
      before={swatch}
    />
  )
}

interface TagInputProps {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  colors: Record<string, string>
}

/** Tags shown as removable chips with an autocomplete input for adding more. */
export function TagInput({ id, value, onChange, colors }: TagInputProps) {
  const { t } = useTranslation()
  const hintId = useId()
  const [text, setText] = useState('')
  const colorOf = useLabelColor('tags')

  const add = (name: string) => {
    const trimmed = name.trim().replace(/,+$/, '').trim()
    if (!trimmed) return
    if (!value.some((tag) => normalizeLabel(tag) === normalizeLabel(trimmed))) onChange([...value, trimmed])
    setText('')
  }

  const remove = (name: string) => onChange(value.filter((tag) => tag !== name))

  return (
    <div className="tag-input">
      {value.length ? (
        <ul className="chip-list" aria-label={t('editor.tags')}>
          {value.map((tag) => (
            <li key={tag}>
              <LabelBadge
                name={tag}
                color={colorOf(tag, colors[normalizeLabel(tag)])}
                onRemove={() => remove(tag)}
                removeLabel={t('editor.removeTag', { name: tag })}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <ComboboxField
        id={id}
        kind="tags"
        text={text}
        onTextChange={(next) => {
          if (next.endsWith(',')) add(next)
          else setText(next)
        }}
        onPick={add}
        exclude={value}
        placeholder={t('editor.tagsPlaceholder')}
        describedBy={hintId}
        onKeyDown={(event, hasActiveOption) => {
          if (event.key === 'Enter' && !hasActiveOption && text.trim()) {
            event.preventDefault()
            add(text)
          } else if (event.key === 'Backspace' && !text && value.length) {
            remove(value[value.length - 1])
          }
        }}
      />
      <p id={hintId} className="field-hint">
        {t('editor.tagsHint')}
      </p>
    </div>
  )
}
