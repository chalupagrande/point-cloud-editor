// A project is a list of layers. Each layer is a .kpc file plus edits. Sources are never modified.

export type Vec3 = [number, number, number]

export type Layer = {
  id: string
  name: string
  source: string // .kpc file name in the project folder
  position: Vec3 // meters
  rotation: Vec3 // degrees, three.js XYZ order
  scale: number
  offset: number // seconds on the timeline where the layer starts
  trimIn: number // seconds into the source clip where the layer starts
  trimOut: number // seconds into the source clip where the layer ends
  speed: number // 1 = recorded speed, 0.5 = half speed
  loop: boolean // repeat the trimmed range until the project ends, otherwise disappear after one pass
  visible: boolean
  useColor: boolean // recorded colors, otherwise the tint
  tint: string // css hex color
}

export type Project = {
  version: 1
  name: string
  fps: number // export frame rate
  duration: number | 'auto' // seconds, 'auto' = until the last layer ends
  layers: Layer[]
}

export const PROJECT_VERSION = 1

export function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export function createLayer(source: string, clipDuration: number, hasColor: boolean, name = source.replace(/\.kpc$/, '')): Layer {
  return {
    id: newId(),
    name,
    source,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    offset: 0,
    trimIn: 0,
    trimOut: clipDuration,
    speed: 1,
    loop: false,
    visible: true,
    useColor: hasColor,
    tint: '#ffffff',
  }
}

export function newProject(name = 'untitled'): Project {
  return { version: PROJECT_VERSION, name, fps: 30, duration: 'auto', layers: [] }
}

export function serializeProject(project: Project) {
  return JSON.stringify(project, null, 2)
}

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number' && isFinite(v))

const number = (value: unknown, fallback: number) => (typeof value === 'number' && isFinite(value) ? value : fallback)
const boolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
const string = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback)

// Reads a saved project, filling in anything missing so older or hand-edited files still load
export function parseProject(json: string): Project {
  const raw = JSON.parse(json)
  if (!raw || typeof raw !== 'object' || raw.version !== PROJECT_VERSION) {
    throw new Error(`Not a point cloud editor project (version ${raw?.version})`)
  }
  if (!Array.isArray(raw.layers)) {
    throw new Error('Project has no layers list')
  }
  const layers: Layer[] = raw.layers.map((l: Record<string, unknown>, index: number) => {
    if (typeof l.source !== 'string') {
      throw new Error(`Layer ${index} has no source file`)
    }
    const defaults = createLayer(l.source, 0, true)
    return {
      ...defaults,
      id: string(l.id, defaults.id),
      name: string(l.name, defaults.name),
      position: isVec3(l.position) ? l.position : defaults.position,
      rotation: isVec3(l.rotation) ? l.rotation : defaults.rotation,
      scale: number(l.scale, 1),
      offset: number(l.offset, 0),
      trimIn: number(l.trimIn, 0),
      trimOut: number(l.trimOut, 0),
      speed: number(l.speed, 1) || 1,
      loop: boolean(l.loop, false),
      visible: boolean(l.visible, true),
      useColor: boolean(l.useColor, true),
      tint: string(l.tint, '#ffffff'),
    }
  })
  return {
    version: PROJECT_VERSION,
    name: string(raw.name, 'untitled'),
    fps: number(raw.fps, 30),
    duration: raw.duration === 'auto' ? 'auto' : number(raw.duration, 0) || 'auto',
    layers,
  }
}
