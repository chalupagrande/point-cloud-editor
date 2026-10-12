import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { KpcClip } from '../kpc/KpcClip'
import { KpcFrame } from '../kpc/kpcTypes'
import { Layer, Project } from './project'
import { localTime, outputTimes, projectDuration } from './time'

const DEG = Math.PI / 180
const INT16_MAX = 32767

// The layer's transform in millimeter space: positions are stored in mm, the layer is edited in meters
export function layerMatrix(layer: Layer) {
  const [x, y, z] = layer.position
  const [rx, ry, rz] = layer.rotation
  return new Matrix4().compose(
    new Vector3(x * 1000, y * 1000, z * 1000),
    new Quaternion().setFromEuler(new Euler(rx * DEG, ry * DEG, rz * DEG)),
    new Vector3(layer.scale, layer.scale, layer.scale),
  )
}

export function tintToRgb(tint: string): [number, number, number] {
  const hex = tint.replace('#', '')
  const value = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16)
  return isNaN(value) ? [255, 255, 255] : [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

type TransformResult = { positions: Int16Array, clipped: boolean }

// Applies the layer's transform to a frame's positions. Reports when a point leaves the int16 range.
export function transformPositions(positions: Int16Array, matrix: Matrix4): TransformResult {
  const e = matrix.elements
  const out = new Int16Array(positions.length)
  let clipped = false
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    const tx = e[0] * x + e[4] * y + e[8] * z + e[12]
    const ty = e[1] * x + e[5] * y + e[9] * z + e[13]
    const tz = e[2] * x + e[6] * y + e[10] * z + e[14]
    if (Math.abs(tx) > INT16_MAX || Math.abs(ty) > INT16_MAX || Math.abs(tz) > INT16_MAX) {
      clipped = true
    }
    out[i] = Math.max(-INT16_MAX - 1, Math.min(INT16_MAX, Math.round(tx)))
    out[i + 1] = Math.max(-INT16_MAX - 1, Math.min(INT16_MAX, Math.round(ty)))
    out[i + 2] = Math.max(-INT16_MAX - 1, Math.min(INT16_MAX, Math.round(tz)))
  }
  return { positions: out, clipped }
}

export type ExportResult = {
  frames: KpcFrame[]
  fps: number
  duration: number
  clipped: boolean // some points fell outside the int16 range and were clamped
  missing: string[] // layers whose source clip was not loaded
}

// Bakes every visible layer into one sequence of frames, sampled at the project's fps
export function exportProject(project: Project, clips: Map<string, KpcClip>, onProgress?: (done: number, total: number) => void): ExportResult {
  const duration = projectDuration(project)
  const fps = project.fps
  const times = outputTimes(duration, fps)
  const layers = project.layers.filter(layer => layer.visible && clips.has(layer.source))
  const missing = project.layers.filter(layer => layer.visible && !clips.has(layer.source)).map(layer => layer.name)
  const matrices = new Map(layers.map(layer => [layer.id, layerMatrix(layer)]))
  const hints = new Map(layers.map(layer => [layer.id, 0]))
  let clipped = false

  const frames: KpcFrame[] = times.map((t, index) => {
    const parts: { positions: Int16Array, colors: Uint8Array }[] = []
    for (const layer of layers) {
      const local = localTime(layer, t)
      if (local === null) {
        continue
      }
      const clip = clips.get(layer.source)!
      const frameIndex = clip.frameIndexAt(local, hints.get(layer.id))
      if (frameIndex < 0) {
        continue
      }
      hints.set(layer.id, frameIndex)
      const frame = clip.getFrame(frameIndex)
      const transformed = transformPositions(frame.positions, matrices.get(layer.id)!)
      clipped = clipped || transformed.clipped
      let colors: Uint8Array
      if (layer.useColor && frame.colors) {
        colors = frame.colors
      } else {
        const [r, g, b] = tintToRgb(layer.tint)
        colors = new Uint8Array(frame.positions.length)
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = r
          colors[i + 1] = g
          colors[i + 2] = b
        }
      }
      parts.push({ positions: transformed.positions, colors })
    }
    const total = parts.reduce((n, part) => n + part.positions.length, 0)
    const positions = new Int16Array(total)
    const colors = new Uint8Array(total)
    let at = 0
    for (const part of parts) {
      positions.set(part.positions, at)
      colors.set(part.colors, at)
      at += part.positions.length
    }
    onProgress?.(index + 1, times.length)
    return { time: t, positions, colors }
  })

  return { frames, fps, duration, clipped, missing }
}
