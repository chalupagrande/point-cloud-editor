import { Section } from '../controls/Section'
import { useProject } from '../store/useProject'

export function LayerList() {
  const layers = useProject(state => state.project.layers)
  const selectedId = useProject(state => state.selectedId)
  const { select, updateLayer, removeLayer, moveLayer } = useProject.getState()

  return (
    <Section title="Layers" storageKey="layers">
      {layers.length === 0 && <div className="hint">No layers yet. Add a .kpc file.</div>}
      <ul className="layer-list">
        {layers.map((layer, index) => (
          <li key={layer.id} className={layer.id === selectedId ? 'selected' : ''} onClick={() => select(layer.id)}>
            <input type="checkbox" checked={layer.visible} title="Visible"
              onClick={e => e.stopPropagation()} onChange={e => updateLayer(layer.id, { visible: e.target.checked })}/>
            <span className="layer-name" title={layer.source}>{layer.name}</span>
            <button disabled={index === 0} onClick={e => { e.stopPropagation(); moveLayer(layer.id, -1) }} title="Move up">↑</button>
            <button disabled={index === layers.length - 1} onClick={e => { e.stopPropagation(); moveLayer(layer.id, 1) }} title="Move down">↓</button>
            <button onClick={e => { e.stopPropagation(); removeLayer(layer.id) }} title="Remove layer">✕</button>
          </li>
        ))}
      </ul>
    </Section>
  )
}
