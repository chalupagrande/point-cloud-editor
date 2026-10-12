import { PointerEvent, useEffect, useRef, useState, WheelEvent } from 'react'
import { Layer } from '../model/project'
import { layerEnd, layerLength, projectDuration } from '../model/time'
import { useProject } from '../store/useProject'

const LABEL_WIDTH = 140
const ROW_HEIGHT = 28
const HANDLE = 8 // px, the trim handles at the ends of a bar
const SNAP = 6 // px

type Drag =
  | { kind: 'playhead' }
  | { kind: 'move', layer: Layer, startX: number }
  | { kind: 'trimIn', layer: Layer, startX: number }
  | { kind: 'trimOut', layer: Layer, startX: number }

// The timeline: a ruler with the playhead and one draggable bar per layer.
// Dragging a bar moves it in time, dragging its ends trims the source clip.
export function Timeline() {
  const project = useProject(state => state.project)
  const clips = useProject(state => state.clips)
  const selectedId = useProject(state => state.selectedId)
  const playhead = useProject(state => state.playhead)
  const select = useProject(state => state.select)
  const setPlayhead = useProject(state => state.setPlayhead)
  const updateLayer = useProject(state => state.updateLayer)

  const [pxPerSecond, setPxPerSecond] = useState(80)
  const [startTime, setStartTime] = useState(0)
  const [trackWidth, setTrackWidth] = useState(800)
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  useEffect(() => {
    const track = trackRef.current!
    const observer = new ResizeObserver(() => setTrackWidth(track.clientWidth))
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  const duration = Math.max(projectDuration(project), 1)
  const toX = (seconds: number) => (seconds - startTime) * pxPerSecond
  const toTime = (x: number) => x / pxPerSecond + startTime

  function trackX(e: PointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return e.clientX - rect.left
  }

  // snaps a time to the other layers' edges and the project end when within a few pixels
  function snap(seconds: number, except: string) {
    const targets = [0, projectDuration(project)]
    for (const layer of project.layers) {
      if (layer.id !== except) {
        targets.push(layer.offset, layerEnd(layer))
      }
    }
    for (const target of targets) {
      if (Math.abs(target - seconds) * pxPerSecond < SNAP) {
        return target
      }
    }
    return seconds
  }

  function startDrag(e: PointerEvent, d: Drag) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = d
    if (d.kind !== 'playhead') {
      select(d.layer.id)
    } else {
      setPlayhead(Math.max(0, toTime(trackX(e))))
    }
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current
    if (!d) {
      return
    }
    if (d.kind === 'playhead') {
      setPlayhead(Math.max(0, toTime(trackX(e))))
      return
    }
    const dt = (e.clientX - d.startX) / pxPerSecond
    const layer = d.layer
    if (d.kind === 'move') {
      const offset = snap(Math.max(0, layer.offset + dt), layer.id)
      updateLayer(layer.id, { offset })
    } else if (d.kind === 'trimIn') {
      // the left edge moves, the rest of the bar stays where it is
      const edge = snap(layer.offset + dt, layer.id)
      const trimIn = Math.min(layer.trimOut - 0.01, Math.max(0, layer.trimIn + (edge - layer.offset) * layer.speed))
      updateLayer(layer.id, { trimIn, offset: layer.offset + (trimIn - layer.trimIn) / layer.speed })
    } else {
      const clipDuration = clips[layer.source]?.duration ?? layer.trimOut
      const edge = snap(layerEnd(layer) + dt, layer.id)
      const trimOut = Math.max(layer.trimIn + 0.01, Math.min(clipDuration, layer.trimIn + (edge - layer.offset) * layer.speed))
      updateLayer(layer.id, { trimOut })
    }
  }

  function onPointerUp(e: PointerEvent) {
    drag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // wheel pans, wheel with ctrl/cmd zooms around the pointer
  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      const x = trackX(e as unknown as PointerEvent)
      const timeAtPointer = toTime(x)
      const next = Math.min(2000, Math.max(10, pxPerSecond * Math.exp(-e.deltaY * 0.002)))
      setPxPerSecond(next)
      setStartTime(Math.max(0, timeAtPointer - x / next))
    } else {
      setStartTime(Math.max(0, startTime + (e.deltaX + e.deltaY) / pxPerSecond))
    }
  }

  // ruler ticks: whole seconds, thinned out when zoomed out
  const tickEvery = pxPerSecond > 150 ? 0.5 : pxPerSecond > 40 ? 1 : pxPerSecond > 15 ? 5 : 10
  const visibleSeconds = trackWidth / pxPerSecond
  const ticks: number[] = []
  for (let t = Math.ceil(startTime / tickEvery) * tickEvery; t <= startTime + visibleSeconds; t += tickEvery) {
    ticks.push(parseFloat(t.toFixed(3)))
  }

  return (
    <div className="timeline" onWheel={onWheel}>
      <div className="timeline-labels" style={{ width: LABEL_WIDTH }}>
        <div className="timeline-ruler-label">{playhead.toFixed(2)}s / {projectDuration(project).toFixed(2)}s</div>
        {project.layers.map(layer => (
          <div key={layer.id} className={`timeline-label ${layer.id === selectedId ? 'selected' : ''}`}
            style={{ height: ROW_HEIGHT }} onClick={() => select(layer.id)}>
            {layer.name}
          </div>
        ))}
      </div>
      <div className="timeline-track" ref={trackRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="timeline-ruler" onPointerDown={e => startDrag(e, { kind: 'playhead' })}>
          {ticks.map(t => (
            <div key={t} className="timeline-tick" style={{ left: toX(t) }}>{t}</div>
          ))}
        </div>
        <div className="timeline-rows" onPointerDown={e => startDrag(e, { kind: 'playhead' })}>
          <div className="timeline-end" style={{ left: toX(duration) }}/>
          {project.layers.map(layer => (
            <div key={layer.id} className="timeline-row" style={{ height: ROW_HEIGHT }}>
              <div className={`timeline-bar ${layer.id === selectedId ? 'selected' : ''} ${layer.visible ? '' : 'hidden'}`}
                style={{ left: toX(layer.offset), width: Math.max(2, layerLength(layer) * pxPerSecond) }}
                onPointerDown={e => startDrag(e, { kind: 'move', layer, startX: e.clientX })}
                title={`${layer.name}: ${layer.offset.toFixed(2)}s to ${layerEnd(layer).toFixed(2)}s${layer.speed !== 1 ? `, ${layer.speed}x` : ''}${layer.loop ? ', loops' : ''}`}>
                <div className="timeline-handle left" style={{ width: HANDLE }}
                  onPointerDown={e => startDrag(e, { kind: 'trimIn', layer, startX: e.clientX })}/>
                <span className="timeline-bar-text">{layer.speed !== 1 ? `${layer.speed}x ` : ''}{layer.loop ? '↻' : ''}</span>
                <div className="timeline-handle right" style={{ width: HANDLE }}
                  onPointerDown={e => startDrag(e, { kind: 'trimOut', layer, startX: e.clientX })}/>
              </div>
            </div>
          ))}
        </div>
        <div className="timeline-playhead" style={{ left: toX(playhead) }}/>
      </div>
    </div>
  )
}
