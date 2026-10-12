// The parts of the File System Access API that the DOM typings do not have yet
interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite', id?: string }): Promise<FileSystemDirectoryHandle>
}

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>
}
