import { create } from 'zustand'
import { KpcClip } from '../kpc/KpcClip'
import { createLayer, Layer, newProject, Project } from '../model/project'

export type GizmoMode = 'translate' | 'rotate' | 'scale'

type State = {
  project: Project
  // loaded source clips by file name
  clips: Record<string, KpcClip>
  selectedId: string | null
  playhead: number // seconds
  playing: boolean
  loop: boolean
  pointSize: number // meters
  gizmoMode: GizmoMode
  // the folder the project and clips live in (File System Access API), null when working with picked files
  folderName: string | null

  setProject: (project: Project) => void
  setProjectName: (name: string) => void
  setFps: (fps: number) => void
  setDuration: (duration: number | 'auto') => void
  addClip: (source: string, clip: KpcClip) => void
  // a new layer for a loaded clip, selected
  addLayer: (source: string) => Layer | null
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  moveLayer: (id: string, direction: -1 | 1) => void
  select: (id: string | null) => void
  setPlayhead: (seconds: number) => void
  setPlaying: (playing: boolean) => void
  setLoop: (loop: boolean) => void
  setPointSize: (size: number) => void
  setGizmoMode: (mode: GizmoMode) => void
  setFolderName: (name: string | null) => void
}

export const useProject = create<State>((set, get) => ({
  project: newProject(),
  clips: {},
  selectedId: null,
  playhead: 0,
  playing: false,
  loop: true,
  pointSize: 0.012,
  gizmoMode: 'translate',
  folderName: null,

  setProject: (project) => set({ project, selectedId: project.layers[0]?.id ?? null, playhead: 0, playing: false }),
  setProjectName: (name) => set(state => ({ project: { ...state.project, name } })),
  setFps: (fps) => set(state => ({ project: { ...state.project, fps } })),
  setDuration: (duration) => set(state => ({ project: { ...state.project, duration } })),

  addClip: (source, clip) => set(state => ({ clips: { ...state.clips, [source]: clip } })),

  addLayer: (source) => {
    const clip = get().clips[source]
    if (!clip) {
      return null
    }
    const layer = createLayer(source, clip.duration, clip.hasColor)
    set(state => ({ project: { ...state.project, layers: [...state.project.layers, layer] }, selectedId: layer.id }))
    return layer
  },

  updateLayer: (id, patch) => set(state => ({
    project: { ...state.project, layers: state.project.layers.map(layer => (layer.id === id ? { ...layer, ...patch } : layer)) },
  })),

  removeLayer: (id) => set(state => ({
    project: { ...state.project, layers: state.project.layers.filter(layer => layer.id !== id) },
    selectedId: state.selectedId === id ? null : state.selectedId,
  })),

  moveLayer: (id, direction) => set(state => {
    const layers = [...state.project.layers]
    const index = layers.findIndex(layer => layer.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= layers.length) {
      return {}
    }
    ;[layers[index], layers[target]] = [layers[target], layers[index]]
    return { project: { ...state.project, layers } }
  }),

  select: (selectedId) => set({ selectedId }),
  setPlayhead: (playhead) => set({ playhead: Math.max(0, playhead) }),
  setPlaying: (playing) => set({ playing }),
  setLoop: (loop) => set({ loop }),
  setPointSize: (pointSize) => set({ pointSize }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode }),
  setFolderName: (folderName) => set({ folderName }),
}))

export const useSelectedLayer = () => useProject(state => state.project.layers.find(layer => layer.id === state.selectedId) ?? null)
