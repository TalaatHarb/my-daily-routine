import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { LABEL_PALETTE } from '../lib/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
}

/** Palette swatches plus a native picker for any custom color. */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { t } = useTranslation()
  const name = useId()
  const isCustom = !(LABEL_PALETTE as readonly string[]).includes(value.toLowerCase())

  return (
    <fieldset className="color-picker">
      <legend className="visually-hidden">{label}</legend>
      {LABEL_PALETTE.map((color) => (
        <label key={color} className="color-picker__swatch" style={{ backgroundColor: color }} title={color}>
          <input
            type="radio"
            name={name}
            value={color}
            checked={value.toLowerCase() === color}
            onChange={() => onChange(color)}
          />
          <span className="visually-hidden">{color}</span>
        </label>
      ))}
      <label
        className={isCustom ? 'color-picker__custom color-picker__custom--active' : 'color-picker__custom'}
        title={t('labels.customColor')}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        <span className="visually-hidden">{t('labels.customColor')}</span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    </fieldset>
  )
}
