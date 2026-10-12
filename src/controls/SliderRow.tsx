type SliderRowProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }: SliderRowProps) {
  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}/>
      <span className="row-unit">{value}{unit}</span>
    </label>
  )
}
