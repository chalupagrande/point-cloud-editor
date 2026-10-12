import { ReactNode, useState } from 'react'

type SectionProps = {
  title: string
  storageKey: string
  defaultOpen?: boolean
  children: ReactNode
}

function loadOpen(storageKey: string, defaultOpen: boolean) {
  try {
    const saved = localStorage.getItem(`section.${storageKey}`)
    return saved === null ? defaultOpen : saved === '1'
  } catch {
    return defaultOpen
  }
}

// A collapsible group of controls that remembers whether it was open
export function Section({ title, storageKey, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(() => loadOpen(storageKey, defaultOpen))

  function toggle() {
    setOpen(!open)
    try {
      localStorage.setItem(`section.${storageKey}`, open ? '0' : '1')
    } catch {
      // not remembered, fine
    }
  }

  return (
    <section className="section">
      <h2 onClick={toggle}>{open ? '▾' : '▸'} {title}</h2>
      {open && <div className="section-body">{children}</div>}
    </section>
  )
}
