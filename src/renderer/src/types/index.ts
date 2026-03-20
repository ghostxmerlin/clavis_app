// Shared type definitions for Clavis App

export interface PasswordEntry {
  id: string
  title: string
  username: string
  password: string
  notes?: string
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

  // APDU / CTAP HID debug
  sendApdu: (hexCommand: string) => Promise<{
    success: boolean
    response?: {
      raw: string
      data: string
      cmd: number
      frameCount: number
      totalLength: number
    }
    error?: string
  }>

  // CTAP HID 协议操作
  ctapInit: () => Promise<{
    success: boolean
    result?: CtapChannelInfo
    error?: string
  }>
  ctapChannelInfo: () => Promise<{ cid: string; info: CtapChannelInfo } | null>
  ctapSend: (cmd: number, payload: number[]) => Promise<{
    success: boolean
    response?: {
      raw: string
      data: string
      cmd: number
      frameCount: number
      totalLength: number
    }
    error?: string
  }>
}

export interface CtapChannelInfo {
  nonce: number[]
  cid: number[]
  cidHex: string
  protocolVersion: number
  majorVersion: number
  minorVersion: number
  buildVersion: number
  capabilities: number
  capabilityNames: string[]
}
