// Reading and writing .kpc and project files.
//
// In Chrome the editor works on a folder through the File System Access API, so exports and
// projects are saved next to the clips. Elsewhere files are picked one by one and saved as downloads.

const DB_NAME = 'point-cloud-editor'
const STORE = 'handles'
const FOLDER_KEY = 'folder'

export const hasFolderAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbSet(key: string, value: unknown) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

// Asks for a folder and remembers it for next time
export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await dbSet(FOLDER_KEY, handle).catch(() => {})
  return handle
}

// The folder from last time, after asking for permission again (needs a user gesture). null if there is none.
export async function restoreFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await dbGet<FileSystemDirectoryHandle>(FOLDER_KEY).catch(() => undefined)
  if (!handle) {
    return null
  }
  const permission = await handle.requestPermission({ mode: 'readwrite' })
  return permission === 'granted' ? handle : null
}

export async function hasRememberedFolder() {
  return !!(await dbGet(FOLDER_KEY).catch(() => undefined))
}

export type FolderListing = { clips: string[], projects: string[] }

export async function listFolder(folder: FileSystemDirectoryHandle): Promise<FolderListing> {
  const listing: FolderListing = { clips: [], projects: [] }
  for await (const entry of folder.values()) {
    if (entry.kind !== 'file') {
      continue
    }
    if (entry.name.endsWith('.kpc')) {
      listing.clips.push(entry.name)
    } else if (entry.name.endsWith('.pce.json')) {
      listing.projects.push(entry.name)
    }
  }
  listing.clips.sort()
  listing.projects.sort()
  return listing
}

export async function readFolderFile(folder: FileSystemDirectoryHandle, name: string): Promise<File> {
  const handle = await folder.getFileHandle(name)
  return handle.getFile()
}

export async function writeFolderFile(folder: FileSystemDirectoryHandle, name: string, data: ArrayBuffer | string) {
  const handle = await folder.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

// Fallbacks for browsers without folder access

export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.oncancel = () => resolve([])
    input.click()
  })
}

export function downloadFile(name: string, data: ArrayBuffer | string, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
