import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { projectDuration } from '../model/time'
import { useProject } from '../store/useProject'
import { LayerPoints } from './LayerPoints'

const RAD = 180 / Math.PI

// Moves the playhead while playing
function Playback() {
  useFrame((_, delta) => {
    const state = useProject.getState()
    if (!state.playing) {
      return
    }
    const duration = projectDuration(state.project)
    let next = state.playhead + delta
    if (duration > 0 && next >= duration) {
      if (state.loop) {
        next = next % duration
      } else {
        next = duration
        state.setPlaying(false)
      }
    }
    state.setPlayhead(next)
  })
  return null
}

type GizmoProps = { object: THREE.Group | null }

// The transform gizmo on the selected layer. Dragging it writes back into the layer.
function Gizmo({ object }: GizmoProps) {
  const mode = useProject(state => state.gizmoMode)
  const selectedId = useProject(state => state.selectedId)
  const updateLayer = useProject(state => state.updateLayer)

  if (!object || !selectedId) {
    return null
  }
  return (
    <TransformControls object={object} mode={mode} size={0.8} onObjectChange={() => {
      const round = (v: number, digits: number) => parseFloat(v.toFixed(digits))
      updateLayer(selectedId, {
        position: [round(object.position.x, 4), round(object.position.y, 4), round(object.position.z, 4)],
        rotation: [round(object.rotation.x * RAD, 2), round(object.rotation.y * RAD, 2), round(object.rotation.z * RAD, 2)],
        scale: round(object.scale.x, 4),
      })
    }}/>
  )
}

export function Viewport() {
  const layers = useProject(state => state.project.layers)
  const clips = useProject(state => state.clips)
  const selectedId = useProject(state => state.selectedId)
  const select = useProject(state => state.select)
  const groups = useRef(new Map<string, THREE.Group>())
  const [selectedGroup, setSelectedGroup] = useState<THREE.Group | null>(null)

  const register = useCallback((id: string, group: THREE.Group | null) => {
    if (group) {
      groups.current.set(id, group)
    } else {
      groups.current.delete(id)
    }
    setSelectedGroup(groups.current.get(useProject.getState().selectedId ?? '') ?? null)
  }, [])

  useEffect(() => {
    setSelectedGroup(groups.current.get(selectedId ?? '') ?? null)
  }, [selectedId])

  return (
    <Canvas camera={{ position: [2.5, 1.5, 3.5], fov: 50, near: 0.02, far: 200 }}
      raycaster={{ params: { Points: { threshold: 0.03 }, Line: { threshold: 1 }, Mesh: {}, LOD: {}, Sprite: {} } }}
      onPointerMissed={() => select(null)}>
      <color attach="background" args={['#15171c']}/>
      <Grid infiniteGrid cellSize={0.25} sectionSize={1} cellColor="#2c3038" sectionColor="#4a5160" fadeDistance={40} fadeStrength={2}/>
      <axesHelper args={[0.5]}/>
      {layers.map(layer => clips[layer.source] && (
        <LayerPoints key={layer.id} layer={layer} clip={clips[layer.source]} register={register}/>
      ))}
      <Gizmo object={selectedGroup}/>
      <OrbitControls makeDefault target={[0, 0.8, 0]}/>
      <Playback/>
    </Canvas>
  )
}
