type CheckboxRowProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
    </label>
  )
}
