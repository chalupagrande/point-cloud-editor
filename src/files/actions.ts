// What the buttons do: load clips, add layers, open/save projects, export.
// Works the same whether files come from a folder or were picked one by one.
import { parseKpc } from '../kpc/KpcClip'
import { encodeKpc } from '../kpc/kpcWriter'
import { exportProject } from '../model/exportProject'
import { parseProject, serializeProject } from '../model/project'
import { useProject } from '../store/useProject'
import { downloadFile, readFolderFile, writeFolderFile } from './fileSystem'
import { useFiles } from './useFiles'

async function readFile(name: string): Promise<File> {
  const { folder, picked } = useFiles.getState()
  if (picked[name]) {
    return picked[name]
  }
  if (folder) {
    return readFolderFile(folder, name)
  }
  throw new Error(`${name} is not available. Open its folder or add the file.`)
}

async function writeFile(name: string, data: ArrayBuffer | string) {
  const { folder, refresh } = useFiles.getState()
  if (folder) {
    await writeFolderFile(folder, name, data)
    await refresh()
    return `Saved ${name} to the folder`
  }
  downloadFile(name, data, typeof data === 'string' ? 'application/json' : 'application/octet-stream')
  return `Downloaded ${name}`
}

// Loads the clip if it is not loaded yet
export async function ensureClip(source: string) {
  const { clips, addClip } = useProject.getState()
  if (clips[source]) {
    return clips[source]
  }
  const file = await readFile(source)
  const clip = await parseKpc(await file.arrayBuffer())
  addClip(source, clip)
  return clip
}

export async function addLayerFromSource(source: string) {
  const { setStatus } = useFiles.getState()
  try {
    await ensureClip(source)
    useProject.getState().addLayer(source)
    setStatus('')
  } catch (e) {
    setStatus(`Could not load ${source}: ${e}`)
  }
}

// Picked files become available, and .kpc files are added as layers straight away
export async function addPickedFiles(files: File[]) {
  const { addPicked } = useFiles.getState()
  addPicked(files)
  for (const file of files) {
    if (file.name.endsWith('.kpc')) {
      await addLayerFromSource(file.name)
    } else if (file.name.endsWith('.pce.json')) {
      await openProject(file.name)
    }
  }
}

export async function saveProject() {
  const { project } = useProject.getState()
  const { setStatus } = useFiles.getState()
  try {
    setStatus(await writeFile(`${project.name}.pce.json`, serializeProject(project)))
  } catch (e) {
    setStatus(`Could not save project: ${e}`)
  }
}

export async function openProject(name: string) {
  const { setStatus } = useFiles.getState()
  try {
    const project = parseProject(await (await readFile(name)).text())
    const missing: string[] = []
    for (const source of new Set(project.layers.map(layer => layer.source))) {
      try {
        await ensureClip(source)
      } catch {
        missing.push(source)
      }
    }
    useProject.getState().setProject(project)
    setStatus(missing.length ? `Opened ${name}. Missing clips: ${missing.join(', ')}` : `Opened ${name}`)
  } catch (e) {
    setStatus(`Could not open ${name}: ${e}`)
  }
}

export async function exportKpc(onProgress?: (done: number, total: number) => void) {
  const { project, clips } = useProject.getState()
  const { setStatus } = useFiles.getState()
  try {
    const result = exportProject(project, new Map(Object.entries(clips)), onProgress)
    if (!result.frames.length) {
      setStatus('Nothing to export: the project is empty')
      return
    }
    const data = await encodeKpc(result.frames, result.fps, true)
    const saved = await writeFile(`${project.name}.kpc`, data)
    const notes = [
      `${result.frames.length} frames, ${result.duration.toFixed(2)}s, ${(data.byteLength / 1e6).toFixed(1)} MB`,
      result.clipped ? 'some points were outside ±32m and were clamped' : '',
      result.missing.length ? `skipped layers with missing clips: ${result.missing.join(', ')}` : '',
    ].filter(Boolean)
    setStatus(`${saved}: ${notes.join('; ')}`)
  } catch (e) {
    setStatus(`Export failed: ${e}`)
  }
}
