import { NumberRow } from '../controls/NumberRow'
import { CheckboxRow } from '../controls/CheckboxRow'
import { SliderRow } from '../controls/SliderRow'
import { useProject } from '../store/useProject'

export function TransportBar() {
  const playing = useProject(state => state.playing)
  const loop = useProject(state => state.loop)
  const fps = useProject(state => state.project.fps)
  const duration = useProject(state => state.project.duration)
  const pointSize = useProject(state => state.pointSize)
  const gizmoMode = useProject(state => state.gizmoMode)
  const { setPlaying, setPlayhead, setLoop, setFps, setDuration, setPointSize, setGizmoMode } = useProject.getState()

  return (
    <div className="transport">
      <button onClick={() => setPlayhead(0)} title="Go to start (Home)">⏮</button>
      <button onClick={() => setPlaying(!playing)} title="Play / pause (space)">{playing ? '⏸' : '▶'}</button>
      <CheckboxRow label="Loop" checked={loop} onChange={setLoop}/>
      <span className="transport-gap"/>
      <NumberRow label="Export fps" value={fps} min={1} max={120} onChange={value => setFps(Math.max(1, Math.round(value)))}/>
      <label className="row">
        <span className="row-label">Duration</span>
        <select value={duration === 'auto' ? 'auto' : 'fixed'} onChange={e => setDuration(e.target.value === 'auto' ? 'auto' : 10)}>
          <option value="auto">auto</option>
          <option value="fixed">fixed</option>
        </select>
      </label>
      {duration !== 'auto' && <NumberRow label="" value={duration} min={0} step={0.5} unit="s" onChange={value => setDuration(Math.max(0, value))}/>}
      <span className="transport-gap"/>
      <SliderRow label="Point size" value={pointSize} min={0.002} max={0.05} step={0.001} unit="m" onChange={setPointSize}/>
      <span className="transport-gap"/>
      <label className="row">
        <span className="row-label">Gizmo</span>
        <select value={gizmoMode} onChange={e => setGizmoMode(e.target.value as typeof gizmoMode)}>
          <option value="translate">move (g)</option>
          <option value="rotate">rotate (r)</option>
          <option value="scale">scale (s)</option>
        </select>
      </label>
    </div>
  )
}
