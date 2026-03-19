// Shared type definitions for Clavis App

export interface PasswordEntry {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  category?: string
  createdAt: number
  updatedAt: number
}

export interface EncryptedFile {
  id: string
  name: string
  size: number
  createdAt: number
  updatedAt: number
}

export interface DeviceStatus {
  connected: boolean
  deviceInfo?: {
    manufacturer?: string
    product?: string
    serialNumber?: string
  }
}

export interface ClavisAPI {
  onDeviceConnect: (callback: (deviceInfo: DeviceStatus['deviceInfo']) => void) => () => void
  onDeviceDisconnect: (callback: () => void) => () => void
  getDeviceStatus: () => Promise<{ connected: boolean }>

  // Password operations
  getPasswords: () => Promise<PasswordEntry[]>
  addPassword: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PasswordEntry>
  updatePassword: (id: string, entry: Partial<PasswordEntry>) => Promise<PasswordEntry>
  deletePassword: (id: string) => Promise<void>

  // File operations
  listFiles: () => Promise<EncryptedFile[]>
  uploadFile: (filePath: string) => Promise<EncryptedFile>
  downloadFile: (fileId: string, savePath: string) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>

  // Dialog helpers
  showOpenDialog: () => Promise<string | null>
  showSaveDialog: (defaultName: string) => Promise<string | null>

  // APDU debug
  sendApdu: (hexCommand: string) => Promise<{
    success: boolean
    response?: {
      raw: string
      sw1: number
      sw2: number
      data: string
    }
    error?: string
  }>
}
