import { Layer, Project } from './project'

// How long the layer plays on the timeline for one pass of its trimmed range
export function layerLength(layer: Layer) {
  return Math.max(0, layer.trimOut - layer.trimIn) / layer.speed
}

export function layerEnd(layer: Layer) {
  return layer.offset + layerLength(layer)
}

// Where in the source clip the layer is at timeline time t, or null when the layer is not showing
export function localTime(layer: Layer, t: number): number | null {
  if (t < layer.offset) {
    return null
  }
  const span = layer.trimOut - layer.trimIn
  if (span <= 0) {
    return null
  }
  const local = (t - layer.offset) * layer.speed
  if (layer.loop) {
    return layer.trimIn + (local % span)
  }
  if (local >= span) {
    return null
  }
  return layer.trimIn + local
}

// Timeline time of the trimmed range's edges, used by the timeline bars
export function offsetForLocalTime(layer: Layer, local: number) {
  return layer.offset + (local - layer.trimIn) / layer.speed
}

export function projectDuration(project: Project) {
  if (project.duration !== 'auto') {
    return project.duration
  }
  return project.layers.filter(layer => layer.visible).reduce((end, layer) => Math.max(end, layerEnd(layer)), 0)
}

// The times of every frame in an export: 0, 1/fps, ... up to but not including the duration
export function outputTimes(duration: number, fps: number) {
  const count = Math.max(0, Math.round(duration * fps))
  return Array.from({ length: count }, (_, i) => i / fps)
}
