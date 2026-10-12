import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KpcClip } from '../kpc/KpcClip'
import { Layer } from '../model/project'
import { localTime } from '../model/time'
import { useProject } from '../store/useProject'

const DEG = Math.PI / 180

// vertex colors need to be linear, the camera gives sRGB
const SRGB_TO_LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

type LayerPointsProps = {
  layer: Layer
  clip: KpcClip
  // lets the viewport find this layer's group for the gizmo
  register: (id: string, group: THREE.Group | null) => void
}

// One layer's points. The buffers are as big as the clip's biggest frame and the current frame is copied in.
export function LayerPoints({ layer, clip, register }: LayerPointsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const currentFrame = useRef(-1)
  const select = useProject(state => state.select)

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new THREE.BufferAttribute(new Int16Array(clip.maxPointCount * 3), 3)
    positions.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', positions)
    const colors = new THREE.BufferAttribute(new Float32Array(clip.maxPointCount * 3), 3)
    colors.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('color', colors)
    geometry.setDrawRange(0, 0)
    const material = new THREE.PointsMaterial({ size: 0.01, sizeAttenuation: true, vertexColors: true })
    return { geometry, material }
  }, [clip])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  // a new clip needs its frame copied again
  useEffect(() => {
    currentFrame.current = -1
  }, [clip])

  useEffect(() => {
    register(layer.id, groupRef.current)
    return () => register(layer.id, null)
  }, [layer.id, register])

  useFrame(() => {
    const group = groupRef.current
    if (!group) {
      return
    }
    const { playhead, pointSize } = useProject.getState()
    const local = layer.visible ? localTime(layer, playhead) : null
    group.visible = local !== null
    if (local === null) {
      return
    }

    const index = clip.frameIndexAt(local, currentFrame.current)
    if (index !== currentFrame.current && index >= 0) {
      currentFrame.current = index
      const frame = clip.getFrame(index)
      const positions = geometry.getAttribute('position') as THREE.BufferAttribute
      ;(positions.array as Int16Array).set(frame.positions)
      positions.needsUpdate = true
      if (frame.colors) {
        const colors = geometry.getAttribute('color') as THREE.BufferAttribute
        const array = colors.array as Float32Array
        for (let i = 0; i < frame.colors.length; i++) {
          array[i] = SRGB_TO_LINEAR[frame.colors[i]]
        }
        colors.needsUpdate = true
      }
      geometry.setDrawRange(0, frame.positions.length / 3)
    }

    material.size = pointSize
    const vertexColors = layer.useColor && clip.hasColor
    if (material.vertexColors !== vertexColors) {
      material.vertexColors = vertexColors
      material.needsUpdate = true
    }
    material.color.set(vertexColors ? '#ffffff' : layer.tint)
  })

  return (
    <group ref={groupRef}
      position={layer.position}
      rotation={[layer.rotation[0] * DEG, layer.rotation[1] * DEG, layer.rotation[2] * DEG]}
      scale={layer.scale}>
      {/* positions are millimeters, the scene is meters */}
      <points geometry={geometry} material={material} scale={0.001} frustumCulled={false}
        onClick={(e) => { e.stopPropagation(); select(layer.id) }}/>
    </group>
  )
}
