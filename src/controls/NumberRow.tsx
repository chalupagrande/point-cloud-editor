import { useState } from 'react'

type NumberRowProps = {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

// A labelled number field. What is typed is kept as text until it is a number, so "-" and "" are allowed.
export function NumberRow({ label, value, step = 1, min, max, unit = '', disabled = false, onChange }: NumberRowProps) {
  const [text, setText] = useState<string | null>(null)

  function handleText(newText: string) {
    setText(newText)
    const parsed = parseFloat(newText)
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
  }

  const shown = text ?? (Number.isInteger(value) ? value : parseFloat(value.toFixed(4)))

  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <input type="number" value={shown} step={step} min={min} max={max} disabled={disabled}
        onChange={e => handleText(e.target.value)} onBlur={() => setText(null)}/>
      <span className="row-unit">{unit}</span>
    </label>
  )
}
