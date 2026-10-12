import { CheckboxRow } from '../controls/CheckboxRow'
import { NumberRow } from '../controls/NumberRow'
import { Section } from '../controls/Section'
import { Layer, Vec3 } from '../model/project'
import { layerEnd } from '../model/time'
import { useProject, useSelectedLayer } from '../store/useProject'

const AXES = ['X', 'Y', 'Z'] as const

export function LayerInspector() {
  const layer = useSelectedLayer()
  const clip = useProject(state => (layer ? state.clips[layer.source] : undefined))
  const updateLayer = useProject(state => state.updateLayer)

  if (!layer) {
    return (
      <Section title="Layer" storageKey="inspector">
        <div className="hint">Select a layer to edit it.</div>
      </Section>
    )
  }

  const update = (patch: Partial<Layer>) => updateLayer(layer.id, patch)
  const setVec = (key: 'position' | 'rotation', axis: number, value: number) => {
    const next = [...layer[key]] as Vec3
    next[axis] = value
    update({ [key]: next })
  }
  const clipDuration = clip?.duration ?? layer.trimOut

  return (
    <Section title="Layer" storageKey="inspector">
      <label className="row">
        <span className="row-label">Name</span>
        <input type="text" value={layer.name} onChange={e => update({ name: e.target.value })}/>
      </label>
      <div className="hint">
        {layer.source}{clip ? ` · ${clip.frameCount} frames, ${clip.duration.toFixed(2)}s, ${clip.fps} fps${clip.hasColor ? ', color' : ''}` : ' · not loaded'}
      </div>

      <h3>Transform</h3>
      {AXES.map((axis, i) => (
        <NumberRow key={`p${axis}`} label={`Position ${axis}`} value={layer.position[i]} step={0.01} unit="m" onChange={v => setVec('position', i, v)}/>
      ))}
      {AXES.map((axis, i) => (
        <NumberRow key={`r${axis}`} label={`Rotation ${axis}`} value={layer.rotation[i]} step={1} unit="°" onChange={v => setVec('rotation', i, v)}/>
      ))}
      <NumberRow label="Scale" value={layer.scale} step={0.05} min={0.001} onChange={v => update({ scale: Math.max(0.001, v) })}/>
      <div className="buttons">
        <button onClick={() => update({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 })}>Reset Transform</button>
      </div>

      <h3>Time</h3>
      <NumberRow label="Start at" value={layer.offset} step={0.1} min={0} unit="s" onChange={v => update({ offset: Math.max(0, v) })}/>
      <NumberRow label="Trim in" value={layer.trimIn} step={0.1} min={0} max={clipDuration} unit="s"
        onChange={v => update({ trimIn: Math.min(Math.max(0, v), layer.trimOut) })}/>
      <NumberRow label="Trim out" value={layer.trimOut} step={0.1} min={0} max={clipDuration} unit="s"
        onChange={v => update({ trimOut: Math.max(Math.min(clipDuration, v), layer.trimIn) })}/>
      <NumberRow label="Speed" value={layer.speed} step={0.25} min={0.05} unit="x" onChange={v => update({ speed: Math.max(0.05, v) })}/>
      <CheckboxRow label="Loop" checked={layer.loop} onChange={loop => update({ loop })}/>
      <div className="hint">Ends at {layerEnd(layer).toFixed(2)}s on the timeline</div>

      <h3>Look</h3>
      <CheckboxRow label="Recorded color" checked={layer.useColor} onChange={useColor => update({ useColor })}/>
      <label className="row">
        <span className="row-label">Tint</span>
        <input type="color" value={layer.tint} onChange={e => update({ tint: e.target.value })}/>
        <span className="row-unit">{layer.useColor ? 'when color is off' : ''}</span>
      </label>
    </Section>
  )
}
