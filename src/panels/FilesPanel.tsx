import { useState } from 'react'
import { Section } from '../controls/Section'
import { addLayerFromSource, addPickedFiles, exportKpc, openProject, saveProject } from '../files/actions'
import { hasFolderAccess, pickFiles } from '../files/fileSystem'
import { useFiles } from '../files/useFiles'
import { useProject } from '../store/useProject'

// Opening folders and files, saving the project, exporting
export function FilesPanel() {
  const folder = useFiles(state => state.folder)
  const listing = useFiles(state => state.listing)
  const remembered = useFiles(state => state.remembered)
  const status = useFiles(state => state.status)
  const { openFolder, reopenFolder, refresh } = useFiles.getState()
  const projectName = useProject(state => state.project.name)
  const setProjectName = useProject(state => state.setProjectName)
  const [progress, setProgress] = useState<string | null>(null)

  async function handleExport() {
    setProgress('Exporting...')
    await exportKpc((done, total) => setProgress(`Exporting ${done} / ${total}`))
    setProgress(null)
  }

  return (
    <Section title="Files" storageKey="files">
      <div className="buttons">
        {hasFolderAccess && <button onClick={openFolder}>Open Folder…</button>}
        {hasFolderAccess && remembered && !folder && <button onClick={reopenFolder}>Reopen Last Folder</button>}
        <button onClick={async () => addPickedFiles(await pickFiles('.kpc,.json'))}>Add Files…</button>
        {folder && <button onClick={refresh} title="Re-read the folder">↻</button>}
      </div>
      {folder && <div className="hint">Folder: {folder.name}</div>}
      {!folder && <div className="hint">Drop .kpc files anywhere, or {hasFolderAccess ? 'open the folder they are in' : 'add them'}.</div>}

      {listing.clips.length > 0 && (
        <ul className="file-list">
          {listing.clips.map(name => (
            <li key={name}>
              <span className="file-name" title={name}>{name}</span>
              <button onClick={() => addLayerFromSource(name)} title="Add as a layer">+ Layer</button>
            </li>
          ))}
        </ul>
      )}
      {listing.projects.length > 0 && (
        <ul className="file-list">
          {listing.projects.map(name => (
            <li key={name}>
              <span className="file-name" title={name}>{name}</span>
              <button onClick={() => openProject(name)}>Open</button>
            </li>
          ))}
        </ul>
      )}

      <label className="row">
        <span className="row-label">Project</span>
        <input type="text" value={projectName} onChange={e => setProjectName(e.target.value.replace(/[/\\:]/g, '-'))}/>
      </label>
      <div className="buttons">
        <button onClick={saveProject} title={`Saves ${projectName}.pce.json`}>Save Project</button>
        <button onClick={handleExport} disabled={progress !== null} title={`Writes ${projectName}.kpc`}>Export .kpc</button>
      </div>
      <div className="status">{progress ?? status}</div>
    </Section>
  )
}
