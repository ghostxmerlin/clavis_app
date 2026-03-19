import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Clavis-specific APIs exposed to renderer via contextBridge
const clavisAPI = {
  // Device connection events
  onDeviceConnect: (callback: (deviceInfo: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown): void => callback(info)
    ipcRenderer.on('device:connected', handler)
    return () => ipcRenderer.removeListener('device:connected', handler)
  },

  onDeviceDisconnect: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('device:disconnected', handler)
    return () => ipcRenderer.removeListener('device:disconnected', handler)
  },

  // Device status
  getDeviceStatus: (): Promise<{ connected: boolean }> => ipcRenderer.invoke('device:status'),

  // Password operations
  getPasswords: (): Promise<unknown[]> => ipcRenderer.invoke('passwords:list'),
  addPassword: (entry: unknown): Promise<unknown> => ipcRenderer.invoke('passwords:add', entry),
  updatePassword: (id: string, updates: unknown): Promise<unknown> =>
    ipcRenderer.invoke('passwords:update', id, updates),
  deletePassword: (id: string): Promise<void> => ipcRenderer.invoke('passwords:delete', id),

  // File operations
  listFiles: (): Promise<unknown[]> => ipcRenderer.invoke('files:list'),
  uploadFile: (filePath: string): Promise<unknown> => ipcRenderer.invoke('files:upload', filePath),
  downloadFile: (fileId: string, savePath: string): Promise<void> =>
    ipcRenderer.invoke('files:download', fileId, savePath),
  deleteFile: (fileId: string): Promise<void> => ipcRenderer.invoke('files:delete', fileId),

  // Dialog helpers
  showOpenDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open'),
  showSaveDialog: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:save', defaultName)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('clavis', clavisAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.clavis = clavisAPI
}
