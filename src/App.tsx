import { DragEvent, useEffect, useState } from 'react'
import { addPickedFiles } from './files/actions'
import { FilesPanel } from './panels/FilesPanel'
import { LayerInspector } from './panels/LayerInspector'
import { LayerList } from './panels/LayerList'
import { useProject } from './store/useProject'
import { Timeline } from './timeline/Timeline'
import { TransportBar } from './timeline/TransportBar'
import { Viewport } from './viewport/Viewport'

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export default function App() {
  const [dropping, setDropping] = useState(false)

  // keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e.target)) {
        return
      }
      const state = useProject.getState()
      switch (e.key) {
        case ' ':
          e.preventDefault()
          state.setPlaying(!state.playing)
          break
        case 'Home':
          state.setPlayhead(0)
          break
        case 'g':
          state.setGizmoMode('translate')
          break
        case 'r':
          state.setGizmoMode('rotate')
          break
        case 's':
          state.setGizmoMode('scale')
          break
        case 'Delete':
        case 'Backspace':
          if (state.selectedId) {
            state.removeLayer(state.selectedId)
          }
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDropping(false)
    addPickedFiles(Array.from(e.dataTransfer.files).filter(file => file.name.endsWith('.kpc') || file.name.endsWith('.json')))
  }

  return (
    <div className={`app ${dropping ? 'dropping' : ''}`}
      onDragOver={e => { e.preventDefault(); setDropping(true) }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}>
      <aside className="sidebar">
        <h1>Point Cloud Editor</h1>
        <FilesPanel/>
        <LayerList/>
        <LayerInspector/>
      </aside>
      <main className="viewport">
        <Viewport/>
      </main>
      <footer className="bottom">
        <TransportBar/>
        <Timeline/>
      </footer>
    </div>
  )
}
