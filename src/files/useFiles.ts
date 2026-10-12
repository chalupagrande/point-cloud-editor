import { create } from 'zustand'
import { FolderListing, hasRememberedFolder, listFolder, pickFolder, restoreFolder } from './fileSystem'

type FilesState = {
  folder: FileSystemDirectoryHandle | null
  listing: FolderListing
  // a folder was used before and can be reopened with one click
  remembered: boolean
  // files picked one by one (no folder access), by name
  picked: Record<string, File>
  status: string

  openFolder: () => Promise<void>
  reopenFolder: () => Promise<void>
  refresh: () => Promise<void>
  addPicked: (files: File[]) => void
  setStatus: (status: string) => void
}

export const useFiles = create<FilesState>((set, get) => ({
  folder: null,
  listing: { clips: [], projects: [] },
  remembered: false,
  picked: {},
  status: '',

  openFolder: async () => {
    try {
      const folder = await pickFolder()
      set({ folder, remembered: true, status: '' })
      await get().refresh()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        set({ status: `Could not open folder: ${e}` })
      }
    }
  },

  reopenFolder: async () => {
    try {
      const folder = await restoreFolder()
      if (folder) {
        set({ folder, status: '' })
        await get().refresh()
      } else {
        set({ status: 'The previous folder could not be reopened' })
      }
    } catch (e) {
      set({ status: `Could not reopen folder: ${e}` })
    }
  },

  refresh: async () => {
    const folder = get().folder
    if (folder) {
      set({ listing: await listFolder(folder) })
    }
  },

  addPicked: (files) => set(state => {
    const picked = { ...state.picked }
    for (const file of files) {
      picked[file.name] = file
    }
    const clips = Object.keys(picked).filter(name => name.endsWith('.kpc')).sort()
    const projects = Object.keys(picked).filter(name => name.endsWith('.pce.json')).sort()
    return { picked, listing: state.folder ? state.listing : { clips, projects } }
  }),

  setStatus: (status) => set({ status }),
}))

hasRememberedFolder().then(remembered => useFiles.setState({ remembered }))
